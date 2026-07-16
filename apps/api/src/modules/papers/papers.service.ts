import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AuthUser,
  PaperBuilderFilterOptions,
  PaperDraftDetail,
  PaperDraftListResponse,
  PaperDraftSummary,
  QuestionSummary
} from '@tj-edu/shared';
import { ContentStatus, PaperType, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { ListPapersDto } from './dto/list-papers.dto';
import type { PaperBuilderFilterOptionsDto } from './dto/paper-builder-filter-options.dto';
import type { UpsertPaperDto } from './dto/upsert-paper.dto';

const questionInclude = {
  subject: { select: { id: true, code: true, name: true } },
  grade: { select: { id: true, code: true, name: true } },
  region: { select: { id: true, code: true, name: true } },
  knowledgeLinks: {
    orderBy: { knowledgePoint: { sortOrder: 'asc' as const } },
    select: { knowledgePoint: { select: { id: true, code: true, name: true } } }
  },
  paperLinks: {
    orderBy: { sortOrder: 'asc' as const },
    select: { paper: { select: { id: true, title: true, year: true, type: true } } }
  }
} satisfies Prisma.QuestionInclude;

const paperInclude = {
  subject: { select: { id: true, code: true, name: true } },
  grade: { select: { id: true, code: true, name: true } },
  region: { select: { id: true, code: true, name: true } },
  createdBy: { select: { id: true, displayName: true } },
  questionLinks: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      sortOrder: true,
      score: true,
      question: { include: questionInclude }
    }
  }
} satisfies Prisma.PaperInclude;

type PaperRecord = Prisma.PaperGetPayload<{ include: typeof paperInclude }>;
type QuestionRecord = Prisma.QuestionGetPayload<{ include: typeof questionInclude }>;

@Injectable()
export class PapersService {
  constructor(private readonly prisma: PrismaService) {}

  async getFilterOptions(
    user: AuthUser,
    query: PaperBuilderFilterOptionsDto
  ): Promise<PaperBuilderFilterOptions> {
    const [subjects, grades, regions, knowledgePoints, questions] = await Promise.all([
      this.prisma.subject.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' }
      }),
      this.prisma.grade.findMany({
        select: { id: true, code: true, name: true },
        orderBy: [{ stage: 'asc' }, { level: 'asc' }]
      }),
      this.prisma.region.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' }
      }),
      this.prisma.knowledgePoint.findMany({
        where: {
          ...(query.subjectId ? { subjectId: query.subjectId } : {}),
          ...(query.gradeId ? { OR: [{ gradeId: query.gradeId }, { gradeId: null }] } : {})
        },
        select: { id: true, code: true, name: true, subjectId: true, gradeId: true },
        orderBy: [{ subjectId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }]
      }),
      this.prisma.question.findMany({
        where: {
          OR: [{ institutionId: null }, { institutionId: user.institutionId }],
          status: ContentStatus.PUBLISHED,
          ...(query.subjectId ? { subjectId: query.subjectId } : {}),
          ...(query.gradeId ? { OR: [{ gradeId: query.gradeId }, { gradeId: null }] } : {}),
          ...(query.knowledgePointId
            ? { knowledgeLinks: { some: { knowledgePointId: query.knowledgePointId } } }
            : {})
        },
        include: questionInclude,
        orderBy: [{ difficulty: 'asc' }, { createdAt: 'desc' }],
        take: 80
      })
    ]);

    return {
      subjects,
      grades,
      regions,
      knowledgePoints,
      questions: questions.map((question) => this.toQuestionSummary(question)),
      paperTypes: Object.values(PaperType),
      statuses: Object.values(ContentStatus)
    };
  }

  async list(user: AuthUser, query: ListPapersDto): Promise<PaperDraftListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.PaperWhereInput = {
      OR: [{ institutionId: null }, { institutionId: user.institutionId }],
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.gradeId ? { gradeId: query.gradeId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search?.trim()
        ? { title: { contains: query.search.trim(), mode: 'insensitive' } }
        : {})
    };
    const [total, papers] = await Promise.all([
      this.prisma.paper.count({ where }),
      this.prisma.paper.findMany({
        where,
        include: paperInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return {
      items: papers.map((paper) => this.toSummary(paper)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  }

  async getById(user: AuthUser, id: string): Promise<PaperDraftDetail> {
    const paper = await this.findVisible(user, id);
    return this.toDetail(paper);
  }

  async create(user: AuthUser, dto: UpsertPaperDto): Promise<PaperDraftDetail> {
    await this.validateInput(user, dto);

    const paper = await this.prisma.paper.create({
      data: {
        institution: { connect: { id: user.institutionId } },
        createdBy: { connect: { id: user.id } },
        subject: { connect: { id: dto.subjectId } },
        grade: { connect: { id: dto.gradeId } },
        ...(dto.regionId ? { region: { connect: { id: dto.regionId } } } : {}),
        title: dto.title.trim(),
        year: dto.year,
        type: dto.type,
        status: dto.status,
        questionLinks: this.createQuestionLinks(dto.questionIds)
      },
      include: paperInclude
    });

    return this.toDetail(paper);
  }

  async update(user: AuthUser, id: string, dto: UpsertPaperDto): Promise<PaperDraftDetail> {
    await this.findEditable(user, id);
    await this.validateInput(user, dto);

    const paper = await this.prisma.paper.update({
      where: { id },
      data: {
        subject: { connect: { id: dto.subjectId } },
        grade: { connect: { id: dto.gradeId } },
        region: dto.regionId ? { connect: { id: dto.regionId } } : { disconnect: true },
        title: dto.title.trim(),
        year: dto.year ?? null,
        type: dto.type,
        status: dto.status,
        questionLinks: { deleteMany: {}, ...this.createQuestionLinks(dto.questionIds) }
      },
      include: paperInclude
    });

    return this.toDetail(paper);
  }

  private createQuestionLinks(questionIds: string[]) {
    return {
      create: questionIds.map((questionId, sortOrder) => ({
        sortOrder,
        score: 10,
        question: { connect: { id: questionId } }
      }))
    };
  }

  private async findVisible(user: AuthUser, id: string): Promise<PaperRecord> {
    const paper = await this.prisma.paper.findFirst({
      where: { id, OR: [{ institutionId: null }, { institutionId: user.institutionId }] },
      include: paperInclude
    });

    if (!paper) {
      throw new NotFoundException('试卷草稿不存在。');
    }

    return paper;
  }

  private async findEditable(user: AuthUser, id: string) {
    const paper = await this.prisma.paper.findFirst({
      where: { id, institutionId: user.institutionId },
      select: { id: true }
    });

    if (!paper) {
      throw new NotFoundException('试卷草稿不存在或不可编辑。');
    }
  }

  private async validateInput(user: AuthUser, dto: UpsertPaperDto) {
    const uniqueQuestionIds = [...new Set(dto.questionIds)];

    if (!dto.title.trim()) {
      throw new BadRequestException('试卷标题不能为空。');
    }

    if (!uniqueQuestionIds.length) {
      throw new BadRequestException('至少选择一道题目。');
    }

    if (uniqueQuestionIds.length !== dto.questionIds.length) {
      throw new BadRequestException('同一份试卷不能重复选择题目。');
    }

    const [subject, grade, region, questions] = await Promise.all([
      this.prisma.subject.findUnique({ where: { id: dto.subjectId }, select: { id: true } }),
      this.prisma.grade.findUnique({ where: { id: dto.gradeId }, select: { id: true } }),
      dto.regionId
        ? this.prisma.region.findUnique({ where: { id: dto.regionId }, select: { id: true } })
        : null,
      this.prisma.question.findMany({
        where: {
          id: { in: uniqueQuestionIds },
          OR: [{ institutionId: null }, { institutionId: user.institutionId }]
        },
        select: { id: true, subjectId: true, gradeId: true }
      })
    ]);

    if (!subject || !grade || (dto.regionId && !region)) {
      throw new BadRequestException('学科、年级或区域参数无效。');
    }

    if (
      questions.length !== uniqueQuestionIds.length ||
      questions.some((question) => question.subjectId !== dto.subjectId)
    ) {
      throw new BadRequestException('题目必须存在且属于所选学科。');
    }
  }

  private toSummary(paper: PaperRecord): PaperDraftSummary {
    const totalScore = paper.questionLinks.reduce(
      (sum, link) => sum + Number(link.score ?? 0),
      0
    );

    return {
      id: paper.id,
      title: paper.title,
      year: paper.year,
      type: paper.type,
      status: paper.status,
      subject: paper.subject,
      grade: paper.grade,
      region: paper.region,
      questionCount: paper.questionLinks.length,
      totalScore,
      updatedAt: paper.updatedAt.toISOString(),
      createdBy: paper.createdBy
    };
  }

  private toDetail(paper: PaperRecord): PaperDraftDetail {
    return {
      ...this.toSummary(paper),
      questions: paper.questionLinks.map((link) => ({
        ...this.toQuestionSummary(link.question),
        sortOrder: link.sortOrder,
        score: link.score === null ? null : Number(link.score)
      })),
      createdAt: paper.createdAt.toISOString()
    };
  }

  private toQuestionSummary(question: QuestionRecord): QuestionSummary {
    return {
      id: question.id,
      stem: question.stem,
      type: question.type,
      status: question.status,
      difficulty: question.difficulty,
      source: question.source,
      subject: question.subject,
      grade: question.grade,
      region: question.region,
      knowledgePoints: question.knowledgeLinks.map(({ knowledgePoint }) => knowledgePoint),
      papers: question.paperLinks.map(({ paper }) => paper),
      createdAt: question.createdAt.toISOString()
    };
  }
}

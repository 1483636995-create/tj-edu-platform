import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AuthUser,
  QuestionDetail,
  QuestionFilterOptions,
  QuestionListResponse,
  QuestionSummary
} from '@tj-edu/shared';
import { ContentStatus, PaperType, Prisma, QuestionType } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { CreateQuestionDto } from './dto/create-question.dto';
import type { ListQuestionsDto } from './dto/list-questions.dto';
import type { QuestionFilterOptionsDto } from './dto/question-filter-options.dto';
import type { UpdateQuestionDto } from './dto/update-question.dto';

const questionInclude = {
  subject: { select: { id: true, code: true, name: true } },
  grade: { select: { id: true, code: true, name: true } },
  region: { select: { id: true, code: true, name: true } },
  knowledgeLinks: {
    orderBy: { knowledgePoint: { sortOrder: 'asc' as const } },
    select: {
      knowledgePoint: { select: { id: true, code: true, name: true } }
    }
  },
  paperLinks: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      paper: { select: { id: true, title: true, year: true, type: true } }
    }
  },
  createdBy: { select: { id: true, displayName: true } }
} satisfies Prisma.QuestionInclude;

type QuestionRecord = Prisma.QuestionGetPayload<{ include: typeof questionInclude }>;

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, query: ListQuestionsDto): Promise<QuestionListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(user, query);
    const [total, questions] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        include: questionInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return {
      items: questions.map((question) => this.toSummary(question)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  }

  async getFilterOptions(
    user: AuthUser,
    query: QuestionFilterOptionsDto
  ): Promise<QuestionFilterOptions> {
    const institutionScope = [{ institutionId: null }, { institutionId: user.institutionId }];
    const [subjects, grades, regions, knowledgePoints, paperYears] = await Promise.all([
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
        select: {
          id: true,
          code: true,
          name: true,
          subjectId: true,
          gradeId: true
        },
        orderBy: [{ subjectId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }]
      }),
      this.prisma.paper.findMany({
        where: { OR: institutionScope, year: { not: null } },
        select: { year: true },
        distinct: ['year'],
        orderBy: { year: 'desc' }
      })
    ]);

    return {
      subjects,
      grades,
      regions,
      knowledgePoints,
      years: paperYears.flatMap(({ year }) => (year === null ? [] : [year])),
      paperTypes: Object.values(PaperType),
      questionTypes: Object.values(QuestionType),
      statuses: Object.values(ContentStatus)
    };
  }

  async getById(user: AuthUser, id: string): Promise<QuestionDetail> {
    const question = await this.prisma.question.findFirst({
      where: {
        id,
        OR: [{ institutionId: null }, { institutionId: user.institutionId }]
      },
      include: questionInclude
    });

    if (!question) {
      throw new NotFoundException('题目不存在。');
    }

    return this.toDetail(question);
  }

  async create(user: AuthUser, dto: CreateQuestionDto): Promise<QuestionDetail> {
    await this.validateReferences(dto.subjectId, dto.gradeId, dto.regionId, dto.knowledgePointIds);

    const question = await this.prisma.question.create({
      data: {
        institution: { connect: { id: user.institutionId } },
        createdBy: { connect: { id: user.id } },
        subject: { connect: { id: dto.subjectId } },
        ...(dto.gradeId ? { grade: { connect: { id: dto.gradeId } } } : {}),
        ...(dto.regionId ? { region: { connect: { id: dto.regionId } } } : {}),
        type: dto.type,
        status: dto.status,
        stem: dto.stem.trim(),
        answer: this.toJsonInput(dto.answer),
        analysis: dto.analysis?.trim(),
        difficulty: dto.difficulty,
        source: dto.source?.trim(),
        ...(dto.knowledgePointIds?.length
          ? {
              knowledgeLinks: {
                create: dto.knowledgePointIds.map((knowledgePointId) => ({
                  knowledgePoint: { connect: { id: knowledgePointId } }
                }))
              }
            }
          : {})
      },
      include: questionInclude
    });

    return this.toDetail(question);
  }

  async update(user: AuthUser, id: string, dto: UpdateQuestionDto): Promise<QuestionDetail> {
    const existing = await this.prisma.question.findFirst({
      where: { id, institutionId: user.institutionId },
      select: { id: true, subjectId: true, gradeId: true, regionId: true }
    });

    if (!existing) {
      throw new NotFoundException('题目不存在或不可编辑。');
    }

    const subjectId = dto.subjectId ?? existing.subjectId;
    await this.validateReferences(
      subjectId,
      dto.gradeId ?? existing.gradeId ?? undefined,
      dto.regionId ?? existing.regionId ?? undefined,
      dto.knowledgePointIds
    );

    const question = await this.prisma.question.update({
      where: { id },
      data: {
        ...(dto.subjectId ? { subject: { connect: { id: dto.subjectId } } } : {}),
        ...(dto.gradeId ? { grade: { connect: { id: dto.gradeId } } } : {}),
        ...(dto.regionId ? { region: { connect: { id: dto.regionId } } } : {}),
        type: dto.type,
        status: dto.status,
        stem: dto.stem?.trim(),
        answer: this.toJsonInput(dto.answer),
        analysis: dto.analysis?.trim(),
        difficulty: dto.difficulty,
        source: dto.source?.trim(),
        ...(dto.knowledgePointIds
          ? {
              knowledgeLinks: {
                deleteMany: {},
                create: dto.knowledgePointIds.map((knowledgePointId) => ({
                  knowledgePoint: { connect: { id: knowledgePointId } }
                }))
              }
            }
          : {})
      },
      include: questionInclude
    });

    return this.toDetail(question);
  }

  private buildWhere(user: AuthUser, query: ListQuestionsDto): Prisma.QuestionWhereInput {
    const search = query.search?.trim();

    return {
      OR: [{ institutionId: null }, { institutionId: user.institutionId }],
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.gradeId ? { gradeId: query.gradeId } : {}),
      ...(query.regionId ? { regionId: query.regionId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      ...(search ? { stem: { contains: search, mode: 'insensitive' } } : {}),
      ...(query.knowledgePointId
        ? { knowledgeLinks: { some: { knowledgePointId: query.knowledgePointId } } }
        : {}),
      ...(query.year || query.paperType
        ? {
            paperLinks: {
              some: {
                paper: {
                  ...(query.year ? { year: query.year } : {}),
                  ...(query.paperType ? { type: query.paperType } : {})
                }
              }
            }
          }
        : {})
    };
  }

  private async validateReferences(
    subjectId: string,
    gradeId?: string,
    regionId?: string,
    knowledgePointIds: string[] = []
  ) {
    const [subject, grade, region, knowledgePoints] = await Promise.all([
      this.prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } }),
      gradeId
        ? this.prisma.grade.findUnique({ where: { id: gradeId }, select: { id: true } })
        : null,
      regionId
        ? this.prisma.region.findUnique({ where: { id: regionId }, select: { id: true } })
        : null,
      knowledgePointIds.length
        ? this.prisma.knowledgePoint.findMany({
            where: { id: { in: knowledgePointIds } },
            select: { id: true, subjectId: true }
          })
        : []
    ]);

    if (!subject || (gradeId && !grade) || (regionId && !region)) {
      throw new BadRequestException('学科、年级或区域参数无效。');
    }

    if (
      knowledgePoints.length !== knowledgePointIds.length ||
      knowledgePoints.some((point) => point.subjectId !== subjectId)
    ) {
      throw new BadRequestException('知识点必须存在且属于所选学科。');
    }
  }

  private toJsonInput(value: unknown) {
    if (value === undefined) {
      return undefined;
    }

    return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  }

  private toSummary(question: QuestionRecord): QuestionSummary {
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

  private toDetail(question: QuestionRecord): QuestionDetail {
    return {
      ...this.toSummary(question),
      answer: question.answer,
      analysis: question.analysis,
      createdBy: question.createdBy,
      updatedAt: question.updatedAt.toISOString()
    };
  }
}

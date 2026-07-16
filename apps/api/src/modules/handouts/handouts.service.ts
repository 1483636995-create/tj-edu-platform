import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AuthUser,
  HandoutDetail,
  HandoutFilterOptions,
  HandoutListResponse,
  HandoutMaterialFile,
  HandoutMaterialQuestion,
  HandoutPreviewSection,
  HandoutSummary
} from '@tj-edu/shared';
import { ContentStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { HandoutFilterOptionsDto } from './dto/handout-filter-options.dto';
import type { ListHandoutsDto } from './dto/list-handouts.dto';
import type { UpsertHandoutDto } from './dto/upsert-handout.dto';

const questionSelect = {
  id: true,
  stem: true,
  type: true,
  difficulty: true,
  subject: { select: { id: true, code: true, name: true } },
  grade: { select: { id: true, code: true, name: true } },
  knowledgeLinks: {
    orderBy: { knowledgePoint: { sortOrder: 'asc' as const } },
    select: { knowledgePoint: { select: { id: true, code: true, name: true } } }
  }
} satisfies Prisma.QuestionSelect;

const fileSelect = {
  id: true,
  name: true,
  category: true,
  mimeType: true,
  size: true,
  subject: { select: { id: true, code: true, name: true } },
  grade: { select: { id: true, code: true, name: true } },
  knowledgeLinks: {
    orderBy: { knowledgePoint: { sortOrder: 'asc' as const } },
    select: { knowledgePoint: { select: { id: true, code: true, name: true } } }
  }
} satisfies Prisma.FileAssetSelect;

const handoutInclude = {
  subject: { select: { id: true, code: true, name: true } },
  grade: { select: { id: true, code: true, name: true } },
  createdBy: { select: { id: true, displayName: true } },
  knowledgeLinks: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      sortOrder: true,
      knowledgePoint: { select: { id: true, code: true, name: true } }
    }
  },
  questionLinks: {
    orderBy: { sortOrder: 'asc' as const },
    select: { sortOrder: true, question: { select: questionSelect } }
  },
  fileLinks: {
    orderBy: { sortOrder: 'asc' as const },
    select: { sortOrder: true, fileAsset: { select: fileSelect } }
  }
} satisfies Prisma.HandoutDraftInclude;

type HandoutRecord = Prisma.HandoutDraftGetPayload<{ include: typeof handoutInclude }>;
type QuestionMaterialRecord = Prisma.QuestionGetPayload<{ select: typeof questionSelect }>;
type FileMaterialRecord = Prisma.FileAssetGetPayload<{ select: typeof fileSelect }>;

@Injectable()
export class HandoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFilterOptions(
    user: AuthUser,
    query: HandoutFilterOptionsDto
  ): Promise<HandoutFilterOptions> {
    const questionScope: Prisma.QuestionWhereInput = {
      OR: [{ institutionId: null }, { institutionId: user.institutionId }],
      status: ContentStatus.PUBLISHED,
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.gradeId ? { OR: [{ gradeId: query.gradeId }, { gradeId: null }] } : {})
    };
    const fileScope: Prisma.FileAssetWhereInput = {
      institutionId: user.institutionId,
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.gradeId ? { OR: [{ gradeId: query.gradeId }, { gradeId: null }] } : {})
    };

    const [subjects, grades, knowledgePoints, questions, files] = await Promise.all([
      this.prisma.subject.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' }
      }),
      this.prisma.grade.findMany({
        select: { id: true, code: true, name: true },
        orderBy: [{ stage: 'asc' }, { level: 'asc' }]
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
        where: questionScope,
        select: questionSelect,
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      this.prisma.fileAsset.findMany({
        where: fileScope,
        select: fileSelect,
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    ]);

    return {
      subjects,
      grades,
      knowledgePoints,
      questions: questions.map((question) => this.toQuestionMaterial(question)),
      files: files.map((file) => this.toFileMaterial(file)),
      statuses: Object.values(ContentStatus)
    };
  }

  async list(user: AuthUser, query: ListHandoutsDto): Promise<HandoutListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.HandoutDraftWhereInput = {
      institutionId: user.institutionId,
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.gradeId ? { gradeId: query.gradeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search?.trim()
        ? { title: { contains: query.search.trim(), mode: 'insensitive' } }
        : {})
    };
    const [total, handouts] = await Promise.all([
      this.prisma.handoutDraft.count({ where }),
      this.prisma.handoutDraft.findMany({
        where,
        include: handoutInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return {
      items: handouts.map((handout) => this.toSummary(handout)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  }

  async getById(user: AuthUser, id: string): Promise<HandoutDetail> {
    const handout = await this.findVisible(user, id);
    return this.toDetail(handout);
  }

  async create(user: AuthUser, dto: UpsertHandoutDto): Promise<HandoutDetail> {
    await this.validateInput(user, dto);

    const handout = await this.prisma.handoutDraft.create({
      data: {
        institution: { connect: { id: user.institutionId } },
        createdBy: { connect: { id: user.id } },
        subject: { connect: { id: dto.subjectId } },
        ...(dto.gradeId ? { grade: { connect: { id: dto.gradeId } } } : {}),
        title: dto.title.trim(),
        objective: dto.objective?.trim() || null,
        status: dto.status,
        knowledgeLinks: this.createKnowledgeLinks(dto.knowledgePointIds),
        questionLinks: this.createQuestionLinks(dto.questionIds),
        fileLinks: this.createFileLinks(dto.fileAssetIds)
      },
      include: handoutInclude
    });

    return this.toDetail(handout);
  }

  async update(user: AuthUser, id: string, dto: UpsertHandoutDto): Promise<HandoutDetail> {
    await this.findVisible(user, id);
    await this.validateInput(user, dto);

    const handout = await this.prisma.handoutDraft.update({
      where: { id },
      data: {
        subject: { connect: { id: dto.subjectId } },
        grade: dto.gradeId ? { connect: { id: dto.gradeId } } : { disconnect: true },
        title: dto.title.trim(),
        objective: dto.objective?.trim() || null,
        status: dto.status,
        knowledgeLinks: { deleteMany: {}, ...this.createKnowledgeLinks(dto.knowledgePointIds) },
        questionLinks: { deleteMany: {}, ...this.createQuestionLinks(dto.questionIds) },
        fileLinks: { deleteMany: {}, ...this.createFileLinks(dto.fileAssetIds) }
      },
      include: handoutInclude
    });

    return this.toDetail(handout);
  }

  private createKnowledgeLinks(ids: string[]) {
    return {
      create: ids.map((knowledgePointId, sortOrder) => ({
        sortOrder,
        knowledgePoint: { connect: { id: knowledgePointId } }
      }))
    };
  }

  private createQuestionLinks(ids: string[]) {
    return {
      create: ids.map((questionId, sortOrder) => ({
        sortOrder,
        question: { connect: { id: questionId } }
      }))
    };
  }

  private createFileLinks(ids: string[]) {
    return {
      create: ids.map((fileAssetId, sortOrder) => ({
        sortOrder,
        fileAsset: { connect: { id: fileAssetId } }
      }))
    };
  }

  private async findVisible(user: AuthUser, id: string): Promise<HandoutRecord> {
    const handout = await this.prisma.handoutDraft.findFirst({
      where: { id, institutionId: user.institutionId },
      include: handoutInclude
    });

    if (!handout) {
      throw new NotFoundException('讲义草稿不存在。');
    }

    return handout;
  }

  private async validateInput(user: AuthUser, dto: UpsertHandoutDto) {
    const uniqueKnowledgePointIds = [...new Set(dto.knowledgePointIds)];
    const uniqueQuestionIds = [...new Set(dto.questionIds)];
    const uniqueFileAssetIds = [...new Set(dto.fileAssetIds)];

    if (!dto.title.trim()) {
      throw new BadRequestException('讲义标题不能为空。');
    }

    if (
      uniqueKnowledgePointIds.length !== dto.knowledgePointIds.length ||
      uniqueQuestionIds.length !== dto.questionIds.length ||
      uniqueFileAssetIds.length !== dto.fileAssetIds.length
    ) {
      throw new BadRequestException('讲义素材不能重复选择。');
    }

    const [subject, grade, knowledgePoints, questions, files] = await Promise.all([
      this.prisma.subject.findUnique({ where: { id: dto.subjectId }, select: { id: true } }),
      dto.gradeId
        ? this.prisma.grade.findUnique({ where: { id: dto.gradeId }, select: { id: true } })
        : null,
      uniqueKnowledgePointIds.length
        ? this.prisma.knowledgePoint.findMany({
            where: { id: { in: uniqueKnowledgePointIds } },
            select: { id: true, subjectId: true }
          })
        : [],
      uniqueQuestionIds.length
        ? this.prisma.question.findMany({
            where: {
              id: { in: uniqueQuestionIds },
              OR: [{ institutionId: null }, { institutionId: user.institutionId }]
            },
            select: { id: true, subjectId: true }
          })
        : [],
      uniqueFileAssetIds.length
        ? this.prisma.fileAsset.findMany({
            where: { id: { in: uniqueFileAssetIds }, institutionId: user.institutionId },
            select: { id: true, subjectId: true }
          })
        : []
    ]);

    if (!subject || (dto.gradeId && !grade)) {
      throw new BadRequestException('学科或年级参数无效。');
    }

    if (
      knowledgePoints.length !== uniqueKnowledgePointIds.length ||
      knowledgePoints.some((point) => point.subjectId !== dto.subjectId)
    ) {
      throw new BadRequestException('知识点必须存在且属于所选学科。');
    }

    if (
      questions.length !== uniqueQuestionIds.length ||
      questions.some((question) => question.subjectId !== dto.subjectId)
    ) {
      throw new BadRequestException('题目必须存在且属于所选学科。');
    }

    if (
      files.length !== uniqueFileAssetIds.length ||
      files.some((file) => file.subjectId && file.subjectId !== dto.subjectId)
    ) {
      throw new BadRequestException('文件素材必须存在且匹配所选学科。');
    }
  }

  private toSummary(handout: HandoutRecord): HandoutSummary {
    return {
      id: handout.id,
      title: handout.title,
      objective: handout.objective,
      status: handout.status,
      subject: handout.subject,
      grade: handout.grade,
      knowledgePoints: handout.knowledgeLinks.map(({ knowledgePoint }) => knowledgePoint),
      questionCount: handout.questionLinks.length,
      fileCount: handout.fileLinks.length,
      updatedAt: handout.updatedAt.toISOString(),
      createdBy: handout.createdBy
    };
  }

  private toDetail(handout: HandoutRecord): HandoutDetail {
    const questions = handout.questionLinks.map(({ question }) => this.toQuestionMaterial(question));
    const files = handout.fileLinks.map(({ fileAsset }) => this.toFileMaterial(fileAsset));

    return {
      ...this.toSummary(handout),
      questions,
      files,
      previewSections: this.buildPreviewSections(
        handout.knowledgeLinks.map(({ knowledgePoint }) => knowledgePoint),
        questions,
        files
      ),
      createdAt: handout.createdAt.toISOString()
    };
  }

  private buildPreviewSections(
    knowledgePoints: HandoutSummary['knowledgePoints'],
    questions: HandoutMaterialQuestion[],
    files: HandoutMaterialFile[]
  ): HandoutPreviewSection[] {
    const sections: HandoutPreviewSection[] = knowledgePoints.map((knowledgePoint) => ({
      knowledgePoint,
      questions: questions.filter((question) =>
        question.knowledgePoints.some((point) => point.id === knowledgePoint.id)
      ),
      files: files.filter((file) =>
        file.knowledgePoints.some((point) => point.id === knowledgePoint.id)
      )
    }));
    const assignedQuestionIds = new Set(
      sections.flatMap((section) => section.questions.map(({ id }) => id))
    );
    const assignedFileIds = new Set(
      sections.flatMap((section) => section.files.map(({ id }) => id))
    );
    const otherQuestions = questions.filter((question) => !assignedQuestionIds.has(question.id));
    const otherFiles = files.filter((file) => !assignedFileIds.has(file.id));

    if (otherQuestions.length || otherFiles.length || !sections.length) {
      sections.push({ knowledgePoint: null, questions: otherQuestions, files: otherFiles });
    }

    return sections;
  }

  private toQuestionMaterial(question: QuestionMaterialRecord): HandoutMaterialQuestion {
    return {
      id: question.id,
      stem: question.stem,
      type: question.type,
      difficulty: question.difficulty,
      subject: question.subject,
      grade: question.grade,
      knowledgePoints: question.knowledgeLinks.map(({ knowledgePoint }) => knowledgePoint)
    };
  }

  private toFileMaterial(file: FileMaterialRecord): HandoutMaterialFile {
    return {
      id: file.id,
      name: file.name,
      category: file.category,
      mimeType: file.mimeType,
      size: Number(file.size),
      subject: file.subject,
      grade: file.grade,
      knowledgePoints: file.knowledgeLinks.map(({ knowledgePoint }) => knowledgePoint)
    };
  }
}

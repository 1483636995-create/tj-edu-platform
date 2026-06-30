import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AuthUser,
  FileAssetSummary,
  FileFilterOptions,
  FileListResponse
} from '@tj-edu/shared';
import { FileCategory, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { FileFilterOptionsDto } from './dto/file-filter-options.dto';
import type { ListFilesDto } from './dto/list-files.dto';
import type { UploadFileDto } from './dto/upload-file.dto';
import { FileStorage } from './file-storage';

const fileInclude = {
  subject: { select: { id: true, code: true, name: true } },
  grade: { select: { id: true, code: true, name: true } },
  region: { select: { id: true, code: true, name: true } },
  knowledgeLinks: {
    orderBy: { knowledgePoint: { sortOrder: 'asc' as const } },
    select: { knowledgePoint: { select: { id: true, code: true, name: true } } }
  },
  uploadedBy: { select: { id: true, displayName: true } }
} satisfies Prisma.FileAssetInclude;

type FileRecord = Prisma.FileAssetGetPayload<{ include: typeof fileInclude }>;

interface UploadPayload {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: FileStorage
  ) {}

  async list(user: AuthUser, query: ListFilesDto): Promise<FileListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.FileAssetWhereInput = {
      institutionId: user.institutionId,
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.gradeId ? { gradeId: query.gradeId } : {}),
      ...(query.regionId ? { regionId: query.regionId } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.search?.trim()
        ? { name: { contains: query.search.trim(), mode: 'insensitive' } }
        : {}),
      ...(query.knowledgePointId
        ? { knowledgeLinks: { some: { knowledgePointId: query.knowledgePointId } } }
        : {})
    };
    const [total, files] = await Promise.all([
      this.prisma.fileAsset.count({ where }),
      this.prisma.fileAsset.findMany({
        where,
        include: fileInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return {
      items: files.map((file) => this.toSummary(file)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  }

  async getFilterOptions(query: FileFilterOptionsDto): Promise<FileFilterOptions> {
    const [subjects, grades, regions, knowledgePoints] = await Promise.all([
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
      })
    ]);

    return {
      subjects,
      grades,
      regions,
      knowledgePoints,
      categories: Object.values(FileCategory)
    };
  }

  async getById(user: AuthUser, id: string): Promise<FileAssetSummary> {
    const file = await this.findVisible(user, id);
    return this.toSummary(file);
  }

  async upload(user: AuthUser, file: UploadPayload, dto: UploadFileDto) {
    if (!file.originalname.trim() || file.size < 1) {
      throw new BadRequestException('文件名称或内容无效。');
    }

    await this.validateReferences(dto.subjectId, dto.gradeId, dto.regionId, dto.knowledgePointIds);
    const stored = await this.storage.save(user.institutionId, file.originalname, file.buffer);

    try {
      const created = await this.prisma.fileAsset.create({
        data: {
          institution: { connect: { id: user.institutionId } },
          uploadedBy: { connect: { id: user.id } },
          ...(dto.subjectId ? { subject: { connect: { id: dto.subjectId } } } : {}),
          ...(dto.gradeId ? { grade: { connect: { id: dto.gradeId } } } : {}),
          ...(dto.regionId ? { region: { connect: { id: dto.regionId } } } : {}),
          name: file.originalname.trim().slice(0, 255),
          storageKey: stored.storageKey,
          mimeType: file.mimetype || 'application/octet-stream',
          size: BigInt(stored.size),
          category: dto.category,
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
        include: fileInclude
      });

      return this.toSummary(created);
    } catch (error) {
      await this.storage.delete(stored.storageKey);
      throw error;
    }
  }

  async open(user: AuthUser, id: string) {
    const file = await this.findVisible(user, id);
    return {
      metadata: this.toSummary(file),
      stream: await this.storage.open(file.storageKey)
    };
  }

  async remove(user: AuthUser, id: string) {
    const file = await this.prisma.fileAsset.findFirst({
      where: { id, institutionId: user.institutionId },
      select: { id: true, storageKey: true }
    });

    if (!file) {
      throw new NotFoundException('文件不存在或不可删除。');
    }

    await this.prisma.fileAsset.delete({ where: { id } });
    await this.storage.delete(file.storageKey);
    return { deleted: true };
  }

  private async findVisible(user: AuthUser, id: string) {
    const file = await this.prisma.fileAsset.findFirst({
      where: { id, institutionId: user.institutionId },
      include: fileInclude
    });

    if (!file) {
      throw new NotFoundException('文件不存在。');
    }

    return file;
  }

  private async validateReferences(
    subjectId?: string,
    gradeId?: string,
    regionId?: string,
    knowledgePointIds: string[] = []
  ) {
    const [subject, grade, region, knowledgePoints] = await Promise.all([
      subjectId
        ? this.prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } })
        : null,
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

    if ((subjectId && !subject) || (gradeId && !grade) || (regionId && !region)) {
      throw new BadRequestException('学科、年级或区域参数无效。');
    }

    if (
      knowledgePoints.length !== knowledgePointIds.length ||
      (subjectId && knowledgePoints.some((point) => point.subjectId !== subjectId))
    ) {
      throw new BadRequestException('知识点必须存在并属于所选学科。');
    }
  }

  private toSummary(file: FileRecord): FileAssetSummary {
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: Number(file.size),
      category: file.category,
      subject: file.subject,
      grade: file.grade,
      region: file.region,
      knowledgePoints: file.knowledgeLinks.map(({ knowledgePoint }) => knowledgePoint),
      uploadedBy: file.uploadedBy,
      createdAt: file.createdAt.toISOString()
    };
  }
}

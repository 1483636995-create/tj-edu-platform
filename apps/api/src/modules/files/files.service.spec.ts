import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@tj-edu/shared';
import { FileCategory } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { FileStorage } from './file-storage';
import { FilesService } from './files.service';

describe('FilesService', () => {
  const prisma = {
    fileAsset: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn()
    },
    subject: { findMany: jest.fn(), findUnique: jest.fn() },
    grade: { findMany: jest.fn(), findUnique: jest.fn() },
    region: { findMany: jest.fn(), findUnique: jest.fn() },
    knowledgePoint: { findMany: jest.fn() }
  };
  const storage = {
    save: jest.fn(),
    open: jest.fn(),
    delete: jest.fn()
  };
  const user: AuthUser = {
    id: '30000000-0000-4000-8000-000000000001',
    institutionId: '30000000-0000-4000-8000-000000000002',
    institutionName: '示范机构',
    displayName: '平台管理员',
    role: 'admin'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists only current institution files with filters and pagination', async () => {
    prisma.fileAsset.count.mockResolvedValue(0);
    prisma.fileAsset.findMany.mockResolvedValue([]);
    const service = new FilesService(
      prisma as unknown as PrismaService,
      storage as unknown as FileStorage
    );

    const result = await service.list(user, {
      category: FileCategory.PAPER,
      subjectId: '20000000-0000-4000-8000-000000000001',
      page: 2,
      pageSize: 10
    });

    expect(prisma.fileAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          institutionId: user.institutionId,
          category: FileCategory.PAPER,
          subjectId: '20000000-0000-4000-8000-000000000001'
        }),
        skip: 10,
        take: 10
      })
    );
    expect(result).toEqual({ items: [], page: 2, pageSize: 10, total: 0, totalPages: 1 });
  });

  it('rejects a knowledge point that does not belong to selected subject', async () => {
    prisma.subject.findUnique.mockResolvedValue({ id: 'subject-1' });
    prisma.knowledgePoint.findMany.mockResolvedValue([
      { id: 'knowledge-1', subjectId: 'subject-2' }
    ]);
    const service = new FilesService(
      prisma as unknown as PrismaService,
      storage as unknown as FileStorage
    );

    await expect(
      service.upload(
        user,
        {
          originalname: 'paper.pdf',
          mimetype: 'application/pdf',
          size: 4,
          buffer: Buffer.from('test')
        },
        {
          category: FileCategory.PAPER,
          subjectId: 'subject-1',
          knowledgePointIds: ['knowledge-1']
        }
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('does not expose a file from another institution', async () => {
    prisma.fileAsset.findFirst.mockResolvedValue(null);
    const service = new FilesService(
      prisma as unknown as PrismaService,
      storage as unknown as FileStorage
    );

    await expect(
      service.getById(user, '20000000-0000-4000-8000-000000000099')
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

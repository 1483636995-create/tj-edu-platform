import { BadRequestException } from '@nestjs/common';
import type { AuthUser } from '@tj-edu/shared';
import { ContentStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HandoutsService } from './handouts.service';

describe('HandoutsService', () => {
  const prisma = {
    subject: { findMany: jest.fn(), findUnique: jest.fn() },
    grade: { findMany: jest.fn(), findUnique: jest.fn() },
    knowledgePoint: { findMany: jest.fn() },
    question: { findMany: jest.fn() },
    fileAsset: { findMany: jest.fn() },
    handoutDraft: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    }
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

  it('lists handout drafts within the current institution', async () => {
    prisma.handoutDraft.count.mockResolvedValue(0);
    prisma.handoutDraft.findMany.mockResolvedValue([]);
    const service = new HandoutsService(prisma as unknown as PrismaService);

    const result = await service.list(user, { page: 1, pageSize: 10 });

    expect(prisma.handoutDraft.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { institutionId: user.institutionId },
        skip: 0,
        take: 10
      })
    );
    expect(result.total).toBe(0);
  });

  it('rejects duplicate selected materials before writing', async () => {
    const service = new HandoutsService(prisma as unknown as PrismaService);

    await expect(
      service.create(user, {
        title: '二次函数专题讲义',
        subjectId: 'subject-1',
        status: ContentStatus.DRAFT,
        knowledgePointIds: ['kp-1', 'kp-1'],
        questionIds: [],
        fileAssetIds: []
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.handoutDraft.create).not.toHaveBeenCalled();
  });
});

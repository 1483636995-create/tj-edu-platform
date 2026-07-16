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

  it('exports a handout draft as markdown content', async () => {
    prisma.handoutDraft.findFirst.mockResolvedValue({
      id: 'handout-1',
      title: '二次函数专题讲义',
      objective: '掌握二次函数图像与性质。',
      status: ContentStatus.DRAFT,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      subject: { id: 'subject-1', code: 'math', name: '数学' },
      grade: { id: 'grade-1', code: 'junior-3', name: '九年级' },
      createdBy: { id: user.id, displayName: user.displayName },
      knowledgeLinks: [
        {
          sortOrder: 0,
          knowledgePoint: {
            id: 'knowledge-1',
            code: 'quadratic-functions',
            name: '二次函数'
          }
        }
      ],
      questionLinks: [
        {
          sortOrder: 0,
          question: {
            id: 'question-1',
            stem: '二次函数的对称轴是什么？',
            type: 'SHORT_ANSWER',
            difficulty: 3,
            subject: { id: 'subject-1', code: 'math', name: '数学' },
            grade: { id: 'grade-1', code: 'junior-3', name: '九年级' },
            knowledgeLinks: [
              {
                knowledgePoint: {
                  id: 'knowledge-1',
                  code: 'quadratic-functions',
                  name: '二次函数'
                }
              }
            ]
          }
        }
      ],
      fileLinks: [
        {
          sortOrder: 0,
          fileAsset: {
            id: 'file-1',
            name: '二次函数课堂素材.pdf',
            category: 'HANDOUT',
            mimeType: 'application/pdf',
            size: 2048,
            subject: { id: 'subject-1', code: 'math', name: '数学' },
            grade: { id: 'grade-1', code: 'junior-3', name: '九年级' },
            knowledgeLinks: [
              {
                knowledgePoint: {
                  id: 'knowledge-1',
                  code: 'quadratic-functions',
                  name: '二次函数'
                }
              }
            ]
          }
        }
      ]
    });
    const service = new HandoutsService(prisma as unknown as PrismaService);

    const exported = await service.exportMarkdown(user, 'handout-1');

    expect(exported).toEqual(
      expect.objectContaining({
        filename: '二次函数专题讲义.md',
        mimeType: 'text/markdown; charset=utf-8'
      })
    );
    expect(exported.content).toContain('# 二次函数专题讲义');
    expect(exported.content).toContain('掌握二次函数图像与性质。');
    expect(exported.content).toContain('二次函数的对称轴是什么？');
    expect(exported.content).toContain('二次函数课堂素材.pdf');
  });
});

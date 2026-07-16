import { BadRequestException } from '@nestjs/common';
import type { AuthUser } from '@tj-edu/shared';
import { ContentStatus, PaperType, QuestionType } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PapersService } from './papers.service';

describe('PapersService', () => {
  const prisma = {
    paper: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    subject: { findMany: jest.fn(), findUnique: jest.fn() },
    grade: { findMany: jest.fn(), findUnique: jest.fn() },
    region: { findMany: jest.fn(), findUnique: jest.fn() },
    knowledgePoint: { findMany: jest.fn() },
    question: { findMany: jest.fn() }
  };
  const user: AuthUser = {
    id: '30000000-0000-4000-8000-000000000001',
    institutionId: '30000000-0000-4000-8000-000000000002',
    institutionName: '示范机构',
    displayName: '平台管理员',
    role: 'admin'
  };

  const question = {
    id: '20000000-0000-4000-8000-000000000001',
    stem: '二次函数的对称轴是什么？',
    type: QuestionType.SHORT_ANSWER,
    status: ContentStatus.PUBLISHED,
    difficulty: 3,
    source: '天津模拟卷',
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    subject: { id: 'subject-1', code: 'math', name: '数学' },
    grade: { id: 'grade-1', code: 'junior-3', name: '九年级' },
    region: { id: 'region-1', code: '120101', name: '和平区' },
    knowledgeLinks: [
      {
        knowledgePoint: {
          id: 'knowledge-1',
          code: 'quadratic-functions',
          name: '二次函数'
        }
      }
    ],
    paperLinks: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns institution-scoped paper drafts with question counts and total score', async () => {
    prisma.paper.count.mockResolvedValue(1);
    prisma.paper.findMany.mockResolvedValue([
      {
        id: '10000000-0000-4000-8000-000000000101',
        title: '二次函数知识点组题草稿',
        year: 2026,
        type: PaperType.PRACTICE,
        status: ContentStatus.DRAFT,
        updatedAt: new Date('2026-01-03T00:00:00.000Z'),
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        subject: { id: 'subject-1', code: 'math', name: '数学' },
        grade: { id: 'grade-1', code: 'junior-3', name: '九年级' },
        region: { id: 'region-1', code: '120101', name: '和平区' },
        createdBy: { id: user.id, displayName: user.displayName },
        questionLinks: [{ sortOrder: 0, score: 10, question }]
      }
    ]);
    const service = new PapersService(prisma as unknown as PrismaService);

    const result = await service.list(user, {
      subjectId: 'subject-1',
      type: PaperType.PRACTICE,
      page: 1,
      pageSize: 8
    });

    expect(prisma.paper.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ institutionId: null }, { institutionId: user.institutionId }],
          subjectId: 'subject-1',
          type: PaperType.PRACTICE
        }),
        take: 8
      })
    );
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        title: '二次函数知识点组题草稿',
        questionCount: 1,
        totalScore: 10
      })
    );
  });

  it('rejects duplicate questions when creating a paper draft', async () => {
    const service = new PapersService(prisma as unknown as PrismaService);

    await expect(
      service.create(user, {
        title: '重复题目草稿',
        subjectId: 'subject-1',
        gradeId: 'grade-1',
        type: PaperType.PRACTICE,
        status: ContentStatus.DRAFT,
        questionIds: [
          '20000000-0000-4000-8000-000000000001',
          '20000000-0000-4000-8000-000000000001'
        ]
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.paper.create).not.toHaveBeenCalled();
  });
});

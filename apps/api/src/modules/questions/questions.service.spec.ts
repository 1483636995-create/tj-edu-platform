import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@tj-edu/shared';
import { ContentStatus, PaperType, QuestionType } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { QuestionsService } from './questions.service';

describe('QuestionsService', () => {
  const prisma = {
    question: {
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
    paper: { findMany: jest.fn() }
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

  it('returns institution-scoped questions with paper filters and pagination', async () => {
    prisma.question.count.mockResolvedValue(1);
    prisma.question.findMany.mockResolvedValue([
      {
        id: '20000000-0000-4000-8000-000000000001',
        institutionId: user.institutionId,
        subjectId: 'subject-1',
        gradeId: 'grade-1',
        regionId: 'region-1',
        createdById: user.id,
        type: QuestionType.SINGLE_CHOICE,
        status: ContentStatus.PUBLISHED,
        stem: '二次函数的对称轴是？',
        answer: { value: 'x = 2' },
        analysis: '配方法。',
        difficulty: 3,
        source: '2025 天津中考数学模拟卷',
        createdAt: new Date('2025-01-02T00:00:00.000Z'),
        updatedAt: new Date('2025-01-02T00:00:00.000Z'),
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
        paperLinks: [
          {
            paper: {
              id: 'paper-1',
              title: '2025 天津中考数学模拟卷',
              year: 2025,
              type: PaperType.EXAM
            }
          }
        ],
        createdBy: { id: user.id, displayName: user.displayName }
      }
    ]);
    const service = new QuestionsService(prisma as unknown as PrismaService);

    const result = await service.list(user, {
      subjectId: 'subject-1',
      year: 2025,
      paperType: PaperType.EXAM,
      page: 2,
      pageSize: 10
    });

    expect(prisma.question.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ institutionId: null }, { institutionId: user.institutionId }],
          subjectId: 'subject-1',
          paperLinks: { some: { paper: { year: 2025, type: PaperType.EXAM } } }
        }),
        skip: 10,
        take: 10
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        page: 2,
        pageSize: 10,
        total: 1,
        totalPages: 1,
        items: [
          expect.objectContaining({
            id: '20000000-0000-4000-8000-000000000001',
            subject: { id: 'subject-1', code: 'math', name: '数学' },
            difficulty: 3
          })
        ]
      })
    );
  });

  it('throws when a question is outside the visible institution scope', async () => {
    prisma.question.findFirst.mockResolvedValue(null);
    const service = new QuestionsService(prisma as unknown as PrismaService);

    await expect(
      service.getById(user, '20000000-0000-4000-8000-000000000099')
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects knowledge points from another subject when creating a question', async () => {
    prisma.subject.findUnique.mockResolvedValue({ id: 'subject-1' });
    prisma.knowledgePoint.findMany.mockResolvedValue([
      { id: 'knowledge-1', subjectId: 'subject-2' }
    ]);
    const service = new QuestionsService(prisma as unknown as PrismaService);

    await expect(
      service.create(user, {
        subjectId: 'subject-1',
        type: QuestionType.SHORT_ANSWER,
        stem: '测试题目',
        knowledgePointIds: ['knowledge-1']
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.question.create).not.toHaveBeenCalled();
  });
});

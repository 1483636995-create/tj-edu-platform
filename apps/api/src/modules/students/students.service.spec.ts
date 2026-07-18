import { NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@tj-edu/shared';
import { MasteryStatus, QuestionType } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StudentsService } from './students.service';

describe('StudentsService', () => {
  const prisma = {
    grade: { findMany: jest.fn() },
    region: { findMany: jest.fn() },
    student: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn()
    },
    studentProfile: { upsert: jest.fn() },
    teacher: { findFirst: jest.fn() },
    mistake: {
      findFirst: jest.fn(),
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

  it('lists students within the current institution', async () => {
    prisma.student.count.mockResolvedValue(0);
    prisma.student.findMany.mockResolvedValue([]);
    const service = new StudentsService(prisma as unknown as PrismaService);

    const result = await service.list(user, { page: 1, pageSize: 10 });

    expect(prisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { institutionId: user.institutionId },
        skip: 0,
        take: 10
      })
    );
    expect(result.total).toBe(0);
  });

  it('restricts a student account to its own profile', async () => {
    const studentUser: AuthUser = { ...user, role: 'student' };
    prisma.student.findFirst.mockResolvedValue(null);
    const service = new StudentsService(prisma as unknown as PrismaService);

    await expect(service.getById(studentUser, 'student-1')).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(prisma.student.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'student-1', userId: studentUser.id }
      })
    );
  });

  it('updates a mistake status and sets resolved time when mastered', async () => {
    prisma.student.findFirst.mockResolvedValue({ id: 'student-1' });
    prisma.mistake.findFirst.mockResolvedValue({ id: 'mistake-1', resolvedAt: null });
    prisma.mistake.update.mockResolvedValue({
      id: 'mistake-1',
      status: MasteryStatus.MASTERED,
      wrongAnswer: { choice: 'A' },
      notes: '已订正',
      occurredAt: new Date('2026-07-01T10:00:00.000Z'),
      resolvedAt: new Date('2026-07-02T10:00:00.000Z'),
      question: {
        id: 'question-1',
        stem: '示例题干',
        type: QuestionType.SINGLE_CHOICE,
        subject: { id: 'subject-1', code: 'math', name: '数学' },
        grade: null,
        knowledgeLinks: []
      },
      lesson: null
    });
    const service = new StudentsService(prisma as unknown as PrismaService);

    const result = await service.updateMistake(user, 'student-1', 'mistake-1', {
      status: MasteryStatus.MASTERED,
      notes: '已订正'
    });

    expect(prisma.mistake.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'mistake-1' },
        data: expect.objectContaining({
          status: MasteryStatus.MASTERED,
          notes: '已订正',
          resolvedAt: expect.any(Date)
        })
      })
    );
    expect(result.status).toBe(MasteryStatus.MASTERED);
  });

  it('builds follow-up insight from open mistakes and lessons', async () => {
    prisma.student.findFirst.mockResolvedValue({
      id: 'student-1',
      studentNo: 'S001',
      schoolName: '天津示范中学',
      user: { displayName: '张同学' },
      grade: { id: 'grade-1', code: 'junior-3', name: '九年级' },
      region: { id: 'region-1', code: '120101', name: '和平区' },
      profile: {
        summary: '基础稳定',
        goals: null,
        notes: '需要关注函数压轴题',
        updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedBy: null
      },
      mistakes: [
        {
          id: 'mistake-1',
          status: MasteryStatus.NEW,
          wrongAnswer: null,
          notes: null,
          occurredAt: new Date('2026-07-10T10:00:00.000Z'),
          resolvedAt: null,
          question: {
            id: 'question-1',
            stem: '二次函数图像问题',
            type: QuestionType.SINGLE_CHOICE,
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
          },
          lesson: null
        },
        {
          id: 'mistake-2',
          status: MasteryStatus.REVIEWING,
          wrongAnswer: null,
          notes: null,
          occurredAt: new Date('2026-07-09T10:00:00.000Z'),
          resolvedAt: null,
          question: {
            id: 'question-2',
            stem: '二次函数对称轴问题',
            type: QuestionType.SHORT_ANSWER,
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
          },
          lesson: null
        }
      ],
      lessonEnrollments: [
        {
          lesson: {
            id: 'lesson-1',
            title: '二次函数专题课',
            type: 'ONE_ON_ONE',
            status: 'COMPLETED',
            classroom: 'A101',
            startsAt: new Date('2026-07-08T10:00:00.000Z'),
            endsAt: new Date('2026-07-08T12:00:00.000Z'),
            teacher: {
              id: 'teacher-1',
              employeeNo: 'T001',
              user: { displayName: '李老师' }
            },
            subject: { id: 'subject-1', code: 'math', name: '数学' }
          }
        }
      ],
      _count: { mistakes: 2 }
    });
    const service = new StudentsService(prisma as unknown as PrismaService);

    const result = await service.getById(user, 'student-1');

    expect(result.followUp).toEqual(
      expect.objectContaining({
        riskLevel: 'MEDIUM',
        openMistakeCount: 2,
        recentLessonCount: 1,
        completedLessonCount: 1
      })
    );
    expect(result.followUp.focusKnowledgePoints[0]).toEqual(
      expect.objectContaining({ name: '二次函数', openMistakeCount: 2 })
    );
    expect(result.followUp.suggestedActions).toContain('安排一次 二次函数 专项复盘');
    expect(result.followUp.nextReviewAt).toBe('2026-07-13T10:00:00.000Z');
  });
});

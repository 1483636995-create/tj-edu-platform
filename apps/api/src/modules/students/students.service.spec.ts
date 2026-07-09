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
});

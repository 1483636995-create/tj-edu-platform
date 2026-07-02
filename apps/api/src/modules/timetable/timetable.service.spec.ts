import { BadRequestException, ConflictException } from '@nestjs/common';
import type { AuthUser } from '@tj-edu/shared';
import { LessonStatus, LessonType } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TimetableService } from './timetable.service';

describe('TimetableService', () => {
  const prisma = {
    timetable: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    teacher: { findMany: jest.fn(), findFirst: jest.fn() },
    student: { findMany: jest.fn() },
    subject: { findMany: jest.fn(), findUnique: jest.fn() },
    grade: { findMany: jest.fn(), findUnique: jest.fn() },
    lesson: {
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

  it('lists lessons in the current institution and requested time range', async () => {
    prisma.lesson.findMany.mockResolvedValue([]);
    const service = new TimetableService(prisma as unknown as PrismaService);

    const result = await service.list(user, {
      start: '2026-06-29T00:00:00.000Z',
      end: '2026-07-06T00:00:00.000Z',
      teacherId: '31000000-0000-4000-8000-000000000101'
    });

    expect(prisma.lesson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          timetable: { institutionId: user.institutionId },
          teacherId: '31000000-0000-4000-8000-000000000101',
          startsAt: { lt: new Date('2026-07-06T00:00:00.000Z') },
          endsAt: { gt: new Date('2026-06-29T00:00:00.000Z') }
        })
      })
    );
    expect(result.total).toBe(0);
  });

  it('requires exactly one student for a one-on-one lesson', async () => {
    const service = new TimetableService(prisma as unknown as PrismaService);

    await expect(
      service.create(user, {
        timetableId: '40000000-0000-4000-8000-000000000001',
        teacherId: '31000000-0000-4000-8000-000000000101',
        subjectId: '33000000-0000-4000-8000-000000000101',
        title: '数学一对一',
        type: LessonType.ONE_ON_ONE,
        startsAt: '2026-07-03T10:00:00.000Z',
        endsAt: '2026-07-03T11:00:00.000Z',
        status: LessonStatus.SCHEDULED,
        studentIds: []
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.timetable.findFirst).not.toHaveBeenCalled();
  });

  it('reports a teacher overlap before creating a lesson', async () => {
    prisma.timetable.findFirst.mockResolvedValue({
      id: '40000000-0000-4000-8000-000000000001',
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      endDate: new Date('2026-08-31T00:00:00.000Z')
    });
    prisma.teacher.findFirst.mockResolvedValue({
      id: '31000000-0000-4000-8000-000000000101'
    });
    prisma.subject.findUnique.mockResolvedValue({ id: 'subject-1' });
    prisma.student.findMany.mockResolvedValue([{ id: 'student-1' }]);
    prisma.lesson.findMany.mockResolvedValue([
      {
        id: 'lesson-existing',
        timetableId: '40000000-0000-4000-8000-000000000001',
        teacherId: '31000000-0000-4000-8000-000000000101',
        subjectId: 'subject-1',
        gradeId: null,
        title: '已有课程',
        type: LessonType.GROUP,
        classroom: 'A301',
        startsAt: new Date('2026-07-03T10:00:00.000Z'),
        endsAt: new Date('2026-07-03T11:30:00.000Z'),
        status: LessonStatus.SCHEDULED,
        createdAt: new Date(),
        updatedAt: new Date(),
        teacher: {
          id: '31000000-0000-4000-8000-000000000101',
          employeeNo: 'T1001',
          user: { displayName: '王老师' }
        },
        subject: { id: 'subject-1', code: 'math', name: '数学' },
        grade: null,
        students: []
      }
    ]);
    const service = new TimetableService(prisma as unknown as PrismaService);

    await expect(
      service.create(user, {
        timetableId: '40000000-0000-4000-8000-000000000001',
        teacherId: '31000000-0000-4000-8000-000000000101',
        subjectId: 'subject-1',
        title: '冲突课程',
        type: LessonType.GROUP,
        startsAt: '2026-07-03T10:30:00.000Z',
        endsAt: '2026-07-03T12:00:00.000Z',
        status: LessonStatus.SCHEDULED,
        studentIds: ['student-1']
      })
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.lesson.create).not.toHaveBeenCalled();
  });
});

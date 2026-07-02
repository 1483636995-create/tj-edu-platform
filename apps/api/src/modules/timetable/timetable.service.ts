import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import type {
  AuthUser,
  LessonListResponse,
  LessonSummary,
  ScheduleConflict,
  TimetableFilterOptions,
  TimetableSummary
} from '@tj-edu/shared';
import { LessonStatus, LessonType, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { CreateLessonDto } from './dto/create-lesson.dto';
import type { CreateTimetableDto } from './dto/create-timetable.dto';
import type { ListLessonsDto } from './dto/list-lessons.dto';
import type { UpdateLessonDto } from './dto/update-lesson.dto';

const lessonInclude = {
  teacher: {
    select: {
      id: true,
      employeeNo: true,
      user: { select: { displayName: true } }
    }
  },
  subject: { select: { id: true, code: true, name: true } },
  grade: { select: { id: true, code: true, name: true } },
  students: {
    orderBy: { student: { user: { displayName: 'asc' as const } } },
    select: {
      student: {
        select: {
          id: true,
          studentNo: true,
          user: { select: { displayName: true } }
        }
      }
    }
  }
} satisfies Prisma.LessonInclude;

type LessonRecord = Prisma.LessonGetPayload<{ include: typeof lessonInclude }>;

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  async getFilterOptions(user: AuthUser): Promise<TimetableFilterOptions> {
    const [timetables, teachers, students, subjects, grades] = await Promise.all([
      this.prisma.timetable.findMany({
        where: { institutionId: user.institutionId },
        orderBy: { startDate: 'desc' }
      }),
      this.prisma.teacher.findMany({
        where: { institutionId: user.institutionId, user: { active: true } },
        select: {
          id: true,
          employeeNo: true,
          user: { select: { displayName: true } }
        },
        orderBy: { user: { displayName: 'asc' } }
      }),
      this.prisma.student.findMany({
        where: { institutionId: user.institutionId, user: { active: true } },
        select: {
          id: true,
          studentNo: true,
          gradeId: true,
          user: { select: { displayName: true } }
        },
        orderBy: { user: { displayName: 'asc' } }
      }),
      this.prisma.subject.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' }
      }),
      this.prisma.grade.findMany({
        select: { id: true, code: true, name: true },
        orderBy: [{ stage: 'asc' }, { level: 'asc' }]
      })
    ]);

    return {
      timetables: timetables.map((item) => this.toTimetableSummary(item)),
      teachers: teachers.map((teacher) => ({
        id: teacher.id,
        displayName: teacher.user.displayName,
        code: teacher.employeeNo
      })),
      students: students.map((student) => ({
        id: student.id,
        displayName: student.user.displayName,
        code: student.studentNo,
        gradeId: student.gradeId
      })),
      subjects,
      grades,
      statuses: Object.values(LessonStatus),
      types: Object.values(LessonType)
    };
  }

  async list(user: AuthUser, query: ListLessonsDto): Promise<LessonListResponse> {
    const range = this.resolveRange(query.start, query.end);
    const where: Prisma.LessonWhereInput = {
      timetable: { institutionId: user.institutionId },
      startsAt: { lt: range.end },
      endsAt: { gt: range.start },
      ...(query.timetableId ? { timetableId: query.timetableId } : {}),
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.studentId ? { students: { some: { studentId: query.studentId } } } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.classroom?.trim()
        ? { classroom: { contains: query.classroom.trim(), mode: 'insensitive' } }
        : {})
    };
    const lessons = await this.prisma.lesson.findMany({
      where,
      include: lessonInclude,
      orderBy: [{ startsAt: 'asc' }, { title: 'asc' }]
    });

    return {
      items: lessons.map((lesson) => this.toSummary(lesson)),
      total: lessons.length,
      rangeStart: range.start.toISOString(),
      rangeEnd: range.end.toISOString()
    };
  }

  async getById(user: AuthUser, id: string): Promise<LessonSummary> {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id, timetable: { institutionId: user.institutionId } },
      include: lessonInclude
    });

    if (!lesson) {
      throw new NotFoundException('课节不存在。');
    }

    return this.toSummary(lesson);
  }

  async createTimetable(user: AuthUser, dto: CreateTimetableDto): Promise<TimetableSummary> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate > endDate) {
      throw new BadRequestException('课表开始日期不能晚于结束日期。');
    }

    const timetable = await this.prisma.timetable.create({
      data: {
        institution: { connect: { id: user.institutionId } },
        name: dto.name.trim(),
        startDate,
        endDate
      }
    });

    return this.toTimetableSummary(timetable);
  }

  async create(user: AuthUser, dto: CreateLessonDto): Promise<LessonSummary> {
    const input = {
      timetableId: dto.timetableId,
      teacherId: dto.teacherId,
      subjectId: dto.subjectId,
      gradeId: dto.gradeId,
      title: dto.title.trim(),
      type: dto.type,
      classroom: dto.classroom?.trim() || null,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      status: dto.status,
      studentIds: dto.studentIds
    };

    await this.validateInput(user, input);
    await this.assertNoConflicts(user, input);

    const lesson = await this.prisma.lesson.create({
      data: {
        timetable: { connect: { id: input.timetableId } },
        teacher: { connect: { id: input.teacherId } },
        subject: { connect: { id: input.subjectId } },
        ...(input.gradeId ? { grade: { connect: { id: input.gradeId } } } : {}),
        title: input.title,
        type: input.type,
        classroom: input.classroom,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        status: input.status,
        students: {
          create: input.studentIds.map((studentId) => ({
            student: { connect: { id: studentId } }
          }))
        }
      },
      include: lessonInclude
    });

    return this.toSummary(lesson);
  }

  async update(user: AuthUser, id: string, dto: UpdateLessonDto): Promise<LessonSummary> {
    const existing = await this.prisma.lesson.findFirst({
      where: { id, timetable: { institutionId: user.institutionId } },
      select: {
        id: true,
        timetableId: true,
        teacherId: true,
        subjectId: true,
        gradeId: true,
        title: true,
        type: true,
        classroom: true,
        startsAt: true,
        endsAt: true,
        status: true,
        students: { select: { studentId: true } }
      }
    });

    if (!existing) {
      throw new NotFoundException('课节不存在。');
    }

    const input = {
      timetableId: dto.timetableId ?? existing.timetableId,
      teacherId: dto.teacherId ?? existing.teacherId,
      subjectId: dto.subjectId ?? existing.subjectId,
      gradeId: dto.gradeId ?? existing.gradeId ?? undefined,
      title: dto.title?.trim() ?? existing.title,
      type: dto.type ?? existing.type,
      classroom: dto.classroom === undefined ? existing.classroom : dto.classroom.trim() || null,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : existing.startsAt,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : existing.endsAt,
      status: dto.status ?? existing.status,
      studentIds: dto.studentIds ?? existing.students.map(({ studentId }) => studentId)
    };

    await this.validateInput(user, input);
    await this.assertNoConflicts(user, input, id);

    const lesson = await this.prisma.lesson.update({
      where: { id },
      data: {
        timetable: { connect: { id: input.timetableId } },
        teacher: { connect: { id: input.teacherId } },
        subject: { connect: { id: input.subjectId } },
        ...(input.gradeId ? { grade: { connect: { id: input.gradeId } } } : {}),
        title: input.title,
        type: input.type,
        classroom: input.classroom,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        status: input.status,
        ...(dto.studentIds
          ? {
              students: {
                deleteMany: {},
                create: input.studentIds.map((studentId) => ({
                  student: { connect: { id: studentId } }
                }))
              }
            }
          : {})
      },
      include: lessonInclude
    });

    return this.toSummary(lesson);
  }

  private resolveRange(start?: string, end?: string) {
    const now = new Date();
    const day = now.getDay() || 7;
    const defaultStart = new Date(now);
    defaultStart.setDate(now.getDate() - day + 1);
    defaultStart.setHours(0, 0, 0, 0);
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setDate(defaultStart.getDate() + 7);

    const rangeStart = start ? new Date(start) : defaultStart;
    const rangeEnd = end ? new Date(end) : defaultEnd;
    if (rangeStart >= rangeEnd) {
      throw new BadRequestException('查询结束时间必须晚于开始时间。');
    }

    return { start: rangeStart, end: rangeEnd };
  }

  private async validateInput(
    user: AuthUser,
    input: {
      timetableId: string;
      teacherId: string;
      subjectId: string;
      gradeId?: string;
      type: LessonType;
      startsAt: Date;
      endsAt: Date;
      studentIds: string[];
    }
  ) {
    if (input.startsAt >= input.endsAt) {
      throw new BadRequestException('课节结束时间必须晚于开始时间。');
    }

    if (input.type === LessonType.ONE_ON_ONE && input.studentIds.length !== 1) {
      throw new BadRequestException('一对一课节必须且只能选择一名学生。');
    }

    if (input.type === LessonType.GROUP && input.studentIds.length < 1) {
      throw new BadRequestException('班课至少需要选择一名学生。');
    }

    const [timetable, teacher, subject, grade, students] = await Promise.all([
      this.prisma.timetable.findFirst({
        where: { id: input.timetableId, institutionId: user.institutionId },
        select: { id: true, startDate: true, endDate: true }
      }),
      this.prisma.teacher.findFirst({
        where: { id: input.teacherId, institutionId: user.institutionId },
        select: { id: true }
      }),
      this.prisma.subject.findUnique({ where: { id: input.subjectId }, select: { id: true } }),
      input.gradeId
        ? this.prisma.grade.findUnique({ where: { id: input.gradeId }, select: { id: true } })
        : null,
      this.prisma.student.findMany({
        where: { id: { in: input.studentIds }, institutionId: user.institutionId },
        select: { id: true }
      })
    ]);

    if (!timetable || !teacher || !subject || (input.gradeId && !grade)) {
      throw new BadRequestException('课表、教师、学科或年级参数无效。');
    }

    if (students.length !== input.studentIds.length) {
      throw new BadRequestException('学生不存在或不属于当前机构。');
    }

    const timetableEnd = new Date(timetable.endDate);
    timetableEnd.setUTCDate(timetableEnd.getUTCDate() + 1);
    if (input.startsAt < timetable.startDate || input.endsAt > timetableEnd) {
      throw new BadRequestException('课节时间必须位于所选课表周期内。');
    }
  }

  private async assertNoConflicts(
    user: AuthUser,
    input: {
      teacherId: string;
      classroom: string | null;
      startsAt: Date;
      endsAt: Date;
      status: LessonStatus;
      studentIds: string[];
    },
    excludeLessonId?: string
  ) {
    if (input.status === LessonStatus.CANCELLED) {
      return;
    }

    const alternatives: Prisma.LessonWhereInput[] = [{ teacherId: input.teacherId }];
    if (input.classroom) {
      alternatives.push({ classroom: { equals: input.classroom, mode: 'insensitive' } });
    }
    if (input.studentIds.length) {
      alternatives.push({ students: { some: { studentId: { in: input.studentIds } } } });
    }

    const overlapping = await this.prisma.lesson.findMany({
      where: {
        ...(excludeLessonId ? { id: { not: excludeLessonId } } : {}),
        timetable: { institutionId: user.institutionId },
        status: { not: LessonStatus.CANCELLED },
        startsAt: { lt: input.endsAt },
        endsAt: { gt: input.startsAt },
        OR: alternatives
      },
      include: lessonInclude
    });
    const conflicts: ScheduleConflict[] = [];

    for (const lesson of overlapping) {
      const base = {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        startsAt: lesson.startsAt.toISOString(),
        endsAt: lesson.endsAt.toISOString()
      };

      if (lesson.teacherId === input.teacherId) {
        conflicts.push({ type: 'TEACHER', label: lesson.teacher.user.displayName, ...base });
      }
      if (
        input.classroom &&
        lesson.classroom?.localeCompare(input.classroom, undefined, { sensitivity: 'accent' }) === 0
      ) {
        conflicts.push({ type: 'CLASSROOM', label: input.classroom, ...base });
      }

      for (const enrollment of lesson.students) {
        if (input.studentIds.includes(enrollment.student.id)) {
          conflicts.push({
            type: 'STUDENT',
            label: enrollment.student.user.displayName,
            ...base
          });
        }
      }
    }

    if (conflicts.length) {
      throw new ConflictException({ message: '课节时间存在冲突。', conflicts });
    }
  }

  private toSummary(lesson: LessonRecord): LessonSummary {
    return {
      id: lesson.id,
      timetableId: lesson.timetableId,
      title: lesson.title,
      type: lesson.type,
      classroom: lesson.classroom,
      startsAt: lesson.startsAt.toISOString(),
      endsAt: lesson.endsAt.toISOString(),
      status: lesson.status,
      teacher: {
        id: lesson.teacher.id,
        displayName: lesson.teacher.user.displayName,
        code: lesson.teacher.employeeNo
      },
      subject: lesson.subject,
      grade: lesson.grade,
      students: lesson.students.map(({ student }) => ({
        id: student.id,
        displayName: student.user.displayName,
        code: student.studentNo
      }))
    };
  }

  private toTimetableSummary(timetable: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  }): TimetableSummary {
    return {
      id: timetable.id,
      name: timetable.name,
      startDate: timetable.startDate.toISOString(),
      endDate: timetable.endDate.toISOString()
    };
  }
}

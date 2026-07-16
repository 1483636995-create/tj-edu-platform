import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AuthUser,
  StudentDetail,
  StudentFilterOptions,
  StudentListResponse,
  StudentLessonRecord,
  StudentMistakeSummary,
  StudentProfileSummary,
  StudentSummary
} from '@tj-edu/shared';
import { MasteryStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { ListStudentsDto } from './dto/list-students.dto';
import type { UpdateMistakeDto } from './dto/update-mistake.dto';
import type { UpdateStudentProfileDto } from './dto/update-student-profile.dto';

const studentSummaryInclude = {
  user: { select: { displayName: true } },
  grade: { select: { id: true, code: true, name: true } },
  region: { select: { id: true, code: true, name: true } },
  profile: { select: { summary: true } },
  mistakes: {
    where: { status: { not: MasteryStatus.MASTERED } },
    select: { id: true }
  },
  lessonEnrollments: {
    orderBy: { lesson: { startsAt: 'desc' as const } },
    take: 1,
    select: { lesson: { select: { startsAt: true } } }
  },
  _count: { select: { mistakes: true } }
} satisfies Prisma.StudentInclude;

const studentDetailInclude = {
  user: { select: { displayName: true } },
  grade: { select: { id: true, code: true, name: true } },
  region: { select: { id: true, code: true, name: true } },
  profile: {
    select: {
      summary: true,
      goals: true,
      notes: true,
      updatedAt: true,
      updatedBy: { select: { id: true, user: { select: { displayName: true } } } }
    }
  },
  mistakes: {
    orderBy: { occurredAt: 'desc' as const },
    take: 50,
    include: {
      question: {
        select: {
          id: true,
          stem: true,
          type: true,
          subject: { select: { id: true, code: true, name: true } },
          grade: { select: { id: true, code: true, name: true } },
          knowledgeLinks: {
            orderBy: { knowledgePoint: { sortOrder: 'asc' as const } },
            select: {
              knowledgePoint: { select: { id: true, code: true, name: true } }
            }
          }
        }
      },
      lesson: { select: { id: true, title: true, startsAt: true } }
    }
  },
  lessonEnrollments: {
    orderBy: { lesson: { startsAt: 'desc' as const } },
    take: 12,
    select: {
      lesson: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          classroom: true,
          startsAt: true,
          endsAt: true,
          teacher: {
            select: {
              id: true,
              employeeNo: true,
              user: { select: { displayName: true } }
            }
          },
          subject: { select: { id: true, code: true, name: true } }
        }
      }
    }
  },
  _count: { select: { mistakes: true } }
} satisfies Prisma.StudentInclude;

const mistakeInclude = studentDetailInclude.mistakes.include;

type StudentSummaryRecord = Prisma.StudentGetPayload<{ include: typeof studentSummaryInclude }>;
type StudentDetailRecord = Prisma.StudentGetPayload<{ include: typeof studentDetailInclude }>;
type MistakeRecord = Prisma.MistakeGetPayload<{ include: typeof mistakeInclude }>;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFilterOptions(): Promise<StudentFilterOptions> {
    const [grades, regions] = await Promise.all([
      this.prisma.grade.findMany({
        select: { id: true, code: true, name: true },
        orderBy: [{ stage: 'asc' }, { level: 'asc' }]
      }),
      this.prisma.region.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' }
      })
    ]);

    return {
      grades,
      regions,
      masteryStatuses: Object.values(MasteryStatus)
    };
  }

  async list(user: AuthUser, query: ListStudentsDto): Promise<StudentListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildStudentWhere(user, query);
    const [total, students] = await Promise.all([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        include: studentSummaryInclude,
        orderBy: { user: { displayName: 'asc' } },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    return {
      items: students.map((student) => this.toSummary(student)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  }

  async getById(user: AuthUser, id: string): Promise<StudentDetail> {
    const student = await this.findAccessibleStudent(user, id);
    return this.toDetail(student);
  }

  async updateProfile(
    user: AuthUser,
    studentId: string,
    dto: UpdateStudentProfileDto
  ): Promise<StudentDetail> {
    if (user.role === 'student') {
      throw new ForbiddenException('学生账号暂不能编辑档案备注。');
    }

    await this.ensureStudentInScope(user, studentId);
    const updatedBy = await this.prisma.teacher.findFirst({
      where: { userId: user.id, institutionId: user.institutionId },
      select: { id: true }
    });

    await this.prisma.studentProfile.upsert({
      where: { studentId },
      update: {
        summary: this.cleanText(dto.summary),
        goals: this.cleanText(dto.goals),
        notes: this.cleanText(dto.notes),
        updatedById: updatedBy?.id ?? null
      },
      create: {
        studentId,
        summary: this.cleanText(dto.summary),
        goals: this.cleanText(dto.goals),
        notes: this.cleanText(dto.notes),
        updatedById: updatedBy?.id ?? null
      }
    });

    return this.getById(user, studentId);
  }

  async updateMistake(
    user: AuthUser,
    studentId: string,
    mistakeId: string,
    dto: UpdateMistakeDto
  ): Promise<StudentMistakeSummary> {
    await this.ensureStudentInScope(user, studentId);
    const existing = await this.prisma.mistake.findFirst({
      where: { id: mistakeId, studentId },
      select: { id: true, resolvedAt: true }
    });

    if (!existing) {
      throw new NotFoundException('错题记录不存在。');
    }

    const status = dto.status;
    const mistake = await this.prisma.mistake.update({
      where: { id: mistakeId },
      data: {
        ...(status ? { status } : {}),
        ...(status
          ? {
              resolvedAt:
                status === MasteryStatus.MASTERED ? existing.resolvedAt ?? new Date() : null
            }
          : {}),
        ...(dto.notes !== undefined ? { notes: this.cleanText(dto.notes) } : {})
      },
      include: mistakeInclude
    });

    return this.toMistakeSummary(mistake);
  }

  private buildStudentWhere(user: AuthUser, query: ListStudentsDto): Prisma.StudentWhereInput {
    const search = query.search?.trim();

    return {
      ...(user.role === 'student' ? { userId: user.id } : { institutionId: user.institutionId }),
      ...(query.gradeId ? { gradeId: query.gradeId } : {}),
      ...(query.regionId ? { regionId: query.regionId } : {}),
      ...(search
        ? {
            OR: [
              { user: { displayName: { contains: search, mode: 'insensitive' } } },
              { studentNo: { contains: search, mode: 'insensitive' } },
              { schoolName: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
  }

  private async findAccessibleStudent(user: AuthUser, id: string): Promise<StudentDetailRecord> {
    const student = await this.prisma.student.findFirst({
      where: {
        id,
        ...(user.role === 'student' ? { userId: user.id } : { institutionId: user.institutionId })
      },
      include: studentDetailInclude
    });

    if (!student) {
      throw new NotFoundException('学生不存在或无权访问。');
    }

    return student;
  }

  private async ensureStudentInScope(user: AuthUser, id: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id,
        ...(user.role === 'student' ? { userId: user.id } : { institutionId: user.institutionId })
      },
      select: { id: true }
    });

    if (!student) {
      throw new NotFoundException('学生不存在或无权访问。');
    }
  }

  private cleanText(value?: string) {
    if (value === undefined) {
      return undefined;
    }

    return value.trim() || null;
  }

  private toSummary(student: StudentSummaryRecord): StudentSummary {
    return {
      id: student.id,
      displayName: student.user.displayName,
      studentNo: student.studentNo,
      schoolName: student.schoolName,
      grade: student.grade,
      region: student.region,
      profileSummary: student.profile?.summary ?? null,
      mistakeCount: student._count.mistakes,
      openMistakeCount: student.mistakes.length,
      lastLessonAt: student.lessonEnrollments[0]?.lesson.startsAt.toISOString() ?? null
    };
  }

  private toDetail(student: StudentDetailRecord): StudentDetail {
    const openMistakeCount = student.mistakes.filter(
      (mistake) => mistake.status !== MasteryStatus.MASTERED
    ).length;

    return {
      id: student.id,
      displayName: student.user.displayName,
      studentNo: student.studentNo,
      schoolName: student.schoolName,
      grade: student.grade,
      region: student.region,
      profileSummary: student.profile?.summary ?? null,
      mistakeCount: student._count.mistakes,
      openMistakeCount,
      lastLessonAt: student.lessonEnrollments[0]?.lesson.startsAt.toISOString() ?? null,
      profile: this.toProfileSummary(student.profile),
      lessons: student.lessonEnrollments.map(({ lesson }) => this.toLessonRecord(lesson)),
      mistakes: student.mistakes.map((mistake) => this.toMistakeSummary(mistake))
    };
  }

  private toProfileSummary(
    profile: StudentDetailRecord['profile'] | null
  ): StudentProfileSummary {
    return {
      summary: profile?.summary ?? null,
      goals: profile?.goals ?? null,
      notes: profile?.notes ?? null,
      updatedAt: profile?.updatedAt.toISOString() ?? null,
      updatedBy: profile?.updatedBy
        ? {
            id: profile.updatedBy.id,
            displayName: profile.updatedBy.user.displayName
          }
        : null
    };
  }

  private toLessonRecord(
    lesson: StudentDetailRecord['lessonEnrollments'][number]['lesson']
  ): StudentLessonRecord {
    return {
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      status: lesson.status,
      classroom: lesson.classroom,
      startsAt: lesson.startsAt.toISOString(),
      endsAt: lesson.endsAt.toISOString(),
      teacher: {
        id: lesson.teacher.id,
        displayName: lesson.teacher.user.displayName,
        code: lesson.teacher.employeeNo
      },
      subject: lesson.subject
    };
  }

  private toMistakeSummary(mistake: MistakeRecord): StudentMistakeSummary {
    return {
      id: mistake.id,
      status: mistake.status,
      wrongAnswer: mistake.wrongAnswer,
      notes: mistake.notes,
      occurredAt: mistake.occurredAt.toISOString(),
      resolvedAt: mistake.resolvedAt?.toISOString() ?? null,
      question: {
        id: mistake.question.id,
        stem: mistake.question.stem,
        type: mistake.question.type,
        subject: mistake.question.subject,
        grade: mistake.question.grade,
        knowledgePoints: mistake.question.knowledgeLinks.map(
          ({ knowledgePoint }) => knowledgePoint
        )
      },
      lesson: mistake.lesson
        ? {
            id: mistake.lesson.id,
            title: mistake.lesson.title,
            startsAt: mistake.lesson.startsAt.toISOString()
          }
        : null
    };
  }
}

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AuthUser,
  StudentDetail,
  StudentFilterOptions,
  StudentFocusKnowledgePoint,
  StudentFollowUpInsight,
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
      mistakes: student.mistakes.map((mistake) => this.toMistakeSummary(mistake)),
      followUp: this.buildFollowUpInsight(student)
    };
  }

  private buildFollowUpInsight(student: StudentDetailRecord): StudentFollowUpInsight {
    const openMistakes = student.mistakes.filter(
      (mistake) => mistake.status !== MasteryStatus.MASTERED
    );
    const reviewingMistakes = student.mistakes.filter(
      (mistake) => mistake.status === MasteryStatus.REVIEWING
    );
    const focusKnowledgePoints = this.getFocusKnowledgePoints(openMistakes);
    const lessons = student.lessonEnrollments.map(({ lesson }) => lesson);
    const completedLessonCount = lessons.filter((lesson) => lesson.status === 'COMPLETED').length;
    const riskReasons: string[] = [];
    const suggestedActions: string[] = [];
    const lastLessonAt = lessons[0]?.startsAt ?? null;

    if (openMistakes.length >= 5) {
      riskReasons.push('待复习错题较多');
    } else if (openMistakes.length >= 2) {
      riskReasons.push('存在多道待复习错题');
    }

    if (focusKnowledgePoints[0]?.openMistakeCount >= 3) {
      riskReasons.push(`${focusKnowledgePoints[0].name} 错题集中`);
    }

    if (!lastLessonAt) {
      riskReasons.push('暂无课堂记录');
    }

    if (!student.profile?.goals) {
      riskReasons.push('近期学习目标未补充');
    }

    if (focusKnowledgePoints[0]) {
      suggestedActions.push(`安排一次 ${focusKnowledgePoints[0].name} 专项复盘`);
    }

    if (reviewingMistakes.length >= 2) {
      suggestedActions.push('检查复习中的错题是否可以转为已掌握');
    }

    if (!student.profile?.goals) {
      suggestedActions.push('补充下一阶段学习目标');
    }

    if (!suggestedActions.length) {
      suggestedActions.push('维持当前学习节奏，下一次课后更新档案');
    }

    return {
      riskLevel: this.getRiskLevel(openMistakes.length, focusKnowledgePoints, lastLessonAt),
      riskReasons: riskReasons.length ? riskReasons : ['当前跟进风险较低'],
      focusKnowledgePoints,
      suggestedActions,
      nextReviewAt: this.getNextReviewAt(openMistakes, lastLessonAt),
      recentLessonCount: lessons.length,
      completedLessonCount,
      openMistakeCount: openMistakes.length
    };
  }

  private getFocusKnowledgePoints(mistakes: StudentDetailRecord['mistakes']): StudentFocusKnowledgePoint[] {
    const pointCounts = new Map<string, StudentFocusKnowledgePoint>();

    mistakes.forEach((mistake) => {
      mistake.question.knowledgeLinks.forEach(({ knowledgePoint }) => {
        const existing = pointCounts.get(knowledgePoint.id);
        pointCounts.set(knowledgePoint.id, {
          ...knowledgePoint,
          openMistakeCount: (existing?.openMistakeCount ?? 0) + 1
        });
      });
    });

    return [...pointCounts.values()]
      .sort((left, right) => right.openMistakeCount - left.openMistakeCount)
      .slice(0, 3);
  }

  private getRiskLevel(
    openMistakeCount: number,
    focusKnowledgePoints: StudentFocusKnowledgePoint[],
    lastLessonAt: Date | null
  ): StudentFollowUpInsight['riskLevel'] {
    if (openMistakeCount >= 5 || (focusKnowledgePoints[0]?.openMistakeCount ?? 0) >= 3) {
      return 'HIGH';
    }

    if (openMistakeCount >= 2 || !lastLessonAt) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private getNextReviewAt(
    openMistakes: StudentDetailRecord['mistakes'],
    lastLessonAt: Date | null
  ) {
    const baseDate = openMistakes[0]?.occurredAt ?? lastLessonAt;

    if (!baseDate) {
      return null;
    }

    const nextReviewAt = new Date(baseDate);
    nextReviewAt.setDate(nextReviewAt.getDate() + (openMistakes.length ? 3 : 7));
    return nextReviewAt.toISOString();
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

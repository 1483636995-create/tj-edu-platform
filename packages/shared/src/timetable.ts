import type { NamedOption } from './questions';

export const LESSON_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED'] as const;
export const LESSON_TYPES = ['GROUP', 'ONE_ON_ONE'] as const;

export type LessonStatus = (typeof LESSON_STATUSES)[number];
export type LessonType = (typeof LESSON_TYPES)[number];

export interface TimetableSummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface SchedulePersonOption {
  id: string;
  displayName: string;
  code: string | null;
}

export interface LessonSummary {
  id: string;
  timetableId: string;
  title: string;
  type: LessonType;
  classroom: string | null;
  startsAt: string;
  endsAt: string;
  status: LessonStatus;
  teacher: SchedulePersonOption;
  subject: NamedOption;
  grade: NamedOption | null;
  students: SchedulePersonOption[];
}

export interface LessonListResponse {
  items: LessonSummary[];
  total: number;
  rangeStart: string;
  rangeEnd: string;
}

export interface TimetableFilterOptions {
  timetables: TimetableSummary[];
  teachers: SchedulePersonOption[];
  students: Array<SchedulePersonOption & { gradeId: string }>;
  subjects: NamedOption[];
  grades: NamedOption[];
  statuses: LessonStatus[];
  types: LessonType[];
}

export type ScheduleConflictType = 'TEACHER' | 'CLASSROOM' | 'STUDENT';

export interface ScheduleConflict {
  type: ScheduleConflictType;
  label: string;
  lessonId: string;
  lessonTitle: string;
  startsAt: string;
  endsAt: string;
}

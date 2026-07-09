import type { NamedOption } from './questions';

export const MASTERY_STATUSES = ['NEW', 'REVIEWING', 'MASTERED'] as const;

export type MasteryStatus = (typeof MASTERY_STATUSES)[number];

export interface StudentSummary {
  id: string;
  displayName: string;
  studentNo: string | null;
  schoolName: string | null;
  grade: NamedOption;
  region: NamedOption | null;
  profileSummary: string | null;
  mistakeCount: number;
  openMistakeCount: number;
  lastLessonAt: string | null;
}

export interface StudentProfileSummary {
  summary: string | null;
  goals: string | null;
  notes: string | null;
  updatedAt: string | null;
  updatedBy: { id: string; displayName: string } | null;
}

export interface StudentLessonRecord {
  id: string;
  title: string;
  type: 'GROUP' | 'ONE_ON_ONE';
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  classroom: string | null;
  startsAt: string;
  endsAt: string;
  teacher: { id: string; displayName: string; code: string | null };
  subject: NamedOption;
}

export interface StudentMistakeSummary {
  id: string;
  status: MasteryStatus;
  wrongAnswer: unknown | null;
  notes: string | null;
  occurredAt: string;
  resolvedAt: string | null;
  question: {
    id: string;
    stem: string;
    type: string;
    subject: NamedOption;
    grade: NamedOption | null;
    knowledgePoints: NamedOption[];
  };
  lesson: { id: string; title: string; startsAt: string } | null;
}

export interface StudentDetail extends StudentSummary {
  profile: StudentProfileSummary;
  lessons: StudentLessonRecord[];
  mistakes: StudentMistakeSummary[];
}

export interface StudentListResponse {
  items: StudentSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface StudentFilterOptions {
  grades: NamedOption[];
  regions: NamedOption[];
  masteryStatuses: MasteryStatus[];
}

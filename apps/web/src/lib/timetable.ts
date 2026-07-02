import type {
  LessonListResponse,
  LessonStatus,
  LessonSummary,
  LessonType,
  TimetableFilterOptions
} from '@tj-edu/shared';
import { apiRequest } from './auth';

export interface LessonQuery {
  start: string;
  end: string;
  timetableId?: string;
  teacherId?: string;
  studentId?: string;
  subjectId?: string;
  status?: LessonStatus | '';
  type?: LessonType | '';
}

export interface LessonInput {
  timetableId: string;
  teacherId: string;
  subjectId: string;
  gradeId?: string;
  title: string;
  type: LessonType;
  classroom?: string;
  startsAt: string;
  endsAt: string;
  status: LessonStatus;
  studentIds: string[];
}

export function getTimetableFilters(token: string) {
  return apiRequest<TimetableFilterOptions>('/timetable/filters', {}, token);
}

export function listLessons(token: string, query: LessonQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, String(value));
  });
  return apiRequest<LessonListResponse>(`/timetable/lessons?${params.toString()}`, {}, token);
}

export function createLesson(token: string, input: LessonInput) {
  return apiRequest<LessonSummary>(
    '/timetable/lessons',
    { method: 'POST', body: JSON.stringify(input) },
    token
  );
}

export function updateLesson(token: string, id: string, input: LessonInput) {
  return apiRequest<LessonSummary>(
    `/timetable/lessons/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    token
  );
}

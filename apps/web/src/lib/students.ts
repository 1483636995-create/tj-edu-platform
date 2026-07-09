import type {
  MasteryStatus,
  StudentDetail,
  StudentFilterOptions,
  StudentListResponse
} from '@tj-edu/shared';
import { apiRequest } from './auth';

export interface StudentQuery {
  gradeId?: string;
  regionId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface StudentProfileInput {
  summary?: string;
  goals?: string;
  notes?: string;
}

export interface StudentMistakeInput {
  status?: MasteryStatus;
  notes?: string;
}

export function getStudentFilters(token: string) {
  return apiRequest<StudentFilterOptions>('/students/filters', {}, token);
}

export function listStudents(token: string, query: StudentQuery) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  return apiRequest<StudentListResponse>(`/students?${params.toString()}`, {}, token);
}

export function getStudent(token: string, id: string) {
  return apiRequest<StudentDetail>(`/students/${id}`, {}, token);
}

export function updateStudentProfile(token: string, id: string, input: StudentProfileInput) {
  return apiRequest<StudentDetail>(
    `/students/${id}/profile`,
    {
      method: 'PATCH',
      body: JSON.stringify(input)
    },
    token
  );
}

export function updateStudentMistake(
  token: string,
  studentId: string,
  mistakeId: string,
  input: StudentMistakeInput
) {
  return apiRequest<StudentDetail['mistakes'][number]>(
    `/students/${studentId}/mistakes/${mistakeId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input)
    },
    token
  );
}

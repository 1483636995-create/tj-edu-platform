import type {
  PaperType,
  QuestionDetail,
  QuestionFilterOptions,
  QuestionListResponse,
  QuestionType
} from '@tj-edu/shared';
import { apiRequest } from './auth';

export interface QuestionQuery {
  subjectId?: string;
  gradeId?: string;
  regionId?: string;
  knowledgePointId?: string;
  year?: string;
  paperType?: PaperType | '';
  type?: QuestionType | '';
  page?: number;
  pageSize?: number;
}

export function getQuestionFilters(token: string) {
  return apiRequest<QuestionFilterOptions>('/questions/filters', {}, token);
}

export function listQuestions(token: string, query: QuestionQuery) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  return apiRequest<QuestionListResponse>(`/questions?${params.toString()}`, {}, token);
}

export function getQuestion(token: string, id: string) {
  return apiRequest<QuestionDetail>(`/questions/${id}`, {}, token);
}

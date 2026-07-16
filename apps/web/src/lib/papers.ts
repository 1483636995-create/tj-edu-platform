import type {
  ContentStatus,
  PaperBuilderFilterOptions,
  PaperDraftDetail,
  PaperDraftListResponse,
  PaperType
} from '@tj-edu/shared';
import { apiRequest } from './auth';

export interface PaperQuery {
  subjectId?: string;
  gradeId?: string;
  type?: PaperType | '';
  status?: ContentStatus | '';
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaperFilterQuery {
  subjectId?: string;
  gradeId?: string;
  knowledgePointId?: string;
}

export interface PaperInput {
  title: string;
  subjectId: string;
  gradeId: string;
  regionId?: string;
  year?: number;
  type: PaperType;
  status: ContentStatus;
  questionIds: string[];
}

function toParams(query: object) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  return params.toString();
}

export function getPaperFilters(token: string, query: PaperFilterQuery = {}) {
  const params = toParams(query);
  return apiRequest<PaperBuilderFilterOptions>(
    `/papers/filters${params ? `?${params}` : ''}`,
    {},
    token
  );
}

export function listPapers(token: string, query: PaperQuery) {
  const params = toParams(query);
  return apiRequest<PaperDraftListResponse>(`/papers${params ? `?${params}` : ''}`, {}, token);
}

export function getPaper(token: string, id: string) {
  return apiRequest<PaperDraftDetail>(`/papers/${id}`, {}, token);
}

export function createPaper(token: string, input: PaperInput) {
  return apiRequest<PaperDraftDetail>(
    '/papers',
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export function updatePaper(token: string, id: string, input: PaperInput) {
  return apiRequest<PaperDraftDetail>(
    `/papers/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input)
    },
    token
  );
}

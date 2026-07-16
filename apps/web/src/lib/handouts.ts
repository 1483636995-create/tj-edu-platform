import type {
  ContentStatus,
  HandoutDetail,
  HandoutFilterOptions,
  HandoutListResponse
} from '@tj-edu/shared';
import { apiRequest } from './auth';

export interface HandoutQuery {
  subjectId?: string;
  gradeId?: string;
  status?: ContentStatus | '';
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface HandoutInput {
  title: string;
  objective?: string;
  subjectId: string;
  gradeId?: string;
  status: ContentStatus;
  knowledgePointIds: string[];
  questionIds: string[];
  fileAssetIds: string[];
}

export function getHandoutFilters(token: string) {
  return apiRequest<HandoutFilterOptions>('/handouts/filters', {}, token);
}

export function listHandouts(token: string, query: HandoutQuery) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  return apiRequest<HandoutListResponse>(`/handouts?${params.toString()}`, {}, token);
}

export function getHandout(token: string, id: string) {
  return apiRequest<HandoutDetail>(`/handouts/${id}`, {}, token);
}

export function createHandout(token: string, input: HandoutInput) {
  return apiRequest<HandoutDetail>(
    '/handouts',
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export function updateHandout(token: string, id: string, input: HandoutInput) {
  return apiRequest<HandoutDetail>(
    `/handouts/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input)
    },
    token
  );
}

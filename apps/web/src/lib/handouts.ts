import type {
  ContentStatus,
  HandoutDetail,
  HandoutFilterOptions,
  HandoutListResponse
} from '@tj-edu/shared';
import { API_BASE_URL, ApiError, type ApiErrorPayload, apiRequest } from './auth';

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

export async function downloadHandoutExport(token: string, id: string) {
  const response = await fetch(`${API_BASE_URL}/handouts/${id}/export`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    const message = Array.isArray(payload.message) ? payload.message[0] : payload.message;
    throw new ApiError(message ?? '讲义导出失败，请稍后重试。', response.status, payload);
  }

  const disposition = response.headers.get('content-disposition') ?? '';
  const filenameMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : 'handout.md';

  return { filename, blob: await response.blob() };
}

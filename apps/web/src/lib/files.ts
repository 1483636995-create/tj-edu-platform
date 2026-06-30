import type {
  FileAssetSummary,
  FileCategory,
  FileFilterOptions,
  FileListResponse
} from '@tj-edu/shared';
import { API_BASE_URL, apiRequest } from './auth';

export interface FileQuery {
  subjectId?: string;
  gradeId?: string;
  regionId?: string;
  knowledgePointId?: string;
  category?: FileCategory | '';
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface FileUploadInput {
  file: File;
  category: FileCategory;
  subjectId?: string;
  gradeId?: string;
  regionId?: string;
  knowledgePointIds?: string[];
}

export function getFileFilters(token: string) {
  return apiRequest<FileFilterOptions>('/files/filters', {}, token);
}

export function listFiles(token: string, query: FileQuery) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  return apiRequest<FileListResponse>(`/files?${params.toString()}`, {}, token);
}

export function uploadFile(token: string, input: FileUploadInput) {
  const body = new FormData();
  body.set('file', input.file);
  body.set('category', input.category);

  for (const key of ['subjectId', 'gradeId', 'regionId'] as const) {
    const value = input[key];
    if (value) {
      body.set(key, value);
    }
  }

  if (input.knowledgePointIds?.length) {
    body.set('knowledgePointIds', JSON.stringify(input.knowledgePointIds));
  }

  return apiRequest<FileAssetSummary>('/files', { method: 'POST', body }, token);
}

export async function downloadFile(token: string, file: FileAssetSummary) {
  const response = await fetch(`${API_BASE_URL}/files/${file.id}/download`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error('文件下载失败，请稍后重试。');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}

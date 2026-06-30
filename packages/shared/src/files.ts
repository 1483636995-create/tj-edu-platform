import type { NamedOption } from './questions';

export const FILE_CATEGORIES = [
  'TEACHING_MATERIAL',
  'PAPER',
  'ANSWER',
  'HANDOUT',
  'OTHER'
] as const;

export type FileCategory = (typeof FILE_CATEGORIES)[number];

export interface FileAssetSummary {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  category: FileCategory;
  subject: NamedOption | null;
  grade: NamedOption | null;
  region: NamedOption | null;
  knowledgePoints: NamedOption[];
  uploadedBy: { id: string; displayName: string } | null;
  createdAt: string;
}

export interface FileListResponse {
  items: FileAssetSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface FileFilterOptions {
  subjects: NamedOption[];
  grades: NamedOption[];
  regions: NamedOption[];
  knowledgePoints: Array<NamedOption & { subjectId: string; gradeId: string | null }>;
  categories: FileCategory[];
}

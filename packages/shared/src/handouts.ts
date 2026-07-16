import type { ContentStatus, NamedOption, QuestionType } from './questions';

export interface HandoutMaterialQuestion {
  id: string;
  stem: string;
  type: QuestionType;
  difficulty: number | null;
  subject: NamedOption;
  grade: NamedOption | null;
  knowledgePoints: NamedOption[];
}

export interface HandoutMaterialFile {
  id: string;
  name: string;
  category: string;
  mimeType: string;
  size: number;
  subject: NamedOption | null;
  grade: NamedOption | null;
  knowledgePoints: NamedOption[];
}

export interface HandoutSummary {
  id: string;
  title: string;
  objective: string | null;
  status: ContentStatus;
  subject: NamedOption;
  grade: NamedOption | null;
  knowledgePoints: NamedOption[];
  questionCount: number;
  fileCount: number;
  updatedAt: string;
  createdBy: { id: string; displayName: string } | null;
}

export interface HandoutPreviewSection {
  knowledgePoint: NamedOption | null;
  questions: HandoutMaterialQuestion[];
  files: HandoutMaterialFile[];
}

export interface HandoutDetail extends HandoutSummary {
  questions: HandoutMaterialQuestion[];
  files: HandoutMaterialFile[];
  previewSections: HandoutPreviewSection[];
  createdAt: string;
}

export interface HandoutListResponse {
  items: HandoutSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface HandoutFilterOptions {
  subjects: NamedOption[];
  grades: NamedOption[];
  knowledgePoints: Array<NamedOption & { subjectId: string; gradeId: string | null }>;
  questions: HandoutMaterialQuestion[];
  files: HandoutMaterialFile[];
  statuses: ContentStatus[];
}

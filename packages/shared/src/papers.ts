import type { ContentStatus, NamedOption, PaperType, QuestionSummary } from './questions';

export interface PaperQuestionItem extends QuestionSummary {
  sortOrder: number;
  score: number | null;
}

export interface PaperDraftSummary {
  id: string;
  title: string;
  year: number | null;
  type: PaperType;
  status: ContentStatus;
  subject: NamedOption;
  grade: NamedOption;
  region: NamedOption | null;
  questionCount: number;
  totalScore: number;
  updatedAt: string;
  createdBy: { id: string; displayName: string } | null;
}

export interface PaperDraftDetail extends PaperDraftSummary {
  questions: PaperQuestionItem[];
  createdAt: string;
}

export interface PaperDraftListResponse {
  items: PaperDraftSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaperBuilderFilterOptions {
  subjects: NamedOption[];
  grades: NamedOption[];
  regions: NamedOption[];
  knowledgePoints: Array<NamedOption & { subjectId: string; gradeId: string | null }>;
  questions: QuestionSummary[];
  paperTypes: PaperType[];
  statuses: ContentStatus[];
}

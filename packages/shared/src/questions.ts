export const QUESTION_TYPES = [
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'FILL_BLANK',
  'SHORT_ANSWER',
  'COMPREHENSIVE'
] as const;

export const CONTENT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export const PAPER_TYPES = ['EXAM', 'MOCK', 'PRACTICE', 'SCHOOL_BASED'] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];
export type ContentStatus = (typeof CONTENT_STATUSES)[number];
export type PaperType = (typeof PAPER_TYPES)[number];

export interface NamedOption {
  id: string;
  name: string;
  code?: string;
}

export interface QuestionPaperSummary {
  id: string;
  title: string;
  year: number | null;
  type: PaperType;
}

export interface QuestionSummary {
  id: string;
  stem: string;
  type: QuestionType;
  status: ContentStatus;
  difficulty: number | null;
  source: string | null;
  subject: NamedOption;
  grade: NamedOption | null;
  region: NamedOption | null;
  knowledgePoints: NamedOption[];
  papers: QuestionPaperSummary[];
  createdAt: string;
}

export interface QuestionDetail extends QuestionSummary {
  answer: unknown | null;
  analysis: string | null;
  createdBy: { id: string; displayName: string } | null;
  updatedAt: string;
}

export interface QuestionListResponse {
  items: QuestionSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface QuestionFilterOptions {
  subjects: NamedOption[];
  grades: NamedOption[];
  regions: NamedOption[];
  knowledgePoints: Array<NamedOption & { subjectId: string; gradeId: string | null }>;
  years: number[];
  paperTypes: PaperType[];
  questionTypes: QuestionType[];
  statuses: ContentStatus[];
}

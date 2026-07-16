'use client';

import type {
  ContentStatus,
  PaperBuilderFilterOptions,
  PaperDraftDetail,
  PaperDraftListResponse,
  PaperType,
  QuestionSummary
} from '@tj-edu/shared';
import { useEffect, useMemo, useState } from 'react';
import { getStoredToken } from '../../../lib/auth';
import {
  createPaper,
  getPaper,
  getPaperFilters,
  listPapers,
  updatePaper
} from '../../../lib/papers';

const statusLabels: Record<ContentStatus, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档'
};

const paperTypeLabels: Record<PaperType, string> = {
  EXAM: '真题/试卷',
  MOCK: '模拟卷',
  PRACTICE: '练习卷',
  SCHOOL_BASED: '校本卷'
};

interface FilterState {
  subjectId: string;
  gradeId: string;
  status: ContentStatus | '';
  type: PaperType | '';
  search: string;
}

interface FormState {
  title: string;
  subjectId: string;
  gradeId: string;
  regionId: string;
  year: string;
  type: PaperType;
  status: ContentStatus;
  knowledgePointId: string;
  questionIds: string[];
}

const initialFilters: FilterState = {
  subjectId: '',
  gradeId: '',
  status: '',
  type: '',
  search: ''
};

const emptyForm: FormState = {
  title: '',
  subjectId: '',
  gradeId: '',
  regionId: '',
  year: String(new Date().getFullYear()),
  type: 'PRACTICE',
  status: 'DRAFT',
  knowledgePointId: '',
  questionIds: []
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function questionMatchesKnowledgePoint(question: QuestionSummary, knowledgePointId: string) {
  return (
    !knowledgePointId || question.knowledgePoints.some((point) => point.id === knowledgePointId)
  );
}

export default function PapersPage() {
  const [options, setOptions] = useState<PaperBuilderFilterOptions | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [result, setResult] = useState<PaperDraftListResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PaperDraftDetail | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const token = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return getStoredToken();
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    getPaperFilters(token)
      .then((payload) => {
        setOptions(payload);
        setForm((current) => ({
          ...current,
          subjectId: current.subjectId || payload.subjects[0]?.id || '',
          gradeId: current.gradeId || payload.grades[0]?.id || '',
          regionId: current.regionId || payload.regions[0]?.id || ''
        }));
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : '组题素材加载失败。');
      });
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    listPapers(token, { ...filters, page, pageSize: 8 })
      .then((payload) => {
        setResult(payload);
        setSelectedId((current) => current ?? payload.items[0]?.id ?? null);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : '组题草稿加载失败。');
      })
      .finally(() => setLoading(false));
  }, [filters, page, token]);

  useEffect(() => {
    if (!token || !selectedId) {
      setDetail(null);
      return;
    }

    getPaper(token, selectedId)
      .then((payload) => {
        setDetail(payload);
        setForm({
          title: payload.title,
          subjectId: payload.subject.id,
          gradeId: payload.grade.id,
          regionId: payload.region?.id ?? '',
          year: payload.year ? String(payload.year) : '',
          type: payload.type,
          status: payload.status,
          knowledgePointId: '',
          questionIds: payload.questions.map((question) => question.id)
        });
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : '组题详情加载失败。');
      });
  }, [selectedId, token]);

  const visibleKnowledgePoints = useMemo(
    () =>
      (options?.knowledgePoints ?? []).filter(
        (point) =>
          (!form.subjectId || point.subjectId === form.subjectId) &&
          (!form.gradeId || !point.gradeId || point.gradeId === form.gradeId)
      ),
    [form.gradeId, form.subjectId, options]
  );

  const visibleQuestions = useMemo(
    () =>
      (options?.questions ?? []).filter(
        (question) =>
          (!form.subjectId || question.subject.id === form.subjectId) &&
          (!form.gradeId || !question.grade || question.grade.id === form.gradeId) &&
          questionMatchesKnowledgePoint(question, form.knowledgePointId)
      ),
    [form.gradeId, form.knowledgePointId, form.subjectId, options]
  );

  const selectedQuestions = useMemo(
    () => {
      const questionById = new Map<string, QuestionSummary>();

      [...(options?.questions ?? []), ...(detail?.questions ?? [])].forEach((question) => {
        questionById.set(question.id, question);
      });

      return form.questionIds
        .map((id) => questionById.get(id))
        .filter((question): question is QuestionSummary => Boolean(question));
    },
    [detail, form.questionIds, options]
  );

  const totalScore = form.questionIds.length * 10;

  function updateFilter<Key extends keyof FilterState>(key: Key, value: FilterState[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setSelectedId(null);
  }

  function updateForm<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'subjectId' || key === 'gradeId' ? { knowledgePointId: '', questionIds: [] } : {})
    }));
  }

  function startNewDraft() {
    setSelectedId(null);
    setDetail(null);
    setForm({
      ...emptyForm,
      subjectId: options?.subjects[0]?.id ?? '',
      gradeId: options?.grades[0]?.id ?? '',
      regionId: options?.regions[0]?.id ?? ''
    });
    setMessage(null);
  }

  function toggleQuestion(questionId: string) {
    setForm((current) => ({
      ...current,
      questionIds: current.questionIds.includes(questionId)
        ? current.questionIds.filter((id) => id !== questionId)
        : [...current.questionIds, questionId]
    }));
  }

  function moveQuestion(questionId: string, direction: -1 | 1) {
    setForm((current) => {
      const index = current.questionIds.indexOf(questionId);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.questionIds.length) {
        return current;
      }

      const next = [...current.questionIds];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return { ...current, questionIds: next };
    });
  }

  async function savePaper() {
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const year = form.year.trim() ? Number(form.year) : undefined;
      const input = {
        title: form.title,
        subjectId: form.subjectId,
        gradeId: form.gradeId,
        regionId: form.regionId || undefined,
        year,
        type: form.type,
        status: form.status,
        questionIds: form.questionIds
      };
      const saved = detail ? await updatePaper(token, detail.id, input) : await createPaper(token, input);
      setDetail(saved);
      setSelectedId(saved.id);
      setMessage('组题草稿已保存。');
      const refreshed = await listPapers(token, { ...filters, page, pageSize: 8 });
      setResult(refreshed);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '组题草稿保存失败。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="page-header">
        <div>
          <h1>知识点组题</h1>
          <p>按学科、年级和知识点筛选题目，快速生成可复用的练习卷草稿。</p>
        </div>
        <button className="primary-button" onClick={startNewDraft} type="button">
          新建组题
        </button>
      </section>

      <div className="filter-strip paper-filter-strip" aria-label="组题筛选">
        <input
          aria-label="搜索组题草稿"
          onChange={(event) => updateFilter('search', event.target.value)}
          placeholder="搜索试卷标题"
          value={filters.search}
        />
        <select
          aria-label="学科"
          onChange={(event) => updateFilter('subjectId', event.target.value)}
          value={filters.subjectId}
        >
          <option value="">全部学科</option>
          {options?.subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
        <select
          aria-label="类型"
          onChange={(event) => updateFilter('type', event.target.value as PaperType | '')}
          value={filters.type}
        >
          <option value="">全部类型</option>
          {options?.paperTypes.map((type) => (
            <option key={type} value={type}>
              {paperTypeLabels[type]}
            </option>
          ))}
        </select>
        <select
          aria-label="状态"
          onChange={(event) => updateFilter('status', event.target.value as ContentStatus | '')}
          value={filters.status}
        >
          <option value="">全部状态</option>
          {options?.statuses.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="inline-alert" role="alert">
          {error}
        </div>
      ) : null}
      {message ? <div className="form-message">{message}</div> : null}

      <div className="paper-workspace">
        <section className="paper-list-panel">
          {loading ? (
            <div className="empty-panel">
              <h2>正在加载组题草稿</h2>
              <p>正在读取当前机构可用的试卷草稿。</p>
            </div>
          ) : result?.items.length ? (
            <>
              <div className="paper-list">
                {result.items.map((paper) => (
                  <button
                    className={`paper-row ${selectedId === paper.id ? 'active' : ''}`}
                    key={paper.id}
                    onClick={() => setSelectedId(paper.id)}
                    type="button"
                  >
                    <span>
                      <strong>{paper.title}</strong>
                      <small>
                        {paper.subject.name} / {paper.grade.name} / {formatDate(paper.updatedAt)}
                      </small>
                    </span>
                    <span>
                      <b>{paper.questionCount}</b>
                      <small>{paper.totalScore} 分</small>
                    </span>
                  </button>
                ))}
              </div>
              <div className="pagination">
                <span>
                  第 {result.page} / {result.totalPages} 页
                </span>
                <div>
                  <button
                    className="secondary-button"
                    disabled={result.page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    type="button"
                  >
                    上一页
                  </button>
                  <button
                    className="secondary-button"
                    disabled={result.page >= result.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                    type="button"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-panel">
              <h2>暂无组题草稿</h2>
              <p>新建组题后，可以按知识点挑选题目并保存为练习卷。</p>
            </div>
          )}
        </section>

        <section className="paper-editor">
          <div className="paper-editor-heading">
            <div>
              <h2>{detail ? '编辑组题草稿' : '新建组题草稿'}</h2>
              <p>
                当前已选 {form.questionIds.length} 题，默认每题 10 分，总分 {totalScore} 分。
              </p>
            </div>
            <button
              className="primary-button"
              disabled={saving || !form.subjectId || !form.gradeId || !form.title.trim()}
              onClick={savePaper}
              type="button"
            >
              {saving ? '保存中' : '保存草稿'}
            </button>
          </div>

          <div className="paper-form-grid">
            <label>
              <span>标题</span>
              <input
                onChange={(event) => updateForm('title', event.target.value)}
                placeholder="例如：九年级数学二次函数练习"
                value={form.title}
              />
            </label>
            <label>
              <span>学科</span>
              <select
                onChange={(event) => updateForm('subjectId', event.target.value)}
                value={form.subjectId}
              >
                {options?.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>年级</span>
              <select
                onChange={(event) => updateForm('gradeId', event.target.value)}
                value={form.gradeId}
              >
                {options?.grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>区域</span>
              <select
                onChange={(event) => updateForm('regionId', event.target.value)}
                value={form.regionId}
              >
                <option value="">通用</option>
                {options?.regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>年份</span>
              <input
                inputMode="numeric"
                onChange={(event) => updateForm('year', event.target.value)}
                placeholder="2026"
                value={form.year}
              />
            </label>
            <label>
              <span>类型</span>
              <select
                onChange={(event) => updateForm('type', event.target.value as PaperType)}
                value={form.type}
              >
                {options?.paperTypes.map((type) => (
                  <option key={type} value={type}>
                    {paperTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>状态</span>
              <select
                onChange={(event) => updateForm('status', event.target.value as ContentStatus)}
                value={form.status}
              >
                {options?.statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>知识点</span>
              <select
                onChange={(event) => updateForm('knowledgePointId', event.target.value)}
                value={form.knowledgePointId}
              >
                <option value="">全部知识点</option>
                {visibleKnowledgePoints.map((point) => (
                  <option key={point.id} value={point.id}>
                    {point.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="paper-builder-grid">
            <section>
              <h3>可选题目</h3>
              <div className="question-picker">
                {visibleQuestions.map((question) => (
                  <label key={question.id}>
                    <input
                      checked={form.questionIds.includes(question.id)}
                      onChange={() => toggleQuestion(question.id)}
                      type="checkbox"
                    />
                    <span>
                      <strong>{question.stem}</strong>
                      <small>
                        难度 {question.difficulty ?? '-'} /{' '}
                        {question.knowledgePoints.map((point) => point.name).join('、') || '未关联知识点'}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section>
              <h3>已选题目</h3>
              <div className="selected-question-list">
                {selectedQuestions.length ? (
                  selectedQuestions.map((question, index) => (
                    <article key={question.id}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{question.stem}</strong>
                        <small>{question.type} / 10 分</small>
                      </div>
                      <div className="question-actions">
                        <button
                          className="secondary-button"
                          disabled={index === 0}
                          onClick={() => moveQuestion(question.id, -1)}
                          type="button"
                        >
                          上移
                        </button>
                        <button
                          className="secondary-button"
                          disabled={index === selectedQuestions.length - 1}
                          onClick={() => moveQuestion(question.id, 1)}
                          type="button"
                        >
                          下移
                        </button>
                        <button
                          className="secondary-button"
                          onClick={() => toggleQuestion(question.id)}
                          type="button"
                        >
                          移除
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="paper-empty-hint">从左侧题目列表勾选后，会按选择顺序生成试卷结构。</p>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </>
  );
}

'use client';

import type {
  ContentStatus,
  HandoutDetail,
  HandoutFilterOptions,
  HandoutListResponse
} from '@tj-edu/shared';
import { useEffect, useMemo, useState } from 'react';
import { getStoredToken } from '../../../lib/auth';
import {
  createHandout,
  getHandout,
  getHandoutFilters,
  listHandouts,
  updateHandout
} from '../../../lib/handouts';

const statusLabels: Record<ContentStatus, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档'
};

interface FilterState {
  subjectId: string;
  gradeId: string;
  status: ContentStatus | '';
  search: string;
}

interface FormState {
  title: string;
  objective: string;
  subjectId: string;
  gradeId: string;
  status: ContentStatus;
  knowledgePointIds: string[];
  questionIds: string[];
  fileAssetIds: string[];
}

const initialFilters: FilterState = {
  subjectId: '',
  gradeId: '',
  status: '',
  search: ''
};

const emptyForm: FormState = {
  title: '',
  objective: '',
  subjectId: '',
  gradeId: '',
  status: 'DRAFT',
  knowledgePointIds: [],
  questionIds: [],
  fileAssetIds: []
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function HandoutsPage() {
  const [options, setOptions] = useState<HandoutFilterOptions | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [result, setResult] = useState<HandoutListResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<HandoutDetail | null>(null);
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

    getHandoutFilters(token)
      .then((payload) => {
        setOptions(payload);
        setForm((current) => ({
          ...current,
          subjectId: current.subjectId || payload.subjects[0]?.id || '',
          gradeId: current.gradeId || payload.grades[0]?.id || ''
        }));
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : '讲义素材加载失败。');
      });
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    listHandouts(token, { ...filters, page, pageSize: 8 })
      .then((payload) => {
        setResult(payload);
        setSelectedId((current) => current ?? payload.items[0]?.id ?? null);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : '讲义列表加载失败。');
      })
      .finally(() => setLoading(false));
  }, [filters, page, token]);

  useEffect(() => {
    if (!token || !selectedId) {
      setDetail(null);
      return;
    }

    getHandout(token, selectedId)
      .then((payload) => {
        setDetail(payload);
        setForm({
          title: payload.title,
          objective: payload.objective ?? '',
          subjectId: payload.subject.id,
          gradeId: payload.grade?.id ?? '',
          status: payload.status,
          knowledgePointIds: payload.knowledgePoints.map((point) => point.id),
          questionIds: payload.questions.map((question) => question.id),
          fileAssetIds: payload.files.map((file) => file.id)
        });
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : '讲义详情加载失败。');
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
          (!form.gradeId || !question.grade || question.grade.id === form.gradeId)
      ),
    [form.gradeId, form.subjectId, options]
  );

  const visibleFiles = useMemo(
    () =>
      (options?.files ?? []).filter(
        (file) =>
          (!form.subjectId || !file.subject || file.subject.id === form.subjectId) &&
          (!form.gradeId || !file.grade || file.grade.id === form.gradeId)
      ),
    [form.gradeId, form.subjectId, options]
  );

  function updateFilter<Key extends keyof FilterState>(key: Key, value: FilterState[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setSelectedId(null);
  }

  function startNewDraft() {
    setSelectedId(null);
    setDetail(null);
    setForm({
      ...emptyForm,
      subjectId: options?.subjects[0]?.id ?? '',
      gradeId: options?.grades[0]?.id ?? ''
    });
    setMessage(null);
  }

  function updateForm<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'subjectId' || key === 'gradeId'
        ? { knowledgePointIds: [], questionIds: [], fileAssetIds: [] }
        : {})
    }));
  }

  async function saveHandout() {
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const input = {
        title: form.title,
        objective: form.objective,
        subjectId: form.subjectId,
        gradeId: form.gradeId || undefined,
        status: form.status,
        knowledgePointIds: form.knowledgePointIds,
        questionIds: form.questionIds,
        fileAssetIds: form.fileAssetIds
      };
      const saved = detail
        ? await updateHandout(token, detail.id, input)
        : await createHandout(token, input);
      setDetail(saved);
      setSelectedId(saved.id);
      setMessage('讲义草稿已保存。');
      const refreshed = await listHandouts(token, { ...filters, page, pageSize: 8 });
      setResult(refreshed);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '讲义保存失败。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="page-header">
        <div>
          <h1>讲义</h1>
          <p>选择知识点、题目和文件素材，沉淀可复用的课堂讲义草稿。</p>
        </div>
        <button className="primary-button" onClick={startNewDraft} type="button">
          新建草稿
        </button>
      </section>

      <div className="filter-strip handout-filter-strip" aria-label="讲义筛选">
        <input
          aria-label="搜索讲义"
          onChange={(event) => updateFilter('search', event.target.value)}
          placeholder="搜索讲义标题"
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

      <div className="handout-workspace">
        <section className="handout-list-panel">
          {loading ? (
            <div className="empty-panel">
              <h2>正在加载讲义</h2>
              <p>正在读取当前机构的讲义草稿。</p>
            </div>
          ) : result?.items.length ? (
            <>
              <div className="handout-list">
                {result.items.map((handout) => (
                  <button
                    className={`handout-row ${selectedId === handout.id ? 'active' : ''}`}
                    key={handout.id}
                    onClick={() => setSelectedId(handout.id)}
                    type="button"
                  >
                    <span>
                      <strong>{handout.title}</strong>
                      <small>
                        {handout.subject.name} · {handout.grade?.name ?? '通用'} ·{' '}
                        {formatDate(handout.updatedAt)}
                      </small>
                    </span>
                    <span>
                      <b>{handout.questionCount}</b>
                      <small>题目</small>
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
              <h2>暂无讲义草稿</h2>
              <p>新建草稿后可以选择知识点、题目和文件素材。</p>
            </div>
          )}
        </section>

        <section className="handout-editor">
          <div className="handout-editor-heading">
            <div>
              <h2>{detail ? '编辑讲义草稿' : '新建讲义草稿'}</h2>
              <p>先组织内容结构，导出和复杂排版后续接入。</p>
            </div>
            <button
              className="primary-button"
              disabled={saving || !form.subjectId || !form.title.trim()}
              onClick={saveHandout}
              type="button"
            >
              {saving ? '保存中' : '保存草稿'}
            </button>
          </div>

          <div className="handout-form-grid">
            <label>
              <span>标题</span>
              <input
                onChange={(event) => updateForm('title', event.target.value)}
                placeholder="例如：九年级数学二次函数专题讲义"
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
                <option value="">通用</option>
                {options?.grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
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
            <label className="handout-objective">
              <span>教学目标</span>
              <textarea
                onChange={(event) => updateForm('objective', event.target.value)}
                placeholder="写下本讲义要解决的学习问题、课堂目标或练习重点"
                value={form.objective}
              />
            </label>
          </div>

          <div className="material-grid">
            <section>
              <h3>知识点</h3>
              <div className="material-list">
                {visibleKnowledgePoints.map((point) => (
                  <label key={point.id}>
                    <input
                      checked={form.knowledgePointIds.includes(point.id)}
                      onChange={() =>
                        updateForm('knowledgePointIds', toggle(form.knowledgePointIds, point.id))
                      }
                      type="checkbox"
                    />
                    <span>{point.name}</span>
                  </label>
                ))}
              </div>
            </section>
            <section>
              <h3>题目</h3>
              <div className="material-list">
                {visibleQuestions.map((question) => (
                  <label key={question.id}>
                    <input
                      checked={form.questionIds.includes(question.id)}
                      onChange={() => updateForm('questionIds', toggle(form.questionIds, question.id))}
                      type="checkbox"
                    />
                    <span>{question.stem}</span>
                  </label>
                ))}
              </div>
            </section>
            <section>
              <h3>文件素材</h3>
              <div className="material-list">
                {visibleFiles.map((file) => (
                  <label key={file.id}>
                    <input
                      checked={form.fileAssetIds.includes(file.id)}
                      onChange={() =>
                        updateForm('fileAssetIds', toggle(form.fileAssetIds, file.id))
                      }
                      type="checkbox"
                    />
                    <span>{file.name}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          {detail ? (
            <section className="handout-preview">
              <h3>预览结构</h3>
              {detail.previewSections.map((section, index) => (
                <article key={section.knowledgePoint?.id ?? `other-${index}`}>
                  <h4>{section.knowledgePoint?.name ?? '未归入知识点的素材'}</h4>
                  <ol>
                    {section.questions.map((question) => (
                      <li key={question.id}>{question.stem}</li>
                    ))}
                  </ol>
                  <ul>
                    {section.files.map((file) => (
                      <li key={file.id}>{file.name}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </section>
          ) : null}
        </section>
      </div>
    </>
  );
}

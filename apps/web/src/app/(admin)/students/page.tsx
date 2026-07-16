'use client';

import type {
  MasteryStatus,
  StudentDetail,
  StudentFilterOptions,
  StudentListResponse,
  StudentSummary
} from '@tj-edu/shared';
import { useEffect, useMemo, useState } from 'react';
import { getStoredToken } from '../../../lib/auth';
import {
  getStudent,
  getStudentFilters,
  listStudents,
  updateStudentMistake,
  updateStudentProfile
} from '../../../lib/students';

const masteryLabels: Record<MasteryStatus, string> = {
  NEW: '新错题',
  REVIEWING: '复习中',
  MASTERED: '已掌握'
};

const lessonStatusLabels = {
  SCHEDULED: '已排课',
  COMPLETED: '已完成',
  CANCELLED: '已取消'
} as const;

const lessonTypeLabels = {
  GROUP: '班课',
  ONE_ON_ONE: '一对一'
} as const;

interface FilterState {
  gradeId: string;
  regionId: string;
  search: string;
}

const initialFilters: FilterState = {
  gradeId: '',
  regionId: '',
  search: ''
};

function formatDateTime(value: string | null) {
  if (!value) {
    return '暂无记录';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function formatDate(value: string | null) {
  if (!value) {
    return '未更新';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(value));
}

export default function StudentsPage() {
  const [options, setOptions] = useState<StudentFilterOptions | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [result, setResult] = useState<StudentListResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [profileForm, setProfileForm] = useState({ summary: '', goals: '', notes: '' });
  const [page, setPage] = useState(1);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    getStudentFilters(token)
      .then(setOptions)
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : '筛选项加载失败。');
      });
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    setLoadingList(true);
    setError(null);
    listStudents(token, { ...filters, page, pageSize: 8 })
      .then((payload) => {
        setResult(payload);
        setSelectedId((current) => current ?? payload.items[0]?.id ?? null);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : '学生列表加载失败。');
      })
      .finally(() => setLoadingList(false));
  }, [filters, page, token]);

  useEffect(() => {
    if (!token || !selectedId) {
      setDetail(null);
      return;
    }

    setLoadingDetail(true);
    setMessage(null);
    getStudent(token, selectedId)
      .then((payload) => {
        setDetail(payload);
        setProfileForm({
          summary: payload.profile.summary ?? '',
          goals: payload.profile.goals ?? '',
          notes: payload.profile.notes ?? ''
        });
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : '学生详情加载失败。');
      })
      .finally(() => setLoadingDetail(false));
  }, [selectedId, token]);

  function updateFilter<Key extends keyof FilterState>(key: Key, value: FilterState[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setSelectedId(null);
  }

  function selectStudent(student: StudentSummary) {
    setSelectedId(student.id);
  }

  async function saveProfile() {
    if (!token || !detail) {
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await updateStudentProfile(token, detail.id, profileForm);
      setDetail(updated);
      setMessage('档案备注已保存。');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '档案保存失败。');
    } finally {
      setSaving(false);
    }
  }

  async function changeMistakeStatus(mistakeId: string, status: MasteryStatus) {
    if (!token || !detail) {
      return;
    }

    setMessage(null);
    setError(null);
    try {
      const updatedMistake = await updateStudentMistake(token, detail.id, mistakeId, { status });
      setDetail((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          mistakes: current.mistakes.map((mistake) =>
            mistake.id === updatedMistake.id ? updatedMistake : mistake
          ),
          openMistakeCount: current.mistakes.filter((mistake) =>
            mistake.id === updatedMistake.id
              ? updatedMistake.status !== 'MASTERED'
              : mistake.status !== 'MASTERED'
          ).length
        };
      });
      setMessage('错题掌握状态已更新。');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '错题状态更新失败。');
    }
  }

  return (
    <>
      <section className="page-header">
        <div>
          <h1>学生档案</h1>
          <p>沉淀课程记录、错题掌握状态和教师备注，支撑一生一案跟进。</p>
        </div>
        <span className="status-pill">{result?.total ?? 0} 名学生</span>
      </section>

      <div className="filter-strip student-filter-strip" aria-label="学生筛选">
        <input
          aria-label="搜索学生"
          onChange={(event) => updateFilter('search', event.target.value)}
          placeholder="搜索姓名、学号、学校"
          value={filters.search}
        />
        <select
          aria-label="年级"
          onChange={(event) => updateFilter('gradeId', event.target.value)}
          value={filters.gradeId}
        >
          <option value="">全部年级</option>
          {options?.grades.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {grade.name}
            </option>
          ))}
        </select>
        <select
          aria-label="区域"
          onChange={(event) => updateFilter('regionId', event.target.value)}
          value={filters.regionId}
        >
          <option value="">全部区域</option>
          {options?.regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
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

      <div className="student-workspace">
        <section className="student-list-panel" aria-label="学生列表">
          {loadingList ? (
            <div className="empty-panel">
              <h2>正在加载学生</h2>
              <p>正在读取当前机构的学生档案数据。</p>
            </div>
          ) : result?.items.length ? (
            <>
              <div className="student-list">
                {result.items.map((student) => (
                  <button
                    className={`student-row ${selectedId === student.id ? 'active' : ''}`}
                    key={student.id}
                    onClick={() => selectStudent(student)}
                    type="button"
                  >
                    <span>
                      <strong>{student.displayName}</strong>
                      <small>
                        {student.studentNo ?? '未填学号'} · {student.grade.name}
                      </small>
                    </span>
                    <span>
                      <b>{student.openMistakeCount}</b>
                      <small>待复习</small>
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
              <h2>暂无学生</h2>
              <p>调整筛选条件后重试，或先通过 seed/API 录入学生。</p>
            </div>
          )}
        </section>

        <section className="student-detail-panel" aria-label="学生详情">
          {loadingDetail ? (
            <div className="empty-panel">
              <h2>正在加载档案</h2>
              <p>正在整理学习记录和错题数据。</p>
            </div>
          ) : detail ? (
            <>
              <header className="student-detail-header">
                <div>
                  <h2>{detail.displayName}</h2>
                  <p>
                    {detail.grade.name} · {detail.region?.name ?? '未填区域'} ·{' '}
                    {detail.schoolName ?? '未填学校'}
                  </p>
                </div>
                <span className="status-pill">{detail.openMistakeCount} 条待复习</span>
              </header>

              <div className="student-stat-grid">
                <div>
                  <span>累计错题</span>
                  <strong>{detail.mistakeCount}</strong>
                </div>
                <div>
                  <span>最近课节</span>
                  <strong>{formatDateTime(detail.lastLessonAt)}</strong>
                </div>
                <div>
                  <span>档案更新</span>
                  <strong>{formatDate(detail.profile.updatedAt)}</strong>
                </div>
              </div>

              <div className="student-profile-editor">
                <label>
                  <span>阶段总结</span>
                  <textarea
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, summary: event.target.value }))
                    }
                    value={profileForm.summary}
                  />
                </label>
                <label>
                  <span>近期目标</span>
                  <textarea
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, goals: event.target.value }))
                    }
                    value={profileForm.goals}
                  />
                </label>
                <label className="profile-notes">
                  <span>教师备注</span>
                  <textarea
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    value={profileForm.notes}
                  />
                </label>
                <div className="student-form-actions">
                  <span>
                    {detail.profile.updatedBy
                      ? `上次由 ${detail.profile.updatedBy.displayName} 更新`
                      : '尚无更新人'}
                  </span>
                  <button
                    className="primary-button"
                    disabled={saving}
                    onClick={saveProfile}
                    type="button"
                  >
                    {saving ? '保存中' : '保存档案'}
                  </button>
                </div>
              </div>

              <div className="student-detail-grid">
                <section>
                  <h3>学习记录</h3>
                  <ol className="record-list">
                    {detail.lessons.map((lesson) => (
                      <li key={lesson.id}>
                        <time>{formatDateTime(lesson.startsAt)}</time>
                        <div>
                          <strong>{lesson.title}</strong>
                          <span>
                            {lesson.subject.name} · {lesson.teacher.displayName} ·{' '}
                            {lessonTypeLabels[lesson.type]} · {lessonStatusLabels[lesson.status]}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                <section>
                  <h3>错题本</h3>
                  <div className="mistake-list">
                    {detail.mistakes.map((mistake) => (
                      <article className="mistake-item" key={mistake.id}>
                        <div>
                          <strong>{mistake.question.stem}</strong>
                          <span>
                            {mistake.question.subject.name} ·{' '}
                            {mistake.question.knowledgePoints
                              .map((point) => point.name)
                              .join('、') || '未关联知识点'}
                          </span>
                        </div>
                        <select
                          aria-label="掌握状态"
                          onChange={(event) =>
                            changeMistakeStatus(mistake.id, event.target.value as MasteryStatus)
                          }
                          value={mistake.status}
                        >
                          {(options?.masteryStatuses ?? []).map((status) => (
                            <option key={status} value={status}>
                              {masteryLabels[status]}
                            </option>
                          ))}
                        </select>
                        <small>
                          {mistake.lesson?.title ?? '未关联课节'} ·{' '}
                          {formatDateTime(mistake.occurredAt)}
                        </small>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </>
          ) : (
            <div className="empty-panel">
              <h2>选择一名学生</h2>
              <p>在左侧列表选择学生后，可以查看档案、课程记录和错题状态。</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

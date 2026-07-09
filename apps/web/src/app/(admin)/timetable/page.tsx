'use client';

import type {
  LessonStatus,
  LessonSummary,
  LessonType,
  ScheduleConflict,
  TimetableFilterOptions
} from '@tj-edu/shared';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiError, getStoredToken } from '../../../lib/auth';
import {
  createLesson,
  getTimetableFilters,
  listLessons,
  type LessonInput,
  updateLesson
} from '../../../lib/timetable';

const statusLabels: Record<LessonStatus, string> = {
  SCHEDULED: '已排课',
  COMPLETED: '已完成',
  CANCELLED: '已取消'
};

const typeLabels: Record<LessonType, string> = {
  GROUP: '班课',
  ONE_ON_ONE: '一对一'
};

const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function mondayOf(date: Date) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function inputDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function timeText(date: string) {
  return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function dateText(date: Date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

interface FormState {
  timetableId: string;
  title: string;
  type: LessonType;
  teacherId: string;
  subjectId: string;
  gradeId: string;
  classroom: string;
  startsAt: string;
  endsAt: string;
  status: LessonStatus;
  studentIds: string[];
}

function initialForm(options: TimetableFilterOptions | null, weekStart: Date): FormState {
  const startsAt = new Date(weekStart);
  startsAt.setHours(18, 30, 0, 0);
  const endsAt = new Date(startsAt);
  endsAt.setMinutes(endsAt.getMinutes() + 90);

  return {
    timetableId: options?.timetables[0]?.id ?? '',
    title: '',
    type: 'GROUP',
    teacherId: options?.teachers[0]?.id ?? '',
    subjectId: options?.subjects[0]?.id ?? '',
    gradeId: '',
    classroom: '',
    startsAt: inputDateTime(startsAt),
    endsAt: inputDateTime(endsAt),
    status: 'SCHEDULED',
    studentIds: []
  };
}

export default function TimetablePage() {
  const [options, setOptions] = useState<TimetableFilterOptions | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [view, setView] = useState<'week' | 'list'>('week');
  const [teacherId, setTeacherId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [status, setStatus] = useState<LessonStatus | ''>('');
  const [form, setForm] = useState<FormState>(() => initialForm(null, mondayOf(new Date())));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    getTimetableFilters(token)
      .then((result) => {
        setOptions(result);
        setForm((current) => ({
          ...current,
          timetableId: current.timetableId || result.timetables[0]?.id || '',
          teacherId: current.teacherId || result.teachers[0]?.id || '',
          subjectId: current.subjectId || result.subjects[0]?.id || ''
        }));
      })
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : '筛选项加载失败。')
      );
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    setLoading(true);
    setError(null);
    listLessons(token, {
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
      teacherId: teacherId || undefined,
      subjectId: subjectId || undefined,
      status
    })
      .then((result) => setLessons(result.items))
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : '课节加载失败。')
      )
      .finally(() => setLoading(false));
  }, [reloadKey, status, subjectId, teacherId, weekEnd, weekStart]);

  const lessonsByDay = useMemo(
    () =>
      days.map((day) => {
        const next = addDays(day, 1);
        return lessons.filter((lesson) => {
          const startsAt = new Date(lesson.startsAt);
          return startsAt >= day && startsAt < next;
        });
      }),
    [days, lessons]
  );

  function resetForm() {
    setEditingId(null);
    setConflicts([]);
    setForm(initialForm(options, weekStart));
  }

  function changeWeek(nextWeek: Date) {
    setWeekStart(nextWeek);
    if (!editingId) {
      setForm(initialForm(options, nextWeek));
    }
  }

  function editLesson(lesson: LessonSummary) {
    setEditingId(lesson.id);
    setConflicts([]);
    setForm({
      timetableId: lesson.timetableId,
      title: lesson.title,
      type: lesson.type,
      teacherId: lesson.teacher.id,
      subjectId: lesson.subject.id,
      gradeId: lesson.grade?.id ?? '',
      classroom: lesson.classroom ?? '',
      startsAt: inputDateTime(new Date(lesson.startsAt)),
      endsAt: inputDateTime(new Date(lesson.endsAt)),
      status: lesson.status,
      studentIds: lesson.students.map((student) => student.id)
    });
  }

  function toggleStudent(id: string) {
    setForm((current) => ({
      ...current,
      studentIds: current.studentIds.includes(id)
        ? current.studentIds.filter((studentId) => studentId !== id)
        : current.type === 'ONE_ON_ONE'
          ? [id]
          : [...current.studentIds, id]
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getStoredToken();
    if (!token) return;

    const input: LessonInput = {
      timetableId: form.timetableId,
      teacherId: form.teacherId,
      subjectId: form.subjectId,
      gradeId: form.gradeId || undefined,
      title: form.title,
      type: form.type,
      classroom: form.classroom || undefined,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      status: form.status,
      studentIds: form.studentIds
    };

    setSaving(true);
    setError(null);
    setConflicts([]);
    try {
      if (editingId) await updateLesson(token, editingId, input);
      else await createLesson(token, input);
      resetForm();
      setReloadKey((current) => current + 1);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 409) {
        setConflicts((requestError.payload.conflicts ?? []) as ScheduleConflict[]);
      }
      setError(requestError instanceof Error ? requestError.message : '课节保存失败。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="page-header">
        <div>
          <h1>课表</h1>
          <p>按周管理班课和一对一课节，并检查教师、教室与学生时间冲突。</p>
        </div>
        <span className="status-pill">本周 {lessons.length} 节课</span>
      </section>

      <div className="schedule-toolbar">
        <div className="segmented-control" aria-label="课表视图">
          <button
            className={view === 'week' ? 'active' : ''}
            onClick={() => setView('week')}
            type="button"
          >
            周视图
          </button>
          <button
            className={view === 'list' ? 'active' : ''}
            onClick={() => setView('list')}
            type="button"
          >
            列表
          </button>
        </div>
        <div className="week-navigation">
          <button
            className="secondary-button"
            onClick={() => changeWeek(addDays(weekStart, -7))}
            type="button"
          >
            上一周
          </button>
          <button
            className="secondary-button"
            onClick={() => changeWeek(mondayOf(new Date()))}
            type="button"
          >
            本周
          </button>
          <button
            className="secondary-button"
            onClick={() => changeWeek(addDays(weekStart, 7))}
            type="button"
          >
            下一周
          </button>
          <strong>
            {dateText(weekStart)} - {dateText(addDays(weekStart, 6))}
          </strong>
        </div>
      </div>

      <div className="filter-strip schedule-filter-strip" aria-label="课表筛选">
        <select
          aria-label="教师"
          onChange={(event) => setTeacherId(event.target.value)}
          value={teacherId}
        >
          <option value="">全部教师</option>
          {options?.teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.displayName}
            </option>
          ))}
        </select>
        <select
          aria-label="学科"
          onChange={(event) => setSubjectId(event.target.value)}
          value={subjectId}
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
          onChange={(event) => setStatus(event.target.value as LessonStatus | '')}
          value={status}
        >
          <option value="">全部状态</option>
          {options?.statuses.map((item) => (
            <option key={item} value={item}>
              {statusLabels[item]}
            </option>
          ))}
        </select>
      </div>

      {error && !conflicts.length ? (
        <div className="inline-alert" role="alert">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="empty-panel">
          <h2>正在加载课表</h2>
          <p>正在读取本周课节安排。</p>
        </div>
      ) : view === 'week' ? (
        <div className="week-board">
          {days.map((day, index) => (
            <section className="week-column" key={day.toISOString()}>
              <header>
                <strong>{weekdays[index]}</strong>
                <span>{dateText(day)}</span>
              </header>
              <div className="week-lessons">
                {lessonsByDay[index].length ? (
                  lessonsByDay[index].map((lesson) => (
                    <button
                      className={`lesson-tile lesson-${lesson.status.toLowerCase()}`}
                      key={lesson.id}
                      onClick={() => editLesson(lesson)}
                      type="button"
                    >
                      <time>
                        {timeText(lesson.startsAt)} - {timeText(lesson.endsAt)}
                      </time>
                      <strong>{lesson.title}</strong>
                      <span>
                        {lesson.subject.name} · {lesson.teacher.displayName}
                      </span>
                      <span>
                        {lesson.classroom ?? '教室待定'} · {typeLabels[lesson.type]}
                      </span>
                    </button>
                  ))
                ) : (
                  <span className="day-empty">暂无课节</span>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : lessons.length ? (
        <div className="table-scroll">
          <table className="data-table schedule-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>课程</th>
                <th>教师</th>
                <th>学生</th>
                <th>教室</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((lesson) => (
                <tr key={lesson.id}>
                  <td>
                    {new Date(lesson.startsAt).toLocaleDateString('zh-CN')}
                    <span className="table-secondary">
                      {timeText(lesson.startsAt)} - {timeText(lesson.endsAt)}
                    </span>
                  </td>
                  <td>
                    {lesson.title}
                    <span className="table-secondary">
                      {lesson.subject.name} · {typeLabels[lesson.type]}
                    </span>
                  </td>
                  <td>{lesson.teacher.displayName}</td>
                  <td>{lesson.students.map((student) => student.displayName).join('、')}</td>
                  <td>{lesson.classroom ?? '待定'}</td>
                  <td>{statusLabels[lesson.status]}</td>
                  <td>
                    <button
                      className="secondary-button"
                      onClick={() => editLesson(lesson)}
                      type="button"
                    >
                      编辑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-panel">
          <h2>本周暂无课节</h2>
          <p>可通过下方表单创建第一节课。</p>
        </div>
      )}

      <section className="lesson-editor">
        <div className="lesson-editor-heading">
          <div>
            <h2>{editingId ? '编辑课节' : '新增课节'}</h2>
            <p>保存前会自动检查时间冲突。</p>
          </div>
          {editingId ? (
            <button className="secondary-button" onClick={resetForm} type="button">
              取消编辑
            </button>
          ) : null}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="lesson-form-grid">
            <label>
              <span>课程名称</span>
              <input
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
                value={form.title}
              />
            </label>
            <label>
              <span>课表周期</span>
              <select
                onChange={(event) => setForm({ ...form, timetableId: event.target.value })}
                required
                value={form.timetableId}
              >
                {options?.timetables.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>课程类型</span>
              <select
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value as LessonType, studentIds: [] })
                }
                value={form.type}
              >
                {options?.types.map((item) => (
                  <option key={item} value={item}>
                    {typeLabels[item]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>教师</span>
              <select
                onChange={(event) => setForm({ ...form, teacherId: event.target.value })}
                required
                value={form.teacherId}
              >
                {options?.teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>学科</span>
              <select
                onChange={(event) => setForm({ ...form, subjectId: event.target.value })}
                required
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
                onChange={(event) => setForm({ ...form, gradeId: event.target.value })}
                value={form.gradeId}
              >
                <option value="">不限定</option>
                {options?.grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>开始时间</span>
              <input
                onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
                required
                type="datetime-local"
                value={form.startsAt}
              />
            </label>
            <label>
              <span>结束时间</span>
              <input
                onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
                required
                type="datetime-local"
                value={form.endsAt}
              />
            </label>
            <label>
              <span>教室</span>
              <input
                onChange={(event) => setForm({ ...form, classroom: event.target.value })}
                placeholder="如 A301"
                value={form.classroom}
              />
            </label>
            <label>
              <span>状态</span>
              <select
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as LessonStatus })
                }
                value={form.status}
              >
                {options?.statuses.map((item) => (
                  <option key={item} value={item}>
                    {statusLabels[item]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <fieldset className="student-selector">
            <legend>上课学生</legend>
            <div>
              {options?.students.map((student) => (
                <label key={student.id}>
                  <input
                    checked={form.studentIds.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                    type="checkbox"
                  />
                  <span>
                    {student.displayName}
                    <small>{student.code}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {conflicts.length ? (
            <div className="conflict-panel" role="alert">
              <strong>发现时间冲突</strong>
              <ul>
                {conflicts.map((conflict, index) => (
                  <li key={`${conflict.type}-${conflict.lessonId}-${index}`}>
                    {conflict.label} 与“{conflict.lessonTitle}”冲突（{timeText(conflict.startsAt)} -{' '}
                    {timeText(conflict.endsAt)}）
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="lesson-form-actions">
            <button className="primary-button" disabled={saving} type="submit">
              {saving ? '正在保存' : editingId ? '保存修改' : '创建课节'}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

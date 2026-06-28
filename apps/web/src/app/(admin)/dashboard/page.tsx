const metrics = [
  { label: '题库题目', value: '0' },
  { label: '讲义草稿', value: '0' },
  { label: '本周课节', value: '0' },
  { label: '学生档案', value: '0' }
];

const upcomingWork = [
  ['工程基础', '初始化 monorepo、Web、API'],
  ['认证权限', 'JWT 登录、四角色权限与路由保护'],
  ['题库 MVP', '筛选、列表、详情和组题预留']
];

export default function DashboardPage() {
  return (
    <>
      <section className="metric-grid" aria-label="关键指标">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>
      <section className="work-grid">
        <article className="work-card">
          <h2>当前建设重点</h2>
          <ul className="compact-list">
            {upcomingWork.map(([title, detail]) => (
              <li key={title}>
                <strong>{title}</strong>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="work-card">
          <h2>后续智能能力</h2>
          <ul className="compact-list">
            <li>
              <strong>OCR</strong>
              <span>试卷与错题识别</span>
            </li>
            <li>
              <strong>相似题</strong>
              <span>向量检索与知识点匹配</span>
            </li>
            <li>
              <strong>报告</strong>
              <span>个性化学习建议</span>
            </li>
          </ul>
        </article>
      </section>
    </>
  );
}

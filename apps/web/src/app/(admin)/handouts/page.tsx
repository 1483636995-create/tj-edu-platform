const drafts = [
  ['九年级数学专题讲义', '二次函数与压轴题', '草稿'],
  ['八年级物理同步讲义', '浮力与压强', '待补题'],
  ['七年级英语阅读训练', '阅读理解与完形', '草稿']
];

export default function HandoutsPage() {
  return (
    <>
      <section className="page-header">
        <div>
          <h1>讲义</h1>
          <p>整合教材、老师自有资料和题库题目，沉淀可复用讲义。</p>
        </div>
        <span className="status-pill">流程设计中</span>
      </section>
      <article className="work-card">
        <h2>讲义草稿</h2>
        <ul className="compact-list">
          {drafts.map(([title, scope, status]) => (
            <li key={title}>
              <strong>{title}</strong>
              <span>
                {scope} · {status}
              </span>
            </li>
          ))}
        </ul>
      </article>
    </>
  );
}

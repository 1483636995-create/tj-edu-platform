const lessons = [
  ['周一 18:30', '九年级数学提高班', '王老师'],
  ['周三 19:00', '八年级物理一对一', '李老师'],
  ['周六 09:00', '七年级英语阅读班', '张老师']
];

export default function TimetablePage() {
  return (
    <>
      <section className="page-header">
        <div>
          <h1>课表</h1>
          <p>管理班课、一对一、教师、教室和学生维度的课节安排。</p>
        </div>
        <span className="status-pill">周视图预留</span>
      </section>
      <article className="work-card">
        <h2>本周课节</h2>
        <ul className="timeline">
          {lessons.map(([time, title, teacher]) => (
            <li key={`${time}-${title}`}>
              <time>{time}</time>
              <div>
                <strong>{title}</strong>
                <p>{teacher}</p>
              </div>
            </li>
          ))}
        </ul>
      </article>
    </>
  );
}

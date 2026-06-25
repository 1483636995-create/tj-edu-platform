import { SUBJECTS, TIANJIN_REGIONS } from '@tj-edu/shared';

const rows = [
  ['数学', '九年级', '二次函数', '天津中考真题', '中等'],
  ['物理', '八年级', '浮力', '区域模拟', '较难'],
  ['英语', '七年级', '阅读理解', '校内月考', '基础']
];

export default function QuestionsPage() {
  return (
    <>
      <section className="page-header">
        <div>
          <h1>题库</h1>
          <p>按学科、年级、区域、年份、试卷类型和知识点筛选题目。</p>
        </div>
        <span className="status-pill">MVP 页面壳子</span>
      </section>
      <div className="filter-strip" aria-label="题库筛选">
        <select defaultValue="">
          <option value="">学科</option>
          {SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
        <select defaultValue="">
          <option value="">年级</option>
        </select>
        <select defaultValue="">
          <option value="">区域</option>
          {TIANJIN_REGIONS.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
        <select defaultValue="">
          <option value="">年份</option>
        </select>
        <select defaultValue="">
          <option value="">知识点</option>
        </select>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>学科</th>
            <th>年级</th>
            <th>知识点</th>
            <th>来源</th>
            <th>难度</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([subject, grade, point, source, difficulty]) => (
            <tr key={`${subject}-${point}`}>
              <td>{subject}</td>
              <td>{grade}</td>
              <td>{point}</td>
              <td>{source}</td>
              <td>{difficulty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

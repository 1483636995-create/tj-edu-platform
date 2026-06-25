const students = [
  ['学生 A', '九年级', '数学二次函数、英语阅读'],
  ['学生 B', '八年级', '物理浮力、数学几何'],
  ['学生 C', '七年级', '英语词汇、语文阅读']
];

export default function StudentsPage() {
  return (
    <>
      <section className="page-header">
        <div>
          <h1>学生档案</h1>
          <p>为教师端一生一案沉淀课程记录、测试记录和薄弱知识点。</p>
        </div>
        <span className="status-pill">档案模型预留</span>
      </section>
      <table className="data-table">
        <thead>
          <tr>
            <th>学生</th>
            <th>年级</th>
            <th>重点关注</th>
          </tr>
        </thead>
        <tbody>
          {students.map(([name, grade, focus]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{grade}</td>
              <td>{focus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

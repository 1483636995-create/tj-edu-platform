const fileTypes = [
  ['试卷', '真题、模拟、月考、校内资料'],
  ['讲义', '老师自有文档和平台生成讲义'],
  ['素材', '教材截图、解析图片、补充资料']
];

export default function FilesPage() {
  return (
    <>
      <section className="page-header">
        <div>
          <h1>文件库</h1>
          <p>统一管理试卷、讲义、教材素材和后续 OCR 原始文件。</p>
        </div>
        <span className="status-pill">对象存储预留</span>
      </section>
      <section className="work-grid">
        {fileTypes.map(([title, detail]) => (
          <article className="empty-panel" key={title}>
            <h2>{title}</h2>
            <p>{detail}</p>
          </article>
        ))}
      </section>
    </>
  );
}

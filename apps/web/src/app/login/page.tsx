export default function LoginPage() {
  return (
    <div className="login-page">
      <section className="login-panel">
        <h1>天津教辅平台</h1>
        <p>为初高中教辅机构集中管理题库、讲义、课表、学生档案和错题复习。</p>
        <form className="login-form">
          <label className="field">
            <span>账号</span>
            <input placeholder="请输入手机号或工号" />
          </label>
          <label className="field">
            <span>密码</span>
            <input placeholder="请输入密码" type="password" />
          </label>
          <button className="primary-button" type="button">
            登录后台
          </button>
        </form>
      </section>
      <aside className="login-aside" aria-label="平台能力概览">
        <div className="aside-stat">
          <strong>9</strong>
          <span>天津初高中核心学科</span>
        </div>
        <div className="aside-stat">
          <strong>1</strong>
          <span>题库、讲义、课表、档案一体化入口</span>
        </div>
        <div className="aside-stat">
          <strong>AI</strong>
          <span>预留 OCR、错题分析和个性化报告能力</span>
        </div>
      </aside>
    </div>
  );
}

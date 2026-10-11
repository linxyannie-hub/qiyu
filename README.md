# 栖愈 Qiyu Care

连接宠物家庭、医院随访团队、兽医与机构运营的诊后协同前端。

## 启动

需要 Node.js 20 或更新版本。页面无运行时第三方依赖。浏览器检查使用 Playwright。

```bash
npm start
```

打开 http://127.0.0.1:4173。

## 工作空间

右上角切换工作空间：

- 院方协同：出院草稿、行动队列、病例、复查、服务报告与设置。
- 医生工作台：计划审核、专业答复、安排调整与病例。
- 家庭照护：今日事项、实际记录、问题反馈、家人交接和资料。
- 平台运营：机构实施、模板、用量结算和支持事项。

所有工作空间共享业务状态；同源标签页会同步更新。URL 使用 hash 路由，支持静态托管和刷新。

## 验证与发布

```bash
npm ci
npx playwright install chromium
npm run check
npm test
npm run test:browser
npm run build
```

`dist/` 可部署至任何静态网站服务。GitHub Actions 在 `main` 更新时执行检查、测试、构建和 GitHub Pages 发布。

## 文件结构

```text
index.html
assets/
  app.mjs       页面、路由、表单与交互
  domain.mjs    业务对象、状态转换与校验
  store.mjs     状态持久化和同源同步
  icons.mjs     原创图形与图标
  style.css     基础组件、响应式布局和交互状态
  polish.css    字体、视觉层级、图标容器与统一间距
  fonts/        本地中文字体与 OFL 授权
scripts/
  serve.mjs     本地静态服务
  build.mjs     静态发布打包
tests/
  domain.test.mjs
  browser.mjs        多端页面与完整交互回归
.github/workflows/deploy.yml
```

## 业务约定

正式安排、执行事实、问题责任、复查状态和软件用量分别建模。已发布安排保留历史；执行更正追加记录；同轮安排调整不重复计费；改约不改医嘱；结束服务前需处理未结问题。HTML 资料包和 CSV 报告均可从对应页面下载。

家庭照护在桌面浏览器中以手机容器呈现，内部页面独立滚动；在手机上适应整屏。既有照护数据自动迁移并保留。

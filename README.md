# 栖愈 Qiyu Care

面向复杂术后照护的纯前端网站，连接家庭实际执行、原医院接手、兽医交付下一步，以及复查与本轮照护结束。

## 启动

源码开发需要 Node.js 20 或更新版本。页面无运行时第三方依赖；esbuild 和 Playwright 仅用于构建与验证。

```bash
npm start
```

打开 http://127.0.0.1:4173。

## 工作空间

右上角切换工作空间：

- 栖愈首页：平台介绍与四端入口。
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
npm run test:static
npm run build
```

`dist/` 是构建完成的静态网站，直接托管即可运行；使用相对资源路径与 hash 路由，支持域名根目录及子目录。发布入口是普通 `app.js`，无需 `.mjs` MIME 配置或运行服务器程序。CSS、图标与中文字体全部随网站提供。

### 比赛提交与静态上传包

请上传构建后的独立网站包。仓库源码 ZIP 包含开发配置、构建脚本和测试，不适合作为只接收前端页面的提交包。

```bash
npm run package:static
# 或指定输出位置
npm run package:static -- --output /完整路径/栖愈纯前端网站.zip
```

默认生成仓库上一级目录的 `栖愈纯前端网站.zip`。ZIP 的根目录直接是 `index.html` 与 `assets/`，其中只有 HTML、CSS、普通 JS、SVG、字体和字体授权文本；不包含 `package.json`、`node_modules`、构建脚本、测试、Git 信息、服务器代码或 `.mjs` 源码。解压后可直接打开首页，也可将文件上传到静态部署平台。需要目录上传的平台，选择 `dist/` 内的文件。

GitHub Actions 在 `main` 更新后完成逻辑、交互和静态产物检查，发布 GitHub Pages，并提供名为 `qiyu-static-website` 的可下载上传包。静态产物检查覆盖根目录、子目录、移动端刷新、弹窗交互和直接打开首页，并验证页面不依赖外网资源。

从 Actions 下载产物后，解开 GitHub 提供的外层归档，取出其中的 `qiyu-static.zip` 作为网站上传包。已解压的网站目录也可单独验证：`npm run test:static -- --directory /网站目录`。

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
  closure.css   术后照护阶段、接手与复查交付
  home.css      首页与工作空间入口
  fonts/        本地中文字体与相应授权（含 MiSans）
scripts/
  serve.mjs     本地静态服务
  build.mjs     浏览器代码合并、资源指纹与纯静态构建
  package-static.mjs  生成首页位于根目录的独立 ZIP
  verify-static.mjs   发布产物的浏览器检查
tests/
  domain.test.mjs
  static-build.test.mjs  上传包结构、完整性与相对路径检查
  browser.mjs        多端页面与完整交互回归
.github/workflows/deploy.yml
```

## 业务约定

正式安排、执行事实、问题责任、复查状态和软件用量分别建模。已发布安排保留历史；执行更正追加记录并按每份独立报告汇总当前事实；具体困难同时保留在报告和医院处理上下文；首次护理记录或主动求助触发有效启用，同轮安排调整不重复计费；改约不改医嘱；结束服务前需处理未结问题。HTML 资料包和 CSV 报告均可从对应页面下载。

家庭照护在桌面浏览器中以手机容器呈现，内部页面独立滚动；在手机上适应整屏。既有照护数据自动迁移并保留。

# 小白板结构、课堂流程与本地验证

小白板是 `kind: "LittleBoard"` 的 NetlessApp。宿主通过 WindowManager 注册应用，再以 `attributes.uid` 指定老师。应用借助 AppliancePlugin 的用户页面隔离完成出题、独立作答、批阅和全班展示。

## 代码结构

| 入口 | 职责 |
| --- | --- |
| `src/index.ts`、`src/app-little-board.ts` | 公共导出、NetlessApp setup、挂载白板 View 和角色 UI、销毁清理 |
| `src/teacherController.ts` | 老师出题、发布、学生名单/提交统计、查看答卷、结束与展示 |
| `src/studentController.ts` | 跟随课堂阶段、学生提交、提交后只读 |
| `src/viewManager.ts` | 白板尺寸、自适应和老师/学生视角同步 |
| `src/writableManager.ts` | 根据共享 writable/readOnly 用户列表切换 Room 可写状态 |
| `src/teacher.ts`、`src/student.ts` | 原生 DOM 视图，阶段对应的按钮、老师标签页/统计、学生等待状态 |
| `src/component/toolbar`、`pencilButtons`、`eraserButtons` | 调用 AppliancePlugin 设置工具、笔型、颜色、透明度、清空和插图 |
| `src/component/ui`、`src/component/icons`、`src/style.less` | 原生 HTML 控件、内联 SVG、应用范围内的样式 |

`setup` 创建的共享 storage 分别存储课堂阶段、学生列表、视角和可写权限。`renderControl` 为老师及各学生维护页面，学生页面继承老师题目，作答内容按用户隔离。老师选择某学生的标签页只影响本地查看；点击全班展示才发布共享 render 页面。

## 阶段和权限

| progress | 老师 | 学生 |
| --- | --- | --- |
| `padding` (0) | 初始化老师页面 | 等待 |
| `developing` (1) | 绘制题目，点击发布 | 等待，只读 |
| `answering` (2) | 查看提交统计、切换答卷、点击结束 | 在自己的页面作答，提交后只读 |
| `finish` (3) | 查看答卷，选择全班展示 | 只读 |
| `announcing` (4) | 全班共享选中的答卷，可批注 | 跟随共享页面，只读 |

本次保留公开 API、阶段数值、storage 和控制器协议。UI 使用 `document.createElement` / `createElementNS` 创建原生 DOM 和 SVG，通过 `textContent` 写入姓名等动态文本；控制器继续通过原有 setter 驱动视图更新。工具栏在可用时创建，标签按钮按 UID 复用，状态变化时保留键盘焦点。

弹层在应用内渲染，支持点击、外部点击关闭、Escape 和焦点恢复；老师标签页支持方向键、Home/End；工具标签支持中英文。透明度使用原生滑块，`0` 为有效值。关闭应用时显式清理弹层的 document 监听器、SDK 工具状态监听器和 DOM。

小白板自身已移除 `antd`、`@ant-design/icons`、React/ReactDOM 及其类型依赖，源码不再使用 JSX。原 example 也移除了未使用的 React/router 依赖和 Vite React 插件。上游 AppliancePlugin / White SDK 仍可能间接依赖 React，所以 pnpm lock 中仍有上游使用的 React 16；它们属于宿主依赖，小白板构建产物不包含 React 模块。

## 通过 window-manager example 联调

工作区已在 `window-manager/example/package.json` 登记：

```json
"@netless/app-little-white-board": "link:../../app-little-white-board"
```

1. 在小白板根目录执行 `pnpm install --frozen-lockfile && pnpm build`。
2. 在 `window-manager/example` 执行 `pnpm install`，配置一个专用测试房间对应的 `.env.little-board.local`，提供 `VITE_APPID`、`VITE_ROOM_UUID`、`VITE_ROOM_TOKEN`、`VITE_REGION`、有效的 `VITE_API_HOSTS`，并设置 `VITE_COURSEWARE_REPRO=false`。
3. 执行 `pnpm exec vite --mode little-board --host 127.0.0.1 --port 4001 --strictPort`。
4. 使用不同浏览器上下文打开 `/?uid=teacher&nickName=Teacher&force=1&lazy=0` 和 `/?uid=student&nickName=Student&force=1&lazy=0`；老师点击宿主侧 `LittleBoard` 按钮。创建者的 UID 自动成为 `attributes.uid`。

这里的 link 指向实际构建产物；修改小白板源码后重新执行 `pnpm build`。测试房间配置文件应保持本地忽略状态，避免提交 Token。

## 自动化

在小白板根目录执行：

```bash
E2E_BASE_URL=http://127.0.0.1:4001/ pnpm test:e2e
```

脚本使用 Playwright Core 和两个隔离浏览器上下文。运行前需要可用 Chromium；可通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定已安装的浏览器，或用 `pnpm exec playwright-core install chromium` 安装对应版本。`E2E_OUTPUT_DIR` 可指定报告和截图目录，默认在 `output/playwright/`。

验证覆盖两端入房、原生 DOM 挂载、出题等待/权限、全部笔型/颜色/透明度零值、橡皮/文字工具切换、键盘/外部点击关闭弹层、状态更新后焦点保持、真实鼠标绘制、发布与继承题目、学生提交/只读/老师统计、结束、键盘切换学生标签和全班展示。展示后 0/30/60 秒检查共享及本地页面、答案 ID 和完整笔迹数据，并保存双端截图；最后验证弹层打开时关闭 App 的监听器清理和重新创建。脚本要求空测试房间，仅关闭本轮创建的 App。

此脚本使用 window-manager example 暴露的本地调试对象读取同步状态；这些对象不是小白板公共 API。截图用于核对实际显示，数据相同不能独立证明像素显示相同。

## 本次验证结果（2026-10-22）

在 WindowManager 1.0.25、white-web-sdk 2.16.59、AppliancePlugin 1.1.45 的 example 环境，原生 DOM 版本 Chromium 双端 **15 项检查通过**，无未捕获浏览器异常。全班展示后 0、30、60 秒共享页面与完整笔迹数据一致，双端截图均可见老师题目和学生答案；关闭时清理及重新创建验证通过。

相同构建配置下的 IIFE 产物：

| 版本 | 原始 bytes | gzip bytes |
| --- | ---: | ---: |
| Ant Design + React | 621,542 | 205,132 |
| 原生控件 + React（上一轮） | 276,276 | 92,575 |
| 原生 DOM（本轮） | 136,255 | 48,041 |

本轮比上一轮原始体积减少 50.7%，比最初版本减少 78.1%。验证覆盖一名老师、一名学生的课堂主流程，尚未覆盖断线重连、回放、多浏览器及图片插入/清空的完整业务测试。

原 `example/` 使用较旧的 WindowManager 0.4.75，与根包本地自动安装的 1.0.13 类型存在冲突，且原配置未向引入的源码提供 `__VERSION__` 声明，其独立 `pnpm build` 仍受这些配置问题影响。本次运行验证使用上述已通过的 `window-manager/example`，未升级旧 example 的 SDK 版本。

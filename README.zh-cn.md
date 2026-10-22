# app-little-white-board

基于 Netless 的**小白板**应用，支持在不同场景屏幕间切换，适用于互动课堂中的出题、答题与作业展示。

![小白板示意](https://github.com/user-attachments/assets/20810ea6-7d85-4e72-b75f-185599fffaf8)

## 功能特性

- **角色区分**：老师端与学生端，老师控制流程（出题、结束、全班展示），学生答题与提交
- **流程状态**：初始等待 → 出题中 → 答题中 → 结束 → 公布结果
- **多语言**：支持 `zh-CN`（中文）、`en`（英文）
- **绘图工具**：铅笔、橡皮、形状、文字、箭头等（依赖白板 SDK）
- **与白板联动**：作为 WindowManager 应用插入房间，需指定 `scenePath` 与老师 `uid`

## 安装

```bash
npm add @netless/app-little-white-board
```

## 依赖项

本应用依赖以下 npm 包（见 `package.json` 的 peerDependencies）：

| 依赖 | 说明 |
|------|------|
| `@netless/window-manager` | 多窗口/应用管理 |
| `white-web-sdk` | 互动白板 SDK |
| **`@netless/appliance-plugin`** | **白板教具绘制插件（必须开启）** |

### 必须开启 appliance-plugin

小白板的绘图能力（铅笔、橡皮、形状、文字等）依赖 [**appliance-plugin**](https://github.com/netless-io/fastboard/blob/main/docs/zh/appliance-plugin.md)。接入时**必须**安装并启用该插件，否则小白板无法正常绘制。

- **文档**：[appliance-plugin 中文文档](https://github.com/netless-io/fastboard/blob/main/docs/zh/appliance-plugin.md)
- **多窗口接入**：使用 `ApplianceMultiPlugin`，在 `joinRoom` 的 `invisiblePlugins` 中传入，并在挂载 WindowManager 后调用 `ApplianceMultiPlugin.getInstance(manager, { options: { cdn: { fullWorkerUrl, subWorkerUrl } } })`，同时 `managerConfig` 中设置 `supportAppliancePlugin: true`。
- **样式**：需引入 `import '@netless/appliance-plugin/dist/style.css'`。

## 使用方法

### 1. 注册应用

在使用前将本应用注册到 WindowManager：

```ts
import LittleBoard from "@netless/app-little-white-board";

WindowManager.register({
  kind: "LittleBoard",
  src: LittleBoard,
  appOptions: {
    /** 语言："en" | "zh-CN"，默认 zh-CN */
    language: "zh-CN",
    /** 是否禁止用户平移/缩放画布 */
    disableCameraTransform: true,
    /** 点击图片时的上传回调，需完成上传并返回图片信息方可插入图片 */
    async onClickImage() {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            uuid: Date.now().toString(),
            src: "https://p5.ssl.qhimg.com/t01a2bd87890397464a.png",
            centerX: 0,
            centerY: 0,
            width: 100,
            height: 100,
            uniformScale: false,
          });
        }, 1000);
      });
    },
    /** 应用挂载时回调，可选 */
    onMount: (appId: string, userId: string) => {
      console.log("LittleBoard Mount", appId, userId);
      !isWritable && manager?.setReadonly(true);
    },
    /** 老师点击「发布」出题时回调，可选 */
    onPublishQuestion: (appId: string, userId: string) => {
      console.log("LittleBoard PublishQuestion", appId, userId);
    },
    /** 学生点击「提交」时回调，可选 */
    onCommit: (appId: string, userId: string) => {
      console.log("LittleBoard Commit", appId, userId);
    },
  },
});
```

### 2. 插入小白板课件

将小白板作为课件插入房间：

```ts
manager.addApp({
  kind: "LittleBoard",
  options: {
    title: "小白板",
    /** 白板场景路径，必填 */
    scenePath: "/LittleBoard",
  },
  attributes: {
    /** 老师 uid，用于区分谁可以控制应用（翻页、点击等） */
    uid: isWritable && sessionStorage.getItem("uid"),
  },
});
```

## 注意事项

- **唯一控制者**：同一时间仅允许一名用户控制应用（翻页、在应用内点击等），因此 `attributes.uid` 必须设置为**老师的 uid**。
- **依赖与插件**：所需依赖及**必须开启的 appliance-plugin** 说明见上方 [依赖项](#依赖项)。

## 小白板操作步骤（Fastboard Demo）

以下步骤基于 [Fastboard Demo 官网](https://demo.whiteboard.agora.io) 的典型使用流程。

### 1. 打开 Fastboard Demo

打开 [Fastboard Demo 官网](https://demo.whiteboard.agora.io)。

### 2. 以老师身份进入

输入测试老师的 name，点击进入。

![进入房间](https://github.com/user-attachments/assets/26759b45-5769-4777-aa31-02d8a7a383db)

### 3. 分享房间链接给学生

复制老师房间的链接，发送给其他终端（学生），学生打开链接即可进入同一房间。

![复制房间链接](https://github.com/user-attachments/assets/3a76165d-2d38-479b-83d6-d434b91abd03)

### 4. 打开小白板

在左侧 toolbar 中选择并打开小白板。

![打开小白板](https://github.com/user-attachments/assets/4a9d11a0-fe9b-484a-9ddf-1089784d1460)

### 5. 老师出题并发布

老师在小白板上书写/绘图后，点击 **发布** 按钮，即可将内容同步到所有学生的小白板。

![老师发布](https://github.com/user-attachments/assets/b1fb179a-50e4-4ba0-a8c4-0064204b67b4)

### 6. 学生答题并提交

学生在自己的小白板上作答，完成后点击 **提交** 按钮提交作业。

![学生提交](https://github.com/user-attachments/assets/678a8740-5bd8-4f98-838b-65f24e065976)

### 7. 老师结束答题

老师结束答题时，点击 **结束** 按钮。

![结束答题](https://github.com/user-attachments/assets/5a3b1496-983b-405c-ac39-b9cc4ee82aeb)

### 8. 老师查看与全班展示

老师可查看每位学生的作业。点击 **全部展示** 可将该学生的作业及老师批改内容向全班展示。

![全班展示](https://github.com/user-attachments/assets/e28766c6-fb46-4355-a6eb-0ea4230d7a27)

## 本地示例

项目根目录下提供 `example` 示例：

1. 进入 `example` 目录并安装依赖：`pnpm i`
2. 在声网文档中申请正确的 [roomToken 及 room uuid](https://doc.shengwang.cn/doc/whiteboard/javascript/fastboard-sdk/get-started/join-room-fb#2-%E7%94%9F%E6%88%90-room-token)，并配置到 `whiteWebSdk.joinRoom` 的 `roomToken` 等参数中
3. 在终端执行：`pnpm dev`

## 相关链接

- [Netless Window Manager](https://github.com/netless-io/window-manager)
- [声网互动白板文档](https://doc.shengwang.cn/doc/whiteboard/javascript/fastboard-sdk/get-started/join-room-fb)
- [Issues](https://github.com/netless-io/app-little-white-board/issues)

## 项目结构与原生 UI 验证

参见 [代码结构、课堂流程和 window-manager 双端自动化](docs/native-ui.zh-CN.md)。UI 使用原生 DOM/CSS/SVG，无需 React 或 Ant Design。

# app-little-white-board

A Netless **small whiteboard** app that switches between different scene screens, for interactive classrooms: set questions, students answer, and show work.

![Small whiteboard](https://github.com/user-attachments/assets/20810ea6-7d85-4e72-b75f-185599fffaf8)

## Features

- **Roles**: Teacher and student. Teacher controls flow (publish, finish, show to class); students answer and submit.
- **Flow states**: Waiting → Publishing question → Answering → Finished → Announcing results.
- **i18n**: `en` and `zh-CN`.
- **Drawing tools**: Pencil, eraser, shapes, text, arrows, etc. (via whiteboard SDK.)
- **WindowManager**: Insert as an app with `scenePath` and teacher `uid`.

## Install

```bash
npm add @netless/app-little-white-board
```

## Dependencies

Peer dependencies (see `package.json`):

| Dependency | Description |
|------------|-------------|
| `@netless/window-manager` | Multi-window / app management |
| `white-web-sdk` | Interactive whiteboard SDK |
| **`@netless/appliance-plugin`** | **Drawing tools plugin (required)** |

### Enable appliance-plugin

Drawing (pencil, eraser, shapes, text, etc.) depends on [**appliance-plugin**](https://github.com/netless-io/fastboard/blob/main/docs/en/appliance-plugin.md). You **must** install and enable it, or the small whiteboard will not draw correctly.

- **Docs**: [appliance-plugin (English)](https://github.com/netless-io/fastboard/blob/main/docs/en/appliance-plugin.md) · [中文](https://github.com/netless-io/fastboard/blob/main/docs/zh/appliance-plugin.md)
- **Multi-window**: Use `ApplianceMultiPlugin`. Add it to `invisiblePlugins` in `joinRoom`, then after mounting WindowManager call `ApplianceMultiPlugin.getInstance(manager, { options: { cdn: { fullWorkerUrl, subWorkerUrl } } })`, and set `supportAppliancePlugin: true` in `managerConfig`.
- **Styles**: `import '@netless/appliance-plugin/dist/style.css'`.

## Usage

### 1. Register the app

Register with WindowManager before use:

```ts
import LittleBoard from "@netless/app-little-white-board";

WindowManager.register({
  kind: "LittleBoard",
  src: LittleBoard,
  appOptions: {
    /** language: "en" | "zh-CN" */
    language: "en",
    /** Whether to allow pan/zoom on the canvas */
    disableCameraTransform: true,
    /** Called when user clicks to insert image; must upload and return image info */
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
    /** Optional: callback when app mounts */
    onMount: (appId: string, userId: string) => {
      console.log("LittleBoard Mount", appId, userId);
      !isWritable && manager?.setReadonly(true);
    },
    /** Optional: callback when teacher publishes question */
    onPublishQuestion: (appId: string, userId: string) => {
      console.log("LittleBoard PublishQuestion", appId, userId);
    },
    /** Optional: callback when student commits answer */
    onCommit: (appId: string, userId: string) => {
      console.log("LittleBoard Commit", appId, userId);
    },
  },
});
```

### 2. Insert Little Board courseware

Add the small whiteboard to the room:

```ts
manager.addApp({
  kind: "LittleBoard",
  options: {
    title: "Little Board app",
    /** Whiteboard scene path (required) */
    scenePath: "/LittleBoard",
  },
  attributes: {
    /** Teacher uid — only this user can control the app */
    uid: isWritable && sessionStorage.getItem("uid"),
  },
});
```

## Notes

- **Single controller**: Only one user can control the app (navigate, click inside it). Set `attributes.uid` to the **teacher's uid**.
- **Dependencies & plugin**: See [Dependencies](#dependencies) above; **appliance-plugin must be enabled**.

## Quick start (Fastboard Demo)

Typical flow using [Fastboard Demo](https://demo.whiteboard.agora.io):

1. **Open** [Fastboard Demo](https://demo.whiteboard.agora.io).
2. **Join as teacher**: Enter the teacher name and join.
   ![Join room](https://github.com/user-attachments/assets/26759b45-5769-4777-aa31-02d8a7a383db)
3. **Share room link** with students so they can open the same room.
   ![Copy room link](https://github.com/user-attachments/assets/3a76165d-2d38-479b-83d6-d434b91abd03)
4. **Open small whiteboard** from the left toolbar.
   ![Open small whiteboard](https://github.com/user-attachments/assets/4a9d11a0-fe9b-484a-9ddf-1089784d1460)
5. **Teacher**: Draw/write, then click **Publish** to push content to all students.
   ![Teacher publish](https://github.com/user-attachments/assets/b1fb179a-50e4-4ba0-a8c4-0064204b67b4)
6. **Students**: Answer on their board, then click **Commit** to submit.
   ![Student commit](https://github.com/user-attachments/assets/678a8740-5bd8-4f98-838b-65f24e065976)
7. **Teacher**: Click **Finish** to end the round.
   ![Finish](https://github.com/user-attachments/assets/5a3b1496-983b-405c-ac39-b9cc4ee82aeb)
8. **Teacher**: View submissions; click **Show to class** to display a student’s work (and teacher feedback) to everyone.
   ![Show to class](https://github.com/user-attachments/assets/e28766c6-fb46-4355-a6eb-0ea4230d7a27)

## Local example

Run the `example` in the repo:

1. `cd example` and install: `pnpm i`
2. Get [roomToken and room uuid](https://doc.shengwang.cn/doc/whiteboard/javascript/fastboard-sdk/get-started/join-room-fb#2-%E7%94%9F%E6%88%90-room-token) and set them in `whiteWebSdk.joinRoom` (e.g. `roomToken`).
3. Run: `pnpm dev`

## Links

- [Netless Window Manager](https://github.com/netless-io/window-manager)
- [Agora Interactive Whiteboard docs](https://doc.shengwang.cn/doc/whiteboard/javascript/fastboard-sdk/get-started/join-room-fb)
- [Issues](https://github.com/netless-io/app-little-white-board/issues)

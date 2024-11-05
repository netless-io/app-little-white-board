# app-little-white-board

Netless App for Small whiteboard that can switch between different scene screens

## Install
`` npm add @netless/app-little-white-board ``

## Usage

Register this app to WindowManager before use:

```ts
import LittleBoard from "@netless/app-little-white-board";

WindowManager.register({
    kind: "LittleBoard",
    src: LittleBoard,
    appOptions: {
        /** 是否静止画布放缩或拖拽  */
        disableCameraTransform: true,
        /** 上传图片,返回插入图片的信息 */
        async onClickImage(){
            // 弹出云盘,模拟1s之后放回图片信息
            return new Promise((resolve) => {
                setTimeout(()=>{
                    resolve({
                        uuid: Date.now().toString(),
                        src: 'https://p5.ssl.qhimg.com/t01a2bd87890397464a.png',
                        centerX: 0,
                        centerY: 0,
                        width: 100,
                        height: 100,
                        uniformScale: false
                    });
                }, 1000)
            });
        }
        // 可选, 发布问题
        onMount:(appId:string, userId:string) => {
            console.log('LittleBoard Mount', appId, userId);
            // 禁止编辑
            !isWritable && manager?.setReadonly(true);
        },
        // 可选, 发布问题
        onPublishQuestion:(appId:string, userId:string)=>{
            console.log('LittleBoard PublishQuestion', appId, userId);
        },
        // 可选, 提交答案
        onCommit:(appId:string, userId:string) => {
            console.log('LittleBoard Commit', appId, userId);
        }
    }
});

```

Insert LittleBoard courseware into the room:

```ts
manager.addApp({
    kind: "LittleBoard",
    options: { 
        title: "小白板",
        /** 必需, 白板的路径 */
        scenePath: '/LittleBoard'
    },
    attributes: {
        /** 老师的uid */
        uid: isWritable && sessionStorage.getItem('uid'),
    }
});
```
## Notes
Only one user could control the app (navigate pages, click stuff in it). so ``attributes.uid`` must be set to the teacher's uid.
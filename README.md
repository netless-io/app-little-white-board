# app-little-white-board

Netless App for Small whiteboard that can switch between different scene screens
![Image](https://github.com/user-attachments/assets/20810ea6-7d85-4e72-b75f-185599fffaf8)

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
        /** language: "en" | "zh-CN" */
        language: 'en',
        /** Whether to resize or drag the stationary canvas  */
        disableCameraTransform: true,
        /** Access the event of uploading an image to the cloud disk, and return the information of inserting an image */
        async onClickImage(){
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
        // a callback at app mount time, not required */
        onMount:(appId:string, userId:string)=>{
            console.log('LittleBoard Mount', appId, userId);
            !isWritable && manager?.setReadonly(true);
        },
        // a callback on teacher publish question time, not required
        onPublishQuestion:(appId:string, userId:string)=>{
            console.log('LittleBoard PublishQuestion', appId, userId);
        },
        // a callback on students commit answer time, not required
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
        title: "Little Board app",
        /** Whiteboard scenePath, required */
        scenePath: '/LittleBoard'
    },
    attributes: {
        /** teacher's uid */
        uid: isWritable && sessionStorage.getItem('uid'),
    }
});
```
## Notes
Only one user could control the app (navigate pages, click stuff in it). so ``attributes.uid`` must be set to the teacher's uid.
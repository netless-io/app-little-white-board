/* eslint-disable @typescript-eslint/no-explicit-any */
import '@netless/window-manager/dist/style.css';
import './index.css';
import '@netless/appliance-plugin/dist/style.css';
import { WhiteWebSdk, DeviceType, DefaultHotKeys, HotKeyEvent, KeyboardKind} from "white-web-sdk";
import { WindowManager } from "@netless/window-manager";
import { ApplianceMultiPlugin } from '@netless/appliance-plugin';
import fullWorkerString from '@netless/appliance-plugin/dist/fullWorker.js?raw';
import subWorkerString from '@netless/appliance-plugin/dist/subWorker.js?raw';

const elm = document.getElementById('whiteboard') as HTMLDivElement;
const appIdentifier = '123456789/987654321';
const ctrlShiftHotKeyCheckerWith = (k:string) =>{
    return (event: HotKeyEvent, kind: KeyboardKind) => {
        const { key, altKey, ctrlKey, shiftKey, nativeEvent } = event;
        switch (kind) {
            case KeyboardKind.Mac: {
                return (
                    key === k &&
                    !ctrlKey &&
                    !altKey &&
                    shiftKey &&
                    !!nativeEvent?.metaKey
                );
            }
            case KeyboardKind.Windows: {
                return (
                    key === k &&
                    ctrlKey &&
                    !altKey &&
                    shiftKey &&
                    event.kind === "KeyDown"
                );
            }
            default: {
                return false;
            }
        }
    };

}
const whiteWebSdk = new WhiteWebSdk({
    appIdentifier,
    useMobXState: true,
    deviceType: DeviceType.Surface,
    // apiHosts: [
    //     "api-cn-hz.netless.group",
    // ],
})
const sUid = sessionStorage.getItem('uid');
const isWritable = !!(sUid && sUid.indexOf('1234') > 0);
const uid = sUid || 'uid-' + Math.floor(Math.random() * 10000);
if (!sUid) {
    sessionStorage.setItem('uid', uid); 
}
const room = await whiteWebSdk.joinRoom({
    uuid:"1d77bb10906411ef83863d0682a6c9bd",
    roomToken:"NETLESSROOM_YWs9VWtNUk92M1JIN2I2Z284dCZleHBpcmVBdD0xNzI5NjgwOTEzOTMyJm5vbmNlPTFkOTZiNGMwLTkwNjQtMTFlZi05NmE5LWFiMzg4NjE4OThhZiZyb2xlPTEmc2lnPWM3MWIwOWZkOWM5ZTYyNjc2MGNiZmMzZWZjNzIzOGU4MjNjN2I4MGY0YjM0ZWZmOTkwMmJhZDAwYTY0YTBhYmUmdXVpZD0xZDc3YmIxMDkwNjQxMWVmODM4NjNkMDY4MmE2YzliZA",
    uid,
    region: "cn-hz",
    isWritable: isWritable,
    floatBar: true,
    userPayload: {
        // userId: uid.split('uid-')[1],
        // userUUID: uid,
        // cursorName: `user-${uid}`,
        nickName: isWritable ? `teacher-${uid}` : `studenr-${uid}`,
    },
    hotKeys: {
        ...DefaultHotKeys,
        redo: ctrlShiftHotKeyCheckerWith("z"),
        changeToSelector: "s",
        changeToLaserPointer: "z",
        changeToPencil: "p",
        changeToRectangle: "r",
        changeToEllipse: "c",
        changeToEraser: "e",
        changeToText: "t",
        changeToStraight: "l",
        changeToArrow: "a",
        changeToHand: "h",
    },
    invisiblePlugins: [WindowManager as any, ApplianceMultiPlugin],
    disableNewPencil: false,
    useMultiViews: true, 
})
if (room.isWritable) {
    room.setScenePath("/init");
}
const manager = await WindowManager.mount({ room , container:elm, chessboard: true, cursor: true, supportAppliancePlugin: true});
if (manager) {
    // await manager.switchMainViewToWriter();
    const fullWorkerBlob = new Blob([fullWorkerString], {type: 'text/javascript'});
    const fullWorkerUrl = URL.createObjectURL(fullWorkerBlob);
    const subWorkerBlob = new Blob([subWorkerString], {type: 'text/javascript'});
    const subWorkerUrl = URL.createObjectURL(subWorkerBlob);
    const plugin = await ApplianceMultiPlugin.getInstance(manager,
        {   // 获取插件实例，全局应该只有一个插件实例，必须在 joinRoom 之后调用
            options: {
                cdn: {
                    fullWorkerUrl,
                    subWorkerUrl
                }
            }
        }
    );
    await WindowManager.register({
        kind: "LittleBoard",
        src: ()=> import('../../src/index'),
        appOptions: {
            disableCameraTransform: true,
            // 可选, 发布问题
            onMount:(appId:string, userId:string)=>{
                console.log('LittleBoard Mount', appId, userId);
                !isWritable && manager?.setReadonly(true);
            },
            // 可选, 发布问题
            onPublishQuestion:(appId:string, userId:string)=>{
                console.log('LittleBoard PublishQuestion', appId, userId);
            },
            // 可选, 提交答案
            onCommit:(appId:string, userId:string) => {
                console.log('LittleBoard Commit', appId, userId);
                if (uid === userId && room.isWritable) {
                    room.setWritable(false);
                }
            },
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
        }
    });
    if (isWritable) {
        room.disableSerialization = false;
    }
    window.appliancePlugin = plugin;
}
window.manager = manager;
document.getElementById('addBtn')?.addEventListener('click', () => {
    manager.addApp({
        kind: "LittleBoard",
        options: { 
            title: "小白板",
            scenePath: '/LittleBoard'
        },
        attributes: {
            uid: isWritable && sessionStorage.getItem('uid'),
        }
    });
});
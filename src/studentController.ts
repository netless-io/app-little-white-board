import type { AppliancePluginInstance } from "@netless/appliance-plugin/dist/plugin";
import type { AppContext, Storage } from "@netless/window-manager";
import { Api, LitteBoardStorage, Logger, ProgressType } from "./app-little-board";
import type { StudentApp } from "./student";
import cloneDeep from "lodash/cloneDeep";

export class StudentController {
    readonly appliancePlugin: AppliancePluginInstance;
    readonly context:AppContext;
    readonly uid: string;
    readonly nickName: string;
    storage: Storage<LitteBoardStorage>;
    $log: Logger;
    private vDom?: StudentApp;
    readonly api: Api;
    constructor(context: AppContext, uid: string, nickName: string, storage: Storage<LitteBoardStorage>,$log: Logger, api:Api) {
        this.context = context;
        this.appliancePlugin = (context as any).manager.windowManger._appliancePlugin;
        this.uid = uid;
        this.nickName = nickName;
        this.storage = storage;
        this.$log = $log;
        this.api = api;
        window.addEventListener("message", this.onInserImage);
    }
    get renderControl(){
        return this.appliancePlugin.currentManager?.renderControl;
    }
    setVDom(vDom: StudentApp) {
        this.vDom = vDom;
    }
    getVDom() {
        return this.vDom;
    }
    onMount() {
        if (this.api?.onMount) {
            this.api?.onMount(this.context.appId, this.uid);
        } else {
            window.postMessage({
                type: "@netless/app-little-white-board",
                eventName: "onMount",
                appId: this.context.appId,
                userId: this.uid,
                customMessage: "@netless/app-little-white-board",
            }, "*");
        }
    }
    onCommit() {
        if (this.api?.onCommit) {
            this.api.onCommit(this.context.appId, this.uid);
        } else {
            window.postMessage({
                type: "@netless/app-little-white-board",
                eventName: "onCommit",
                appId: this.context.appId,
                userId: this.uid,
                customMessage: "@netless/app-little-white-board",
            }, "*");
        }
    }
    private onInserImage = (event: MessageEvent) => {
        const data = event.data;
        const {type, eventName, payload, appId} = data;
        if (type === "@netless/app-little-white-board" && appId === this.context.appId) {
            if (eventName === "insertImage" && payload.src && payload.width && payload.height ) {
                this.appliancePlugin.currentManager?.worker.insertImage(this.context.appId, payload);
            }
        }
    }
    async insertImage() {
        if (this.api.onClickImage) {
            const image = await this.api.onClickImage();
            if (image) {
                this.appliancePlugin.currentManager?.worker.insertImage(this.context.appId, image);
            }
        } else {
            window.postMessage({
                type: "@netless/app-little-white-board",
                eventName: "onClickImage",
                appId: this.context.appId,
                userId: this.uid,
                customMessage: "@netless/app-little-white-board",
            }, "*");
        }
    }
    mount(){
        if (!this.vDom) {
            setTimeout(() => {
                this.mount();
            }, 50);
        }
        const progress =  this.storage.state.progress
        this.vDom?.setProgress(progress);
        switch (progress) {
            case ProgressType.answering:
                const user = this.storage.state.userList.find(u=>u.uid === this.uid);
                if (user) {
                    if (user.isCommit) {
                        this.setCurIsCommit(true);
                    } else {
                        this.setCurIsCommit(false);
                    }
                }
                break;
            default:
                break;
        }
        this.storage.addStateChangedListener(diff => {
            if (diff.progress && diff.progress.newValue) {
                this.vDom?.setProgress(diff.progress.newValue); 
            }
            if (diff.userList && diff.userList.newValue) {
                const userList = diff.userList.newValue || [];
                const user = userList.find(u=>u.uid === this.uid);
                if (user) {
                    if (user.isCommit) {
                        this.setCurIsCommit(true);
                    } else {
                        this.setCurIsCommit(false);
                    }
                }
            }
        });
    }
    setCurIsCommit(bol:boolean){
        const isWriteable = this.context.getIsWritable();
        this.vDom?.setIsCommit(bol);
        if (bol && isWriteable) {
            this.appliancePlugin.currentManager?.publishSelfWriteable(false, true);
            return;
        } 
        if (!bol && !isWriteable) {
            this.appliancePlugin.currentManager?.publishSelfWriteable(true, true);
            return
        }
    }
    commitAnswer(){
        if (!this.context.getIsWritable()) {
            throw new Error("[LittleBoard] not writable");
        }
        const userList = cloneDeep(this.storage.state.userList)
        const curUserIndex = userList.findIndex(u=>u.uid === this.uid);
        if (curUserIndex >- 1) {
            userList[curUserIndex].isCommit = true;
        } else {
            throw new Error("[LittleBoard] user not found");
        }
        this.storage.setState({ userList });
    }
    destory(){
        window.removeEventListener("message", this.onInserImage);
    }
}
import type { AppliancePluginInstance } from "@netless/appliance-plugin/dist/plugin";
import type { AppContext, Storage } from "@netless/window-manager";
import { Api, LitteBoardStorage, Logger, ProgressType, Student } from "./app-little-board";
import type { StudentApp } from "./student";
import cloneDeep from "lodash/cloneDeep";
import { ViewManager } from "./viewManager";
import { WritableController } from "./writableManager";

export class StudentController {
    readonly appliancePlugin: AppliancePluginInstance;
    readonly context:AppContext;
    readonly uid: string;
    readonly nickName: string;
    storage: Storage<LitteBoardStorage>;
    $log: Logger;
    private vDom?: StudentApp;
    readonly api: Api;
    readonly viewManager: ViewManager;
    readonly writeableManager: WritableController;
    constructor(
        context: AppContext, 
        uid: string, 
        nickName: string, 
        storage: Storage<LitteBoardStorage>,
        $log: Logger, 
        api:Api, 
        viewManager:ViewManager,
        writeableManager: WritableController
    ) {
        this.context = context;
        this.appliancePlugin = (context as any).manager.windowManger._appliancePlugin;
        this.uid = uid;
        this.nickName = nickName;
        this.storage = storage;
        this.$log = $log;
        this.api = api;
        this.viewManager = viewManager;
        this.writeableManager = writeableManager;
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
    private setProgressEffect(progress:ProgressType){
        this.vDom?.setProgress(progress);
        switch (progress) {
            case ProgressType.answering:
                if (this.viewManager.isHasDisabledCameraTransform && this.viewManager.view) {
                    this.viewManager.setStudentDisabledCameraTransform(false);
                }
                break;
            default:
                if (this.viewManager.isHasDisabledCameraTransform && this.viewManager.view) {
                    this.viewManager.setStudentDisabledCameraTransform(true);
                }
                break;
        }
    }
    private setUseListEffect(users?: Student[]){
        const userList = users || [];
        const user = userList.find(u=>u.uid === this.uid);
        if (user) {
            const isBol = !!user.isCommit
            this.setCurIsCommit(isBol);
        }
    }
    mount(){
        if (!this.vDom) {
            setTimeout(() => {
                this.mount();
            }, 50);
        }
        const progress =  this.storage.state.progress
        this.setProgressEffect(progress);
        this.setUseListEffect(this.storage.state.userList);
        this.storage.addStateChangedListener(diff => {
            if (diff.progress && diff.progress.newValue) {
                this.setProgressEffect(diff.progress.newValue);
            }
            if (diff.userList && diff.userList.newValue) {
                this.setUseListEffect(diff.userList.newValue);
            }
        });
        this.writeableManager.mount();
    }
    setCurIsCommit(bol:boolean){
        const isWriteable = this.context.getIsWritable();
        this.vDom?.setIsCommit(bol);
        if (bol && isWriteable) {
            this.writeableManager.publishOneWriteAble(this.uid, 'readOnly', true);
            return;
        } 
        if (!bol && !isWriteable) {
            this.writeableManager.publishOneWriteAble(this.uid, 'writable', true);
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
        this.writeableManager.publishOneWriteAble(this.uid, 'readOnly', true);
    }
    destory(){
        window.removeEventListener("message", this.onInserImage);
    }
}
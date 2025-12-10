import type { AppliancePluginInstance } from "@netless/appliance-plugin/dist/plugin";
import type { AppContext, Storage } from "@netless/window-manager";
import { Api, LitteBoardStorage, Logger, ProgressType, Student, StudentsStorage } from "./app-little-board";
import type { StudentApp } from "./student";
import { ViewManager } from "./viewManager";
import { WritableController } from "./writableManager";
import { clone } from "lodash";

export class StudentController {
    readonly appliancePlugin: AppliancePluginInstance;
    readonly context:AppContext;
    readonly uid: string;
    readonly nickName: string;
    readonly storage: Storage<LitteBoardStorage>;
    readonly studentsStorage: Storage<StudentsStorage>;
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
        studentsStorage: Storage<StudentsStorage>,
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
        this.studentsStorage = studentsStorage;
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
            this.viewManager.mount();
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
                if (!this.viewManager.isHasDisabledCameraTransform && this.viewManager.view) {
                    this.viewManager.setStudentDisabledCameraTransform(false);
                }
                break;
            default:
                if (!this.viewManager.isHasDisabledCameraTransform && this.viewManager.view) {
                    this.viewManager.setStudentDisabledCameraTransform(true);
                }
                break;
        }
    }

    private setUseItemEffect(user?: Student){
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
        const uids = Object.keys(this.studentsStorage.state || {});
        if(uids.includes(this.uid) && this.studentsStorage.state[this.uid]){
            this.setUseItemEffect(this.studentsStorage.state[this.uid]);
        }
        this.storage.addStateChangedListener(diff => {
            if (diff.progress && diff.progress.newValue) {
                this.setProgressEffect(diff.progress.newValue);
            }
        });
        this.studentsStorage.addStateChangedListener(diff => {
            if (diff) {
                const uids = Object.keys(diff);
                if(uids.includes(this.uid) && diff[this.uid] && diff[this.uid]?.newValue){
                    this.setUseItemEffect(diff[this.uid]?.newValue);
                }
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
        const curUser = clone(this.studentsStorage.state[this.uid]);
        if (curUser) {
            curUser.isCommit = true;
            this.studentsStorage.setState({ [this.uid]: curUser });
        } else {
            throw new Error("[LittleBoard] user not found");
        }
    }
    destory(){
        window.removeEventListener("message", this.onInserImage);
    }
}
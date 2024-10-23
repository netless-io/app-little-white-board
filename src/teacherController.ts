import type { AppliancePluginInstance } from "@netless/appliance-plugin";
import type { AppContext, Displayer, Storage } from "@netless/window-manager";
import { Api, LitteBoardStorage, Logger, ProgressType } from "./app-little-board";
import type { DisplayerCallbacks } from "white-web-sdk";
import { TeacherApp } from "./teacher";
import cloneDeep from "lodash/cloneDeep";
import debounce from "lodash/debounce";
import isEqual from "lodash/isEqual";
import type { Uid } from "@netless/appliance-plugin/dist/collector";

export class TeacherController {
    readonly appliancePlugin: AppliancePluginInstance;
    readonly context: AppContext;
    readonly uid: string;
    readonly nickName: string;
    readonly storage: Storage<LitteBoardStorage>;
    readonly $log: Logger;
    private vDom?: TeacherApp;
    private scenePath?: string;
    readonly api: Api;
    private timer?:number;
    constructor(context: AppContext, uid: string, nickName: string, storage: Storage<LitteBoardStorage>, $log:Logger, api:Api) {
        this.context = context;
        this.appliancePlugin = (context as any).manager.windowManger._appliancePlugin;
        this.uid = uid;
        this.nickName = nickName;
        this.storage = storage;
        this.$log = $log;
        this.scenePath = context.getView()?.focusScenePath;
        this.api = api;
        window.addEventListener("message", this.onInserImage);
    }
    setVDom(vDom: TeacherApp) {
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
    onPublishQuestion(){
        if (this.api?.onPublishQuestion) {
            this.api?.onPublishQuestion(this.context.appId, this.uid);
        } else {
            window.postMessage({
                type: "@netless/app-little-white-board",
                eventName: "onPublishQuestion",
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
    get renderControl(){
        return this.appliancePlugin.currentManager?.renderControl;
    }
    get renderPageId(){
        const render = ((this.renderControl as any).pageAuth)?.get(this.context.appId)?.get(this.scenePath)?.render;
        if (!render || render === 'localSelf') {
            return this.uid;
        }
        return render;
    }
    private get displayer(): Displayer<DisplayerCallbacks> {
        return this.context.getDisplayer();
    }
    private get isReplay(): boolean {
        return this.context.isReplay;
    }
    private get callbackName(): string {
        return this.isReplay ? "onPlayerStateChanged" : "onRoomStateChanged";
    }
    private onRoomMemberListener = debounce(()=>{
        const displayer = this.context.getDisplayer();
        if (displayer) {
            const roomMembers = displayer.state.roomMembers;
            const newAnswering = roomMembers.filter(c=>{
                const suid = c.payload?.uid;
                if (suid && suid !== this.uid) {
                    const userList = this.storage.state.userList;
                    if (userList && userList.find(u=>u.uid === suid)) {
                        return false;
                    }
                    return true;
                }
            }).map(c=>({
                uid: c.payload?.uid as string,
                nickName: (c.payload?.nickName || c.payload?.cursorName || c.payload?.uid) as string,
                isCommit: false
            }));

            if (newAnswering.length > 0) {
                const userList = cloneDeep([...this.storage.state.userList, ...newAnswering]);  
                this.storage.setState({ userList });
                const appId = this.context.appId;
                const scenePath = this.scenePath;
                if (appId && scenePath) {
                    const elementIds  = this.renderControl?.getPageInfo(this.uid, this.context.appId, scenePath);
                    for (const item of userList) {
                        const {uid} = item;
                        const hasCurPage = this.renderControl?.hasPage(uid, appId, scenePath);
                        if (!hasCurPage) {
                            this.renderControl?.addPage({
                                viewId: appId,
                                pageId: uid,
                                elementIds
                            }, true);
                        }
                    }
                }
                
            }
        }
    }, 500, {maxWait:1000}) 
    private addRoomMemberListener(){
        this.displayer.callbacks.on(this.callbackName, this.onRoomMemberListener);
    }
    private createTeacherPage(){
        this.renderControl?.destoryByViewId(this.context.appId);
        this.renderControl?.publishWriteAble([this.uid], true);
        // 创建一个老师画布,学生不可见
        this.renderControl?.addPage({
            viewId: this.context.appId,
            pageId: this.uid,
        }, true);
        this.storage.setState({
            progress: ProgressType.developing,
            userList: []
        });
        this.vDom?.setProgress(ProgressType.developing);
    }
    get teacherPage() {
        return {
            label: this.nickName,
            key: this.uid
        }
    }
    mount() {
        if (!this.vDom || !this.appliancePlugin.currentManager?.viewContainerManager.getView(this.context.appId)) {
            this.timer = setTimeout(() => {
                this.timer =  undefined;
                this.mount();
            }, 50);
            return;
        }
        const teacherPage = {label: this.nickName, key: this.uid};
        const initPages = this.storage.state.userList?.map(u=>({label: u?.nickName, key: u?.uid})) || [];
        initPages.unshift(teacherPage);
        this.vDom?.setPages(initPages);
        this.vDom?.setRenderPageId(this.renderPageId || this.uid);
        const progress =  this.storage.state.progress
        this.vDom?.setProgress(progress);
        switch (progress) {
            case ProgressType.padding:
                this.createTeacherPage();
                break;
            case ProgressType.answering:
                const userList = this.storage.state.userList || [];
                let commits = userList.filter(u=>u.isCommit).map(u=>u.nickName);
                let unCommits = userList.filter(u=>!u.isCommit).map(u=>u.nickName);
                this.vDom?.setCommitList(commits);
                this.vDom?.setUnCommitList(unCommits);
                this.updateTitle();
                this.onRoomMemberListener()
                this.addRoomMemberListener();
                break; 
            case ProgressType.finish:
            case ProgressType.announcing:
                this.displayer.callbacks.off(this.callbackName, this.onRoomMemberListener);
                break;  
            default:
                break;
        }
        this.storage.addStateChangedListener((diff) => {
            if (diff.progress && diff.progress.newValue) {
                this.vDom?.setProgress(diff.progress.newValue);
            }
            if (diff.userList && !isEqual(diff.userList.newValue, diff.userList.oldValue)) {
                const userList = diff.userList.newValue || [];
                const newPages = userList.map(u=>({label: u?.nickName, key: u?.uid}));
                newPages.unshift(this.teacherPage);
                this.vDom?.setPages(newPages);
                if (this.storage.state.progress === ProgressType.answering) {
                    const userList = diff.userList.newValue || [];
                    let commits = userList.filter(u=>u.isCommit).map(u=>u.nickName);
                    let unCommits = userList.filter(u=>!u.isCommit).map(u=>u.nickName);
                    this.vDom?.setCommitList(commits);
                    this.vDom?.setUnCommitList(unCommits);
                }
            }
        });
    }
    updateTitle() {
        if (this.storage.state.progress === ProgressType.answering) {
            const startAt = this.storage.state.startAt;
            if (startAt) {
                const now = Date.now();
                const duration = now - startAt;
                if (duration) {
                    const time = this.millisecondsToTime(duration);
                    this.api.updateTitle(time);
                }
            }
            this.timer = setTimeout(() => {
                this.timer = undefined;
                this.updateTitle()
            }, 1000);
        }
    }
    private millisecondsToTime = (milliseconds: number): string => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
      
        return [
          this.padZero(hours),
          this.padZero(minutes),
          this.padZero(seconds)
        ].join(':');
    }
    private padZero = (value: number): string => {
        return value.toString().padStart(2, '0');
      }
    publishQuestion() {
        this.appliancePlugin.currentManager?.textEditorManager.checkEmptyTextBlur();
        this.renderControl?.publishWriteAble(true);
        this.storage.setState({
            progress: ProgressType.answering,
            startAt: Date.now()
        });
        this.updateTitle();
        this.onRoomMemberListener();
        this.addRoomMemberListener();
    }
    finishAnswer() {
        this.renderControl?.publishWriteAble([this.uid], true);
        this.storage.setState({
            progress: ProgressType.finish,
            finishAt: Date.now()
        });
        this.displayer.callbacks.off(this.callbackName, this.onRoomMemberListener);
    }
    switchPage (pageId:Uid) {
        if (this.scenePath) {
            const isPublish = this.storage.state.progress === ProgressType.announcing;
            this.renderControl?.setPageRender(this.context.appId, this.scenePath, pageId, isPublish);
        }
    }
    publishAnswer(uid:string) {
        if (this.scenePath) {
            this.renderControl?.setPageRender(this.context.appId, this.scenePath, uid, true)
            this.storage.setState({
                progress: ProgressType.announcing,
            });
        }
    }
    destory() {
        if (this.timer) {
            clearTimeout(this.timer)
        }
        this.displayer.callbacks.off(this.callbackName, this.onRoomMemberListener);
        window.removeEventListener("message", this.onInserImage);
        this.storage.destroy();
    }
}
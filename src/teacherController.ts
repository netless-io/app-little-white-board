import type { AppliancePluginInstance } from "@netless/appliance-plugin";
import type { AppContext, Displayer, Storage } from "@netless/window-manager";
import { Api, LitteBoardStorage, Logger, ProgressType, Student, StudentsStorage } from "./app-little-board";
import type { DisplayerCallbacks } from "white-web-sdk";
import { TeacherApp } from "./teacher";
// import cloneDeep from "lodash/cloneDeep";
import debounce from "lodash/debounce";
// import isEqual from "lodash/isEqual";
import type { Uid } from "@netless/appliance-plugin/dist/collector";
import { ViewManager } from "./viewManager";
import { WritableController } from "./writableManager";

export class TeacherController {
    readonly appliancePlugin: AppliancePluginInstance;
    readonly context: AppContext;
    readonly uid: string;
    readonly nickName: string;
    readonly storage: Storage<LitteBoardStorage>;
    readonly studentsStorage: Storage<StudentsStorage>;
    readonly $log: Logger;
    private vDom?: TeacherApp;
    private scenePath?: string;
    readonly api: Api;
    private timer?:number;
    readonly viewManager: ViewManager;
    readonly writeableManager: WritableController;
    constructor(
        context: AppContext, 
        uid: string, 
        nickName: string, 
        storage: Storage<LitteBoardStorage>, 
        studentsStorage: Storage<StudentsStorage>,
        $log:Logger, 
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
        this.scenePath = context.getView()?.focusScenePath;
        this.api = api;
        this.viewManager = viewManager;
        this.writeableManager = writeableManager;
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
    onPublishQuestion(){
        if (!this.viewManager.isHasDisabledCameraTransform && this.viewManager.view) {
            this.viewManager.setTeacherDisabledCameraTransform(false);
            this.viewManager.setCanSync(false);
        }
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
    get pageAuth(){
        return (this.appliancePlugin.currentManager?.collector as any).getAuthSpaceData()?.pageAuth;
    }
    get renderPageId(){
        const render = ((this.renderControl as any).pageAuth)?.get(this.context.appId)?.get(this.scenePath)?.render;
        if (!render || render === 'localSelf') {
            return this.uid;
        }
        return render;
    }
    get ServiceRenderPageId(){
        if (this.scenePath) {
            const render = this.pageAuth?.[this.context.appId]?.[this.scenePath]?.render;
            return render;
        }
        return undefined;
    }
    private get displayer(): Displayer<DisplayerCallbacks> {
        return this.context.getDisplayer();
    }
    private get isReplay(): boolean {
        return this.context.isReplay;
    }
    get timestamp(): number {
        return this.context.getRoom()?.calibrationTimestamp || Date.now();
    }
    private get callbackName(): string {
        return this.isReplay ? "onPlayerStateChanged" : "onRoomStateChanged";
    }
    private onRoomMemberListener = debounce(()=>{
        const displayer = this.context.getDisplayer();
        if (displayer) {
            const roomMembers = displayer.state.roomMembers;
            const studentsList = Object.keys(this.studentsStorage.state) || [];
            console.log('studentsList===>', studentsList, roomMembers);
            const newAnswering: Uid[] = [];
            // const leaveStudents: Uid[] = [];
            // for (const uid of studentsList) {
            //     if (!roomMembers.find((item) => item.payload?.uid !== this.uid &&item.payload?.uid === uid)) {
            //         this.studentsStorage.setState({
            //             [uid]: undefined
            //         });
            //         leaveStudents.push(uid);
            //     }
            // }
            for (const member of roomMembers) {
                const suid = member.payload?.uid as string;
                if (suid && suid !== this.uid && !studentsList.find((uid: Uid) => uid ===suid)) {
                    this.studentsStorage.setState({
                        [suid]: {
                            nickName: member.payload?.nickName || member.payload?.cursorName || member.payload?.uid,
                            isCommit: false
                        }
                    });
                    newAnswering.push(suid);
                }
            };
            if (newAnswering.length > 0) { 
                const appId = this.context.appId;
                const scenePath = this.scenePath;
                if (appId && scenePath) {
                    const elementIds  = this.renderControl?.getPageInfo(this.uid, this.context.appId, scenePath);
                    for (const uid of newAnswering) {
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
            // if (leaveStudents.length > 0) {
            //     for (const uid of leaveStudents) {
            //         const appId = this.context.appId;
            //         const scenePath = this.scenePath;
            //         if (appId && scenePath) {
            //             const hasCurPage = this.renderControl?.hasPage(uid, appId, scenePath);
            //             if (hasCurPage) {
            //                 this.renderControl?.delPage(uid, this.context.appId);
            //             }
            //         }
            //     }
            // }
        }
    }, 500, {maxWait:1000}) 
    private addRoomMemberListener(){
        this.displayer.callbacks.on(this.callbackName, this.onRoomMemberListener);
    }
    private createTeacherPage(){
        this.renderControl?.destoryByViewId(this.context.appId);
        this.writeableManager.publishWriteAble([this.uid], true);
        // 创建一个老师画布,学生不可见
        this.renderControl?.addPage({
            viewId: this.context.appId,
            pageId: this.uid,
        }, true);
        this.storage.setState({
            progress: ProgressType.developing,
        });
        this.studentsStorage.emptyStorage();
        this.vDom?.setProgress(ProgressType.developing);
    }
    get teacherPage() {
        return {
            label: this.nickName,
            key: this.uid
        }
    }
    private setProgressEffect(progress:ProgressType){
        this.vDom?.setProgress(progress);
        switch (progress) {
            case ProgressType.answering:
                if (!this.viewManager.isHasDisabledCameraTransform && this.viewManager.view) {
                    this.viewManager.setTeacherDisabledCameraTransform(false);
                    this.viewManager.setCanSync(false);
                }
                break;
            default:
                if (!this.viewManager.isHasDisabledCameraTransform && this.viewManager.view) {
                    this.viewManager.setTeacherDisabledCameraTransform(false);
                    this.viewManager.setCanSync(true);
                }
                break;
        }
    }
    mount() {
        if (!this.vDom || !this.appliancePlugin.currentManager?.viewContainerManager.getView(this.context.appId)) {
            this.timer = setTimeout(() => {
                this.timer =  undefined;
                this.mount();
            }, 50) as unknown as number;
            return;
        }
        const teacherPage = {label: this.nickName, key: this.uid};
        const initPages = Object.entries(this.studentsStorage.state || {}).map(([uid, student]: [Uid, Student]) => ({label: student.nickName, key: uid})) || [];
        initPages.unshift(teacherPage);
        this.vDom?.setPages(initPages);
        this.vDom?.setRenderPageId(this.renderPageId || this.uid);
        const progress =  this.storage.state.progress
        this.setProgressEffect(progress);
        switch (progress) {
            case ProgressType.padding:
                this.createTeacherPage();
                break;
            case ProgressType.answering:
                const userList = Object.values(this.studentsStorage.state || {}) || [];
                const commits = userList.filter(u=>u.isCommit).map(u=>u.nickName);
                const unCommits = userList.filter(u=>!u.isCommit).map(u=>u.nickName);
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
                this.setProgressEffect(diff.progress.newValue);
            }
        });
        this.studentsStorage.addStateChangedListener((diff) => {
            if (diff) {
                const userList = Object.entries(this.studentsStorage.state || {}) || [];
                const newPages = userList.map(([uid,student])=>({label: student.nickName, key: uid}));
                newPages.unshift(this.teacherPage);
                this.vDom?.setPages(newPages);
                if (this.storage.state.progress === ProgressType.answering) {
                    const commits = userList.filter(u=>u[1].isCommit).map(u=>u[1].nickName);
                    const unCommits = userList.filter(u=>!u[1].isCommit).map(u=>u[1].nickName);
                    this.vDom?.setCommitList(commits);
                    this.vDom?.setUnCommitList(unCommits);
                }
            }
        });
        this.writeableManager.mount();
    }
    updateTitle() {
        if (this.storage.state.progress === ProgressType.answering) {
            const startAt = this.storage.state.startAt;
            if (startAt) {
                const duration = this.timestamp - startAt;
                if (duration) {
                    const time = this.millisecondsToTime(duration);
                    this.api.updateTitle(time);
                }
            }
            this.timer = setTimeout(() => {
                this.timer = undefined;
                this.updateTitle()
            }, 1000) as unknown as number;
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
        this.writeableManager.publishWriteAble(true);
        this.storage.setState({
            progress: ProgressType.answering,
            startAt: this.timestamp
        });
        this.updateTitle();
        this.onRoomMemberListener();
        this.addRoomMemberListener();
    }
    finishAnswer() {
        this.writeableManager.publishWriteAble([this.uid], true);
        this.storage.setState({
            progress: ProgressType.finish,
            finishAt: this.timestamp
        });
        this.displayer.callbacks.off(this.callbackName, this.onRoomMemberListener);
    }
    switchPage (pageId:Uid) {
        if (this.scenePath) {
            if (this.storage.state.progress === ProgressType.announcing) {
                this.storage.setState({
                    progress: ProgressType.finish
                });
            }
            this.renderControl?.setPageRender(this.context.appId, this.scenePath, pageId, false);
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
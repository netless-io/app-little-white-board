import type { AnimationMode, AppContext, View, Storage } from "@netless/window-manager"
import { LittleBoardAppOptions } from "./app-little-board";
import debounce from "lodash/debounce";
import throttle from "lodash/throttle";

export interface LitteBoardViewStorage {
    width:number,
    height:number,
    centerX:number,
    centerY:number,
    scale:number,
}

export class ViewManager {
    readonly view?: View;
    readonly context: AppContext;
    readonly isTeacher: boolean;
    readonly storage?: Storage<LitteBoardViewStorage>;
    private hasDisableCameraTransform?: boolean;
    private isCanSync: boolean = true;
    private defaultWidth: number = 600;
    private defaultHeight: number = 337.5;
    constructor(context:AppContext, isTeacher: boolean, options: LittleBoardAppOptions){
        this.context = context;
        const view = context.getView();
        this.view = view;
        this.isTeacher = isTeacher;
        if (this.view) {
            const { disableCameraTransform } = options;
            this.hasDisableCameraTransform = disableCameraTransform;
            if (!disableCameraTransform) {
                const { centerX, centerY, scale } = this.view.camera;
                const { width, height } = this.view.size;
                this.storage = context.createStorage<LitteBoardViewStorage>(`${context.appId}-view`, {
                    width,
                    height,
                    centerX,
                    centerY,
                    scale,
                });
                if (isTeacher) {
                    this.scaleDocsToFit();
                    this.view.callbacks.on('onCameraUpdated', this.scaleCameraToSync);
                } else if (!isTeacher) {
                    if (this.storage) {
                        this.storage.addStateChangedListener(this.syncViewFromStorage);
                    }
                }
            } else {
                this.view.disableCameraTransform = disableCameraTransform;
            }
            this.view.callbacks.on('onSizeUpdated', this.scaleDocsToFit);
        }
    }
    mount(){
        if (this.isHasDisabledCameraTransform && this.view) {
            const {width, height} = this.view.size;
            const scaleWidth = width / this.defaultWidth;
            const scaleHeight = height / this.defaultHeight;
            const scale = Math.min(scaleWidth, scaleHeight);
            this.view.moveCamera({
                centerX: 0,
                centerY: 0,
                scale,
                animationMode: 'immediately' as AnimationMode.Immediately
            })
        }
    }
    get isHasDisabledCameraTransform() {
        return this.hasDisableCameraTransform;
    }
    /** 设置是否可以同步视角 */
    setCanSync(bol:boolean){
        this.isCanSync = bol;
    }
    getCanSync(){
        return this.isCanSync;
    }
    /** 老师端监听视角变化，同步到服务端storage */
    scaleCameraToSync = throttle(() => {
        if (this.view && this.storage && this.isCanSync) {
            const { centerX, centerY, scale } = this.view.camera;
            const { width, height } = this.view.size;
            this.storage.setState({
                centerX, 
                centerY, 
                width, 
                height, 
                scale
            })
        }
    }, 200, { trailing: true })
    /** 根据窗口大小缩放文档 */
    scaleDocsToFit = debounce(() => {
        if (this.view) {
            const { width, height } = this.view.size;
            const { centerX, centerY } = this.view.camera;
            if (width && height) {
                if (!this.isHasDisabledCameraTransform) {
                    if (this.isTeacher) {
                        this.view.setCameraBound({
                            damping: 1,
                            centerX, 
                            centerY,
                            width, 
                            height,
                        })
                    } else {
                        this.syncViewFromStorage();
                    }
                } else {
                    this.mount();
                }
            }
        }
    }, 200, { trailing: true })
    /** 从服务端storage中同步视角信息 */
    syncViewFromStorage = () => {
        if (this.storage && this.view) {
            const { width, height, centerX, centerY, scale } = this.storage.state;
            const boxSize = this.view.size;
            const mixScale = Math.min(boxSize.width / width, boxSize.height / height);
            this.view.setCameraBound({
                centerX, 
                centerY, 
                width, 
                height,
            });
            this.view.moveCamera({
                centerX,
                centerY,
                scale: scale * mixScale,
                animationMode: 'immediately' as AnimationMode.Immediately
            })
        }
    }
    /** 禁止老师端操作视角 */
    setTeacherDisabledCameraTransform(bol:boolean){
        if (this.isTeacher && this.view) {
            this.view.disableCameraTransform = bol;
            if (bol) {
                this.syncViewFromStorage();
            }
        }
    }
    /** 禁止学生端操作视角 */
    setStudentDisabledCameraTransform(bol:boolean){
        if (!this.isTeacher && this.view) {
            this.view.disableCameraTransform = bol;
            if (bol) {
                this.syncViewFromStorage();
            }
        }
    }
    destroy(){
        this.view?.callbacks.off('onSizeUpdated', this.scaleDocsToFit)
        this.view?.callbacks.off('onCameraUpdated', this.scaleCameraToSync)
    }
}
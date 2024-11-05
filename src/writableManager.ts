import type { _ArrayTrue, AppliancePluginInstance } from "@netless/appliance-plugin";
import { Uid } from "@netless/appliance-plugin/dist/collector/types";
import type { AppContext, Room, Storage } from "@netless/window-manager";
import isString from "lodash/isString";
import isArray from "lodash/isArray";
import clone from "lodash/clone";

export type FilterPublishAutType = "writable" | "readOnly";

export interface LitteBoardWriteableStorage {
    /** 可写用户组, 如果是true, 则为所有用户可写 */
    writable?:  _ArrayTrue<Uid>;
    /** 只读用户组, 如果是true, 则为所有用户可读 */
    readOnly?: _ArrayTrue<Uid>;
}

export class WritableController {
    readonly appliancePlugin: AppliancePluginInstance;
    readonly context: AppContext;
    readonly uid: string;
    readonly room?: Room;
    readonly storage: Storage<LitteBoardWriteableStorage>;
    private writable?: _ArrayTrue<Uid>;
    private readOnly?: _ArrayTrue<Uid>;
    constructor(context:AppContext, uid: string){
        this.context = context;
        this.appliancePlugin = (context as any).manager.windowManger._appliancePlugin;
        this.uid = uid;
        this.room = this.context.getRoom();
        this.storage = context.createStorage<LitteBoardWriteableStorage>(`${context.appId}-writeable`, {
            writable: this.writable,
            readOnly: this.readOnly,
        });
        this.storage.addStateChangedListener((diff) => {
            const {writable, readOnly} = diff;
            if (writable) {
                this.writable = writable.newValue;
            }
            if (readOnly) {
                this.readOnly = readOnly.newValue;
            }
            this.writeEffect();
        });
    }
    mount(){
        this.writable = this.storage.state.writable;
        this.readOnly = this.storage.state.readOnly;
        this.writeEffect();
    }
    async setWriteable(writeable: LitteBoardWriteableStorage, isSync:boolean): Promise<void> {    
        const {writable, readOnly} = writeable;
        if (writable===true || (isArray(writable) && writable.length)) {
            this.writable = clone(writable);
        } else {
            this.writable = undefined;
        }
        if (readOnly ===true || (isArray(readOnly) && readOnly.length)) {
            this.readOnly = clone(readOnly);
        } else {
            this.readOnly = undefined;
        }
        if (isSync) {
            const isWritable = this.context.getIsWritable();
            if (!isWritable) {
                await this.context.getRoom()?.setWritable(true);
            }
            this.storage.setState({writable: this.writable, readOnly: this.readOnly});
            if (!isWritable) {
                await this.context.getRoom()?.setWritable(false);
            }
        }
        await this.writeEffect();
    }
    publishWriteAble(writable?:_ArrayTrue<Uid>, readOnly?:_ArrayTrue<Uid>) {
        if (writable === true) {
            this.writable = true;
        } else if(isArray(writable)) {
            const uids = new Set(writable);
            this.writable = [...uids];
        } else {
            this.writable = undefined;
        }
        if (readOnly === true) {
            this.readOnly = true;
        } else if(isArray(readOnly)) {
            const uids = new Set(readOnly);
            this.readOnly = [...uids];
        } else {
            this.readOnly = undefined;
        }
        this.setWriteable({writable: this.writable, readOnly: this.readOnly}, true);
    }
    publishOneWriteAble(uid:Uid, type:FilterPublishAutType, isSync:boolean = true) {
        if (!isString(uid)) {
            return;
        }
        switch (type) {
            case 'writable':
                if (this.writable === undefined) {
                    this.writable = [];
                }
                if (isArray(this.writable) && !this.writable.includes(uid)) {
                    this.writable.push(uid);
                }
                if (isArray(this.readOnly) && this.readOnly.includes(uid)) {
                    const i = this.readOnly.indexOf(uid);
                    this.readOnly.splice(i, 1);
                }
                break;
            case 'readOnly':
                if (this.readOnly === undefined) {
                    this.readOnly = [];
                }
                if (isArray(this.readOnly) && !this.readOnly.includes(uid)) {
                    this.readOnly.push(uid);
                }
                if (isArray(this.writable) && this.writable.includes(uid)){
                    const i = this.writable.indexOf(uid);
                    this.writable.splice(i, 1);
                }
                break;
        }
        this.setWriteable({writable: this.writable, readOnly: this.readOnly}, isSync);
    }
    private async writeEffect() {
        const writable = this.writable;
        const readOnly = this.readOnly;
        if (writable === true ) {
            if (isArray(readOnly) && readOnly.includes(this.uid)) {
                if (this.context.getIsWritable()) {
                    await this.room?.setWritable(false);
                }
                return;
            }
            if (!this.context.getIsWritable()) {
                await this.room?.setWritable(true);
            }
            return;
        }
        if (isArray(writable)) {
            if (writable.includes(this.uid)) {
                if (!this.context.getIsWritable()) {
                    await this.room?.setWritable(true);
                }
                return;
            }
            if ((isArray(readOnly) && readOnly.includes(this.uid)) || readOnly === true){
                if (this.context.getIsWritable()) {
                    await this.room?.setWritable(false);
                }
                return;
            }
        }
    }
    destroy(){
        this.storage.destroy();
    }
}
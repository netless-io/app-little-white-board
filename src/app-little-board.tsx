import type { NetlessApp, Room} from "@netless/window-manager";
import type { ImageInformation } from "@netless/appliance-plugin";
import styles from './style.less?inline'
import { getUserPayload } from "./utils";
import ReactDOM from "react-dom";
import { TeacherController } from "./teacherController";
import { StudentController } from "./studentController";
import { TeacherApp } from "./teacher";
import React from "react";
import { StudentApp } from "./student";
import isBoolean from "lodash/isBoolean";

export type Logger = (...data: any[]) => void

export enum RoleType {
  student = "0",
  teacher = "1",
}
export enum ProgressType {
  /** 初始等待中 */
  padding = 0,
  /** 出题中 */
  developing = 1,
  /** 答题中 */
  answering = 2,
  /** 结束 */
  finish = 3,
  /** 公布结果 */
  announcing = 4
}

export interface LittleBoardAttributes {
  /** teacher's uid */
  uid: string;
}

export type Student = {
  uid: string;
  nickName: string;
  isCommit: boolean;
}

export type LitteBoardStorage = {
  teacher: string;
  progress: ProgressType;
  userList: Student[];
  startAt?: number;
  finishAt?: number;
};

export interface LittleBoardAppOptions {
  /** Disables user move / scale the image and whiteboard. */
  disableCameraTransform?: boolean;
  /** 上传图片事件,如果需要插入图片功能,必需在该事件中完成上传并返回图片信息 */
  onClickImage?: () => Promise<UploadImageResult>;
  /** Custom logger. Default: a logger that reports to the whiteboard server. */
  log?: Logger;
  /** 挂载后回调 */
  onMount?: (appId: string, useId: string) => void;
  /** 本地发布问题事件, 老师端事件  */
  onPublishQuestion?: (appId: string, useId: string)=>void;
  /** 本地学生提交答案事件, 学生端事件 */
  onCommit?: (appId: string, useId: string)=>void;
}

export type UploadImageResult = {src: string} & ImageInformation;

export type Api = {
  $log: Logger;
  onMount?: (appId: string, useId: string) => void;
  onCommit?: (appId: string, useId: string) => void;
  onPublishQuestion?: (appId: string, useId: string) => void;
  updateTitle: (time?: string) => void;
  onClickImage?: () => Promise<UploadImageResult>;
};

export { styles }

const createLogger = (room: Room | undefined): Logger => {
  if (room && (room as any).logger) {
    return (...args) => (room as any).logger.info(...args)
  } else {
    return (...args) => console.log(...args)
  }
}

export const NetlessAppLittleBoard: NetlessApp<LittleBoardAttributes, {}, LittleBoardAppOptions> = {
  kind: "LittleBoard",
  setup(context) {
    const $content = document.createElement("div");
    $content.className = "app-litteBoard-container";
    const $whiteBoard = document.createElement("div");
    $whiteBoard.className = "app-litteBoard-whiteboard";
    const $uiContent = document.createElement("div");
    $uiContent.className = "app-litteBoard-ui";
    $content.append($whiteBoard, $uiContent);
    
    const box = context.getBox();
    const title = box.title;
    box.mountStyles(styles);
    box.mountContent($content);
    context.mountView($whiteBoard);

    const options = (context.getAppOptions() || {}) as LittleBoardAppOptions;
    const { disableCameraTransform, log, ...hooks } = options;
    const $log = log || createLogger(context.getRoom());
    if (isBoolean(disableCameraTransform)) {
      const view = context.getView();
      if (view) {
        view.disableCameraTransform = disableCameraTransform;
      }
    }
    const { uid, nickName } = getUserPayload(context);
    const attribute = (context.getAttributes() || {}) as LittleBoardAttributes
    const role  = attribute.uid === uid ? RoleType.teacher : RoleType.student;
    const storage = context.createStorage<LitteBoardStorage>(context.appId, {
      teacher: attribute.uid,
      progress: ProgressType.padding,
      userList: [],
    });

    const updateTitle = (time?: string) => {
      box.titleBar.setTitle(`${title}   ${time}`);
    };
    const api = { ...hooks, $log, updateTitle };
    let controller:TeacherController | StudentController | undefined = undefined;
    if (role === RoleType.teacher) {
      controller = new TeacherController(context, uid, nickName, storage, $log, api);
      ReactDOM.render(
        <TeacherApp controller={controller as TeacherController} />,
        $uiContent,
        ()=>{
          controller?.mount()
        }
      );
    } else {
      const controller = new StudentController(context, uid, nickName, storage, $log, api);
      ReactDOM.render(
        <StudentApp controller={controller} />,
        $uiContent,
        ()=>{
          controller?.mount()
        }
      );
    }
    $log(`[LittleBoard] new ${context.appId}`);
    context.emitter.on("destroy", () => {
      controller?.destory();
      $log(`[LittleBoard] ${context.appId} is closed`)
    });
    return controller;
  }
}
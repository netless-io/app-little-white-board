export type Language = "en" | "zh-CN";

export type I18nData<T extends string> = Record<Language, Record<T, string>>;


export type I18nTeacherKey = 'publish' | 'finish' | 'show' | 'uncommitted' | 'committed' | 'padding' | 'boards';

export const I18n_Teacher: I18nData<I18nTeacherKey> = {
    'en': {
      boards: "Answer boards",
      padding: "Loading...",
      publish: "Publish",
      finish: "Finish",
      show: "show the whole class",
      uncommitted: "Uncommitted",
      committed: "Committed",
    },
    "zh-CN": {
      boards: "答题画布",
      padding: "加载中...",
      publish: "发布",
      finish: "结束",
      show: "全班展示",
      uncommitted: "未提交",
      committed: "已提交",
    },
};

export type I18nStudentKey = 'commit' | 'padding';

export const I18n_Student: I18nData<I18nStudentKey> = {
    'en': {
      padding: "Waiting for the teacher...",
      commit: "Commit",
    },
    "zh-CN": {
      padding: "等待老师出题中...",
      commit: "提交",
    },
};

export const I18n_Tools = {
    "en": {
        toolbar: "Drawing tools", clicker: "Pointer", pencil: "Pencil", eraser: "Eraser",
        bitmapEraser: "Partial eraser", text: "Text", clear: "Clear board", image: "Insert image",
        Stroke: "Pressure pen", Normal: "Pen", Dotted: "Dotted pen", LongDotted: "Dashed pen",
        opacity: "Opacity", color: "Color",
    },
    "zh-CN": {
        toolbar: "绘图工具", clicker: "点击工具", pencil: "画笔", eraser: "橡皮擦",
        bitmapEraser: "局部橡皮擦", text: "文字", clear: "清空画布", image: "插入图片",
        Stroke: "压感笔", Normal: "普通笔", Dotted: "点线笔", LongDotted: "虚线笔",
        opacity: "透明度", color: "颜色",
    },
};
export type ToolLabels = typeof I18n_Tools[Language];

export type Language = "en" | "zh-CN";

export type I18nData<T extends string> = Record<Language, Record<T, string>>;


export type I18nTeacherKey = 'publish' | 'finish' | 'show' | 'uncommitted' | 'committed' | 'padding';

export const I18n_Teacher: I18nData<I18nTeacherKey> = {
    'en': {
      padding: "Loading...",
      publish: "Publish",
      finish: "Finish",
      show: "show the whole class",
      uncommitted: "Uncommitted",
      committed: "Committed",
    },
    "zh-CN": {
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
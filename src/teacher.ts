import type { TeacherController } from "./teacherController";
import { ProgressType, type Uid } from "./app-little-board";
import { button, element, loadingIndicator } from "./component/ui";
import { ToolBar } from "./component/toolbar";
import { I18n_Teacher, type Language } from "./locale";

export type ITeacherAppProps = { controller: TeacherController; language: Language };
export type pageListItem = { label: string; key: string };
export interface ITeacherAppState {
    progress: ProgressType;
    pages: pageListItem[];
    activeKey: Uid;
    commits: string[];
    unCommits: string[];
}

export class TeacherApp {
    readonly element = element("div", "little-board-teacher-container");
    readonly state: ITeacherAppState = {
        progress: ProgressType.padding, pages: [], activeKey: "", commits: [], unCommits: [],
    };
    private readonly waiting = element("div", "little-board-student-padding");
    private readonly tabs = element("div", "little-board-tabs");
    private readonly tabButtons = new Map<string, HTMLButtonElement>();
    private readonly statistics = element("div", "little-board-teacher-statistics-board");
    private readonly commits = element("div", "little-board-statistics-list");
    private readonly unCommits = element("div", "little-board-statistics-list");
    private readonly bottom = element("div", "little-board-teacher-bottom");
    private readonly tools = element("div");
    private readonly action: HTMLButtonElement;
    private toolbar?: ToolBar;
    private readonly i18n;
    private destroyed = false;

    constructor(private readonly props: ITeacherAppProps) {
        const { controller, language } = props;
        this.i18n = I18n_Teacher[language];
        this.waiting.append(loadingIndicator(this.i18n.padding));
        this.tabs.setAttribute("role", "tablist");
        this.tabs.setAttribute("aria-label", this.i18n.boards);
        const columns = element("div", "little-board-statistics-columns");
        for (const [label, list] of [[this.i18n.committed, this.commits], [this.i18n.uncommitted, this.unCommits]] as const) {
            const column = element("div");
            column.style.width = "50%";
            column.append(element("h3", "", label), list);
            columns.append(column);
        }
        this.statistics.append(columns);
        this.action = button({ primary: true, onClick: () => {
            switch (this.state.progress) {
                case ProgressType.developing:
                    controller.publishQuestion();
                    controller.onPublishQuestion();
                    break;
                case ProgressType.answering:
                    controller.finishAnswer();
                    break;
                case ProgressType.finish:
                    controller.publishAnswer(this.state.activeKey);
                    break;
            }
        } });
        this.bottom.append(this.tools, this.action);
        this.element.append(this.waiting, this.tabs, this.statistics, this.bottom);
        this.update();
    }

    mount(parent: HTMLElement) {
        parent.append(this.element);
        this.props.controller.setVDom(this);
        this.props.controller.onMount();
    }

    setRenderPageId(activeKey: string) {
        this.state.activeKey = activeKey;
        this.update();
    }

    setProgress(progress: ProgressType) {
        this.state.progress = progress;
        this.update();
    }

    setPages(pages: pageListItem[]) {
        if (this.destroyed) return;
        this.state.pages = pages;
        const keys = new Set(pages.map(page => page.key));
        for (const [key, node] of this.tabButtons) {
            if (!keys.has(key)) {
                node.remove();
                this.tabButtons.delete(key);
            }
        }
        pages.forEach((page, index) => {
            let node = this.tabButtons.get(page.key);
            if (!node) {
                node = element("button");
                node.type = "button";
                node.setAttribute("role", "tab");
                node.addEventListener("click", () => this.choosePage(page.key));
                node.addEventListener("keydown", event => this.onTabKeyDown(event, page.key));
                this.tabButtons.set(page.key, node);
            }
            node.textContent = page.label;
            // Keep existing tab nodes in place so student updates preserve keyboard focus.
            if (this.tabs.children[index] !== node) this.tabs.insertBefore(node, this.tabs.children[index] || null);
        });
        this.update();
    }

    setCommitList(names: string[]) {
        this.state.commits = names;
        if (!this.destroyed) this.commits.replaceChildren(...names.map(name => element("div", "", name)));
    }

    setUnCommitList(names: string[]) {
        this.state.unCommits = names;
        if (!this.destroyed) this.unCommits.replaceChildren(...names.map(name => element("div", "", name)));
    }

    private choosePage(key: string) {
        this.setRenderPageId(key);
        this.props.controller.switchPage(key);
    }

    private onTabKeyDown(event: KeyboardEvent, key: string) {
        const { pages } = this.state;
        let target = pages.findIndex(page => page.key === key);
        if (event.key === "ArrowRight") target = (target + 1) % pages.length;
        else if (event.key === "ArrowLeft") target = (target - 1 + pages.length) % pages.length;
        else if (event.key === "Home") target = 0;
        else if (event.key === "End") target = pages.length - 1;
        else return;
        event.preventDefault();
        this.choosePage(pages[target].key);
        this.tabButtons.get(pages[target].key)?.focus();
    }

    private update() {
        if (this.destroyed) return;
        const { progress, activeKey } = this.state;
        const { controller } = this.props;
        const waiting = progress === ProgressType.padding;
        this.waiting.hidden = !waiting;
        this.tabs.hidden = waiting;
        this.bottom.hidden = waiting;
        this.statistics.hidden = waiting || activeKey !== controller.uid || progress !== ProgressType.answering;
        for (const [key, node] of this.tabButtons) {
            node.setAttribute("aria-selected", String(key === activeKey));
            node.tabIndex = key === activeKey ? 0 : -1;
        }
        const enabled = progress === ProgressType.developing || progress === ProgressType.announcing ||
            (progress === ProgressType.answering && activeKey !== controller.uid);
        if (enabled && !this.toolbar) {
            this.toolbar = new ToolBar(controller, this.props.language);
            this.tools.append(this.toolbar.element);
        }
        this.toolbar?.setEnabled(enabled);
        const text = progress === ProgressType.developing ? this.i18n.publish
            : progress === ProgressType.answering ? this.i18n.finish
            : progress === ProgressType.finish && controller.ServiceRenderPageId !== activeKey ? this.i18n.show : "";
        this.action.textContent = text;
        this.action.hidden = !text;
    }

    destroy() {
        this.destroyed = true;
        this.toolbar?.destroy();
        this.tabButtons.clear();
        this.element.remove();
    }
}

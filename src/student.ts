import { ProgressType } from "./app-little-board";
import { button, element, loadingIndicator } from "./component/ui";
import { ToolBar } from "./component/toolbar";
import type { StudentController } from "./studentController";
import { I18n_Student, type Language } from "./locale";

export type IStudentAppProps = { controller: StudentController; language: Language };
export interface IStudentAppState { progress: ProgressType; isCommit: boolean }

export class StudentApp {
    readonly element = element("div", "little-board-student-container");
    readonly state: IStudentAppState = { progress: ProgressType.padding, isCommit: false };
    private readonly waiting = element("div", "little-board-student-padding");
    private readonly bottom = element("div", "little-board-student-bottom");
    private readonly tools = element("div");
    private toolbar?: ToolBar;
    private destroyed = false;

    constructor(private readonly props: IStudentAppProps) {
        const { controller, language } = props;
        const i18n = I18n_Student[language];
        this.bottom.append(this.tools, button({ text: i18n.commit, primary: true, onClick: () => {
            controller.commitAnswer();
            controller.onCommit();
        } }));
        this.waiting.append(loadingIndicator(i18n.padding));
        this.element.append(this.bottom, this.waiting);
        this.update();
    }

    mount(parent: HTMLElement) {
        parent.append(this.element);
        this.props.controller.setVDom(this);
        this.props.controller.onMount();
    }

    setProgress(progress: ProgressType) {
        this.state.progress = progress;
        this.update();
    }

    setIsCommit(isCommit: boolean) {
        this.state.isCommit = isCommit;
        this.update();
    }

    private update() {
        if (this.destroyed) return;
        const { progress, isCommit } = this.state;
        const answering = progress === ProgressType.answering && !isCommit;
        this.bottom.hidden = !answering;
        if (answering && !this.toolbar) {
            this.toolbar = new ToolBar(this.props.controller, this.props.language);
            this.tools.append(this.toolbar.element);
        }
        this.toolbar?.setEnabled(answering);
        this.waiting.hidden = progress !== ProgressType.padding && progress !== ProgressType.developing;
    }

    destroy() {
        this.destroyed = true;
        this.toolbar?.destroy();
        this.element.remove();
    }
}

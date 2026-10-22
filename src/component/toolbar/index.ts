import { button, element, setSelected } from "../ui";
import { ClickerIcon, DeleteOutlined, FileImageOutlined, TextIcon } from "../icons";
import { EraserButtons } from "../eraserButtons";
import { PencilButtons } from "../pencilButtons";
import { rgbToHex } from "../icons/color";
import type { Color, FloatBarOptions, RoomState } from "white-web-sdk";
import type { MemberState } from "@netless/appliance-plugin";
import type { TeacherController } from "../../teacherController";
import type { StudentController } from "../../studentController";
import { ApplianceNames, EStrokeType, EToolsKey } from "../../enum";
import { I18n_Tools, type Language, type ToolLabels } from "../../locale";

export interface ToolContext {
    readonly state: { toolsKey: EToolsKey; color: Color; strokeType: EStrokeType; opacity: number };
    readonly labels: ToolLabels;
    readonly floatBarOptions?: FloatBarOptions;
    selectTool(key: EToolsKey): void;
    setPencilState(state: Partial<MemberState>): void;
}

const tools = {
    [ApplianceNames.clicker]: EToolsKey.Clicker,
    [ApplianceNames.pencil]: EToolsKey.Pencil,
    [ApplianceNames.eraser]: EToolsKey.Eraser,
    [ApplianceNames.pencilEraser]: EToolsKey.BitMapEraser,
    [ApplianceNames.text]: EToolsKey.Text,
};
const appliances = {
    [EToolsKey.Clicker]: ApplianceNames.clicker,
    [EToolsKey.Pencil]: ApplianceNames.pencil,
    [EToolsKey.Eraser]: ApplianceNames.eraser,
    [EToolsKey.BitMapEraser]: ApplianceNames.pencilEraser,
    [EToolsKey.Text]: ApplianceNames.text,
};

export class ToolBar implements ToolContext {
    readonly element = element("div", "little-board-toolbar");
    readonly labels: ToolLabels;
    readonly state: ToolContext["state"];
    readonly floatBarOptions?: FloatBarOptions;
    private readonly pencil: PencilButtons;
    private readonly eraser: EraserButtons;
    private readonly clicker: HTMLButtonElement;
    private readonly text: HTMLButtonElement;
    private readonly displayer;

    constructor(private readonly controller: TeacherController | StudentController, language: Language) {
        const plugin = controller.appliancePlugin;
        this.displayer = plugin.displayer;
        this.labels = I18n_Tools[language];
        const initial = plugin.currentManager?.room?.state.memberState as MemberState | undefined;
        const key = initial?.currentApplianceName as keyof typeof tools | undefined;
        this.state = {
            toolsKey: key && tools[key] !== undefined ? tools[key] : EToolsKey.Clicker,
            color: initial?.strokeColor || [0, 0, 0],
            strokeType: initial?.strokeType || EStrokeType.Stroke,
            opacity: initial?.strokeOpacity ?? 1,
        };
        this.floatBarOptions = (plugin.currentManager?.room as { floatBarOptions?: FloatBarOptions })?.floatBarOptions;
        this.element.setAttribute("role", "toolbar");
        this.element.setAttribute("aria-label", this.labels.toolbar);
        this.clicker = button({ label: this.labels.clicker, icon: ClickerIcon(), onClick: () => this.selectTool(EToolsKey.Clicker) });
        this.pencil = new PencilButtons(this);
        this.eraser = new EraserButtons(this);
        this.text = button({ label: this.labels.text, icon: TextIcon(), onClick: () => this.selectTool(EToolsKey.Text) });
        this.element.append(this.clicker, this.pencil.popover.element, this.eraser.popover.element, this.text,
            button({ label: this.labels.clear, icon: DeleteOutlined(), onClick: () => plugin.cleanCurrentScene() }),
            button({ label: this.labels.image, icon: FileImageOutlined(), onClick: () => { void controller.insertImage(); } }));
        this.displayer?.callbacks.on("onRoomStateChanged", this.onStateChanged);
        this.update();
    }

    private onStateChanged = (state: RoomState) => {
        if (this.controller.context.isReplay) return;
        this.applyMemberState(state.memberState as Partial<MemberState> | undefined);
        this.update();
    };

    private applyMemberState(member?: Partial<MemberState>) {
        const key = member?.currentApplianceName as keyof typeof tools | undefined;
        if (key && tools[key] !== undefined) this.state.toolsKey = tools[key];
        if (member?.strokeColor) this.state.color = member.strokeColor;
        if (member?.strokeType !== undefined) this.state.strokeType = member.strokeType;
        if (member?.strokeOpacity !== undefined) this.state.opacity = member.strokeOpacity;
    }

    selectTool(key: EToolsKey) {
        const appliance = appliances[key as keyof typeof appliances];
        if (appliance) this.controller.appliancePlugin.setMemberState({ currentApplianceName: appliance });
        this.state.toolsKey = key;
        this.update();
    }

    setPencilState(state: Partial<MemberState>) {
        this.applyMemberState(state);
        this.controller.appliancePlugin.setMemberState(state);
        this.selectTool(EToolsKey.Pencil);
    }

    setEnabled(enabled: boolean) {
        this.element.hidden = !enabled;
        if (!enabled) {
            this.pencil.popover.setOpen(false);
            this.eraser.popover.setOpen(false);
        }
    }

    private update() {
        const { color, toolsKey } = this.state;
        this.element.style.setProperty("--lb-accent", rgbToHex(color[0], color[1], color[2]));
        setSelected(this.clicker, toolsKey === EToolsKey.Clicker);
        setSelected(this.text, toolsKey === EToolsKey.Text);
        this.pencil.update();
        this.eraser.update();
    }

    destroy() {
        this.displayer?.callbacks.off("onRoomStateChanged", this.onStateChanged);
        this.pencil.destroy();
        this.eraser.destroy();
        this.element.remove();
    }
}

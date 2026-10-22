import { DottedPencilIcon, DottedPencilLongIcon, NormPencilIcon, StrokePencilIcon } from "../icons";
import { button, element, setSelected, ToolPopover } from "../ui";
import type { ToolContext } from "../toolbar";
import { rgbToRgba } from "../icons/color";
import { EStrokeType, EToolsKey } from "../../enum";

const pencilIcons = {
    [EStrokeType.Stroke]: StrokePencilIcon,
    [EStrokeType.Normal]: NormPencilIcon,
    [EStrokeType.Dotted]: DottedPencilIcon,
    [EStrokeType.LongDotted]: DottedPencilLongIcon,
};

export class PencilButtons {
    readonly popover: ToolPopover;
    private readonly strokes = new Map<EStrokeType, HTMLButtonElement>();
    private readonly colors: { color: readonly number[]; button: HTMLButtonElement }[] = [];
    private readonly range = element("input");
    private readonly output = element("output");
    private iconType?: EStrokeType;

    constructor(private readonly context: ToolContext) {
        const { labels, state } = context;
        this.popover = new ToolPopover(labels.pencil, pencilIcons[state.strokeType](), () => context.selectTool(EToolsKey.Pencil));
        const options = element("div", "little-board-tool-options");
        const row = element("div", "little-board-tool-row");
        for (const type of Object.values(EStrokeType)) {
            const node = button({ label: labels[type], icon: pencilIcons[type](),
                onClick: () => context.setPencilState({ strokeType: type }) });
            this.strokes.set(type, node);
            row.append(node);
        }
        const colors = element("div", "little-board-colors");
        colors.setAttribute("role", "group");
        colors.setAttribute("aria-label", labels.color);
        for (const color of context.floatBarOptions?.colors || []) {
            const [r, g, b] = color;
            const value = `rgb(${r},${g},${b})`;
            const node = element("button", "little-board-color");
            node.type = "button";
            node.setAttribute("aria-label", `${labels.color} ${value}`);
            node.title = value;
            node.style.backgroundColor = value;
            node.addEventListener("click", () => context.setPencilState({ strokeColor: [r, g, b] }));
            this.colors.push({ color, button: node });
            colors.append(node);
        }
        const opacity = element("label", "little-board-opacity");
        const caption = element("span", "", `${labels.opacity} `);
        caption.append(this.output);
        this.range.type = "range";
        this.range.min = "0";
        this.range.max = "1";
        this.range.step = "0.1";
        this.range.setAttribute("aria-label", labels.opacity);
        this.range.addEventListener("input", () => context.setPencilState({ strokeOpacity: Number(this.range.value) }));
        opacity.append(caption, this.range);
        options.append(row, colors, opacity);
        this.popover.panel.append(options);
        this.update();
    }

    update() {
        const { toolsKey, strokeType, color, opacity } = this.context.state;
        setSelected(this.popover.trigger, toolsKey === EToolsKey.Pencil);
        if (strokeType !== this.iconType) {
            this.popover.trigger.replaceChildren(pencilIcons[strokeType]());
            this.iconType = strokeType;
        }
        for (const [type, node] of this.strokes) setSelected(node, strokeType === type);
        for (const { color: choice, button: node } of this.colors) {
            node.setAttribute("aria-pressed", String(choice.every((value, index) => value === color[index])));
        }
        this.output.textContent = `${Math.round(opacity * 100)}%`;
        this.range.value = String(opacity);
        this.range.setAttribute("aria-valuetext", this.output.textContent);
        this.range.style.background = `linear-gradient(to right, transparent, ${rgbToRgba(color[0], color[1], color[2], 1)})`;
    }

    destroy() { this.popover.destroy(); }
}

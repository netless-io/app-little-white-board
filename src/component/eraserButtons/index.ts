import { ErasersIcon, PencilEraserIcon } from "../icons";
import { button, element, setSelected, ToolPopover } from "../ui";
import type { ToolContext } from "../toolbar";
import { EToolsKey } from "../../enum";

export class EraserButtons {
    readonly popover: ToolPopover;
    private current = EToolsKey.Eraser;
    private readonly choices = new Map<EToolsKey, HTMLButtonElement>();

    constructor(private readonly context: ToolContext) {
        this.popover = new ToolPopover(context.labels.eraser, ErasersIcon(), () => context.selectTool(this.current));
        const row = element("div", "little-board-tool-row");
        for (const { key, icon, label } of [
            { key: EToolsKey.Eraser, icon: ErasersIcon, label: context.labels.eraser },
            { key: EToolsKey.BitMapEraser, icon: PencilEraserIcon, label: context.labels.bitmapEraser },
        ]) {
            const node = button({ label, icon: icon(), onClick: () => context.selectTool(key) });
            this.choices.set(key, node);
            row.append(node);
        }
        this.popover.panel.append(row);
        this.update();
    }

    update() {
        const { toolsKey } = this.context.state;
        const selected = toolsKey === EToolsKey.Eraser || toolsKey === EToolsKey.BitMapEraser;
        if (selected && toolsKey !== this.current) {
            this.current = toolsKey;
            this.popover.trigger.replaceChildren((toolsKey === EToolsKey.BitMapEraser ? PencilEraserIcon : ErasersIcon)());
        }
        setSelected(this.popover.trigger, selected);
        for (const [key, node] of this.choices) setSelected(node, toolsKey === key);
    }

    destroy() { this.popover.destroy(); }
}

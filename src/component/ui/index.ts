export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

export function setSelected(button: HTMLButtonElement, selected: boolean) {
    button.setAttribute("aria-pressed", String(selected));
    button.classList.toggle("little-board-button-primary", selected);
    button.classList.toggle("little-board-button-default", !selected);
}

export function button({ text, label, icon, primary = false, onClick }: {
    text?: string;
    label?: string;
    icon?: SVGElement;
    primary?: boolean;
    onClick: () => void;
}): HTMLButtonElement {
    const node = element("button", `little-board-button little-board-button-${primary ? "primary" : "default"}`);
    node.type = "button";
    if (label) {
        node.setAttribute("aria-label", label);
        node.title = label;
    }
    if (icon) {
        node.append(icon);
        if (!text) node.classList.add("little-board-icon-button");
    }
    if (text) node.append(document.createTextNode(text));
    node.addEventListener("click", onClick);
    return node;
}

let panelSequence = 0;

/** A local panel with explicitly scoped document listeners and stable focus targets. */
export class ToolPopover {
    readonly element = element("div", "little-board-popover");
    readonly trigger: HTMLButtonElement;
    readonly panel = element("div", "little-board-tool-panel");
    private open = false;

    constructor(label: string, icon: SVGElement, onSelect: () => void) {
        this.panel.id = `little-board-panel-${++panelSequence}`;
        this.panel.setAttribute("role", "group");
        this.panel.setAttribute("aria-label", label);
        this.panel.hidden = true;
        this.trigger = button({ label, icon, onClick: () => {
            onSelect();
            this.setOpen(!this.open);
        } });
        this.trigger.setAttribute("aria-expanded", "false");
        this.element.append(this.trigger, this.panel);
        this.element.addEventListener("keydown", this.onKeyDown);
        this.element.addEventListener("focusout", this.onFocusOut);
    }

    private onPointerDown = (event: PointerEvent) => {
        if (!this.element.contains(event.target as Node)) this.setOpen(false);
    };

    private onKeyDown = (event: KeyboardEvent) => {
        if (this.open && event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            this.setOpen(false);
            this.trigger.focus();
        }
    };

    private onFocusOut = (event: FocusEvent) => {
        if (!this.element.contains(event.relatedTarget as Node | null)) this.setOpen(false);
    };

    setOpen(open: boolean) {
        if (open === this.open) return;
        this.open = open;
        this.panel.hidden = !open;
        this.trigger.setAttribute("aria-expanded", String(open));
        if (open) {
            this.trigger.setAttribute("aria-controls", this.panel.id);
            document.addEventListener("pointerdown", this.onPointerDown, true);
        } else {
            this.trigger.removeAttribute("aria-controls");
            document.removeEventListener("pointerdown", this.onPointerDown, true);
        }
    }

    destroy() {
        this.setOpen(false);
        this.element.removeEventListener("keydown", this.onKeyDown);
        this.element.removeEventListener("focusout", this.onFocusOut);
        this.element.remove();
    }
}

export function loadingIndicator(text: string): HTMLDivElement {
    const node = element("div", "little-board-loading");
    node.setAttribute("role", "status");
    node.setAttribute("aria-live", "polite");
    const spinner = element("span", "little-board-spinner");
    spinner.setAttribute("aria-hidden", "true");
    node.append(spinner, element("span", "", text));
    return node;
}

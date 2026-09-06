import { App, MarkdownView, Notice, Platform, Plugin } from "obsidian";
import { EditorView } from "@codemirror/view";
import { Transaction } from "@codemirror/state";
import { isolateHistory } from "@codemirror/commands";

export default class TapToggleTaskPlugin extends Plugin {
  static readonly maxTapDurationMs = 500;
  static readonly maxTapDistancePx = 12;
  static readonly primaryMouseButton = 0;
  static readonly duplicateClickWindowMs = 800;
  static readonly previousCharacterSide = -1;
  static readonly firstCharacterIndex = 0;
  static readonly characterStep = 1;
  static readonly taskPattern = /^(?<prefix>[\t >]*(?:[-+*]|\d+[.)])\s+\[)(?<status>[^\]\r\n])(?<separator>\]\s+)(?<text>.*)$/;
  static readonly interactiveSelector = [
    "a", "button", "input", "label", "select", "textarea", "summary",
    "[contenteditable]:not([contenteditable='false'])",
    "[role='button']", "[role='link']", "[role='checkbox']", "[tabindex]",
    ".collapse-indicator", ".list-collapse-indicator",
    ".tasks-edit", ".tasks-postpone", ".task-created", ".task-start",
    ".task-scheduled", ".task-due", ".task-done", ".task-cancelled",
    ".task-block-link", ".task-dependsOn",
    ".cm-link", ".cm-hmd-internal-link", ".cm-url", ".cm-hashtag",
    ".cm-formatting", ".cm-fold-indicator",
  ].join(", ");

  onload(): void {
    this.addCommand({
      id: "show-status",
      name: "Show status",
      callback: () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        const mode = view?.getMode() === "preview" ? "Reading" : view?.getMode() === "source" ? "Editing" : "Other view";
        new Notice(`TaskTap ${this.manifest.version}\nMobile app: ${Platform.isMobileApp ? "yes" : "no"}\nMode: ${mode}`);
      },
    });
    if (!Platform.isMobileApp) return;

    const document = this.app.workspace.containerEl.ownerDocument;
    let gesture: {
      pointerId: number;
      x: number;
      y: number;
      startedAt: number;
      cancelled: boolean;
      target: EventTarget | null;
    } | null = null;
    let touchClick: { x: number; y: number; endedAt: number } | null = null;

    this.registerDomEvent(document, "pointerdown", (event) => {
      if (!event.isPrimary) {
        if (gesture) gesture.cancelled = true;
        return;
      }
      touchClick = null;
      gesture = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startedAt: event.timeStamp,
        cancelled: false,
        target: event.target,
      };
    }, { capture: true, passive: true });

    this.registerDomEvent(document, "pointermove", (event) => {
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y)
        > TapToggleTaskPlugin.maxTapDistancePx) gesture.cancelled = true;
    }, { capture: true, passive: true });

    this.registerDomEvent(document, "pointercancel", () => {
      if (gesture) gesture.cancelled = true;
    }, { capture: true, passive: true });

    this.registerDomEvent(document, "scroll", () => {
      if (gesture) gesture.cancelled = true;
    }, { capture: true, passive: true });

    this.registerDomEvent(document, "pointerup", (event) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      const tap = gesture;
      if (!tap || tap.pointerId !== event.pointerId) return;
      if (tap.cancelled || event.timeStamp - tap.startedAt > TapToggleTaskPlugin.maxTapDurationMs
        || Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > TapToggleTaskPlugin.maxTapDistancePx) {
        tap.cancelled = true;
        return;
      }
      const start = tap.target instanceof Element ? tap.target : null;
      const end = document.elementFromPoint(event.clientX, event.clientY);
      if (!start || !end || start.closest("li, .cm-line") !== end.closest("li, .cm-line")) {
        tap.cancelled = true;
        return;
      }
      gesture = null;
      if (this.updateTask(event)) {
        touchClick = { x: event.clientX, y: event.clientY, endedAt: event.timeStamp };
      }
    }, true);

    this.registerDomEvent(document, "touchend", (event) => {
      if (!touchClick || event.timeStamp - touchClick.endedAt >= TapToggleTaskPlugin.duplicateClickWindowMs) return;
      const touch = Array.from(event.changedTouches).find((touch) =>
        Math.hypot(touch.clientX - touchClick!.x, touch.clientY - touchClick!.y)
          <= TapToggleTaskPlugin.maxTapDistancePx);
      if (!touch) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, { capture: true, passive: false });

    this.registerDomEvent(document, "mousedown", (event) => {
      if (event.button !== TapToggleTaskPlugin.primaryMouseButton
        || gesture?.cancelled || (gesture
          && event.timeStamp - gesture.startedAt > TapToggleTaskPlugin.maxTapDurationMs)) return;
      if (!this.getEditorTask(event)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    this.registerDomEvent(document, "click", (event) => {
      const tap = gesture;
      gesture = null;
      if (event.target instanceof HTMLInputElement) return;
      if (touchClick && event.timeStamp - touchClick.endedAt < TapToggleTaskPlugin.duplicateClickWindowMs
        && Math.hypot(event.clientX - touchClick.x, event.clientY - touchClick.y)
          <= TapToggleTaskPlugin.maxTapDistancePx) {
        touchClick = null;
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (event.defaultPrevented || event.button !== TapToggleTaskPlugin.primaryMouseButton
        || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (tap && (tap.cancelled
        || event.timeStamp - tap.startedAt > TapToggleTaskPlugin.maxTapDurationMs)) return;
      this.updateTask(event);
    }, true);
  }

  private getEditorTask(event: MouseEvent) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
      || this.app.workspace.containerEl.ownerDocument.getSelection()?.toString()) return null;
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target.closest(".canvas-node, .popover, .markdown-embed, .cm-embed-block")) return null;
    const task = target.closest<HTMLElement>(".cm-line.HyperMD-task-line");
    if (!task) return null;
    const interactive = target.closest(TapToggleTaskPlugin.interactiveSelector);
    if (interactive && task.contains(interactive)) return null;
    const editor = EditorView.findFromDOM(task);
    if (!editor || editor.state.readOnly || !editor.state.selection.main.empty || editor.composing) return null;
    const leaf = this.app.workspace.getLeavesOfType("markdown").find(({ view }) =>
      view instanceof MarkdownView && view.getMode() === "source" && view.contentEl.contains(editor.dom));
    if (!(leaf?.view instanceof MarkdownView) || !leaf.view.file) return null;
    const position = editor.posAtCoords({ x: event.clientX, y: event.clientY });
    if (position === null) return null;
    const line = editor.state.doc.lineAt(position);
    if (editor.state.doc.lineAt(editor.posAtDOM(task)).from !== line.from) return null;
    const match = line.text.match(TapToggleTaskPlugin.taskPattern)?.groups;
    if (!match || !match.text.trim()) return null;
    const textStart = line.from + match.prefix.length + match.status.length + match.separator.length;
    if (position < textStart) return null;
    const endPosition = line.from + line.text.trimEnd().length;
    const end = editor.coordsAtPos(endPosition, TapToggleTaskPlugin.previousCharacterSide);
    if (!end) return null;
    const isLastVisualRow = event.clientY >= end.top && event.clientY <= end.bottom;
    const direction = task.ownerDocument.defaultView?.getComputedStyle(task).direction;
    const isAfterText = direction === "rtl" ? event.clientX <= end.left : event.clientX >= end.right;
    if ((isLastVisualRow || position >= endPosition) && isAfterText) return null;
    return { editor, line, match, filePath: leaf.view.file.path };
  }

  private updateTask(event: MouseEvent): boolean {
    const document = this.app.workspace.containerEl.ownerDocument;
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
      || document.getSelection()?.toString()) return false;
    const target = event.target instanceof Element ? event.target
      : event.target instanceof Node ? event.target.parentElement : null;
    if (target?.closest(".cm-editor")) {
      const task = this.getEditorTask(event);
      if (!task) return false;
      const { editor, line, match, filePath } = task;
      const tasks = (this.app as App & {
        plugins?: { getPlugin?(id: string): { apiV1?: {
          executeToggleTaskDoneCommand?: (line: string, path: string) => string;
        } } | null };
      }).plugins?.getPlugin?.("obsidian-tasks-plugin")?.apiV1;
      const updated = tasks?.executeToggleTaskDoneCommand?.(line.text, filePath)
        ?? `${match.prefix}${match.status === " " ? "x" : " "}${match.separator}${match.text}`;
      const to = updated === "" && line.number < editor.state.doc.lines
        ? editor.state.doc.line(line.number + TapToggleTaskPlugin.characterStep).from : line.to;
      const original = editor.state.doc.sliceString(line.from, to);
      let start = TapToggleTaskPlugin.firstCharacterIndex;
      while (start < original.length && start < updated.length && original[start] === updated[start]) start++;
      let oldEnd = original.length;
      let newEnd = updated.length;
      while (oldEnd > start && newEnd > start
        && original[oldEnd - TapToggleTaskPlugin.characterStep] === updated[newEnd - TapToggleTaskPlugin.characterStep]) {
        oldEnd--;
        newEnd--;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      editor.dispatch({
        changes: { from: line.from + start, to: line.from + oldEnd, insert: updated.slice(start, newEnd) },
        annotations: [Transaction.userEvent.of("input.tap-toggle-task"), isolateHistory.of("full")],
      });
      return true;
    }
    if (!target || target.closest(".markdown-source-view, .cm-editor, .canvas-node, .popover")) return false;
    const task = target.closest("li");
    if (!task?.classList.contains("task-list-item")) return false;
    const interactive = target.closest(TapToggleTaskPlugin.interactiveSelector);
    if (interactive && task.contains(interactive)) return false;
    if (target.closest(".markdown-embed") !== task.closest(".markdown-embed")) return false;
    const isReadingView = this.app.workspace.getLeavesOfType("markdown").some(({ view }) =>
      view instanceof MarkdownView && view.getMode() === "preview"
      && view.previewMode.containerEl.contains(task));
    if (!isReadingView) return false;
    const checkbox = Array.from(task.querySelectorAll<HTMLInputElement>(
      "input.task-list-item-checkbox[type='checkbox']",
    )).find((input) => input.closest("li") === task);
    if (!checkbox || checkbox.disabled) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    checkbox.click();
    return true;
  }
}

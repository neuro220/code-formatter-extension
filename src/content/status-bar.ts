import { ELEMENT_IDS, CSS_CLASSES, COLORS } from "../shared/constants";
import { formatFileSize } from "../formatters/file-loader";
import type { ExtensionSettings } from "../shared/types";

let statusBarElement: HTMLElement | null = null;

export function getStatusBar(): HTMLElement | null {
  return statusBarElement;
}

export function setStatusBar(element: HTMLElement | null): void {
  statusBarElement = element;
}

export function createStatusBar(
  language: string,
  code: string,
  settings: ExtensionSettings,
): HTMLElement {
  const bar = document.createElement("div");
  bar.id = ELEMENT_IDS.STATUS_BAR;
  bar.className = CSS_CLASSES.STATUS_BAR;

  const lineCount = code.split("\n").length;
  const fileSize = new Blob([code]).size;
  const sizeLabel =
    fileSize > 1024 ? `${(fileSize / 1024).toFixed(1)} KB` : `${fileSize} B`;

  const makeItem = (text: string): HTMLSpanElement => {
    const item = document.createElement("span");
    item.className = CSS_CLASSES.STATUS_BAR_ITEM;
    item.textContent = text;
    return item;
  };

  const langItem = makeItem(language.toUpperCase());
  const lineItem = makeItem(`Ln ${lineCount}`);
  const sizeItem = makeItem(sizeLabel);
  const indentItem = makeItem(
    settings.useTabs
      ? `Tabs: ${settings.indentSize}`
      : `Spaces: ${settings.indentSize}`,
  );

  bar.append(langItem, lineItem, sizeItem, indentItem);
  statusBarElement = bar;
  return bar;
}

export function updateStatusBarWithFile(
  fileInfo: { name: string; size: number } | null | undefined,
): void {
  if (!statusBarElement || !fileInfo) return;

  if (typeof fileInfo.name !== "string" || typeof fileInfo.size !== "number") {
    console.warn(
      "[Code Formatter] Invalid fileInfo provided to updateStatusBarWithFile",
    );
    return;
  }

  const oldFileItem = statusBarElement.querySelector(
    `.${CSS_CLASSES.STATUS_BAR_FILENAME}`,
  );
  if (oldFileItem) oldFileItem.remove();

  const sizeLabel = formatFileSize(fileInfo.size);

  const fileItem = document.createElement("span");
  fileItem.className = CSS_CLASSES.STATUS_BAR_FILENAME;
  fileItem.textContent = `${fileInfo.name} (${sizeLabel})`;
  fileItem.style.color = COLORS.ACTIVE;

  const langItem = statusBarElement.querySelector(
    ".code-formatter-status-bar__item",
  );
  if (langItem && langItem.nextSibling) {
    statusBarElement.insertBefore(fileItem, langItem.nextSibling);
  }
}

export function removeStatusBar(): void {
  if (statusBarElement) {
    statusBarElement.remove();
    statusBarElement = null;
  }
}

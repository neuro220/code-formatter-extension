/**
 * Code Formatter Extension - Content Script
 *
 * Detects code pages, formats code via background script, and renders
 * formatted output using CodeMirror 6 with toolbar controls.
 */

import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { EditorState, Extension, Compartment } from "@codemirror/state";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldGutter,
  foldKeymap,
  codeFolding,
  foldAll,
  unfoldAll,
  indentOnInput,
} from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { python } from "@codemirror/lang-python";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { nord } from "@uiw/codemirror-theme-nord";
import { monokai } from "@uiw/codemirror-theme-monokai";
import { material } from "@uiw/codemirror-theme-material";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { solarizedLight, solarizedDark } from "@uiw/codemirror-theme-solarized";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import type {
  ExtensionSettings,
  FormatResponse,
  ThemeName,
} from "./shared/types";
import {
  ELEMENT_IDS,
  CSS_CLASSES,
  EXTENSION_MAP,
  AVAILABLE_THEMES,
  DEFAULT_SETTINGS,
  COLORS,
} from "./shared/constants";
import { loadFiles, formatFileSize } from "./formatters/file-loader";
import { debounce, LRUMap, detectLanguageFromUrl } from "./shared/utils";

// ============================================================================
// State
// ============================================================================

const currentSettings: ExtensionSettings = { ...DEFAULT_SETTINGS };
let codeMirrorEditor: EditorView | null = null;
let currentEditorCode = "";
let currentEditorLanguage = "";
let statusBarElement: HTMLElement | null = null;

// Toggle functionality for original/formatted code
let isShowingOriginal = false;
let originalPreElement: HTMLElement | null = null;

// Hidden file input for file picker
let fileInputElement: HTMLInputElement | null = null;

/** CodeMirror compartments for dynamic reconfiguration */
const themeCompartment = new Compartment();
const languageCompartment = new Compartment();

// Content-script cache for formatted code (LRU)
const contentCache = new LRUMap<string, string>(20);

// ============================================================================
// Debounced Formatting
// ============================================================================

// Sequence counter to prevent race conditions
let formatSequence = 0;

/**
 * Debounced format function for format-on-type feature
 * Waits 500ms after user stops typing before formatting
 * Uses sequence tracking to prevent out-of-order updates
 */
const debouncedFormat = debounce(async () => {
  if (!codeMirrorEditor || !currentEditorLanguage) return;

  const code = codeMirrorEditor.state.doc.toString();
  if (!code.trim()) return;

  // Validate code size before sending to prevent abuse
  const MAX_FORMAT_ON_TYPE_SIZE = 100000; // 100KB
  if (code.length > MAX_FORMAT_ON_TYPE_SIZE) {
    console.warn("[Code Formatter] Code too large for format-on-type");
    return;
  }

  // Increment sequence and capture current value
  const currentSequence = ++formatSequence;

  try {
    const formatted = await formatCode(code, currentEditorLanguage);

    // Only apply if this is still the most recent format request
    // and the editor content hasn't changed during formatting
    if (currentSequence === formatSequence) {
      const currentContent = codeMirrorEditor.state.doc.toString();

      // Only update if content hasn't changed during formatting
      // and the formatted result is different
      if (currentContent === code && formatted !== code) {
        codeMirrorEditor.dispatch({
          changes: {
            from: 0,
            to: codeMirrorEditor.state.doc.length,
            insert: formatted,
          },
        });
        currentEditorCode = formatted;
      }
    }
  } catch (error) {
    console.error("[Code Formatter] Auto-format failed:", error);
  }
}, 500);

// ============================================================================
// Settings
// ============================================================================

function loadSettings(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      [
        "indentSize",
        "quoteStyle",
        "theme",
        "wrapLines",
        "fontSize",
        "lineHeight",
        // Formatter options
        "singleQuote",
        "semi",
        "trailingComma",
        // js-beautify options
        "e4x",
        "spaceInEmptyParens",
        "unescapeStrings",
        "keepArrayIndentation",
        // WASM formatter options
        "quoteStyleWasm",
        "keywordCase",
        "commaPosition",
        // Feature flags
        "autoFormatOnType",
        "formatOnPasteMinLength",
      ],
      (result: Partial<ExtensionSettings>) => {
        // Display settings
        if (result.indentSize !== undefined)
          currentSettings.indentSize = result.indentSize;
        if (result.quoteStyle !== undefined)
          currentSettings.quoteStyle = result.quoteStyle;
        if (result.theme !== undefined) currentSettings.theme = result.theme;
        if (result.wrapLines !== undefined)
          currentSettings.wrapLines = result.wrapLines;
        if (result.fontSize !== undefined)
          currentSettings.fontSize = result.fontSize;
        if (result.lineHeight !== undefined)
          currentSettings.lineHeight = result.lineHeight;

        // Formatter options
        if (result.singleQuote !== undefined)
          currentSettings.singleQuote = result.singleQuote;
        if (result.semi !== undefined) currentSettings.semi = result.semi;
        if (result.trailingComma !== undefined)
          currentSettings.trailingComma = result.trailingComma;

        // js-beautify options
        if (result.e4x !== undefined) currentSettings.e4x = result.e4x;
        if (result.spaceInEmptyParens !== undefined)
          currentSettings.spaceInEmptyParens = result.spaceInEmptyParens;
        if (result.unescapeStrings !== undefined)
          currentSettings.unescapeStrings = result.unescapeStrings;
        if (result.keepArrayIndentation !== undefined)
          currentSettings.keepArrayIndentation = result.keepArrayIndentation;

        // WASM formatter options
        if (result.quoteStyleWasm !== undefined)
          currentSettings.quoteStyleWasm = result.quoteStyleWasm;
        if (result.keywordCase !== undefined)
          currentSettings.keywordCase = result.keywordCase;
        if (result.commaPosition !== undefined)
          currentSettings.commaPosition = result.commaPosition;

        // Feature flags
        if (result.autoFormatOnType !== undefined)
          currentSettings.autoFormatOnType = result.autoFormatOnType;
        if (result.formatOnPasteMinLength !== undefined)
          currentSettings.formatOnPasteMinLength =
            result.formatOnPasteMinLength;

        resolve();
      },
    );
  });
}

function saveSettings(): void {
  chrome.storage.sync.set(currentSettings, () => {
    if (chrome.runtime.lastError) {
      console.error(
        "[Code Formatter] Failed to save settings:",
        chrome.runtime.lastError.message,
      );
    }
  });
}

// ============================================================================
// Language Detection
// ============================================================================

function detectLanguage(content: string): string | null {
  // Try JSON first
  if (content.trim().startsWith("{") && content.trim().endsWith("}")) {
    try {
      const parsed = JSON.parse(content.trim());
      // Ensure it's an object and not null
      if (typeof parsed === "object" && parsed !== null) {
        return "json";
      }
    } catch {
      /* not JSON */
    }
  }
  if (content.trim().startsWith("[") && content.trim().endsWith("]")) {
    try {
      const parsed = JSON.parse(content.trim());
      // Ensure it's an array
      if (Array.isArray(parsed)) {
        return "json";
      }
    } catch {
      /* not JSON */
    }
  }

  // Try URL-based detection
  const url = window.location.href;
  const ext = url.split(".").pop()?.split("?")[0].toLowerCase();
  if (ext && EXTENSION_MAP[ext]) return EXTENSION_MAP[ext];

  // Pattern-based detection — expanded for more languages
  // Optimized regex patterns to prevent ReDoS attacks
  // Uses atomic groups concept via specific quantifier limits
  const patterns: Array<{ lang: string; regex: RegExp; weight: number }> = [
    {
      lang: "html",
      regex: /^\s*<!DOCTYPE|<html|<head|<body/i,
      weight: 10,
    },
    { lang: "xml", regex: /^\s*<\?xml/i, weight: 10 },
    {
      lang: "css",
      // Limited match: word char selector followed by { with limited content
      // Using {0,500} to limit backtracking
      regex: /\b(?:body|html|div|span|[\w-][\w-]*)\s*\{[^\n]{0,500}\}/,
      weight: 8,
    },
    {
      lang: "typescript",
      // Simplified pattern for TypeScript-specific keywords
      regex: /\b(?:interface|type|enum|namespace|declare|readonly)\s+\w+/,
      weight: 6,
    },
    {
      lang: "javascript",
      // Common JS keywords with word boundaries
      regex:
        /\b(?:const|let|var|function|class|return|if|else|for|import|export|async|await)\b/,
      weight: 3,
    },
    {
      lang: "python",
      // Python-specific patterns
      regex:
        /\b(?:def\s|class\s|elif\s|import\s+\w+|from\s+\w+\s+import|lambda\s|yield\b)/,
      weight: 5,
    },
    {
      lang: "go",
      // Go-specific keywords
      regex:
        /\b(?:func\s|package\s|import\s|defer\b|goroutine|chan\b|select\b)/,
      weight: 6,
    },
    {
      lang: "rust",
      // Rust-specific patterns
      regex:
        /\b(?:fn\s|let\s+mut|impl\s|pub\s+fn|struct\s|enum\s|match\b|use\s+\w+::|trait\s)/,
      weight: 6,
    },
    {
      lang: "sql",
      // SQL keywords (case insensitive)
      regex:
        /\b(?:SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE|ALTER\s+TABLE|DROP|JOIN|WHERE|FROM)\b/i,
      weight: 6,
    },
    // YAML: simplified to avoid ReDoS - just check for key: value pattern at start of line
    { lang: "yaml", regex: /^[a-zA-Z_][a-zA-Z0-9_-]*\s*:/m, weight: 3 },
    {
      lang: "ruby",
      // Ruby-specific patterns
      regex:
        /\b(?:require\s|puts\s|def\s|end\b|class\s|module\s|attr_accessor|do\s*\|)/,
      weight: 5,
    },
    // TOML: simplified key=value pattern
    { lang: "toml", regex: /^\s*[a-zA-Z_][a-zA-Z0-9_-]*\s*=\s*/, weight: 3 },
  ];

  let bestMatch: { lang: string; weight: number } | null = null;
  for (const p of patterns) {
    if (p.regex.test(content)) {
      if (!bestMatch || p.weight > bestMatch.weight) {
        bestMatch = { lang: p.lang, weight: p.weight };
      }
    }
  }

  return bestMatch?.lang ?? null;
}

function appearsToBeCodePage(): boolean {
  // Fast URL pre-check first (no DOM access)
  const urlLang = detectLanguageFromUrl();
  if (urlLang) return true;

  // Also check for common URL patterns
  const url = window.location.href;
  if (
    url.includes("/blob/") ||
    url.includes("/raw/") ||
    url.includes("github.com") ||
    url.includes("stackoverflow.com") ||
    url.includes("gist.github.com")
  ) {
    return true;
  }

  // Check for code elements anywhere in the page
  return !!(document.querySelector("pre") || document.querySelector("code"));
}

// ============================================================================
// Message Handling
// ============================================================================

function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener(
    (message: { action: string }, _sender, sendResponse) => {
      if (message.action === "getLanguage") {
        // Limit content size for language detection to avoid performance issues
        const content = document.body.innerText || "";
        const limitedContent =
          content.length > 50000 ? content.substring(0, 50000) : content;
        const lang = detectLanguage(limitedContent);
        sendResponse({ status: "success", language: lang });
        return true;
      }

      return false;
    },
  );
}

async function formatCode(code: string, language: string): Promise<string> {
  // Check content cache first
  const cacheKey = `${language}:${code.substring(0, 500)}`;
  const cached = contentCache.get(cacheKey);
  if (cached) {
    console.log("[Code Formatter] Using cached format result");
    return cached;
  }

  return new Promise((resolve) => {
    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
      console.warn("[Code Formatter] Extension context invalidated");
      resolve(code);
      return;
    }

    try {
      chrome.runtime.sendMessage(
        { action: "format", code, language, settings: currentSettings },
        (response: FormatResponse) => {
          // Check for runtime error (extension context invalidated)
          if (chrome.runtime.lastError) {
            console.error(
              "[Code Formatter] Runtime error:",
              chrome.runtime.lastError.message,
            );
            // Return original code but log the error
            resolve(code);
            return;
          }
          if (response?.success && response.code) {
            // Cache the result
            contentCache.set(cacheKey, response.code);
            resolve(response.code);
          } else if (response?.error) {
            // Log formatting error but return original code
            console.warn("[Code Formatter] Formatting failed:", response.error);
            resolve(code);
          } else {
            // Unexpected response format
            console.warn("[Code Formatter] Unexpected response format");
            resolve(code);
          }
        },
      );
    } catch (error) {
      console.error("[Code Formatter] Failed to send message:", error);
      resolve(code);
    }
  });
}

/**
 * Toggle between original and formatted code view
 * Shows original pre element when disabled, extension UI when enabled
 * Toolbar always stays visible for easy switching
 */
function toggleOriginalCode(): void {
  isShowingOriginal = !isShowingOriginal;

  // Get extension UI elements
  const renderer = document.getElementById(ELEMENT_IDS.RENDERER);
  const statusBar = document.getElementById(ELEMENT_IDS.STATUS_BAR);

  if (isShowingOriginal) {
    // Show original: hide editor and status bar, show original pre element
    // Toolbar stays visible so user can switch back!
    if (renderer) renderer.style.display = "none";
    if (statusBar) statusBar.style.display = "none";
    if (originalPreElement) {
      originalPreElement.style.display = "block";
      // Add padding to account for toolbar
      originalPreElement.style.paddingTop = "50px";
    }

    // Remove body classes to restore normal page
    document.body.classList.remove(CSS_CLASSES.LOADED);
    document.documentElement.classList.remove(CSS_CLASSES.LOADED);
  } else {
    // Show formatted: show editor and status bar, hide original pre element
    if (renderer) renderer.style.display = "block";
    if (statusBar) statusBar.style.display = "flex";
    if (originalPreElement) {
      originalPreElement.style.display = "none";
      originalPreElement.style.paddingTop = "";
    }

    // Add body classes for extension styling
    document.body.classList.add(CSS_CLASSES.LOADED);
    document.documentElement.classList.add(CSS_CLASSES.LOADED);
  }

  // Update button text and active state
  const toggleBtn = document.getElementById("code-formatter-toggle-original");
  if (toggleBtn) {
    const label = toggleBtn.querySelector(
      ".code-formatter-toolbar__button-label",
    );
    if (label) {
      label.textContent = isShowingOriginal ? "Formatted" : "Original";
    }
    toggleBtn.title = isShowingOriginal
      ? "Show Formatted Code"
      : "Show Original Code";
    toggleBtn.classList.toggle("active", isShowingOriginal);
  }
}

// ============================================================================
// Status Bar
// ============================================================================

function createStatusBar(language: string, code: string): HTMLElement {
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
  const indentItem = makeItem(`Spaces: ${currentSettings.indentSize}`);
  const wrapItem = makeItem(
    currentSettings.wrapLines ? "Wrap: On" : "Wrap: Off",
  );

  // Style wrap item to show active/inactive state
  if (currentSettings.wrapLines) {
    wrapItem.style.color = COLORS.ACTIVE; // Green for active
  } else {
    wrapItem.style.color = COLORS.INACTIVE; // Muted for inactive
  }

  bar.append(langItem, lineItem, sizeItem, indentItem, wrapItem);
  return bar;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function showLoadingSkeleton(): HTMLElement {
  const skeleton = document.createElement("div");
  skeleton.className = CSS_CLASSES.SKELETON;

  // Create animated skeleton lines using DocumentFragment for better performance
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 20; i++) {
    const line = document.createElement("div");
    line.className = CSS_CLASSES.SKELETON_LINE;
    const width = 30 + Math.random() * 60;
    line.style.width = `${width}%`;
    fragment.appendChild(line);
  }
  skeleton.appendChild(fragment);

  document.body.appendChild(skeleton);
  return skeleton;
}

// ============================================================================
// Toolbar
// ============================================================================
// ============================================================================
// Helpers
// ============================================================================

function getFileExtension(language: string): string {
  const map: Record<string, string> = {
    javascript: "js",
    typescript: "ts",
    json: "json",
    css: "css",
    scss: "scss",
    html: "html",
    xml: "xml",
    python: "py",
    markdown: "md",
    go: "go",
    rust: "rs",
    sql: "sql",
    yaml: "yml",
    toml: "toml",
    ruby: "rb",
  };
  return map[language.toLowerCase()] || "txt";
}

// ============================================================================
// Format on Paste
// ============================================================================

function setupFormatOnPaste(): void {
  // Use a flag to prevent re-entrancy
  let isProcessing = false;

  registerEventListener(document, "paste", async (_e: Event) => {
    // Prevent re-entrancy
    if (isProcessing) return;

    const e = _e as ClipboardEvent;
    const target = e.target as HTMLElement;

    // Only intercept paste in TEXTAREA or INPUT elements
    // NEVER intercept contentEditable as it's a security risk
    const isTextInput =
      target.tagName === "TEXTAREA" || target.tagName === "INPUT";

    if (!isTextInput) {
      return;
    }

    // Get pasted text early, before any modifications
    const pastedText = e.clipboardData?.getData("text/plain");
    if (!pastedText) return;

    const minLength = currentSettings.formatOnPasteMinLength ?? 5;
    if (pastedText.length < minLength) return; // Too short to be code

    const detectedLang = detectLanguage(pastedText);
    if (!detectedLang) return;

    // Check if formatting category exists for this language
    const formattable = [
      "javascript",
      "typescript",
      "json",
      "css",
      "scss",
      "html",
      "xml",
      "python",
      "go",
      "rust",
      "sql",
      "yaml",
      "toml",
      "ruby",
      "lua",
      "zig",
      "dart",
    ];
    if (!formattable.includes(detectedLang)) return;

    // Prevent default paste and mark as processing
    e.preventDefault();
    isProcessing = true;

    try {
      const formatted = await formatCode(pastedText, detectedLang);

      // Verify target is still focused and valid
      if (
        document.activeElement !== target ||
        (target.tagName !== "TEXTAREA" && target.tagName !== "INPUT")
      ) {
        console.warn("[Code Formatter] Target lost focus during formatting");
        // Fallback: insert original text
        insertTextAtCursor(target as HTMLTextAreaElement, pastedText);
        return;
      }

      insertTextAtCursor(target as HTMLTextAreaElement, formatted);
    } catch (error) {
      console.error("[Code Formatter] Format on paste failed:", error);
      // Fallback: insert original text
      insertTextAtCursor(target as HTMLTextAreaElement, pastedText);
    } finally {
      isProcessing = false;
    }
  });
}

/**
 * Safely insert text at cursor position in textarea/input
 * Replaces deprecated document.execCommand
 */
function insertTextAtCursor(input: HTMLTextAreaElement, text: string): void {
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const before = input.value.substring(0, start);
  const after = input.value.substring(end);

  input.value = before + text + after;
  input.selectionStart = input.selectionEnd = start + text.length;

  // Trigger input event for any listeners
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

// ============================================================================
// File Browser / Drag-Drop
// ============================================================================

/**
 * Create hidden file input element
 */
function createFileInput(): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "file";
  input.id = ELEMENT_IDS.FILE_INPUT;
  input.multiple = true; // Support multiple files
  input.accept =
    ".js,.jsx,.ts,.tsx,.json,.css,.scss,.less,.html,.htm,.xml,.md,.py,.go,.rs,.sql,.yml,.yaml,.toml,.rb,.lua,.zig,.dart,.txt";
  input.style.display = "none";
  input.addEventListener("change", async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const filesArray = Array.from(target.files);
      await handleFileSelection(filesArray);
    }
  });
  fileInputElement = input;
  return input;
}

/**
 * Handle file selection (from file picker or drag-drop)
 */
async function handleFileSelection(files: File[]): Promise<void> {
  if (files.length === 0) return;

  // Load all files
  const results = await loadFiles(files);

  // Filter successful loads
  const successfulLoads = results.filter((r) => r.success);

  if (successfulLoads.length === 0) {
    console.error("[Code Formatter] No files could be loaded");
    return;
  }

  // If multiple files, use the first one (could be enhanced to show tabs)
  const firstLoad = successfulLoads[0];

  // Format and display the first file
  if (firstLoad.code && firstLoad.language && firstLoad.fileInfo) {
    const formatted = await formatCode(firstLoad.code, firstLoad.language);

    // Update editor
    if (codeMirrorEditor) {
      codeMirrorEditor.dispatch({
        changes: {
          from: 0,
          to: codeMirrorEditor.state.doc.length,
          insert: formatted,
        },
      });
    }

    currentEditorCode = formatted;
    currentEditorLanguage = firstLoad.language;

    // Update status bar with file info
    updateStatusBarWithFile(firstLoad.fileInfo);

    // Show warning if multiple files
    if (successfulLoads.length > 1) {
      console.log(
        `[Code Formatter] Loaded first of ${successfulLoads.length} files. Only one file can be displayed at a time.`,
      );
    }
  }
}

/**
 * Open file dialog
 */
function openFileDialog(): void {
  if (fileInputElement) {
    fileInputElement.click();
  }
}

/**
 * Create drag-drop zone overlay
 */
function createDropZone(): HTMLElement {
  const zone = document.createElement("div");
  zone.id = ELEMENT_IDS.DROP_ZONE;
  zone.className = CSS_CLASSES.DROP_ZONE;
  const content = document.createElement("div");
  content.className = "code-formatter-drop-zone__content";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "64");
  svg.setAttribute("height", "64");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");

  const createPath = (d: string) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    return path;
  };

  const createPolyline = (points: string) => {
    const polyline = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polyline",
    );
    polyline.setAttribute("points", points);
    return polyline;
  };

  const createLine = (x1: string, y1: string, x2: string, y2: string) => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    return line;
  };

  svg.appendChild(
    createPath("M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"),
  );
  svg.appendChild(createPolyline("14 2 14 8 20 8"));
  svg.appendChild(createLine("12", "18", "12", "12"));
  svg.appendChild(createLine("9", "15", "12", "12"));
  svg.appendChild(createLine("15", "15", "12", "12"));

  const text = document.createElement("p");
  text.className = "code-formatter-drop-zone__text";
  text.textContent = "Drop files here or press ";

  const kbd = document.createElement("kbd");
  kbd.textContent = "Ctrl+O";
  text.appendChild(kbd);

  content.appendChild(svg);
  content.appendChild(text);
  zone.appendChild(content);

  // Add drag-drop event handlers
  zone.addEventListener("dragover", (e: DragEvent) => {
    e.preventDefault();
    zone.classList.add(CSS_CLASSES.DROP_ZONE_DRAGOVER);
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove(CSS_CLASSES.DROP_ZONE_DRAGOVER);
  });

  zone.addEventListener("drop", async (e: DragEvent) => {
    e.preventDefault();
    zone.classList.remove(CSS_CLASSES.DROP_ZONE_DRAGOVER);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const filesArray = Array.from(files);
      await handleFileSelection(filesArray);
      // Hide drop zone after successful drop
      hideDropZone();
    }
  });

  return zone;
}

/**
 * Show drop zone overlay
 */
let dropZoneElement: HTMLElement | null = null;

function showDropZone(): void {
  if (!dropZoneElement) {
    dropZoneElement = createDropZone();
    document.body.appendChild(dropZoneElement);
  }
  dropZoneElement.classList.add(CSS_CLASSES.DROP_ZONE_ACTIVE);
}

/**
 * Hide drop zone overlay
 */
function hideDropZone(): void {
  if (dropZoneElement) {
    dropZoneElement.classList.remove(CSS_CLASSES.DROP_ZONE_ACTIVE);
  }
}

/**
 * Setup drag-drop zone on the page
 */
function setupDragDropZone(): void {
  // Create drop zone once
  if (!dropZoneElement) {
    dropZoneElement = createDropZone();
    document.body.appendChild(dropZoneElement);
  }

  // Handle window-level drag events (using registerEventListener for cleanup)
  registerEventListener(document, "dragover", (_e: Event) => {
    const e = _e as DragEvent;
    const hasFiles = e.dataTransfer?.types.some((type) => type === "Files");
    if (hasFiles) {
      showDropZone();
    }
  });

  registerEventListener(document, "dragleave", (_e: Event) => {
    const e = _e as DragEvent;
    if (e.relatedTarget === null) {
      hideDropZone();
    }
  });

  registerEventListener(document, "drop", (_e: Event) => {
    hideDropZone();
  });
}

/**
 * Update status bar with file information
 */
function updateStatusBarWithFile(
  fileInfo: { name: string; size: number } | null | undefined,
): void {
  if (!statusBarElement || !fileInfo) return;

  // Validate required properties
  if (typeof fileInfo.name !== "string" || typeof fileInfo.size !== "number") {
    console.warn(
      "[Code Formatter] Invalid fileInfo provided to updateStatusBarWithFile",
    );
    return;
  }

  // Remove old file info if exists
  const oldFileItem = statusBarElement.querySelector(
    `.${CSS_CLASSES.STATUS_BAR_FILENAME}`,
  );
  if (oldFileItem) oldFileItem.remove();

  const sizeLabel = formatFileSize(fileInfo.size);

  // Create new file info item
  const fileItem = document.createElement("span");
  fileItem.className = CSS_CLASSES.STATUS_BAR_FILENAME;
  fileItem.textContent = `${fileInfo.name} (${sizeLabel})`;
  fileItem.style.color = COLORS.ACTIVE; // Highlight file info

  // Insert after language item
  const langItem = statusBarElement.querySelector(
    ".code-formatter-status-bar__item",
  );
  if (langItem && langItem.nextSibling) {
    statusBarElement.insertBefore(fileItem, langItem.nextSibling);
  }
}

/**
 * Sanitize SVG content to prevent XSS attacks
 * Removes potentially dangerous elements and attributes
 */
function sanitizeSvg(svgElement: SVGElement): SVGElement {
  // List of dangerous elements to remove
  const dangerousElements = [
    "script",
    "foreignObject",
    "iframe",
    "object",
    "embed",
    "use",
    "animate",
    "set",
  ];

  // Comprehensive list of dangerous attributes to remove
  const dangerousAttrs = [
    "onload",
    "onclick",
    "onerror",
    "onmouseover",
    "onfocus",
    "onblur",
    "onchange",
    "onsubmit",
    "onkeydown",
    "onkeyup",
    "onkeypress",
    "onanimationstart",
    "onanimationend",
    "onanimationiteration",
    "ontransitionend",
    "href",
    "xlink:href",
    "ping",
    "formaction",
    "poster",
    "src",
    "data",
    "xmlns:xlink",
  ];

  // Dangerous URL protocols
  const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"];

  // Helper to check if attribute value is dangerous
  const isDangerousUrl = (value: string): boolean => {
    const lower = value.toLowerCase().trim();
    return dangerousProtocols.some((proto) => lower.startsWith(proto));
  };

  // Remove dangerous elements
  for (const tagName of dangerousElements) {
    const elements = svgElement.querySelectorAll(tagName);
    elements.forEach((el) => el.remove());
  }

  // Remove dangerous attributes from all elements
  const allElements = svgElement.querySelectorAll("*");
  allElements.forEach((el) => {
    const elAttrs = Array.from(el.attributes);
    for (const attr of elAttrs) {
      // Remove dangerous attribute names
      if (dangerousAttrs.includes(attr.name.toLowerCase())) {
        el.removeAttribute(attr.name);
        continue;
      }
      // Remove any event handler attributes (on*)
      if (attr.name.toLowerCase().startsWith("on")) {
        el.removeAttribute(attr.name);
        continue;
      }
      // Check for dangerous URL values in href, src, etc.
      if (
        ["href", "src", "xlink:href", "data", "poster", "formaction"].includes(
          attr.name.toLowerCase(),
        ) &&
        isDangerousUrl(attr.value)
      ) {
        el.removeAttribute(attr.name);
      }
    }
  });

  // Also check the root SVG element
  const rootAttrs = Array.from(svgElement.attributes);
  for (const attr of rootAttrs) {
    if (dangerousAttrs.includes(attr.name.toLowerCase())) {
      svgElement.removeAttribute(attr.name);
      continue;
    }
    if (attr.name.toLowerCase().startsWith("on")) {
      svgElement.removeAttribute(attr.name);
      continue;
    }
    if (
      ["href", "src", "xlink:href"].includes(attr.name.toLowerCase()) &&
      isDangerousUrl(attr.value)
    ) {
      svgElement.removeAttribute(attr.name);
    }
  }

  // Remove xmlns:xlink if present (can be used for attacks)
  svgElement.removeAttribute("xmlns:xlink");

  return svgElement;
}

function createToolbarButton(
  id: string,
  title: string,
  iconSvg: string,
  text: string,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.id = id;
  btn.className = CSS_CLASSES.TOOLBAR_BUTTON;
  btn.title = title;

  const iconContainer = document.createElement("span");
  // Parse SVG string safely using DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString(iconSvg, "image/svg+xml");
  const svgElement = doc.documentElement;

  // Verify it is an SVG element before appending, and sanitize it
  if (svgElement instanceof SVGElement) {
    const sanitizedSvg = sanitizeSvg(svgElement);
    iconContainer.appendChild(sanitizedSvg);
  }

  btn.appendChild(iconContainer);
  if (text) {
    const label = document.createElement("span");
    label.style.marginLeft = "4px";
    label.textContent = text;
    btn.appendChild(label);
  }
  return btn;
}

function createSeparator(): HTMLElement {
  const sep = document.createElement("div");
  sep.className = CSS_CLASSES.TOOLBAR_SEPARATOR;
  return sep;
}

function createToolbar(formattedCode: string): HTMLElement {
  const toolbar = document.createElement("div");
  toolbar.id = ELEMENT_IDS.TOOLBAR;
  toolbar.className = CSS_CLASSES.TOOLBAR;

  // Open File button (NEW)
  const openFileBtn = createToolbarButton(
    ELEMENT_IDS.BUTTON_OPEN_FILE,
    "Open File (Ctrl+O)",
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 1-2-2v16a2 2 0 0 1 2 2h12a2 2 0 0 1 2 2V4a2 2 0 0 1 2-2z"></path><polyline points="14 2 14 22 8 22 8 22"></polyline><line x1="2" y1="2" x2="22" y2="2"></line><line x1="2" y1="22" x2="22" y2="22"></line><path d="M14.5 12.5H19"></path><polyline points="9 9 12 12 12 15 12"></polyline><polyline points="12 12 9 15"></polyline></svg>',
    "Open",
  );
  openFileBtn.addEventListener("click", openFileDialog);
  toolbar.appendChild(openFileBtn);
  toolbar.appendChild(createSeparator());

  // Theme selector
  const themeSel = document.createElement("select");
  themeSel.id = ELEMENT_IDS.BUTTON_THEME;
  themeSel.className = CSS_CLASSES.TOOLBAR_SELECT;
  AVAILABLE_THEMES.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.value;
    opt.textContent = t.label;
    if (t.value === currentSettings.theme) opt.selected = true;
    themeSel.appendChild(opt);
  });
  themeSel.addEventListener("change", (e: Event) => {
    const target = e.target as HTMLSelectElement;
    currentSettings.theme = target.value as ThemeName;
    applyTheme();
    saveSettings();
    // showToast remove
  });
  toolbar.appendChild(themeSel);
  toolbar.appendChild(createSeparator());

  // Collapse button — fold all code blocks
  const collapseBtn = createToolbarButton(
    ELEMENT_IDS.BUTTON_COLLAPSE,
    "Collapse All",
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>',
    "",
  );
  collapseBtn.addEventListener("click", () => {
    if (codeMirrorEditor) {
      foldAll(codeMirrorEditor);
      // showToast remove
    }
  });
  toolbar.appendChild(collapseBtn);

  // Expand button — unfold all code blocks
  const expandBtn = createToolbarButton(
    ELEMENT_IDS.BUTTON_EXPAND,
    "Expand All",
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>',
    "",
  );
  expandBtn.addEventListener("click", () => {
    if (codeMirrorEditor) {
      unfoldAll(codeMirrorEditor);
      // showToast remove
    }
  });
  toolbar.appendChild(expandBtn);

  // Word wrap toggle button
  const wrapBtn = createToolbarButton(
    "code-formatter-wrap-btn",
    "Toggle Word Wrap",
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h12"/></svg>',
    "Wrap",
  );
  // Set initial active state
  if (currentSettings.wrapLines) {
    wrapBtn.classList.add("active");
  }
  wrapBtn.addEventListener("click", () => {
    currentSettings.wrapLines = !currentSettings.wrapLines;
    updateStatusBarWrap();
    saveSettings();
    // Update button appearance with active class
    wrapBtn.classList.toggle("active", currentSettings.wrapLines);
  });
  toolbar.appendChild(wrapBtn);

  // Toggle Original/Formatted button (shows formatted by default)
  const toggleOriginalBtn = createToolbarButton(
    "code-formatter-toggle-original",
    "Show Original Code",
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>',
    "Original",
  );
  // Initially showing formatted, so not active
  toggleOriginalBtn.addEventListener("click", () => {
    toggleOriginalCode();
    // Toggle active state based on isShowingOriginal
    toggleOriginalBtn.classList.toggle("active", isShowingOriginal);
  });
  toolbar.appendChild(toggleOriginalBtn);

  toolbar.appendChild(createSeparator());

  // Spacer
  const spacer = document.createElement("div");
  spacer.style.flex = "1";
  toolbar.appendChild(spacer);

  // Copy button
  const copyBtn = createToolbarButton(
    ELEMENT_IDS.BUTTON_COPY,
    "Copy",
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    "Copy",
  );
  copyBtn.addEventListener("click", () => {
    const codeToCopy = currentEditorCode || formattedCode;
    navigator.clipboard.writeText(codeToCopy).then(() => {
      // showToast remove
    });
  });
  toolbar.appendChild(copyBtn);

  // Download button
  const downloadBtn = createToolbarButton(
    ELEMENT_IDS.BUTTON_DOWNLOAD,
    "Download",
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    "Download",
  );
  downloadBtn.addEventListener("click", () => {
    const codeToDownload = currentEditorCode || formattedCode;
    const ext = getFileExtension(currentEditorLanguage);
    const blob = new Blob([codeToDownload], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `formatted.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    // showToast remove
  });
  toolbar.appendChild(downloadBtn);

  return toolbar;
}

// ============================================================================
// Editor
// ============================================================================

function getLanguageExtension(language: string): Extension {
  switch (language.toLowerCase()) {
    case "javascript":
    case "typescript":
    case "jsx":
    case "tsx":
      return javascript();
    case "json":
      return json();
    case "css":
    case "scss":
    case "less":
      return css();
    case "html":
    case "xml":
    case "svg":
      return html();
    case "python":
    case "py":
      return python();
    case "markdown":
    case "md":
      return markdown();
    default:
      return []; // Languages without syntax highlighting
  }
}

function getThemeExtensions(): Extension[] {
  const exts: Extension[] = [];

  switch (currentSettings.theme) {
    case "one-dark-pro":
      exts.push(oneDark);
      break;
    case "dracula":
      exts.push(dracula);
      break;
    case "nord":
      exts.push(nord);
      break;
    case "monokai":
      exts.push(monokai);
      break;
    case "material":
      exts.push(material);
      break;
    case "github-dark":
      exts.push(githubDark);
      break;
    case "github-light":
      exts.push(githubLight);
      break;
    case "solarized-light":
      exts.push(solarizedLight);
      break;
    case "solarized-dark":
      exts.push(solarizedDark);
      break;
    case "tokyo-night":
      exts.push(tokyoNight);
      break;
    default:
      exts.push(syntaxHighlighting(defaultHighlightStyle));
      break;
  }

  // Determine if theme is dark for custom styling
  const darkThemes = [
    "one-dark-pro",
    "dracula",
    "nord",
    "monokai",
    "material",
    "github-dark",
    "solarized-dark",
    "tokyo-night",
  ];
  const isDark = darkThemes.includes(currentSettings.theme);
  const bg = isDark ? "#282c34" : "#ffffff";
  const fg = isDark ? "#abb2bf" : "#24292e";
  const gutterBg = isDark ? "#21252b" : "#f6f8fa";
  const gutterFg = isDark ? "#636d83" : "#6a737d";

  exts.push(
    EditorView.theme({
      "&": {
        backgroundColor: bg,
        color: fg,
        fontSize: `${currentSettings.fontSize}px`,
      },
      ".cm-content": {
        backgroundColor: bg,
        color: fg,
        lineHeight: `${currentSettings.lineHeight}`,
        fontFamily: "'SF Mono', Monaco, Consolas, monospace",
      },
      ".cm-gutters": {
        backgroundColor: gutterBg,
        color: gutterFg,
        borderRight: "1px solid #3e4451",
      },
      ".cm-activeLineGutter": {
        backgroundColor: isDark ? "#2c313c" : "#f0f0f0",
      },
      ".cm-activeLine": { backgroundColor: isDark ? "#2c313c" : "#f0f0f0" },
      ".cm-selectionBackground": {
        backgroundColor: isDark ? "#3e4451" : "#b4d5fe",
      },
    }),
  );

  return exts;
}

function createCodeMirrorEditor(
  container: HTMLElement,
  code: string,
  language: string,
): EditorView {
  console.log("[Code Formatter] Creating editor:", language);

  const isEditable = currentSettings.autoFormatOnType ?? false;

  const extensions: Extension[] = [
    lineNumbers(),
    bracketMatching(),
    codeFolding(),
    foldGutter(),
    // Add auto-indent and Tab key handling
    indentOnInput(),
    keymap.of([...defaultKeymap, ...foldKeymap, indentWithTab]),
    languageCompartment.of(getLanguageExtension(language)),
    themeCompartment.of(getThemeExtensions()),
    EditorView.editable.of(isEditable),
  ];

  // Add update listener for format-on-type if enabled
  if (isEditable) {
    extensions.push(
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          debouncedFormat();
        }
      }),
    );
  }

  const state = EditorState.create({ doc: code, extensions });
  return new EditorView({ state, parent: container });
}

/**
 * Apply theme dynamically using compartment reconfiguration — no editor destroy/recreate
 */
function applyTheme(): void {
  if (codeMirrorEditor) {
    codeMirrorEditor.dispatch({
      effects: themeCompartment.reconfigure(getThemeExtensions()),
    });
  }
}

/**
 * Update the wrap status in the status bar
 */
function updateStatusBarWrap(): void {
  if (statusBarElement) {
    const wrapItems = statusBarElement.querySelectorAll("span");
    // Find the item that starts with "Wrap:"
    for (const item of wrapItems) {
      if (item.textContent && item.textContent.startsWith("Wrap:")) {
        if (currentSettings.wrapLines) {
          item.textContent = "Wrap: On";
          item.style.color = COLORS.ACTIVE; // Green for active
        } else {
          item.textContent = "Wrap: Off";
          item.style.color = COLORS.INACTIVE; // Muted for inactive
        }
        break;
      }
    }
  }
}

// ============================================================================
// Core Logic
// ============================================================================

function extractOriginalCode(): string {
  const pre = document.querySelector("body > pre");
  return pre?.textContent || document.body.innerText;
}

async function autoFormatPage(): Promise<void> {
  console.log("[Code Formatter] Auto-formatting...");

  // Show loading skeleton while formatting
  const skeleton = showLoadingSkeleton();

  try {
    const code = extractOriginalCode();
    const lang = detectLanguage(code);

    if (!lang) {
      skeleton.remove();
      const pre = document.querySelector("body > pre");
      if (pre) (pre as HTMLElement).style.display = "block";
      return;
    }

    const formattedCode = await formatCode(code, lang);

    // Store original pre element for toggle functionality
    isShowingOriginal = false;
    originalPreElement = document.querySelector(
      "body > pre",
    ) as HTMLElement | null;

    // Hide the original pre element
    if (originalPreElement) {
      originalPreElement.style.display = "none";
    }

    // Remove skeleton
    skeleton.remove();

    const renderer = document.createElement("div");
    renderer.id = ELEMENT_IDS.RENDERER;
    renderer.style.cssText =
      "position:absolute;width:100%;height:calc(100vh - 62px);top:38px;right:0;overflow:auto;";
    document.body.appendChild(renderer);

    currentEditorCode = formattedCode;
    currentEditorLanguage = lang;

    codeMirrorEditor = createCodeMirrorEditor(renderer, formattedCode, lang);

    const toolbar = createToolbar(formattedCode);
    document.body.appendChild(toolbar);

    // Status bar with language, line count, file size
    statusBarElement = createStatusBar(lang, formattedCode);
    document.body.appendChild(statusBarElement);

    document.documentElement.classList.add(CSS_CLASSES.LOADED);
    document.body.classList.add(CSS_CLASSES.LOADED);

    // Setup additional features
    setupMessageListener();
    setupFormatOnPaste();
    setupDragDropZone();
    setupKeyboardShortcuts();

    // Create hidden file input for file picker
    const fileInput = createFileInput();
    document.body.appendChild(fileInput);

    console.log("[Code Formatter] Done");
  } catch (e) {
    skeleton.remove();
    console.error("[Code Formatter] Error:", e);
  }
}

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

function setupKeyboardShortcuts(): void {
  registerEventListener(document, "keydown", (e: Event) => {
    const keyEvent = e as KeyboardEvent;

    // Ctrl+Shift+C — Copy formatted code
    if (keyEvent.ctrlKey && keyEvent.shiftKey && keyEvent.key === "C") {
      keyEvent.preventDefault();
      if (currentEditorCode) {
        navigator.clipboard.writeText(currentEditorCode).then(() => {
          // showToast remove
        });
      }
    }

    // Ctrl+Shift+F — Re-format
    if (keyEvent.ctrlKey && keyEvent.shiftKey && keyEvent.key === "F") {
      keyEvent.preventDefault();
      if (currentEditorCode && currentEditorLanguage) {
        formatCode(currentEditorCode, currentEditorLanguage).then(
          (formatted) => {
            if (codeMirrorEditor) {
              codeMirrorEditor.dispatch({
                changes: {
                  from: 0,
                  to: codeMirrorEditor.state.doc.length,
                  insert: formatted,
                },
              });
              currentEditorCode = formatted;
              // showToast remove
            }
          },
        );
      }
    }

    // Ctrl+O / Cmd+O — Open file dialog
    if ((keyEvent.ctrlKey || keyEvent.metaKey) && keyEvent.key === "o") {
      keyEvent.preventDefault();
      openFileDialog();
    }
  });
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Store references to all event listener functions for cleanup
 */
const eventCleanupFunctions: (() => void)[] = [];

/**
 * Register an event listener and store its cleanup function
 */
function registerEventListener(
  target: EventTarget,
  event: string,
  handler: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions,
): void {
  target.addEventListener(event, handler, options);

  // Store cleanup function
  const cleanup = () => target.removeEventListener(event, handler);
  eventCleanupFunctions.push(cleanup);
}

/**
 * Cleanup all event listeners and resources
 */
function cleanup(): void {
  // Remove all registered event listeners
  for (const cleanup of eventCleanupFunctions) {
    cleanup();
  }
  eventCleanupFunctions.length = 0;

  // Destroy CodeMirror editor
  if (codeMirrorEditor) {
    codeMirrorEditor.destroy();
    codeMirrorEditor = null;
  }

  // Remove drop zone if exists
  const dropZone = document.getElementById("code-formatter-drop-zone");
  if (dropZone) {
    dropZone.remove();
  }

  // Remove toolbar and status bar if they exist
  const toolbar = document.getElementById("code-formatter-toolbar");
  if (toolbar) toolbar.remove();
  const statusBar = document.getElementById("code-formatter-status-bar");
  if (statusBar) statusBar.remove();
  const renderer = document.getElementById("code-formatter-renderer");
  if (renderer) renderer.remove();

  // Remove file input element if exists
  if (fileInputElement) {
    fileInputElement.remove();
    fileInputElement = null;
  }

  // Remove body classes with null check
  if (document.body) {
    document.body.classList.remove("code-formatter-is-loaded");
  }

  console.log("[Code Formatter] Cleanup completed");
}

// Register cleanup on page unload
registerEventListener(window, "beforeunload", cleanup);

// ============================================================================
// Initialization
// ============================================================================

async function main(): Promise<void> {
  await loadSettings();

  const init = async () => {
    if (appearsToBeCodePage()) {
      await autoFormatPage();
    }
  };

  // Auto-format on page load
  if (document.readyState === "loading") {
    registerEventListener(document, "DOMContentLoaded", () => {
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(() => init(), { timeout: 2000 });
      } else {
        setTimeout(init, 500);
      }
    });
  } else {
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(() => init(), { timeout: 2000 });
    } else {
      setTimeout(init, 500);
    }
  }
}

main();

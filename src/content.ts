/**
 * Code Formatter Extension - Content Script
 *
 * Detects code pages, formats code via background script, and renders
 * formatted output using CodeMirror 6 with toolbar controls.
 */

import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState, Extension, Compartment } from '@codemirror/state';
import { defaultKeymap } from '@codemirror/commands';
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldGutter,
  foldKeymap,
  codeFolding,
  foldAll,
  unfoldAll,
} from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { nord } from '@uiw/codemirror-theme-nord';
import type {
  ExtensionSettings,
  FormatResponse,
  ThemeName,
} from './shared/types';
import {
  ELEMENT_IDS,
  CSS_CLASSES,
  EXTENSION_MAP,
  AVAILABLE_THEMES,
  DEFAULT_SETTINGS,
} from './shared/constants';
import { loadFiles, formatFileSize } from './formatters/file-loader';
import { debounce } from './shared/utils';

// ============================================================================
// State
// ============================================================================

const currentSettings: ExtensionSettings = { ...DEFAULT_SETTINGS };
let codeMirrorEditor: EditorView | null = null;
let currentEditorCode = '';
let currentEditorLanguage = '';
let statusBarElement: HTMLElement | null = null;

// Toggle functionality for original/formatted code
let isShowingOriginal = false;
let originalPreElement: HTMLElement | null = null;

// Hidden file input for file picker
let fileInputElement: HTMLInputElement | null = null;

/** CodeMirror compartments for dynamic reconfiguration */
const themeCompartment = new Compartment();
const languageCompartment = new Compartment();
const lineWrapCompartment = new Compartment();

// ============================================================================
// Debounced Formatting
// ============================================================================

/**
 * Debounced format function for format-on-type feature
 * Waits 500ms after user stops typing before formatting
 */
const debouncedFormat = debounce(async () => {
  if (!codeMirrorEditor || !currentEditorLanguage) return;

  const code = codeMirrorEditor.state.doc.toString();
  if (!code.trim()) return;

  try {
    const formatted = await formatCode(code, currentEditorLanguage);

    // Only update if content changed
    if (formatted !== code) {
      codeMirrorEditor.dispatch({
        changes: {
          from: 0,
          to: codeMirrorEditor.state.doc.length,
          insert: formatted,
        },
      });
      currentEditorCode = formatted;
    }
  } catch (error) {
    console.error('[Code Formatter] Auto-format failed:', error);
  }
}, 500);

// ============================================================================
// Settings
// ============================================================================

function loadSettings(): void {
  chrome.storage.sync.get(
    [
      'indentSize',
      'quoteStyle',
      'lineWrap',
      'theme',
      'wrapLines',
      'fontSize',
      'lineHeight',
      // Formatter options
      'singleQuote',
      'semi',
      'trailingComma',
      // js-beautify options
      'e4x',
      'spaceInEmptyParens',
      'unescapeStrings',
      'keepArrayIndentation',
      // WASM formatter options
      'quoteStyleWasm',
      'keywordCase',
      'commaPosition',
      // Feature flags
      'autoFormatOnType',
      'formatOnPasteMinLength',
    ],
    (result: Partial<ExtensionSettings>) => {
      // Display settings
      if (result.indentSize !== undefined)
        currentSettings.indentSize = result.indentSize;
      if (result.quoteStyle !== undefined)
        currentSettings.quoteStyle = result.quoteStyle;
      if (result.lineWrap !== undefined)
        currentSettings.lineWrap = result.lineWrap;
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
        currentSettings.formatOnPasteMinLength = result.formatOnPasteMinLength;
    }
  );
}

function saveSettings(): void {
  chrome.storage.sync.set(currentSettings, () => {});
}

// ============================================================================
// Language Detection
// ============================================================================

function detectLanguage(content: string): string | null {
  // Try JSON first
  if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
    try {
      JSON.parse(content.trim());
      return 'json';
    } catch {
      /* not JSON */
    }
  }
  if (content.trim().startsWith('[') && content.trim().endsWith(']')) {
    try {
      JSON.parse(content.trim());
      return 'json';
    } catch {
      /* not JSON */
    }
  }

  // Try URL-based detection
  const url = window.location.href;
  const ext = url.split('.').pop()?.split('?')[0].toLowerCase();
  if (ext && EXTENSION_MAP[ext]) return EXTENSION_MAP[ext];

  // Pattern-based detection — expanded for more languages
  const patterns: Array<{ lang: string; regex: RegExp; weight: number }> = [
    { lang: 'html', regex: /^\s*<!DOCTYPE|<html|<head|<body/i, weight: 10 },
    { lang: 'xml', regex: /^\s*<\?xml/i, weight: 10 },
    {
      lang: 'css',
      regex: /\b(body|html|div|span|\.[\w-]+)\s*\{[^}]*\}/s,
      weight: 8,
    },
    {
      lang: 'typescript',
      regex: /\b(interface|type|enum|namespace|declare|readonly)\s+\w+/g,
      weight: 6,
    },
    {
      lang: 'javascript',
      regex:
        /\b(const|let|var|function|class|return|if|else|for|import|export|async|await)\b/,
      weight: 3,
    },
    {
      lang: 'python',
      regex:
        /\b(def|class|elif|import\s+\w+|from\s+\w+\s+import|lambda|yield)\b/,
      weight: 5,
    },
    {
      lang: 'go',
      regex: /\b(func|package|import|defer|goroutine|chan|select)\b/,
      weight: 6,
    },
    {
      lang: 'rust',
      regex:
        /\b(fn|let\s+mut|impl|pub\s+fn|struct|enum|match|use\s+\w+::|trait)\b/,
      weight: 6,
    },
    {
      lang: 'sql',
      regex:
        /\b(SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE|ALTER\s+TABLE|DROP|JOIN|WHERE|FROM)\b/i,
      weight: 6,
    },
    { lang: 'yaml', regex: /^[\w-]+:\s*[^\n]*$/m, weight: 3 },
    {
      lang: 'ruby',
      regex: /\b(require|puts|def|end|class|module|attr_accessor|do\s*\|)\b/,
      weight: 5,
    },
    { lang: 'toml', regex: /^\s*[\w-]+\s*=\s*/, weight: 3 },
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
  return !!(
    document.querySelector('body > pre') ||
    document.querySelector('body > code')
  );
}

// ============================================================================
// Message Handling
// ============================================================================

function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message: { action: string }) => {
    if (message.action === 'getLanguage') {
      const lang = detectLanguage(document.body.innerText || '');
      return { status: 'success', language: lang };
    }
    return false;
  });
}

async function formatCode(code: string, language: string): Promise<string> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(
      { action: 'format', code, language, settings: currentSettings },
      (response: FormatResponse) => {
        if (response?.success && response.code) resolve(response.code);
        else resolve(code);
      }
    );
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
    if (renderer) renderer.style.display = 'none';
    if (statusBar) statusBar.style.display = 'none';
    if (originalPreElement) originalPreElement.style.display = 'block';

    // Remove body classes to restore normal page
    document.body.classList.remove(CSS_CLASSES.LOADED);
    document.documentElement.classList.remove(CSS_CLASSES.LOADED);
  } else {
    // Show formatted: show editor and status bar, hide original pre element
    if (renderer) renderer.style.display = 'block';
    if (statusBar) statusBar.style.display = 'flex';
    if (originalPreElement) originalPreElement.style.display = 'none';

    // Add body classes for extension styling
    document.body.classList.add(CSS_CLASSES.LOADED);
    document.documentElement.classList.add(CSS_CLASSES.LOADED);
  }

  // Update button text
  const toggleBtn = document.getElementById('code-formatter-toggle-original');
  if (toggleBtn) {
    const label = toggleBtn.querySelector(
      '.code-formatter-toolbar__button-label'
    );
    if (label) {
      label.textContent = isShowingOriginal ? 'Formatted' : 'Original';
    }
    toggleBtn.title = isShowingOriginal
      ? 'Show Formatted Code'
      : 'Show Original Code';
    toggleBtn.style.opacity = isShowingOriginal ? '1' : '0.7';
  }
}

// ============================================================================
// Status Bar
// ============================================================================

function createStatusBar(language: string, code: string): HTMLElement {
  const bar = document.createElement('div');
  bar.id = ELEMENT_IDS.STATUS_BAR;
  bar.className = CSS_CLASSES.STATUS_BAR;

  const lineCount = code.split('\n').length;
  const fileSize = new Blob([code]).size;
  const sizeLabel =
    fileSize > 1024 ? `${(fileSize / 1024).toFixed(1)} KB` : `${fileSize} B`;

  const makeItem = (text: string): HTMLSpanElement => {
    const item = document.createElement('span');
    item.className = CSS_CLASSES.STATUS_BAR_ITEM;
    item.textContent = text;
    return item;
  };

  const langItem = makeItem(language.toUpperCase());
  const lineItem = makeItem(`Ln ${lineCount}`);
  const sizeItem = makeItem(sizeLabel);
  const indentItem = makeItem(`Spaces: ${currentSettings.indentSize}`);
  const wrapItem = makeItem(
    currentSettings.wrapLines ? 'Wrap: On' : 'Wrap: Off'
  );

  // Style wrap item to show active/inactive state
  if (currentSettings.wrapLines) {
    wrapItem.style.color = '#73c991'; // Green for active
  } else {
    wrapItem.style.color = '#5a5a5a'; // Muted for inactive
  }

  bar.append(langItem, lineItem, sizeItem, indentItem, wrapItem);
  return bar;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function showLoadingSkeleton(): HTMLElement {
  const skeleton = document.createElement('div');
  skeleton.className = CSS_CLASSES.SKELETON;

  // Create animated skeleton lines using DocumentFragment for better performance
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 20; i++) {
    const line = document.createElement('div');
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
    javascript: 'js',
    typescript: 'ts',
    json: 'json',
    css: 'css',
    scss: 'scss',
    html: 'html',
    xml: 'xml',
    python: 'py',
    markdown: 'md',
    go: 'go',
    rust: 'rs',
    sql: 'sql',
    yaml: 'yml',
    toml: 'toml',
    ruby: 'rb',
  };
  return map[language.toLowerCase()] || 'txt';
}

// ============================================================================
// Format on Paste
// ============================================================================

function setupFormatOnPaste(): void {
  document.addEventListener('paste', async (e: ClipboardEvent) => {
    const target = e.target as HTMLElement;

    // Only intercept paste in editable areas (not in our read-only editor)
    if (
      !target.isContentEditable &&
      target.tagName !== 'TEXTAREA' &&
      target.tagName !== 'INPUT'
    ) {
      return;
    }

    const pastedText = e.clipboardData?.getData('text/plain');
    if (!pastedText) return;
    const minLength = currentSettings.formatOnPasteMinLength ?? 5;
    if (pastedText.length < minLength) return; // Too short to be code

    const detectedLang = detectLanguage(pastedText);
    if (!detectedLang) return;

    // Check if formatting category exists for this language
    const formattable = [
      'javascript',
      'typescript',
      'json',
      'css',
      'scss',
      'html',
      'xml',
      'python',
      'go',
      'rust',
      'sql',
      'yaml',
      'toml',
      'ruby',
      'lua',
      'zig',
      'dart',
    ];
    if (!formattable.includes(detectedLang)) return;

    e.preventDefault();
    const formatted = await formatCode(pastedText, detectedLang);

    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
      const input = target as HTMLTextAreaElement;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      input.value =
        input.value.substring(0, start) +
        formatted +
        input.value.substring(end);
      input.selectionStart = input.selectionEnd = start + formatted.length;
    } else if (target.isContentEditable) {
      document.execCommand('insertText', false, formatted);
    }

    // showToast remove
  });
}

// ============================================================================
// File Browser / Drag-Drop
// ============================================================================

/**
 * Create hidden file input element
 */
function createFileInput(): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'file';
  input.id = ELEMENT_IDS.FILE_INPUT;
  input.multiple = true; // Support multiple files
  input.accept =
    '.js,.jsx,.ts,.tsx,.json,.css,.scss,.less,.html,.htm,.xml,.md,.py,.go,.rs,.sql,.yml,.yaml,.toml,.rb,.lua,.zig,.dart,.txt';
  input.style.display = 'none';
  input.addEventListener('change', async (e: Event) => {
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
  const successfulLoads = results.filter(r => r.success);

  if (successfulLoads.length === 0) {
    console.error('[Code Formatter] No files could be loaded');
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
        `[Code Formatter] Loaded first of ${successfulLoads.length} files. Only one file can be displayed at a time.`
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
  const zone = document.createElement('div');
  zone.id = ELEMENT_IDS.DROP_ZONE;
  zone.className = CSS_CLASSES.DROP_ZONE;
  zone.innerHTML = `
    <div class="code-formatter-drop-zone__content">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 1-2-2v16a2 2 0 0 1 2 2h12a2 2 0 0 1 2 2V4a2 2 0 0 1 2-2z"></path>
        <polyline points="14 2 14 22 8 22 8 22"></polyline>
        <line x1="2" y1="2" x2="22" y2="2"></line>
        <line x1="2" y1="22" x2="22" y2="22"></line>
        <path d="M14.5 12.5H19"></path>
        <polyline points="9 9 12 12 12 15 12"></polyline>
        <polyline points="12 12 9 15"></polyline>
      </svg>
      <p class="code-formatter-drop-zone__text">
        Drop files here or press <kbd>Ctrl+O</kbd>
      </p>
    </div>
  `;

  // Add drag-drop event handlers
  zone.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault();
    zone.classList.add(CSS_CLASSES.DROP_ZONE_DRAGOVER);
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove(CSS_CLASSES.DROP_ZONE_DRAGOVER);
  });

  zone.addEventListener('drop', async (e: DragEvent) => {
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

  // Handle window-level drag events
  document.addEventListener('dragover', (_e: DragEvent) => {
    const hasFiles = _e.dataTransfer?.types.some(type => type === 'Files');
    if (hasFiles) {
      showDropZone();
    }
  });

  document.addEventListener('dragleave', (_e: DragEvent) => {
    if (_e.relatedTarget === null) {
      hideDropZone();
    }
  });

  document.addEventListener('drop', (_e: DragEvent) => {
    hideDropZone();
  });
}

/**
 * Update status bar with file information
 */
function updateStatusBarWithFile(fileInfo: any): void {
  if (!statusBarElement) return;

  // Remove old file info if exists
  const oldFileItem = statusBarElement.querySelector(
    `.${CSS_CLASSES.STATUS_BAR_FILENAME}`
  );
  if (oldFileItem) oldFileItem.remove();

  const sizeLabel = formatFileSize(fileInfo.size);

  // Create new file info item
  const fileItem = document.createElement('span');
  fileItem.className = CSS_CLASSES.STATUS_BAR_FILENAME;
  fileItem.textContent = `${fileInfo.name} (${sizeLabel})`;
  fileItem.style.color = '#73c991'; // Highlight file info

  // Insert after language item
  const langItem = statusBarElement.querySelector(
    '.code-formatter-status-bar__item'
  );
  if (langItem && langItem.nextSibling) {
    statusBarElement.insertBefore(fileItem, langItem.nextSibling);
  }
}

function createToolbarButton(
  id: string,
  title: string,
  iconSvg: string,
  text: string
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = id;
  btn.className = CSS_CLASSES.TOOLBAR_BUTTON;
  btn.title = title;
  const iconContainer = document.createElement('span');
  iconContainer.innerHTML = iconSvg;
  btn.appendChild(iconContainer);
  if (text) {
    const label = document.createElement('span');
    label.style.marginLeft = '4px';
    label.textContent = text;
    btn.appendChild(label);
  }
  return btn;
}

function createSeparator(): HTMLElement {
  const sep = document.createElement('div');
  sep.className = CSS_CLASSES.TOOLBAR_SEPARATOR;
  return sep;
}

function createToolbar(formattedCode: string): HTMLElement {
  const toolbar = document.createElement('div');
  toolbar.id = ELEMENT_IDS.TOOLBAR;
  toolbar.className = CSS_CLASSES.TOOLBAR;

  // Open File button (NEW)
  const openFileBtn = createToolbarButton(
    ELEMENT_IDS.BUTTON_OPEN_FILE,
    'Open File (Ctrl+O)',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 1-2-2v16a2 2 0 0 1 2 2h12a2 2 0 0 1 2 2V4a2 2 0 0 1 2-2z"></path><polyline points="14 2 14 22 8 22 8 22"></polyline><line x1="2" y1="2" x2="22" y2="2"></line><line x1="2" y1="22" x2="22" y2="22"></line><path d="M14.5 12.5H19"></path><polyline points="9 9 12 12 12 15 12"></polyline><polyline points="12 12 9 15"></polyline></svg>',
    'Open'
  );
  openFileBtn.addEventListener('click', openFileDialog);
  toolbar.appendChild(openFileBtn);
  toolbar.appendChild(createSeparator());

  // Theme selector
  const themeSel = document.createElement('select');
  themeSel.id = ELEMENT_IDS.BUTTON_THEME;
  themeSel.className = CSS_CLASSES.TOOLBAR_SELECT;
  AVAILABLE_THEMES.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.value;
    opt.textContent = t.label;
    if (t.value === currentSettings.theme) opt.selected = true;
    themeSel.appendChild(opt);
  });
  themeSel.addEventListener('change', (e: Event) => {
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
    'Collapse All',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>',
    ''
  );
  collapseBtn.addEventListener('click', () => {
    if (codeMirrorEditor) {
      foldAll(codeMirrorEditor);
      // showToast remove
    }
  });
  toolbar.appendChild(collapseBtn);

  // Expand button — unfold all code blocks
  const expandBtn = createToolbarButton(
    ELEMENT_IDS.BUTTON_EXPAND,
    'Expand All',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>',
    ''
  );
  expandBtn.addEventListener('click', () => {
    if (codeMirrorEditor) {
      unfoldAll(codeMirrorEditor);
      // showToast remove
    }
  });
  toolbar.appendChild(expandBtn);

  // Word wrap toggle button
  const wrapBtn = createToolbarButton(
    'code-formatter-wrap-btn',
    'Toggle Word Wrap',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h12"/></svg>',
    'Wrap'
  );
  wrapBtn.addEventListener('click', () => {
    currentSettings.wrapLines = !currentSettings.wrapLines;
    applyLineWrap();
    updateStatusBarWrap();
    saveSettings();
    // Update button appearance
    wrapBtn.style.opacity = currentSettings.wrapLines ? '1' : '0.5';
  });
  // Set initial state
  wrapBtn.style.opacity = currentSettings.wrapLines ? '1' : '0.5';
  toolbar.appendChild(wrapBtn);

  // Toggle Original/Formatted button
  const toggleOriginalBtn = createToolbarButton(
    'code-formatter-toggle-original',
    'Show Original Code',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>',
    'Original'
  );
  toggleOriginalBtn.addEventListener('click', () => {
    toggleOriginalCode();
  });
  toolbar.appendChild(toggleOriginalBtn);

  toolbar.appendChild(createSeparator());

  // Spacer
  const spacer = document.createElement('div');
  spacer.style.flex = '1';
  toolbar.appendChild(spacer);

  // Copy button
  const copyBtn = createToolbarButton(
    ELEMENT_IDS.BUTTON_COPY,
    'Copy',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    'Copy'
  );
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(formattedCode).then(() => {
      // showToast remove
    });
  });
  toolbar.appendChild(copyBtn);

  // Download button
  const downloadBtn = createToolbarButton(
    ELEMENT_IDS.BUTTON_DOWNLOAD,
    'Download',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    'Download'
  );
  downloadBtn.addEventListener('click', () => {
    const ext = getFileExtension(currentEditorLanguage);
    const blob = new Blob([formattedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
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
    case 'javascript':
    case 'typescript':
      return javascript();
    case 'json':
      return json();
    case 'css':
    case 'scss':
      return css();
    case 'html':
    case 'xml':
      return html();
    default:
      return []; // Python, Markdown, etc. shown without highlighting
  }
}

function getThemeExtensions(): Extension[] {
  const exts: Extension[] = [];

  switch (currentSettings.theme) {
    case 'one-dark-pro':
      exts.push(oneDark);
      break;
    case 'dracula':
      exts.push(dracula);
      break;
    case 'nord':
      exts.push(nord);
      break;
    default:
      exts.push(syntaxHighlighting(defaultHighlightStyle));
      break;
  }

  const isDark = currentSettings.theme !== 'github-light';
  const bg = isDark ? '#282c34' : '#ffffff';
  const fg = isDark ? '#abb2bf' : '#24292e';
  const gutterBg = isDark ? '#21252b' : '#f6f8fa';
  const gutterFg = isDark ? '#636d83' : '#6a737d';

  exts.push(
    EditorView.theme({
      '&': {
        backgroundColor: bg,
        color: fg,
        fontSize: `${currentSettings.fontSize}px`,
      },
      '.cm-content': {
        backgroundColor: bg,
        color: fg,
        lineHeight: `${currentSettings.lineHeight}`,
        fontFamily: "'SF Mono', Monaco, Consolas, monospace",
      },
      '.cm-gutters': {
        backgroundColor: gutterBg,
        color: gutterFg,
        borderRight: '1px solid #3e4451',
      },
      '.cm-activeLineGutter': {
        backgroundColor: isDark ? '#2c313c' : '#f0f0f0',
      },
      '.cm-activeLine': { backgroundColor: isDark ? '#2c313c' : '#f0f0f0' },
      '.cm-selectionBackground': {
        backgroundColor: isDark ? '#3e4451' : '#b4d5fe',
      },
    })
  );

  return exts;
}

function createCodeMirrorEditor(
  container: HTMLElement,
  code: string,
  language: string
): EditorView {
  console.log('[Code Formatter] Creating editor:', language);

  const isEditable = currentSettings.autoFormatOnType ?? false;

  const extensions: Extension[] = [
    lineNumbers(),
    bracketMatching(),
    codeFolding(),
    foldGutter(),
    keymap.of([...defaultKeymap, ...foldKeymap]),
    languageCompartment.of(getLanguageExtension(language)),
    themeCompartment.of(getThemeExtensions()),
    lineWrapCompartment.of(
      currentSettings.wrapLines ? EditorView.lineWrapping : []
    ),
    EditorView.editable.of(isEditable),
  ];

  // Add update listener for format-on-type if enabled
  if (isEditable) {
    extensions.push(
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          debouncedFormat();
        }
      })
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
 * Toggle line wrapping dynamically
 */
function applyLineWrap(): void {
  if (codeMirrorEditor) {
    codeMirrorEditor.dispatch({
      effects: lineWrapCompartment.reconfigure(
        currentSettings.wrapLines ? EditorView.lineWrapping : []
      ),
    });

    // Also manually toggle CSS class for visual wrapping
    const editorElement = codeMirrorEditor.dom;
    if (currentSettings.wrapLines) {
      editorElement.classList.add('cm-wrapping');
    } else {
      editorElement.classList.remove('cm-wrapping');
    }
  }
}

/**
 * Update the wrap status in the status bar
 */
function updateStatusBarWrap(): void {
  if (statusBarElement) {
    const wrapItems = statusBarElement.querySelectorAll('span');
    // Find the item that starts with "Wrap:"
    for (const item of wrapItems) {
      if (item.textContent && item.textContent.startsWith('Wrap:')) {
        if (currentSettings.wrapLines) {
          item.textContent = 'Wrap: On';
          item.style.color = '#73c991'; // Green for active
        } else {
          item.textContent = 'Wrap: Off';
          item.style.color = '#5a5a5a'; // Muted for inactive
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
  const pre = document.querySelector('body > pre');
  return pre?.textContent || document.body.innerText;
}

async function autoFormatPage(): Promise<void> {
  console.log('[Code Formatter] Auto-formatting...');

  // Show loading skeleton while formatting
  const skeleton = showLoadingSkeleton();

  try {
    const code = extractOriginalCode();
    const lang = detectLanguage(code);

    if (!lang) {
      skeleton.remove();
      const pre = document.querySelector('body > pre');
      if (pre) (pre as HTMLElement).style.display = 'block';
      return;
    }

    const formattedCode = await formatCode(code, lang);

    // Store original pre element for toggle functionality
    isShowingOriginal = false;
    originalPreElement = document.querySelector(
      'body > pre'
    ) as HTMLElement | null;

    // Hide the original pre element
    if (originalPreElement) {
      originalPreElement.style.display = 'none';
    }

    // Remove skeleton
    skeleton.remove();

    const renderer = document.createElement('div');
    renderer.id = ELEMENT_IDS.RENDERER;
    renderer.style.cssText =
      'position:absolute;width:100%;height:calc(100vh - 62px);top:38px;right:0;overflow:auto;';
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

    console.log('[Code Formatter] Done');
  } catch (e) {
    skeleton.remove();
    console.error('[Code Formatter] Error:', e);
  }
}

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Ctrl+Shift+C — Copy formatted code
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      if (currentEditorCode) {
        navigator.clipboard.writeText(currentEditorCode).then(() => {
          // showToast remove
        });
      }
    }

    // Ctrl+Shift+F — Re-format
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      if (currentEditorCode && currentEditorLanguage) {
        formatCode(currentEditorCode, currentEditorLanguage).then(formatted => {
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
        });
      }
    }

    // Ctrl+O / Cmd+O — Open file dialog
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
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
  options?: AddEventListenerOptions
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
  const dropZone = document.getElementById('code-formatter-drop-zone');
  if (dropZone) {
    dropZone.remove();
  }

  // Remove toolbar and status bar if they exist
  const toolbar = document.getElementById('code-formatter-toolbar');
  if (toolbar) toolbar.remove();
  const statusBar = document.getElementById('code-formatter-status-bar');
  if (statusBar) statusBar.remove();
  const renderer = document.getElementById('code-formatter-renderer');
  if (renderer) renderer.remove();

  // Remove file input element if exists
  if (fileInputElement) {
    fileInputElement.remove();
    fileInputElement = null;
  }

  // Remove body classes
  document.body.classList.remove('code-formatter-is-loaded');

  console.log('[Code Formatter] Cleanup completed');
}

// Register cleanup on page unload
registerEventListener(window, 'beforeunload', cleanup);

// ============================================================================
// Initialization
// ============================================================================

function main(): void {
  loadSettings();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (appearsToBeCodePage()) {
        autoFormatPage();
      }
    });
  } else {
    if (appearsToBeCodePage()) {
      autoFormatPage();
    }
  }
}

main();

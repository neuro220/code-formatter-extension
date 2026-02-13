/**
 * Shared constants across the extension
 */

import type { ExtensionSettings } from "./types";
import type { LanguageDefaults } from "../formatters/types";

/** DOM element IDs used by the content script */
export const ELEMENT_IDS = {
  RENDERER: "code-formatter-renderer",
  TOOLBAR: "code-formatter-toolbar",
  BUTTON_THEME: "code-formatter-toolbar-button-theme",
  BUTTON_COLLAPSE: "code-formatter-toolbar-button-collapse",
  BUTTON_EXPAND: "code-formatter-toolbar-button-expand",
  BUTTON_SEARCH: "code-formatter-toolbar-button-search",
  BUTTON_SWITCH: "code-formatter-switcher-button",
  BUTTON_COPY: "code-formatter-toolbar-button-copy",
  BUTTON_DOWNLOAD: "code-formatter-toolbar-button-download",
  BUTTON_OPEN_FILE: "code-formatter-toolbar-button-open-file",
  STATUS_BAR: "code-formatter-status-bar",
  DROP_ZONE: "code-formatter-drop-zone",
  FILE_INPUT: "code-formatter-file-input",
} as const;

/** CSS class names */
export const CSS_CLASSES = {
  TOOLBAR: "code-formatter-toolbar",
  TOOLBAR_BUTTON: "code-formatter-toolbar__button",
  TOOLBAR_SEPARATOR: "code-formatter-toolbar__separator",
  TOOLBAR_SELECT: "code-formatter-toolbar__select",
  LOADED: "code-formatter-is-loaded",
  STATUS_BAR: "code-formatter-status-bar",
  STATUS_BAR_ITEM: "code-formatter-status-bar__item",
  STATUS_BAR_FILENAME: "code-formatter-status-bar__filename",
  SKELETON: "code-formatter-skeleton",
  SKELETON_LINE: "code-formatter-skeleton__line",
  DROP_ZONE: "code-formatter-drop-zone",
  DROP_ZONE_ACTIVE: "code-formatter-drop-zone--active",
  DROP_ZONE_DRAGOVER: "code-formatter-drop-zone--dragover",
} as const;

/** Color constants for UI elements */
export const COLORS = {
  // Status colors
  ACTIVE: "#73c991", // Green for active state
  INACTIVE: "#5a5a5a", // Muted for inactive state

  // Editor theme backgrounds (fallback)
  EDITOR_BG_LIGHT: "#ffffff",
  EDITOR_BG_DARK: "#282c34",
  EDITOR_FG_LIGHT: "#24292e",
  EDITOR_FG_DARK: "#abb2bf",
  GUTTER_BG_LIGHT: "#f6f8fa",
  GUTTER_BG_DARK: "#21252b",
  GUTTER_FG_LIGHT: "#6a737d",
  GUTTER_FG_DARK: "#636d83",
} as const;

/**
 * File extension to language mapping for URL-based detection
 * Note: This is used for URL extension detection, not file loading
 * For file loading, use getLanguageFromFilename from shared/utils.ts
 */
export const EXTENSION_MAP: Record<string, string> = {
  // JavaScript/TypeScript
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  // Data formats
  json: "json",
  // Stylesheets - map to their specific languages
  css: "css",
  scss: "scss",
  less: "less",
  // Markup
  html: "html",
  htm: "html",
  xml: "xml",
  svg: "xml",
  // Python
  py: "python",
  pyi: "python",
  pyw: "python",
  // Other languages
  md: "markdown",
  go: "go",
  rs: "rust",
  sql: "sql",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  rb: "ruby",
  lua: "lua",
  zig: "zig",
  dart: "dart",
};

/** Available themes */
export const AVAILABLE_THEMES = [
  { value: "one-dark-pro", label: "One Dark Pro" },
  { value: "dracula", label: "Dracula" },
  { value: "nord", label: "Nord" },
  { value: "monokai", label: "Monokai" },
  { value: "material", label: "Material" },
  { value: "github-dark", label: "GitHub Dark" },
  { value: "github-light", label: "GitHub Light" },
  { value: "solarized-dark", label: "Solarized Dark" },
  { value: "solarized-light", label: "Solarized Light" },
  { value: "tokyo-night", label: "Tokyo Night" },
] as const;

/** Default extension settings */
export const DEFAULT_SETTINGS: ExtensionSettings = {
  indentSize: 2,
  quoteStyle: "single",
  theme: "one-dark-pro",
  wrapLines: false,
  fontSize: "14",
  lineHeight: 1.6,
  useTabs: false,
  // Formatter options
  singleQuote: true,
  semi: true,
  trailingComma: "es5",
  // js-beautify options
  e4x: false,
  spaceInEmptyParens: false,
  unescapeStrings: false,
  keepArrayIndentation: false,
  // WASM formatter options
  quoteStyleWasm: "preserve",
  keywordCase: "preserve",
  commaPosition: "before",
  // Feature flags
  autoFormatOnType: false,
  formatOnPasteMinLength: 5,
};

/** Language-specific default settings based on community standards */
export const LANGUAGE_DEFAULTS: Record<string, LanguageDefaults> = {
  javascript: {
    indentSize: 2,
    useTabs: false,
    singleQuote: true,
    semi: true,
  },
  typescript: {
    indentSize: 2,
    useTabs: false,
    singleQuote: true,
    semi: true,
  },
  python: {
    indentSize: 4,
    useTabs: false,
    singleQuote: true,
    semi: true,
  },
  go: {
    indentSize: 4,
    useTabs: true, // gofmt standard
    singleQuote: true,
    semi: true,
  },
  java: {
    indentSize: 4,
    useTabs: false,
    singleQuote: false,
    semi: true,
  },
  css: {
    indentSize: 2,
    useTabs: false,
    singleQuote: false,
    semi: true,
  },
  html: {
    indentSize: 2,
    useTabs: false,
    singleQuote: false,
    semi: true,
  },
  json: {
    indentSize: 2,
    useTabs: false,
    singleQuote: false, // JSON requires double quotes
    semi: true,
  },
  rust: {
    indentSize: 4,
    useTabs: false,
    singleQuote: true,
    semi: true,
  },
  sql: {
    indentSize: 2,
    useTabs: false,
    singleQuote: false,
    semi: true,
  },
  yaml: {
    indentSize: 2,
    useTabs: false,
    singleQuote: false,
    semi: true,
  },
  toml: {
    indentSize: 2,
    useTabs: false,
    singleQuote: false,
    semi: true,
  },
  markdown: {
    indentSize: 2,
    useTabs: false,
    singleQuote: false,
    semi: true,
  },
};

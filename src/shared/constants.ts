/**
 * Shared constants across the extension
 */

import type { ExtensionSettings } from './types';
import type { LanguageDefaults } from '../formatters/types';

/** DOM element IDs used by the content script */
export const ELEMENT_IDS = {
  RENDERER: 'code-formatter-renderer',
  TOOLBAR: 'code-formatter-toolbar',
  BUTTON_THEME: 'code-formatter-toolbar-button-theme',
  BUTTON_COLLAPSE: 'code-formatter-toolbar-button-collapse',
  BUTTON_EXPAND: 'code-formatter-toolbar-button-expand',
  BUTTON_SEARCH: 'code-formatter-toolbar-button-search',
  BUTTON_SWITCH: 'code-formatter-switcher-button',
  BUTTON_COPY: 'code-formatter-toolbar-button-copy',
  BUTTON_DOWNLOAD: 'code-formatter-toolbar-button-download',
  BUTTON_OPEN_FILE: 'code-formatter-toolbar-button-open-file',
  STATUS_BAR: 'code-formatter-status-bar',
  DROP_ZONE: 'code-formatter-drop-zone',
  FILE_INPUT: 'code-formatter-file-input',
} as const;

/** CSS class names */
export const CSS_CLASSES = {
  TOOLBAR: 'code-formatter-toolbar',
  TOOLBAR_BUTTON: 'code-formatter-toolbar__button',
  TOOLBAR_SEPARATOR: 'code-formatter-toolbar__separator',
  TOOLBAR_SELECT: 'code-formatter-toolbar__select',
  LOADED: 'code-formatter-is-loaded',
  STATUS_BAR: 'code-formatter-status-bar',
  STATUS_BAR_ITEM: 'code-formatter-status-bar__item',
  STATUS_BAR_FILENAME: 'code-formatter-status-bar__filename',
  SKELETON: 'code-formatter-skeleton',
  SKELETON_LINE: 'code-formatter-skeleton__line',
  DROP_ZONE: 'code-formatter-drop-zone',
  DROP_ZONE_ACTIVE: 'code-formatter-drop-zone--active',
  DROP_ZONE_DRAGOVER: 'code-formatter-drop-zone--dragover',
} as const;

/** File extension to language mapping */
export const EXTENSION_MAP: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  jsx: 'javascript',
  tsx: 'typescript',
  json: 'json',
  css: 'css',
  scss: 'css',
  html: 'html',
  xml: 'html',
  py: 'python',
  md: 'markdown',
  go: 'go',
  rs: 'rust',
  sql: 'sql',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'toml',
  rb: 'ruby',
};

/** Available themes */
export const AVAILABLE_THEMES = [
  { value: 'one-dark-pro', label: 'One Dark Pro' },
  { value: 'dracula', label: 'Dracula' },
  { value: 'nord', label: 'Nord' },
  { value: 'github-light', label: 'GitHub Light' },
] as const;

/** Default extension settings */
export const DEFAULT_SETTINGS: ExtensionSettings = {
  indentSize: 2,
  quoteStyle: 'single',
  lineWrap: 80,
  theme: 'one-dark-pro',
  wrapLines: false,
  fontSize: '14',
  lineHeight: 1.6,
  // Formatter options
  singleQuote: true,
  semi: true,
  trailingComma: 'es5',
  // js-beautify options
  e4x: false,
  spaceInEmptyParens: false,
  unescapeStrings: false,
  keepArrayIndentation: false,
  // WASM formatter options
  quoteStyleWasm: 'preserve',
  keywordCase: 'preserve',
  commaPosition: 'before',
  // Feature flags
  autoFormatOnType: false,
  formatOnPasteMinLength: 5,
};

/** Language-specific default settings based on community standards */
export const LANGUAGE_DEFAULTS: Record<string, LanguageDefaults> = {
  javascript: {
    indentSize: 2,
    useTabs: false,
    lineWrap: 80,
    singleQuote: true,
    semi: true,
  },
  typescript: {
    indentSize: 2,
    useTabs: false,
    lineWrap: 80,
    singleQuote: true,
    semi: true,
  },
  python: {
    indentSize: 4,
    useTabs: false,
    lineWrap: 88, // Black standard
    singleQuote: true,
    semi: true,
  },
  go: {
    indentSize: 4,
    useTabs: true, // gofmt standard
    lineWrap: 0,
    singleQuote: true,
    semi: true,
  },
  java: {
    indentSize: 4,
    useTabs: false,
    lineWrap: 100,
    singleQuote: false,
    semi: true,
  },
  css: {
    indentSize: 2,
    useTabs: false,
    lineWrap: 80,
    singleQuote: false,
    semi: true,
  },
  html: {
    indentSize: 2,
    useTabs: false,
    lineWrap: 80,
    singleQuote: false,
    semi: true,
  },
  json: {
    indentSize: 2,
    useTabs: false,
    lineWrap: 80,
    singleQuote: false, // JSON requires double quotes
    semi: true,
  },
  rust: {
    indentSize: 4,
    useTabs: false,
    lineWrap: 100,
    singleQuote: true,
    semi: true,
  },
  sql: {
    indentSize: 2,
    useTabs: false,
    lineWrap: 80,
    singleQuote: false,
    semi: true,
  },
  yaml: {
    indentSize: 2,
    useTabs: false,
    lineWrap: 80,
    singleQuote: false,
    semi: true,
  },
  toml: {
    indentSize: 2,
    useTabs: false,
    lineWrap: 80,
    singleQuote: false,
    semi: true,
  },
  markdown: {
    indentSize: 2,
    useTabs: false,
    lineWrap: 80,
    singleQuote: false,
    semi: true,
  },
};

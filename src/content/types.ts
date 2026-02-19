import type { EditorView } from "@codemirror/view";
import type { ExtensionSettings } from "../shared/types";

export interface ContentState {
  settings: ExtensionSettings;
  editor: EditorView | null;
  editorCode: string;
  editorLanguage: string;
  statusBarElement: HTMLElement | null;
  isShowingOriginal: boolean;
  originalPreElement: HTMLElement | null;
  fileInputElement: HTMLInputElement | null;
  dropZoneElement: HTMLElement | null;
}

export interface ToolbarButton {
  id: string;
  title: string;
  icon: string;
  label?: string;
  onClick?: () => void;
}

export interface ToolbarSelect {
  id: string;
  options: Array<{ value: string; label: string }>;
  selectedValue: string;
  onChange?: (value: string) => void;
}

export interface LanguagePattern {
  lang: string;
  regex: RegExp;
  weight: number;
}

export interface DetectionResult {
  language: string | null;
  confidence: number;
  patterns: string[];
}

export interface FileInfo {
  name: string;
  size: number;
  type?: string;
}

export interface FileLoadResult {
  success: boolean;
  code?: string;
  language?: string;
  fileInfo?: FileInfo;
  error?: string;
}

export type ToastType = "info" | "error" | "success" | "warning";

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

export interface StatusBarInfo {
  language: string;
  lineCount: number;
  fileSize: number;
  indentSize: number;
  wrapLines: boolean;
  filename?: string;
}

export type EventListenerCleanup = () => void;

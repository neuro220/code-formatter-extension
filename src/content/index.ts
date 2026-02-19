// Detection
export {
  detectLanguage,
  appearsToBeCodePage,
  getLimitedContent,
} from "./detection";

// Toast
export {
  showToast,
  showSuccess,
  showError,
  showInfo,
  showWarning,
} from "./toast";

// Status Bar
export {
  createStatusBar,
  updateStatusBarWithFile,
  getStatusBar,
  setStatusBar,
} from "./status-bar";

// Editor
export {
  createEditor,
  getEditor,
  setEditor,
  applyTheme,
  applyLanguage,
  updateEditorContent,
  getEditorContent,
  updateSettings as updateEditorSettings,
  destroyEditor,
  initEditor,
} from "./editor";

// Toolbar
export {
  createToolbar,
  createToolbarButton,
  createSeparator,
  sanitizeSvg,
  initToolbar,
  setEditorInstance,
  setCurrentLanguage,
  downloadCode,
  getFileExtension,
  updateSettings as updateToolbarSettings,
} from "./toolbar";

// File Handling
export {
  createFileInput,
  handleFileSelection,
  openFileDialog,
  showDropZone,
  hideDropZone,
  setupDragDropZone,
  insertTextAtCursor,
  setFileSelectionHandler,
  getFileInputElement,
  cleanup as cleanupFileHandling,
} from "./file-handling";

// Types
export type {
  ContentState,
  ToolbarButton,
  ToolbarSelect,
  LanguagePattern,
  DetectionResult,
  FileInfo,
  FileLoadResult,
  ToastType,
  ToastOptions,
  StatusBarInfo,
  EventListenerCleanup,
} from "./types";

/**
 * Utility Functions
 *
 * Reusable utility functions for performance optimization and common operations.
 */

/**
 * Debounce function to limit how often a function can fire
 * @param func - The function to debounce
 * @param wait - The delay in milliseconds
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit execution to once per wait period
 * @param func - The function to throttle
 * @param limit - The time limit in milliseconds
 * @returns A throttled version of the function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Simple LRU Cache implementation for content script
 */
export class LRUMap<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;

    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value!);
    return value;
  }

  set(key: K, value: V): void {
    // Delete if exists to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Quick URL-based language pre-check
 * Returns language if URL suggests code page, null otherwise
 */
export function detectLanguageFromUrl(): string | null {
  const url = window.location.href;

  // Check file extension in URL
  const codeExtensions =
    /\.(js|jsx|ts|tsx|mjs|cjs|json|py|pyi|go|rs|sql|html|htm|xml|css|scss|less|md|yml|yaml|toml|rb|lua|zig|dart)$/i;
  const match = url.match(codeExtensions);

  if (match) {
    const ext = match[1].toLowerCase();
    const extMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      mjs: "javascript",
      cjs: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      pyi: "python",
      json: "json",
      go: "go",
      rs: "rust",
      sql: "sql",
      html: "html",
      htm: "html",
      xml: "xml",
      css: "css",
      scss: "scss",
      less: "less",
      md: "markdown",
      yml: "yaml",
      yaml: "yaml",
      toml: "toml",
      rb: "ruby",
      lua: "lua",
      zig: "zig",
      dart: "dart",
    };
    return extMap[ext] || null;
  }

  return null;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Unified file extension to language mapping
 * Used by both file-loader.ts and other modules
 */
export const EXTENSION_TO_LANGUAGE_MAP: Record<string, string> = {
  // JavaScript/TypeScript
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  // Data formats
  json: "json",
  // Stylesheets
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

/**
 * Detect language from file extension
 * Handles edge cases like multiple dots and missing extensions
 */
export function getLanguageFromFilename(filename: string): string | null {
  if (!filename || typeof filename !== "string") {
    return null;
  }

  const parts = filename.split(".");
  if (parts.length < 2) {
    return null;
  }

  const ext = parts.pop()?.toLowerCase();
  if (!ext) return null;

  const secondLastPart =
    parts.length > 0 ? parts[parts.length - 1].toLowerCase() : "";

  // Handle special compound extensions like .d.ts
  if (ext === "ts" && secondLastPart === "d") {
    return "typescript";
  }

  return EXTENSION_TO_LANGUAGE_MAP[ext] || null;
}

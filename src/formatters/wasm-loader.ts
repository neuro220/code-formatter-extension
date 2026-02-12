/**
 * WASM Loader for browser extensions
 * Handles loading and initializing WASM formatters in Chrome/Firefox extension context
 * Includes error boundaries and fallback support
 */

// Chrome types are provided by @types/chrome package

// Interface for WASM module exports
interface WasmModule {
  initAsync(url?: string | URL | Request): Promise<unknown>;
  format(code: string, ...args: unknown[]): string;
}

// Cache for initialized WASM modules
const wasmCache = new Map<string, WasmModule>();

// Error tracking for monitoring
interface WasmLoadError {
  timestamp: number;
  module: string;
  error: string;
}

const loadErrors: WasmLoadError[] = [];

/**
 * Get the base URL for WASM files in the extension
 */
function getWasmBaseUrl(): string {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return chrome.runtime.getURL('wasm/');
  }
  return '/wasm/';
}

/**
 * Check if WASM is supported in the current browser
 */
export function isWasmSupported(): boolean {
  try {
    return (
      typeof WebAssembly !== 'undefined' &&
      WebAssembly.instantiateStreaming !== undefined
    );
  } catch {
    return false;
  }
}

/**
 * Get recent load errors for debugging
 */
export function getRecentErrors(): WasmLoadError[] {
  return loadErrors.slice(-10); // Return last 10 errors
}

/**
 * Clear error history
 */
export function clearErrorHistory(): void {
  loadErrors.length = 0;
}

/**
 * Load and initialize a WASM formatter module
 *
 * @param webJsFile - The web JS wrapper filename (e.g., 'ruff_fmt_web.js')
 * @param wasmFile - WASM binary filename (e.g., 'ruff_fmt_bg.wasm')
 * @returns Initialized module with format function
 */
export async function loadWasmFormatter(
  webJsFile: string,
  wasmFile: string
): Promise<WasmModule> {
  // Check cache first
  const cacheKey = `${webJsFile}:${wasmFile}`;
  if (wasmCache.has(cacheKey)) {
    return wasmCache.get(cacheKey)!;
  }

  // Check WASM support first
  if (!isWasmSupported()) {
    const error = new Error('WebAssembly is not supported in this browser');
    loadErrors.push({
      timestamp: Date.now(),
      module: webJsFile,
      error: error.message,
    });
    console.warn('[WASM Loader] WebAssembly not supported:', webJsFile);
    throw error;
  }

  try {
    const baseUrl = getWasmBaseUrl();
    const webJsUrl = `${baseUrl}${webJsFile}`;
    const wasmUrl = `${baseUrl}${wasmFile}`;

    // Dynamic import of the web version of the WASM module
    // Using the full chrome-extension:// URL
    const module = await import(/* @vite-ignore */ webJsUrl);

    // Initialize the WASM module with the correct WASM binary URL
    await module.initAsync(wasmUrl);

    // Cache the initialized module
    wasmCache.set(cacheKey, module);

    console.log(`[WASM Loader] Successfully loaded ${webJsFile}`);
    return module;
  } catch (error) {
    // Log error for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    loadErrors.push({
      timestamp: Date.now(),
      module: webJsFile,
      error: errorMessage,
    });

    console.error(`[WASM Loader] Failed to load ${webJsFile}:`, error);
    throw new Error(
      `WASM formatter '${webJsFile}' failed to load. ` +
        `This may be due to CSP restrictions or missing files. ` +
        `Check that wasm/${wasmFile} exists and CSP allows 'wasm-unsafe-eval'. ` +
        `Error: ${errorMessage}`
    );
  }
}

/**
 * Try to load WASM formatter with graceful fallback
 * Returns null instead of throwing on failure
 */
export async function tryLoadWasmFormatter(
  webJsFile: string,
  wasmFile: string
): Promise<WasmModule | null> {
  try {
    return await loadWasmFormatter(webJsFile, wasmFile);
  } catch (error) {
    console.warn(`[WASM Loader] Graceful fallback for ${webJsFile}:`, error);
    return null;
  }
}

/**
 * Clear the WASM module cache
 */
export function clearWasmCache(): void {
  wasmCache.clear();
  console.log('[WASM Loader] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; modules: string[] } {
  return {
    size: wasmCache.size,
    modules: Array.from(wasmCache.keys()),
  };
}

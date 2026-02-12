/**
 * Code Formatter Extension - Background Script
 *
 * Handles code formatting requests from the content script using the new
 * formatter registry with support for Prettier and WASM-based formatters.
 * Manages extension lifecycle, context menus, and message routing.
 */

import {
  formatterRegistry,
  type FormatterSettings,
  type FormatResult,
} from './formatters';
import type {
  ExtensionMessage,
  FormatMessage,
  FormatResponse,
  GetSupportedLanguagesResponse,
  CheckLanguageSupportResponse,
} from './shared/types';
import { LANGUAGE_DEFAULTS } from './shared/constants';

// ============================================================================
// Formatting Cache
// ============================================================================

const formatCache = new Map<string, string>();
const MAX_CACHE_SIZE = 50;

/** Simple hash for cache keys */
function hashKey(
  code: string,
  language: string,
  settings?: FormatterSettings
): string {
  const settingsStr = JSON.stringify(settings ?? {});
  let hash = 2166136261;
  const str = `${language}:${settingsStr}:${code}`;
  for (let i = 0; i < Math.min(str.length, 500); i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${hash >>> 0}:${code.length}`;
}

/**
 * Convert extension settings to formatter settings
 * Merges language-specific defaults with user settings (user settings take precedence)
 */
function convertSettings(
  settings?: FormatMessage['settings'],
  language?: string
): FormatterSettings {
  // Get language-specific defaults if available
  const langDefaults = language ? LANGUAGE_DEFAULTS[language] : undefined;

  // Parse indent size from settings
  const indentSize =
    typeof settings?.indentSize === 'string'
      ? parseInt(settings.indentSize as string, 10) || 2
      : (settings?.indentSize ?? langDefaults?.indentSize ?? 2);

  // Build formatter settings with priority: user settings > language defaults > global defaults
  return {
    indentSize,
    lineWrap: settings?.lineWrap ?? langDefaults?.lineWrap ?? 80,
    useTabs: langDefaults?.useTabs ?? false,
    singleQuote: settings?.singleQuote ?? langDefaults?.singleQuote ?? true,
    semi: settings?.semi ?? langDefaults?.semi ?? true,
    trailingComma: settings?.trailingComma ?? 'es5',
  };
}

/**
 * Format code using the formatter registry, with caching
 */
async function formatCode(
  code: string,
  language: string,
  settings?: FormatMessage['settings']
): Promise<FormatResult> {
  // Check if language is supported
  if (!formatterRegistry.isSupported(language)) {
    return {
      success: false,
      code,
      error: `Language "${language}" is not supported`,
    };
  }

  // Check cache
  const formatterSettings = convertSettings(settings, language);
  const key = hashKey(code, language, formatterSettings);
  const cached = formatCache.get(key);
  if (cached) {
    return { success: true, code: cached };
  }

  // Format using registry
  const result = await formatterRegistry.format(
    code,
    language,
    formatterSettings
  );

  // Store in cache if successful
  if (result.success && formatCache.size >= MAX_CACHE_SIZE) {
    const firstKey = formatCache.keys().next().value;
    if (firstKey !== undefined) formatCache.delete(firstKey);
  }
  if (result.success) {
    formatCache.set(key, result.code);
  }

  return result;
}

// ============================================================================
// Message Handling
// ============================================================================

function setupMessageHandlers(): void {
  chrome.runtime.onMessage.addListener(
    (
      message: ExtensionMessage,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: FormatResponse) => void
    ): boolean => {
      if (message.action === 'format') {
        const formatMsg = message as unknown as FormatMessage;

        // Use async/await with Promise
        formatCode(formatMsg.code, formatMsg.language, formatMsg.settings)
          .then(result => {
            if (result.success) {
              sendResponse({ success: true, code: result.code });
            } else {
              sendResponse({
                success: false,
                error: result.error || 'Formatting failed',
              });
            }
          })
          .catch(error => {
            console.error('[Code Formatter] Formatting error:', error);
            sendResponse({
              success: false,
              error:
                error instanceof Error ? error.message : 'Formatting failed',
            });
          });
      } else if (message.action === 'getSupportedLanguages') {
        const languages = formatterRegistry.getSupportedLanguages();
        const response: GetSupportedLanguagesResponse = {
          success: true,
          languages,
        };
        sendResponse(response);
      } else if (message.action === 'checkLanguageSupport') {
        const formatMsg = message as unknown as FormatMessage;
        const isSupported = formatterRegistry.isSupported(formatMsg.language);
        const response: CheckLanguageSupportResponse = {
          success: true,
          isSupported,
        };
        sendResponse(response);
      } else {
        sendResponse({
          success: false,
          error: `Unknown action: ${message.action}`,
        });
      }

      return true;
    }
  );
}

// ============================================================================
// Context Menu
// ============================================================================

function setupContextMenu(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'codeFormatter',
      title: 'Format Code',
      contexts: ['page', 'selection'],
    });

    chrome.contextMenus.create({
      id: 'formatJS',
      parentId: 'codeFormatter',
      title: 'Format as JavaScript',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'formatTS',
      parentId: 'codeFormatter',
      title: 'Format as TypeScript',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'formatCSS',
      parentId: 'codeFormatter',
      title: 'Format as CSS',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'formatHTML',
      parentId: 'codeFormatter',
      title: 'Format as HTML',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'formatJSON',
      parentId: 'codeFormatter',
      title: 'Format as JSON',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'formatPython',
      parentId: 'codeFormatter',
      title: 'Format as Python',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'formatGo',
      parentId: 'codeFormatter',
      title: 'Format as Go',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'formatSQL',
      parentId: 'codeFormatter',
      title: 'Format as SQL',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'formatYAML',
      parentId: 'codeFormatter',
      title: 'Format as YAML',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'formatTOML',
      parentId: 'codeFormatter',
      title: 'Format as TOML',
      contexts: ['selection'],
    });
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab?.id || !info.selectionText) return;

    const languageMap: Record<string, string> = {
      formatJS: 'javascript',
      formatTS: 'typescript',
      formatCSS: 'css',
      formatHTML: 'html',
      formatJSON: 'json',
      formatPython: 'python',
      formatGo: 'go',
      formatSQL: 'sql',
      formatYAML: 'yaml',
      formatTOML: 'toml',
    };

    const language = languageMap[info.menuItemId as string];
    if (!language) return;

    chrome.tabs.sendMessage(tab.id, {
      action: 'formatSelection',
      language,
      code: info.selectionText,
    });
  });
}

// ============================================================================
// Extension Lifecycle
// ============================================================================

function initializeExtension(): void {
  console.log('[Code Formatter] Extension initialized');
  console.log(
    '[Code Formatter] Supported languages:',
    formatterRegistry.getSupportedLanguages().join(', ')
  );
  setupMessageHandlers();
  setupContextMenu();
}

/**
 * Opens the changelog page in a new tab
 */
function openChangelog(): void {
  chrome.tabs.create({
    url: chrome.runtime.getURL('changelog.html'),
  });
}

/**
 * Checks if changelog should be shown based on version changes
 * @param reason - The install reason (install, update, etc.)
 */
function handleInstallOrUpdate(
  _reason: chrome.runtime.OnInstalledReason
): void {
  // We track the version in storage, so we don't need the reason parameter
  // The changelog is shown regardless of install or update
  const currentVersion = chrome.runtime.getManifest().version;

  chrome.storage.local.get(['lastSeenVersion'], result => {
    const lastSeenVersion = result.lastSeenVersion;

    // Show changelog if:
    // 1. First installation (no lastSeenVersion)
    // 2. Version has changed (update)
    if (!lastSeenVersion || lastSeenVersion !== currentVersion) {
      console.log(
        `[Code Formatter] Showing changelog: ${lastSeenVersion || 'none'} → ${currentVersion}`
      );

      // Open changelog after a short delay to ensure extension is ready
      setTimeout(() => {
        openChangelog();
      }, 500);

      // Store current version as last seen
      chrome.storage.local.set({ lastSeenVersion: currentVersion });
    }
  });
}

chrome.runtime.onInstalled.addListener(details => {
  const reason = details.reason;

  if (reason === 'install') {
    console.log('[Code Formatter] Extension installed');
    chrome.storage.local.set({
      javascriptOptions: { indent_size: 2 },
      cssOptions: { indent_size: 2 },
      htmlOptions: { indent_size: 2 },
    });
  } else if (reason === 'update') {
    console.log(`[Code Formatter] Updated from ${details.previousVersion}`);
  }

  // Handle changelog display for both install and update
  handleInstallOrUpdate(reason);

  initializeExtension();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Code Formatter] Extension started');
  initializeExtension();
});

initializeExtension();

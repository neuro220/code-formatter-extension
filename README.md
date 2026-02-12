# Code Formatter Extension v1.9.1

**Release Date:** February 12, 2026  
**Version:** 1.9.1  
**Manifest Version:** 3  
**Browser Support:** Chrome (Extension), Firefox (Extension)

A powerful, production-ready browser extension for formatting and beautifying code directly in your browser using true code formatters. Built with TypeScript, esbuild, and modern web technologies.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Supported Languages](#supported-languages)
4. [Architecture](#architecture)
5. [Project Structure](#project-structure)
6. [Technical Stack](#technical-stack)
7. [Building from Source](#building-from-source)
8. [Testing](#testing)
9. [Configuration](#configuration)
10. [Development](#development)
11. [Release Process](#release-process)
12. [Contributing](#contributing)
13. [License](#license)

---

## Overview

This extension provides real-time code formatting for 17 programming languages directly in the browser. Unlike simple beautifiers, it uses industry-standard formatters (Prettier, WASM-based formatters) to enforce consistent, opinionated code style.

### Key Characteristics

- **True Formatting**: Uses Prettier and WASM-based formatters, not just beautifiers
- **Local Processing**: All formatting happens locally in the browser
- **Privacy-First**: No data collection, minimal permissions
- **Production-Ready**: TypeScript strict mode, comprehensive tests, CI/CD ready
- **Modular Architecture**: Easy to extend with new formatters
- **i18n Ready**: Supports 13 languages out of the box

---

## Features

### Core Functionality

#### Multi-Language Support
- **17 Programming Languages** supported
- **True Formatters**: Prettier for web languages, WASM for system languages
- **Fallback Formatters**: Beautifiers for other languages
- **Auto-Detection**: Automatically detects language from file content

#### File Handling
- **File Browser**: Open local files directly in the extension
- **Drag & Drop**: Drop files onto the page to format them
- **10MB Limit**: Handles files up to 10MB
- **Background Processing**: Large files format without freezing

#### User Interface
- **CodeMirror 6**: Modern code editor with syntax highlighting
- **Theme Support**: Light/Dark modes with auto-detection
- **Code Folding**: Collapse/Expand code sections
- **Word Wrap**: Toggle line wrapping for better viewing
- **Font Controls**: Adjustable font size and line height

#### Formatting Options

**Prettier Settings:**
- Quote style (single/double)
- Semicolon insertion
- Trailing commas (none/es5/all)
- Indent size (2/4/tab)

**js-beautify Settings:**
- E4X/JSX support
- Space in empty parentheses
- Unescape strings
- Keep array indentation

**WASM Formatter Settings:**
- Quote style (single/double/preserve)
- Keyword case (upper/lower/preserve)
- Comma position (before/after)

#### Advanced Features
- **Format on Type**: Debounced auto-formatting (500ms)
- **Format on Paste**: Auto-format pasted code
- **Find/Replace**: Integrated search with Regex support (Ctrl+F)
- **Automatic Changelog**: Shows "What's New" on install/update

### Localization

Available in 13 languages:
- English (en)
- German (de)
- French (fr)
- Indonesian (id)
- Italian (it)
- Japanese (ja)
- Portuguese (Brazil) (pt_BR)
- Romanian (ro)
- Turkish (tr)
- Ukrainian (uk)
- Chinese Simplified (zh_CN)

---

## Supported Languages

### True Formatters (Strict, Opinionated)

These formatters enforce consistent, opinionated code style:

| Language | Formatter | Notes |
|----------|-----------|-------|
| JavaScript | Prettier | Industry standard |
| TypeScript | Prettier | Full TS support |
| CSS | Prettier | CSS3, SCSS support |
| HTML | Prettier | HTML5, SVG support |
| Markdown | Prettier | GFM support |
| Python | Ruff (WASM) | Fast, modern Python formatter |
| Go | GoFmt (WASM) | Official Go formatter |
| SQL | sqlfmt (WASM) | SQL formatting |
| YAML | yamlfmt (WASM) | YAML formatting |
| TOML | Taplo (WASM) | TOML formatting |

### Fallback Formatters (Beautifiers)

These use beautification for formatting:

| Language | Formatter | Notes |
|----------|-----------|-------|
| Rust | rustfmt/beautifier | Falls back to beautifier if rustfmt unavailable |
| Ruby | Ruby beautifier | Basic Ruby formatting |
| Lua | Lua beautifier | Lua-specific formatting |
| Zig | Zig beautifier | Basic Zig formatting |
| Dart | Dart beautifier | Basic Dart formatting |

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Extension                     │
├─────────────────────────────────────────────────────────┤
│  Content Script (content.ts)                             │
│  ├── CodeMirror 6 Editor                                 │
│  ├── Settings UI                                         │
│  ├── File Loader                                         │
│  └── Format-on-Type Handler                             │
├─────────────────────────────────────────────────────────┤
│  Background Script (background.ts)                       │
│  ├── Message Passing                                     │
│  ├── Context Menu                                       │
│  └── Storage Management                                 │
├─────────────────────────────────────────────────────────┤
│  Options Page (options.ts + options.html)               │
│  ├── Settings Form                                       │
│  ├── Settings Storage                                    │
│  └── Theme Management                                   │
├─────────────────────────────────────────────────────────┤
│  Changelog Page (changelog.ts + changelog.html)          │
│  ├── Dynamic Rendering                                   │
│  ├── Version Tracking                                    │
│  └── Auto-Display                                       │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action
    │
    ▼
┌─────────────────┐
│ Content Script  │ ◄── Load Settings (chrome.storage)
│ (content.ts)    │
└────────┬────────┘
         │
         │ Format Request
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Background      │ ──► │ Formatter Registry │
│ (background.ts) │     │ (formatters/)      │
└────────┬────────┘     └────────┬───────────┘
         │                      │
         │ Formatted Code        │ Load Formatter
         ▼                      ▼
┌─────────────────┐     ┌──────────────────┐
│ Content Script  │     │ WASM/Prettier    │
│ Updates Editor  │ ◄── │ Format Code      │
└─────────────────┘     └──────────────────┘
```

### Formatter Registry Pattern

The extension uses a **registry pattern** for formatters:

```typescript
// formatters/registry.ts
interface Formatter {
  format(code: string, lang: string, settings: FormatterSettings): Promise<FormatResult>;
  isSupported(lang: string): boolean;
  getSupportedLanguages(): string[];
}

class FormatterRegistry {
  private formatters = new Map<string, Formatter>();
  
  register(name: string, formatter: Formatter): void {
    this.formatters.set(name, formatter);
  }
  
  format(code: string, lang: string, settings: FormatterSettings): Promise<FormatResult> {
    const formatter = this.formatters.get(lang);
    if (!formatter) {
      return fallbackFormatter.format(code, lang, settings);
    }
    return formatter.format(code, lang, settings);
  }
}
```

This allows:
- Easy addition of new formatters
- Fallback chain for unsupported languages
- Consistent interface across formatters
- Testing with mock formatters

---

## Project Structure

```
code-formatter-extension/
├── src/
│   ├── content.ts                 # Main content script (39KB)
│   ├── background.ts               # Background service worker (11KB)
│   ├── options.ts                  # Options page logic (19KB)
│   ├── changelog.ts                # Changelog display logic
│   ├── js-beautify.d.ts           # TypeScript definitions
│   │
│   ├── content/                    # Content script modules
│   │   └── (future modules)
│   │
│   ├── css/
│   │   └── content.scss            # SCSS styles (8.5KB)
│   │
│   ├── formatters/                 # Formatter modules
│   │   ├── index.ts               # Registry entry point
│   │   ├── registry.ts             # Formatter registry pattern
│   │   ├── types.ts               # Formatter type definitions
│   │   ├── prettier-formatter.ts   # Prettier integration
│   │   ├── js-beautify-formatter.ts # js-beautify integration
│   │   ├── wasm-formatters.ts      # WASM formatter wrapper
│   │   ├── wasm-loader.ts         # WASM module loader
│   │   ├── file-loader.ts         # File loading utilities
│   │   ├── fallback-formatter.ts   # Generic fallback
│   │   └── wasm-formatters.test.ts # WASM formatter tests
│   │
│   └── shared/                     # Shared utilities
│       ├── types.ts               # Extension type definitions
│       ├── constants.ts           # Constants and defaults
│       └── utils.ts              # Utility functions
│
├── css/
│   └── content.min.css            # Compiled styles (6.5KB)
│
├── icons/
│   └── icon.svg                   # Extension icon
│
├── wasm/                          # WASM binaries (2.4MB)
│   ├── ruff_fmt_bg.wasm          # Python formatter
│   ├── gofmt.wasm                # Go formatter
│   ├── sql_fmt_bg.wasm           # SQL formatter
│   ├── yamlfmt_bg.wasm           # YAML formatter
│   └── taplo_fmt_bg.wasm         # TOML formatter
│
├── _locales/                      # i18n translations (13 languages)
│   ├── en/messages.json
│   ├── zh_CN/messages.json
│   └── ...
│
├── manifest.json                  # Extension manifest (v3)
├── package.json                   # NPM configuration
├── tsconfig.json                 # TypeScript configuration
├── esbuild.config.js             # Build configuration
├── vitest.config.ts              # Test configuration
│
├── README.md                     # This file
├── BUILD_SUMMARY.md             # Build documentation
├── RELEASE_NOTES.md             # Release notes
├── SUPPORTED_LANGUAGES.md        # Languages reference
├── AUTO_CHANGELOG.md            # Changelog feature docs
└── CODEBASE_ANALYSIS.md         # Code analysis report
```

---

## Technical Stack

### Core Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| **TypeScript** | Source language | 5.0+ |
| **esbuild** | Bundler and minifier | 0.19+ |
| **Chrome Extension API** | Extension functionality | Manifest v3 |
| **CodeMirror 6** | Code editor | 6.0+ |
| **Prettier** | Web language formatting | 3.0+ |
| **WASM** | Binary formatters | WebAssembly |

### Build Tools

```json
{
  "typescript": "Type safety and IDE support",
  "esbuild": "Fast bundling and minification",
  "sass": "SCSS compilation",
  "eslint": "Code quality",
  "prettier": "Code formatting",
  "vitest": "Testing framework"
}
```

### Formatter Technologies

| Language | Formatter | Technology |
|----------|-----------|------------|
| JS/TS/CSS/HTML/MD | Prettier | JavaScript library |
| Python | Ruff | WASM binary |
| Go | GoFmt | WASM binary |
| SQL | sqlfmt | WASM binary |
| YAML | yamlfmt | WASM binary |
| TOML | Taplo | WASM binary |

---

## Building from Source

### Prerequisites

- Node.js 18+
- npm 9+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/code-formatter-extension.git
cd code-formatter-extension

# Install dependencies
npm install
```

### Available Scripts

```bash
# Build the extension
npm run build

# Build in watch mode (development)
npm run dev

# Type checking
npm run typecheck

# Run linter
npm run lint

# Run tests
npm test

# Clean build artifacts
npm run clean

# Package for Chrome
npm run package:chrome

# Package for Firefox
npm run package:firefox
```

### Build Output

After running `npm run build`:

```
├── background.min.js      # 2.1 MB (background script)
├── content.min.js        # 478 KB (content script)
├── options.js             # 7.1 KB (options page)
├── changelog.js          # 3.4 KB (changelog page)
├── css/content.min.css   # 6.5 KB (compiled styles)
├── icons/icon.svg        # Extension icon
├── wasm/                 # WASM binaries
└── _locales/            # Translations
```

### Loading in Browser

**Chrome:**
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the build output folder

**Firefox:**
1. Navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select `manifest.json`

---

## Testing

### Test Suite

The extension includes a comprehensive test suite:

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage
```

### Test Structure

```
src/
├── background.test.ts           # Background script tests
├── shared.test.ts              # Shared utilities tests
└── formatters/
    └── wasm-formatters.test.ts # WASM formatter tests
```

### Test Coverage

```
Test Files        Tests       Duration
3 passed     31 passed     ~300ms
```

**Coverage Areas:**
- Background script functionality
- Shared utilities (storage, formatting)
- WASM formatter loading and execution
- Type safety validation

### Writing Tests

Example test:

```typescript
// src/formatters/wasm-formatters.test.ts
import { describe, it, expect } from 'vitest';
import { WasmFormatter } from './wasm-formatters';

describe('WasmFormatter', () => {
  it('should format Python code', async () => {
    const formatter = new WasmFormatter('python');
    const input = 'x=1';
    const result = await formatter.format(input, 'python', defaultSettings);
    expect(result.success).toBe(true);
    expect(result.code).toBe('x = 1\n');
  });
});
```

---

## Configuration

### TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

### esbuild Configuration (esbuild.config.js)

```javascript
const commonConfig = {
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: true,
  sourcemap: false,
  treeShaking: true,
  splitting: false,
  platform: 'browser',
  external: ['chrome'],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
};
```

### Extension Manifest (manifest.json)

```json
{
  "manifest_version": 3,
  "name": "__MSG_extName__",
  "version": "1.9.1",
  "description": "__MSG_extDescription__",
  "default_locale": "en",
  "permissions": ["scripting", "tabs", "storage", "contextMenus"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "scripts": ["background.min.js"]
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.min.js"],
    "css": ["css/content.min.css"],
    "run_at": "document_idle",
    "all_frames": true
  }],
  "action": {
    "default_icon": "icons/icon.svg",
    "default_title": "__MSG_extName__"
  },
  "options_ui": {
    "page": "options.html"
  },
  "web_accessible_resources": [{
    "resources": ["wasm/*"],
    "matches": ["<all_urls>"]
  }]
}
```

---

## Development

### Adding a New Formatter

1. **Create the formatter module** (`src/formatters/my-formatter.ts`):

```typescript
import { FormatterSettings, FormatResult } from './types';

export class MyFormatter {
  async format(
    code: string,
    lang: string,
    settings: FormatterSettings
  ): Promise<FormatResult> {
    try {
      // Your formatting logic here
      const formatted = await doFormat(code, settings);
      return { success: true, code: formatted };
    } catch (error) {
      return {
        success: false,
        code,
        error: error instanceof Error ? error.message : 'Formatting failed',
      };
    }
  }

  isSupported(lang: string): boolean {
    return lang === 'mylang';
  }

  getSupportedLanguages(): string[] {
    return ['mylang'];
  }
}
```

2. **Register the formatter** (`src/formatters/index.ts`):

```typescript
import { MyFormatter } from './my-formatter';

export const formatterRegistry = new FormatterRegistry();
formatterRegistry.register('mylang', new MyFormatter());
```

3. **Update types** (`src/formatters/types.ts`):

```typescript
export interface FormatterSettings {
  // ... existing settings
  mylangOption?: boolean; // Add new settings
}
```

4. **Add tests** (`src/formatters/my-formatter.test.ts`):

```typescript
import { describe, it, expect } from 'vitest';
import { MyFormatter } from './my-formatter';

describe('MyFormatter', () => {
  // Add tests
});
```

### Adding a New Language

1. Add formatter support (see above)
2. Update `SUPPORTED_LANGUAGES.md`
3. Add translations in `_locales/{lang}/messages.json`
4. Update `src/shared/constants.ts` if needed
5. Add tests for language detection

### Modifying Settings

1. **Update interface** (`src/shared/types.ts`):
```typescript
export interface ExtensionSettings {
  // ... existing
  newSetting: string;
}
```

2. **Add to defaults** (`src/shared/constants.ts`):
```typescript
export const DEFAULT_SETTINGS: ExtensionSettings = {
  // ... existing
  newSetting: 'default',
};
```

3. **Update options page** (`src/options.ts`):
```typescript
const newSetting = document.getElementById('new-setting') as HTMLInputElement;
// Add UI element in options.html
```

4. **Update content script** (`src/content.ts`):
```typescript
currentSettings.newSetting = result.newSetting;
```

5. **Update formatters** as needed

### Theme Customization

Styles are in `src/css/content.scss`:

```scss
// Variables
$primary-color: #4a6cf7;
$text-primary: #1f2937;
$bg-primary: #ffffff;

// Usage
.header {
  background: $primary-color;
  color: $text-primary;
}
```

### Localization

1. **Add messages** in `_locales/{lang}/messages.json`:

```json
{
  "extName": {
    "message": "Code Formatter",
    "description": "Extension name"
  }
}
```

2. **Use in manifest**:
```json
"name": "__MSG_extName__"
```

3. **Use in code**:
```typescript
chrome.i18n.getMessage('extName')
```

---

## Release Process

### Version Numbering

This project uses **Semantic Versioning** (SemVer):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

Current version: `1.9.1`

### Release Steps

1. **Update version** in:
   - `package.json`
   - `manifest.json`
   - `src/changelog.ts`

2. **Update changelog**:
   - Add new features
   - Document breaking changes
   - List bug fixes

3. **Run tests**:
   ```bash
   npm run typecheck
   npm run lint
   npm test
   ```

4. **Build**:
   ```bash
   npm run build
   ```

5. **Package**:
   ```bash
   npm run package:chrome
   npm run package:firefox
   ```

6. **Upload**:
   - Chrome Web Store
   - Firefox Add-ons
   - GitHub Releases

### Automated Changelog

The extension includes automatic changelog display:

```typescript
// background.ts
chrome.runtime.onInstalled.addListener(details => {
  const currentVersion = chrome.runtime.getManifest().version;
  
  chrome.storage.local.get(['lastSeenVersion'], (result) => {
    if (!result.lastSeenVersion || result.lastSeenVersion !== currentVersion) {
      // Show changelog
      chrome.tabs.create({
        url: chrome.runtime.getURL('changelog.html'),
      });
      // Mark as seen
      chrome.storage.local.set({ lastSeenVersion: currentVersion });
    }
  });
});
```

---

## Contributing

### Getting Started

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOURUSERNAME/code-formatter-extension.git
   ```
3. **Create a branch**:
   ```bash
   git checkout -b feature/my-feature
   ```
4. **Make changes**
5. **Run tests**:
   ```bash
   npm test
   ```
6. **Submit a pull request**

### Contribution Guidelines

- Follow TypeScript strict mode
- Write tests for new features
- Update documentation
- Use meaningful commit messages
- Keep PRs focused and small

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier (run `npm run format`)
- **Linting**: ESLint (run `npm run lint`)
- **Commits**: Conventional commits preferred

### Reporting Issues

When reporting issues, include:
- Browser and version
- Extension version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Console errors (if any)

---

## Performance

### Optimization Techniques

1. **Tree Shaking**: esbuild removes unused code
2. **Minification**: All code is minified in production
3. **Lazy Loading**: WASM modules loaded on demand
4. **Caching**: Formatters cached after first load
5. **Debouncing**: Format-on-type debounced 500ms
6. **DocumentFragment**: Batch DOM operations

### Bundle Size Breakdown

```
background.min.js  2.1 MB  (includes WASM loader + formatters)
content.min.js     478 KB  (CodeMirror + functionality)
options.js         7.1 KB  (settings page)
changelog.js       3.4 KB  (changelog display)
css/content.min.css 6.5 KB (compiled styles)
```

Total: ~4.9 MB (well under 2GB Chrome limit)

### Memory Management

- Event listeners cleaned up on page unload
- No memory leaks detected
- WASM modules properly disposed

---

## Security

### Permissions

The extension requests only necessary permissions:

```json
{
  "permissions": [
    "scripting",    // Inject content scripts
    "tabs",         // Access tab information
    "storage",      // Save settings
    "contextMenus"  // Context menu items
  ],
  "host_permissions": [
    "<all_urls>"   // Access all web pages
  ]
}
```

### CSP (Content Security Policy)

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  }
}
```

### Privacy

- No data collection
- No analytics
- No external requests
- All processing local

---

## Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 88+ | Full |
| Firefox | 109+ | Full |
| Edge | 88+ | Full |
| Brave | 1.0+ | Full |

---

## License

MIT License - see LICENSE file for details.

---

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/code-formatter-extension/issues)
- **Documentation**: See included documentation files
- **Email**: support@example.com

---

## Acknowledgments

- [Prettier](https://prettier.io/) - Code formatting
- [CodeMirror](https://codemirror.com/) - Code editor
- [esbuild](https://esbuild.github.io/) - Bundler
- [WASM Formatters](https://github.com/wasm-fmt/) - Rust-based formatters

---

**Built with ❤️ for developers**

*Format your code beautifully, everywhere.*

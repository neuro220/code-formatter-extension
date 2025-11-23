# Changelog

All notable changes to Code Formatter extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] - 2025-11-22

### Added
- **Configuration Panel**: New options page accessible via Firefox Add-ons > Code Formatter > Preferences
  - Indentation settings (2/4 spaces or tabs)
  - Quote style preferences (single/double quotes)
  - Line wrap length configuration
  - Theme selection (Dracula, GitHub Light, Solarized Light, Material)
  - Line wrapping toggle
  - Font size adjustment (12-20px)
- **Extended Beautification Support**:
  - HTML formatting using Prettier
  - XML formatting using Prettier
- **Multiple Syntax Highlighting Themes**:
  - Dracula (Dark) - default
  - GitHub Light
  - Solarized Light
  - Material
- **Search Functionality**: Integrated CodeMirror search with Ctrl+F support
- **Keyboard Shortcuts**:
  - Ctrl+S: Switch between original and formatted views
  - Ctrl+Shift+C: Copy formatted code
  - Ctrl+D: Download formatted code
- **Minification Toggle**: Added minify button in toolbar (placeholder for future implementation)
- **Line Wrapping Control**: Toggle long line wrapping in options
- **Font Size Adjustment**: Customizable font sizes for better readability
- **Enhanced Language Detection**:
  - Added C++ detection patterns
  - Improved patterns for all supported languages with more keywords and syntax recognition
  - Better JSX/TSX component detection
  - Enhanced plain text code block identification
  - Multiple detection patterns per language with priority system

### Improved
- **Error Handling**: Robust error handling for malformed code with graceful fallbacks
- **File Detection**: Stronger detection algorithms for all supported languages
  - JavaScript: Added async/await, DOM methods, Promise patterns
  - TypeScript: Added interface, type, enum detection
  - Python: Added control structures, built-in functions
  - Go: Added goroutine, channel patterns
  - Rust: Added macro, derive patterns
  - Java: Added System.out.println, main method detection
  - C#: Added LINQ, async patterns
  - YAML: Added version fields, list structures
  - Markdown: Added code blocks, inline formatting
  - C++: Added templates, namespaces, standard library usage
- **Plain Text Detection**: Enhanced recognition of code in plain text pages
- **Beautification Options**: Configurable formatting with user preferences
- **User Experience**: Better accessibility with keyboard navigation and customizable display

### Technical
- Added Prettier integration for HTML/XML formatting
- Implemented chrome.storage for settings persistence
- Enhanced CodeMirror extensions (search, themes, line wrapping)
- Improved regex patterns for language detection
- Added priority-based detection system

### Fixed
- Better handling of malformed JSON and code parsing errors
- Improved detection accuracy to reduce missed files
- More reliable language identification from content patterns

### Security
- Maintained offline functionality and no data collection
- Secure settings storage using chrome.storage.sync
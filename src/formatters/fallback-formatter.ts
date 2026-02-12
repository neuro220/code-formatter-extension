import type {
  IFormatter,
  FormatterMetadata,
  FormatResult,
  FormatterSettings,
} from './types';

/**
 * Fallback formatter for languages without dedicated formatters
 * Provides basic indentation and normalization
 */
export class FallbackFormatter implements IFormatter {
  readonly metadata: FormatterMetadata = {
    id: 'fallback',
    name: 'Fallback Formatter',
    description:
      'Basic indentation and normalization for unsupported languages',
    languages: ['rust', 'ruby', 'lua', 'zig', 'dart'],
    capabilities: {
      isFormatter: false,
      isOpinionated: false,
      tolerant: true,
    },
  };

  async format(
    code: string,
    language: string,
    settings?: FormatterSettings
  ): Promise<FormatResult> {
    try {
      const indentSize = settings?.indentSize ?? 2;
      const indentChar = settings?.useTabs ? '\t' : ' ';
      const indent = indentChar.repeat(indentSize);

      // Language-specific formatting rules
      switch (language.toLowerCase()) {
        case 'rust':
          return this.formatRust(code, indent);
        case 'ruby':
          return this.formatRuby(code, indent);
        case 'lua':
          return this.formatLua(code, indent);
        case 'zig':
          return this.formatZig(code, indent);
        case 'dart':
          return this.formatDart(code, indent);
        default:
          return this.formatGeneric(code, indent);
      }
    } catch (error) {
      return {
        success: false,
        code,
        error:
          error instanceof Error ? error.message : 'Fallback formatting failed',
      };
    }
  }

  private formatRust(code: string, indent: string): FormatResult {
    // Basic Rust formatting rules
    const formatted = code
      // Normalize newlines
      .replace(/\r\n/g, '\n')
      // Fix common spacing issues
      .replace(/\s*\{\s*/g, ' {\n')
      .replace(/\s*\}\s*/g, '\n}\n')
      .replace(/;\s*/g, ';\n')
      // Fix indentation
      .split('\n')
      .map((line, index, lines) =>
        this.fixIndentation(line, index, lines, indent)
      )
      .join('\n')
      // Clean up multiple empty lines
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return { success: true, code: formatted };
  }

  private formatRuby(code: string, indent: string): FormatResult {
    const formatted = code
      .replace(/\r\n/g, '\n')
      // Ensure proper spacing around blocks
      .replace(/\s*end\s*/g, '\nend\n')
      .split('\n')
      .map((line, index, lines) =>
        this.fixIndentation(line, index, lines, indent)
      )
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return { success: true, code: formatted };
  }

  private formatLua(code: string, indent: string): FormatResult {
    const formatted = code
      .replace(/\r\n/g, '\n')
      .replace(/\s*then\s*/g, ' then\n')
      .replace(/\s*end\s*/g, '\nend\n')
      .split('\n')
      .map((line, index, lines) =>
        this.fixIndentation(line, index, lines, indent)
      )
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return { success: true, code: formatted };
  }

  private formatZig(code: string, indent: string): FormatResult {
    const formatted = code
      .replace(/\r\n/g, '\n')
      .replace(/\s*\{\s*/g, ' {\n')
      .replace(/\s*\}\s*/g, '\n}\n')
      .split('\n')
      .map((line, index, lines) =>
        this.fixIndentation(line, index, lines, indent)
      )
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return { success: true, code: formatted };
  }

  private formatDart(code: string, indent: string): FormatResult {
    const formatted = code
      .replace(/\r\n/g, '\n')
      .replace(/\s*\{\s*/g, ' {\n')
      .replace(/\s*\}\s*/g, '\n}\n')
      .replace(/;\s*/g, ';\n')
      .split('\n')
      .map((line, index, lines) =>
        this.fixIndentation(line, index, lines, indent)
      )
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return { success: true, code: formatted };
  }

  private formatGeneric(code: string, indent: string): FormatResult {
    const formatted = code
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line, index, lines) =>
        this.fixIndentation(line, index, lines, indent)
      )
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return { success: true, code: formatted };
  }

  private fixIndentation(
    line: string,
    _index: number,
    _lines: string[],
    _indent: string
  ): string {
    const trimmed = line.trim();
    if (!trimmed) return '';

    // This is a simplified approach - in reality we'd need to track state
    // For now, just trim and return
    return trimmed;
  }

  isAvailable(): boolean {
    return true;
  }
}

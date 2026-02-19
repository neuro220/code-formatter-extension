import type { IFormatter, FormatResult, FormatterSettings } from "./types";
import { normalizeLanguage } from "./types";
import { PrettierFormatter } from "./prettier-formatter";
import { JsBeautifyFormatter } from "./js-beautify-formatter";
import { FallbackFormatter } from "./fallback-formatter";
import {
  RuffFormatter,
  GofmtFormatter,
  SqlFormatter,
  YamlFormatter,
  TomlFormatter,
} from "./wasm-formatters";

/**
 * Registry that manages all available formatters
 * Uses a strategy pattern to route formatting requests to the appropriate formatter
 */
export class FormatterRegistry {
  private formatters: Map<string, IFormatter> = new Map();
  private languageMap: Map<string, string> = new Map();

  constructor() {
    this.registerDefaultFormatters();
  }

  /**
   * Register all default formatters
   */
  private registerDefaultFormatters(): void {
    // Register formatters
    this.register(new PrettierFormatter());
    this.register(new JsBeautifyFormatter());
    this.register(new RuffFormatter());
    this.register(new GofmtFormatter());
    this.register(new SqlFormatter());
    this.register(new YamlFormatter());
    this.register(new TomlFormatter());
    this.register(new FallbackFormatter());
  }

  /**
   * Register a formatter
   */
  register(formatter: IFormatter): void {
    this.formatters.set(formatter.metadata.id, formatter);

    // Map languages to this formatter
    formatter.metadata.languages.forEach((lang) => {
      const normalized = normalizeLanguage(lang);
      // If multiple formatters support a language, the last one registered wins
      // (Prettier overrides js-beautify for web languages)
      this.languageMap.set(normalized, formatter.metadata.id);
    });
  }

  /**
   * Get the best formatter for a language
   * Priority: true formatters over beautifiers
   */
  getFormatter(language: string): IFormatter | null {
    const normalized = normalizeLanguage(language);
    const formatterId = this.languageMap.get(normalized);

    if (formatterId) {
      return this.formatters.get(formatterId) || null;
    }

    return null;
  }

  /**
   * Get formatter by ID
   */
  getFormatterById(id: string): IFormatter | null {
    return this.formatters.get(id) || null;
  }

  /**
   * Format code using the appropriate formatter
   */
  async format(
    code: string,
    language: string,
    settings?: FormatterSettings,
  ): Promise<FormatResult> {
    const formatter = this.getFormatter(language);

    if (!formatter) {
      return {
        success: false,
        code,
        error: `No formatter available for language: ${language}`,
      };
    }

    return formatter.format(code, language, settings);
  }

  /**
   * Check if a language is supported
   */
  isSupported(language: string): boolean {
    return this.languageMap.has(normalizeLanguage(language));
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.languageMap.keys());
  }

  /**
   * Get all registered formatters
   */
  getAllFormatters(): IFormatter[] {
    return Array.from(this.formatters.values());
  }

  /**
   * Get formatters for a specific language
   */
  getFormattersForLanguage(language: string): IFormatter[] {
    const normalized = normalizeLanguage(language);
    const formatterId = this.languageMap.get(normalized);
    if (formatterId) {
      const formatter = this.formatters.get(formatterId);
      return formatter ? [formatter] : [];
    }
    return [];
  }
}

// Singleton instance
export const formatterRegistry = new FormatterRegistry();

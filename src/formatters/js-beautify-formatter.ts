import { js_beautify, css_beautify, html_beautify } from "js-beautify";
import type {
  IFormatter,
  FormatterMetadata,
  FormatResult,
  FormatterSettings,
} from "./types";

export class JsBeautifyFormatter implements IFormatter {
  readonly metadata: FormatterMetadata = {
    id: "js-beautify",
    name: "JS Beautify",
    description:
      "Beautifies code with configurable options (not strict formatting)",
    languages: [
      "javascript",
      "typescript",
      "json",
      "css",
      "scss",
      "html",
      "xml",
    ],
    capabilities: {
      isFormatter: false,
      isOpinionated: false,
      tolerant: true,
    },
  };

  async format(
    code: string,
    language: string,
    settings?: FormatterSettings,
  ): Promise<FormatResult> {
    try {
      const indentSize = settings?.indentSize ?? 2;
      const baseOptions = {
        indent_size: indentSize,
        indent_char: settings?.useTabs ? "\t" : " ",
        indent_with_tabs: settings?.useTabs ?? false,
        end_with_newline: true,
        preserve_newlines: true,
        max_preserve_newlines: 10,
      };

      let formatted: string;

      switch (language.toLowerCase()) {
        case "javascript":
        case "typescript":
        case "json":
          formatted = js_beautify(code, {
            ...baseOptions,
            space_in_paren: settings?.spaceInEmptyParens ?? false,
            jslint_happy: false,
            space_after_anon_function: true,
            brace_style: "collapse,preserve-inline",
            break_chained_methods: false,
            keep_array_indentation: settings?.keepArrayIndentation ?? false,
            unescape_strings: settings?.unescapeStrings ?? false,
            comma_first: false,
            operator_position: "before-newline",
            space_before_conditional: true,
            e4x: settings?.e4x ?? false,
          });
          break;

        case "css":
        case "scss":
          formatted = css_beautify(code, {
            ...baseOptions,
            selector_separator_newline: true,
            newline_between_rules: true,
            space_around_combinator: true,
          });
          break;

        case "html":
        case "xml":
          formatted = html_beautify(code, {
            ...baseOptions,
            indent_inner_html: false,
            indent_body_inner_html: true,
            indent_head_inner_html: true,
            wrap_attributes: "auto",
            wrap_attributes_min_attrs: 2,
            unformatted: [],
            content_unformatted: ["pre", "textarea"],
          });
          break;

        default:
          return {
            success: false,
            code,
            error: `Language ${language} not supported by js-beautify`,
          };
      }

      return { success: true, code: formatted };
    } catch (error) {
      return {
        success: false,
        code,
        error: error instanceof Error ? error.message : "Beautification failed",
      };
    }
  }

  isAvailable(): boolean {
    return true;
  }
}

import type {
  IFormatter,
  FormatterMetadata,
  FormatResult,
  FormatterSettings,
} from "./types";

export class FallbackFormatter implements IFormatter {
  readonly metadata: FormatterMetadata = {
    id: "fallback",
    name: "Fallback Formatter",
    description:
      "Basic indentation and normalization for unsupported languages",
    languages: ["rust", "ruby", "lua", "zig", "dart"],
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
      const indentChar = settings?.useTabs ? "\t" : " ";
      const indent = indentChar.repeat(indentSize);

      switch (language.toLowerCase()) {
        case "rust":
          return this.formatRust(code, indent);
        case "ruby":
          return this.formatRuby(code, indent);
        case "lua":
          return this.formatLua(code, indent);
        case "zig":
          return this.formatZig(code, indent);
        case "dart":
          return this.formatDart(code, indent);
        default:
          return this.formatGeneric(code, indent);
      }
    } catch (error) {
      return {
        success: false,
        code,
        error:
          error instanceof Error ? error.message : "Fallback formatting failed",
      };
    }
  }

  private formatRust(code: string, indent: string): FormatResult {
    const lines = code
      .replace(/\r\n/g, "\n")
      .replace(/\s*\{\s*/g, " {\n")
      .replace(/\s*\}\s*/g, "\n}\n")
      .replace(/;\s*/g, ";\n")
      .split("\n");

    const formatted = this.formatLinesWithIndentation(lines, indent)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return { success: true, code: formatted };
  }

  private formatRuby(code: string, indent: string): FormatResult {
    const lines = code
      .replace(/\r\n/g, "\n")
      .replace(/\s*end\s*/g, "\nend\n")
      .split("\n");

    const formatted = this.formatLinesWithIndentation(lines, indent)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return { success: true, code: formatted };
  }

  private formatLua(code: string, indent: string): FormatResult {
    const lines = code
      .replace(/\r\n/g, "\n")
      .replace(/\s*then\s*/g, " then\n")
      .replace(/\s*end\s*/g, "\nend\n")
      .split("\n");

    const formatted = this.formatLinesWithIndentation(lines, indent)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return { success: true, code: formatted };
  }

  private formatZig(code: string, indent: string): FormatResult {
    const lines = code
      .replace(/\r\n/g, "\n")
      .replace(/\s*\{\s*/g, " {\n")
      .replace(/\s*\}\s*/g, "\n}\n")
      .split("\n");

    const formatted = this.formatLinesWithIndentation(lines, indent)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return { success: true, code: formatted };
  }

  private formatDart(code: string, indent: string): FormatResult {
    const lines = code
      .replace(/\r\n/g, "\n")
      .replace(/\s*\{\s*/g, " {\n")
      .replace(/\s*\}\s*/g, "\n}\n")
      .replace(/;\s*/g, ";\n")
      .split("\n");

    const formatted = this.formatLinesWithIndentation(lines, indent)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return { success: true, code: formatted };
  }

  private formatGeneric(code: string, indent: string): FormatResult {
    const lines = code.replace(/\r\n/g, "\n").split("\n");
    const formatted = this.formatLinesWithIndentation(lines, indent)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return { success: true, code: formatted };
  }

  private formatLinesWithIndentation(
    lines: string[],
    indent: string,
  ): string[] {
    let indentLevel = 0;

    return lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";

      const openCount = (trimmed.match(/[\{\[\(]/g) || []).length;
      const closeCount = (trimmed.match(/[\}\]\)]/g) || []).length;

      let currentIndent = indentLevel;
      if (trimmed.match(/^[\}\]\)]/)) {
        currentIndent = Math.max(0, indentLevel - 1);
      }

      indentLevel += openCount - closeCount;
      indentLevel = Math.max(0, indentLevel);

      return indent.repeat(currentIndent) + trimmed;
    });
  }

  isAvailable(): boolean {
    return true;
  }
}

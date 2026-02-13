import type {
  IFormatter,
  FormatterMetadata,
  FormatResult,
  FormatterSettings,
} from "./types";

// Pre-bundle all Prettier plugins at module load time
// This ensures they work correctly in the bundled extension
let prettier: typeof import("prettier/standalone");
let babelPlugin: any;
let estreePlugin: any;
let typescriptPlugin: any;
let postcssPlugin: any;
let htmlPlugin: any;
let markdownPlugin: any;

// Load Prettier and plugins once at startup
async function loadPrettierPlugins(): Promise<void> {
  if (prettier) return; // Already loaded

  prettier = await import("prettier/standalone");

  // Load all plugins in parallel
  const [babel, estree, typescript, postcss, html, markdown] =
    await Promise.all([
      import("prettier/plugins/babel"),
      import("prettier/plugins/estree"),
      import("prettier/plugins/typescript"),
      import("prettier/plugins/postcss"),
      import("prettier/plugins/html"),
      import("prettier/plugins/markdown"),
    ]);

  babelPlugin = babel;
  estreePlugin = estree;
  typescriptPlugin = typescript;
  postcssPlugin = postcss;
  htmlPlugin = html;
  markdownPlugin = markdown;
}

export class PrettierFormatter implements IFormatter {
  readonly metadata: FormatterMetadata = {
    id: "prettier",
    name: "Prettier",
    description: "Opinionated code formatter for JS/TS/JSON/CSS/HTML",
    languages: [
      "javascript",
      "typescript",
      "json",
      "css",
      "scss",
      "less",
      "html",
      "markdown",
    ],
    capabilities: {
      isFormatter: true,
      isOpinionated: true,
      tolerant: false,
    },
  };

  async format(
    code: string,
    language: string,
    settings?: FormatterSettings,
  ): Promise<FormatResult> {
    try {
      // Ensure plugins are loaded
      await loadPrettierPlugins();

      const plugins: any[] = [];

      // Use pre-loaded plugins
      switch (language.toLowerCase()) {
        case "javascript":
        case "typescript":
          plugins.push(babelPlugin, estreePlugin, typescriptPlugin);
          break;
        case "json":
          plugins.push(babelPlugin);
          break;
        case "css":
        case "scss":
        case "less":
          plugins.push(postcssPlugin);
          break;
        case "html":
          plugins.push(htmlPlugin);
          break;
        case "markdown":
          plugins.push(markdownPlugin);
          break;
      }

      const formatted = await prettier.format(code, {
        parser: this.getParser(language),
        plugins,
        tabWidth: settings?.indentSize ?? 2,
        useTabs: settings?.useTabs ?? false,
        singleQuote: settings?.singleQuote ?? true,
        trailingComma: settings?.trailingComma ?? "es5",
        semi: settings?.semi ?? true,
      });

      return { success: true, code: formatted };
    } catch (error) {
      return {
        success: false,
        code,
        error:
          error instanceof Error ? error.message : "Prettier formatting failed",
      };
    }
  }

  private getParser(language: string): string {
    const parsers: Record<string, string> = {
      javascript: "babel",
      typescript: "typescript",
      json: "json",
      css: "css",
      scss: "scss",
      less: "less",
      html: "html",
      markdown: "markdown",
    };
    return parsers[language.toLowerCase()] || "babel";
  }

  isAvailable(): boolean {
    return true;
  }
}

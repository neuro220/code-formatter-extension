export interface FormatterSettings {
  indentSize: number;
  lineWrap: number;
  useTabs: boolean;
  // Prettier & js-beautify options
  singleQuote?: boolean;
  semi?: boolean;
  trailingComma?: 'none' | 'es5' | 'all';
  // js-beautify options
  e4x?: boolean;
  spaceInEmptyParens?: boolean;
  unescapeStrings?: boolean;
  keepArrayIndentation?: boolean;
  // WASM formatter options
  quoteStyle?: 'single' | 'double' | 'preserve';
  keywordCase?: 'upper' | 'lower' | 'preserve';
  commaPosition?: 'before' | 'after';
  // TOML formatter options
  alignEntries?: boolean;
  alignComments?: boolean;
  indentTables?: boolean;
  // Feature flags
  autoFormatOnType?: boolean;
  formatOnPasteMinLength?: number;
}

export interface LanguageDefaults {
  indentSize: number;
  useTabs: boolean;
  lineWrap: number;
  singleQuote?: boolean;
  semi?: boolean;
}

export interface FormatResult {
  success: boolean;
  code: string;
  error?: string;
}

export interface FormatterCapabilities {
  isFormatter: boolean;
  isOpinionated: boolean;
  tolerant: boolean;
}

export interface FormatterMetadata {
  id: string;
  name: string;
  description: string;
  languages: string[];
  capabilities: FormatterCapabilities;
}

export interface IFormatter {
  readonly metadata: FormatterMetadata;
  format(
    code: string,
    language: string,
    settings?: FormatterSettings
  ): Promise<FormatResult>;
  isAvailable(): boolean;
}

export const LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  htm: 'html',
  xml: 'xml',
  svg: 'svg',
  py: 'python',
  pyi: 'python',
  pyw: 'python',
  go: 'go',
  rs: 'rust',
  sql: 'sql',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'toml',
  md: 'markdown',
  mdx: 'markdown',
  lua: 'lua',
  zig: 'zig',
  dart: 'dart',
};

export function normalizeLanguage(language: string): string {
  const aliases: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    rs: 'rust',
    golang: 'go',
    yml: 'yaml',
  };
  return aliases[language.toLowerCase()] || language.toLowerCase();
}

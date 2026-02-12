/**
 * Type declarations for js-beautify
 */
declare module 'js-beautify' {
  export interface JsBeautifyOptions {
    indent_size?: number;
    indent_char?: string;
    indent_with_tabs?: boolean;
    eol?: string;
    end_with_newline?: boolean;
    preserve_newlines?: boolean;
    max_preserve_newlines?: number;
    indent_level?: number;
    space_in_paren?: boolean;
    space_in_empty_paren?: boolean;
    jslint_happy?: boolean;
    space_after_anon_function?: boolean;
    space_after_named_function?: boolean;
    brace_style?: string;
    unindent_chained_methods?: boolean;
    break_chained_methods?: boolean;
    keep_array_indentation?: boolean;
    unescape_strings?: boolean;
    wrap_line_length?: number;
    e4x?: boolean;
    comma_first?: boolean;
    operator_position?: string;
    space_before_conditional?: boolean;
  }

  export interface CssBeautifyOptions {
    indent_size?: number;
    indent_char?: string;
    indent_with_tabs?: boolean;
    eol?: string;
    end_with_newline?: boolean;
    selector_separator_newline?: boolean;
    newline_between_rules?: boolean;
    space_around_combinator?: boolean;
  }

  export interface HtmlBeautifyOptions {
    indent_size?: number;
    indent_char?: string;
    indent_with_tabs?: boolean;
    eol?: string;
    end_with_newline?: boolean;
    preserve_newlines?: boolean;
    max_preserve_newlines?: number;
    indent_inner_html?: boolean;
    indent_body_inner_html?: boolean;
    indent_head_inner_html?: boolean;
    indent_handlebars?: boolean;
    wrap_line_length?: number;
    wrap_attributes?: string;
    wrap_attributes_min_attrs?: number;
    wrap_attributes_indent_size?: number;
    unformatted?: string[];
    content_unformatted?: string[];
    extra_liners?: string[];
    indent_scripts?: string;
  }

  export function js_beautify(
    source: string,
    options?: JsBeautifyOptions
  ): string;
  export function css_beautify(
    source: string,
    options?: CssBeautifyOptions
  ): string;
  export function html_beautify(
    source: string,
    options?: HtmlBeautifyOptions
  ): string;

  const jsBeautify: {
    js: typeof js_beautify;
    css: typeof css_beautify;
    html: typeof html_beautify;
    js_beautify: typeof js_beautify;
    css_beautify: typeof css_beautify;
    html_beautify: typeof html_beautify;
  };

  export default jsBeautify;
}

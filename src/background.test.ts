/**
 * Unit tests for background script formatting functions
 */
import { describe, it, expect } from 'vitest';
import { js_beautify, css_beautify, html_beautify } from 'js-beautify';

// Since background.ts functions are not exported, we test the js-beautify
// integration directly to verify formatting works correctly

describe('JavaScript Formatting', () => {
  it('should format minified JavaScript', () => {
    const input = 'function hello(){var x=1;if(x>0){console.log(x)}}';
    const result = js_beautify(input, { indent_size: 2 });
    expect(result).toContain('function hello()');
    expect(result).toContain('  var x = 1;');
    expect(result).toContain('  if (x > 0)');
  });

  it('should respect indent_size setting', () => {
    const input = 'function a(){return 1}';
    const result2 = js_beautify(input, { indent_size: 2 });
    const result4 = js_beautify(input, { indent_size: 4 });
    expect(result2).toContain('  return');
    expect(result4).toContain('    return');
  });

  it('should handle empty input', () => {
    const result = js_beautify('', { indent_size: 2 });
    expect(result).toBe('');
  });

  it('should format arrow functions', () => {
    const input = 'const fn=()=>{return 42}';
    const result = js_beautify(input, { indent_size: 2 });
    expect(result).toContain('const fn');
    expect(result).toContain('return 42');
  });

  it('should handle nested objects', () => {
    const input = '{a:{b:{c:1}}}';
    const result = js_beautify(input, { indent_size: 2 });
    expect(result.split('\n').length).toBeGreaterThan(3);
  });
});

describe('CSS Formatting', () => {
  it('should format minified CSS', () => {
    const input = 'body{color:red;margin:0}.header{display:flex}';
    const result = css_beautify(input, { indent_size: 2 });
    expect(result).toContain('body {');
    expect(result).toContain('  color: red;');
    expect(result).toContain('.header {');
  });

  it('should add newlines between rules', () => {
    const input = '.a{color:red}.b{color:blue}';
    const result = css_beautify(input, {
      indent_size: 2,
      newline_between_rules: true,
    });
    expect(result).toContain('\n\n');
  });

  it('should handle empty input', () => {
    const result = css_beautify('', { indent_size: 2 });
    expect(result).toBe('');
  });
});

describe('HTML Formatting', () => {
  it('should format minified HTML', () => {
    const input = '<div><p>Hello</p><span>World</span></div>';
    const result = html_beautify(input, { indent_size: 2 });
    expect(result).toContain('<div>');
    expect(result).toContain('</div>');
    // p and span are kept on same line since they're inline
    expect(result.split('\n').length).toBeGreaterThan(1);
  });

  it('should handle self-closing tags', () => {
    const input = '<div><img src="test.png"><br></div>';
    const result = html_beautify(input, { indent_size: 2 });
    expect(result).toContain('<img');
    expect(result).toContain('<br>');
  });

  it('should handle empty input', () => {
    const result = html_beautify('', { indent_size: 2 });
    expect(result).toBe('');
  });
});

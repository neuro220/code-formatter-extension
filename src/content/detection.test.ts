import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  detectLanguage,
  appearsToBeCodePage,
  getLimitedContent,
  DETECTION_PATTERNS,
} from "./detection";

describe("Detection Module", () => {
  describe("DETECTION_PATTERNS", () => {
    it("should have patterns for common languages", () => {
      const languages = DETECTION_PATTERNS.map((p) => p.lang);
      expect(languages).toContain("javascript");
      expect(languages).toContain("typescript");
      expect(languages).toContain("python");
      expect(languages).toContain("go");
      expect(languages).toContain("rust");
      expect(languages).toContain("sql");
      expect(languages).toContain("html");
      expect(languages).toContain("css");
    });

    it("should have weight property for all patterns", () => {
      for (const pattern of DETECTION_PATTERNS) {
        expect(pattern.weight).toBeGreaterThan(0);
        expect(pattern.weight).toBeLessThanOrEqual(10);
      }
    });

    it("should have valid regex for all patterns", () => {
      for (const pattern of DETECTION_PATTERNS) {
        expect(pattern.regex).toBeInstanceOf(RegExp);
      }
    });
  });

  describe("detectLanguage", () => {
    it("should detect JSON objects", () => {
      const json = '{"name": "test", "value": 123}';
      expect(detectLanguage(json)).toBe("json");
    });

    it("should detect JSON arrays", () => {
      const json = '[1, 2, 3, {"key": "value"}]';
      expect(detectLanguage(json)).toBe("json");
    });

    it("should not detect invalid JSON", () => {
      const notJson = '{"missing": "quote}';
      expect(detectLanguage(notJson)).not.toBe("json");
    });

    it("should detect HTML", () => {
      const html = "<!DOCTYPE html><html><body>Hello</body></html>";
      expect(detectLanguage(html)).toBe("html");
    });

    it("should return null for empty content", () => {
      expect(detectLanguage("")).toBeNull();
      expect(detectLanguage("   ")).toBeNull();
    });

    it("should detect code patterns", () => {
      const code = `
        interface User { name: string; }
        def hello(): pass
        package main
        fn main() {}
        SELECT * FROM table
      `;
      const result = detectLanguage(code);
      expect(result).not.toBeNull();
    });
  });

  describe("getLimitedContent", () => {
    it("should return content as-is if under limit", () => {
      const content = "short content";
      expect(getLimitedContent(content)).toBe(content);
    });

    it("should truncate content over limit", () => {
      const longContent = "x".repeat(60000);
      const limited = getLimitedContent(longContent);
      expect(limited.length).toBe(50000);
    });

    it("should handle empty string", () => {
      expect(getLimitedContent("")).toBe("");
    });
  });
});

describe("appearsToBeCodePage", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("should return false for empty page", () => {
    expect(appearsToBeCodePage()).toBe(false);
  });

  it("should return true when pre element has language class", () => {
    const pre = document.createElement("pre");
    pre.className = "language-javascript";
    pre.textContent = "const x = 10;".repeat(20);
    document.body.appendChild(pre);

    expect(appearsToBeCodePage()).toBe(true);
  });

  it("should return true when code element has language class", () => {
    const code = document.createElement("code");
    code.className = "language-python";
    code.textContent = "def hello(): pass".repeat(20);
    document.body.appendChild(code);

    expect(appearsToBeCodePage()).toBe(true);
  });

  it("should return true for shebang scripts", () => {
    const pre = document.createElement("pre");
    pre.textContent = "#!/bin/bash\necho 'hello'".repeat(10);
    document.body.appendChild(pre);

    expect(appearsToBeCodePage()).toBe(true);
  });

  it("should return false for short content", () => {
    const pre = document.createElement("pre");
    pre.textContent = "short";
    document.body.appendChild(pre);

    expect(appearsToBeCodePage()).toBe(false);
  });
});

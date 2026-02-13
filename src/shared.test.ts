/**
 * Unit tests for shared constants and types
 */
import { describe, it, expect } from "vitest";
import {
  EXTENSION_MAP,
  DEFAULT_SETTINGS,
  AVAILABLE_THEMES,
  ELEMENT_IDS,
  CSS_CLASSES,
} from "./shared/constants";

describe("EXTENSION_MAP", () => {
  it("should map common JS extensions", () => {
    expect(EXTENSION_MAP["js"]).toBe("javascript");
    expect(EXTENSION_MAP["ts"]).toBe("typescript");
    expect(EXTENSION_MAP["jsx"]).toBe("javascript");
    expect(EXTENSION_MAP["tsx"]).toBe("typescript");
  });

  it("should map web extensions", () => {
    expect(EXTENSION_MAP["html"]).toBe("html");
    expect(EXTENSION_MAP["css"]).toBe("css");
    expect(EXTENSION_MAP["json"]).toBe("json");
    expect(EXTENSION_MAP["xml"]).toBe("xml");
  });

  it("should map other language extensions", () => {
    expect(EXTENSION_MAP["py"]).toBe("python");
    expect(EXTENSION_MAP["md"]).toBe("markdown");
    expect(EXTENSION_MAP["go"]).toBe("go");
    expect(EXTENSION_MAP["rs"]).toBe("rust");
    expect(EXTENSION_MAP["sql"]).toBe("sql");
    expect(EXTENSION_MAP["yml"]).toBe("yaml");
    expect(EXTENSION_MAP["yaml"]).toBe("yaml");
    expect(EXTENSION_MAP["rb"]).toBe("ruby");
  });

  it("should return undefined for unknown extensions", () => {
    expect(EXTENSION_MAP["xyz"]).toBeUndefined();
    expect(EXTENSION_MAP["unknown"]).toBeUndefined();
  });
});

describe("DEFAULT_SETTINGS", () => {
  it("should have expected default values", () => {
    expect(DEFAULT_SETTINGS.indentSize).toBe(2);
    expect(DEFAULT_SETTINGS.quoteStyle).toBe("single");
    expect(DEFAULT_SETTINGS.theme).toBe("one-dark-pro");
    expect(DEFAULT_SETTINGS.wrapLines).toBe(false);
    expect(DEFAULT_SETTINGS.fontSize).toBe("14");
    expect(DEFAULT_SETTINGS.lineHeight).toBe(1.6);
  });
});

describe("AVAILABLE_THEMES", () => {
  it("should include all required themes", () => {
    const themeValues = AVAILABLE_THEMES.map((t) => t.value);
    expect(themeValues).toContain("one-dark-pro");
    expect(themeValues).toContain("dracula");
    expect(themeValues).toContain("nord");
    expect(themeValues).toContain("github-light");
  });

  it("should have human-readable labels", () => {
    AVAILABLE_THEMES.forEach((theme) => {
      expect(theme.label.length).toBeGreaterThan(0);
    });
  });
});

describe("ELEMENT_IDS", () => {
  it("should have unique IDs", () => {
    const ids = Object.values(ELEMENT_IDS);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe("CSS_CLASSES", () => {
  it("should have unique class names", () => {
    const classes = Object.values(CSS_CLASSES);
    const unique = new Set(classes);
    expect(unique.size).toBe(classes.length);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createToolbarButton,
  createSeparator,
  sanitizeSvg,
  getFileExtension,
  downloadCode,
  initToolbar,
} from "./toolbar";
import { DEFAULT_SETTINGS } from "../shared/constants";

describe("Toolbar Module", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("createToolbarButton", () => {
    it("should create button with id", () => {
      const btn = createToolbarButton("test-id", "Test Title", "<svg></svg>");
      expect(btn.id).toBe("test-id");
    });

    it("should create button with title", () => {
      const btn = createToolbarButton("test-id", "Test Title", "<svg></svg>");
      expect(btn.title).toBe("Test Title");
    });

    it("should create button with correct class", () => {
      const btn = createToolbarButton("test-id", "Test Title", "<svg></svg>");
      expect(btn.className).toBe("code-formatter-toolbar__button");
    });

    it("should include SVG icon", () => {
      const btn = createToolbarButton(
        "test-id",
        "Test Title",
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><circle cx="5" cy="5" r="3"></circle></svg>',
      );
      const svg = btn.querySelector("svg");
      expect(svg).toBeTruthy();
    });

    it("should include text label when provided", () => {
      const btn = createToolbarButton(
        "test-id",
        "Test Title",
        "<svg></svg>",
        "Click Me",
      );
      expect(btn.textContent).toContain("Click Me");
    });

    it("should not include text label when not provided", () => {
      const btn = createToolbarButton("test-id", "Test Title", "<svg></svg>");
      const spans = btn.querySelectorAll("span");
      expect(spans.length).toBe(1);
    });
  });

  describe("createSeparator", () => {
    it("should create separator element", () => {
      const sep = createSeparator();
      expect(sep.className).toBe("code-formatter-toolbar__separator");
    });
  });

  describe("sanitizeSvg", () => {
    it("should preserve valid SVG elements", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      circle.setAttribute("cx", "10");
      circle.setAttribute("cy", "10");
      circle.setAttribute("r", "5");
      svg.appendChild(circle);

      const sanitized = sanitizeSvg(svg);
      expect(sanitized.querySelector("circle")).toBeTruthy();
    });

    it("should remove script elements", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const script = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "script",
      );
      script.textContent = "alert('xss')";
      svg.appendChild(script);

      const sanitized = sanitizeSvg(svg);
      expect(sanitized.querySelector("script")).toBeFalsy();
    });

    it("should remove onclick attributes", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("onclick", "alert('xss')");

      const sanitized = sanitizeSvg(svg);
      expect(sanitized.getAttribute("onclick")).toBeFalsy();
    });

    it("should remove onload attributes", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("onload", "alert('xss')");

      const sanitized = sanitizeSvg(svg);
      expect(sanitized.getAttribute("onload")).toBeFalsy();
    });

    it("should remove foreignObject elements", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const foreign = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "foreignObject",
      );
      svg.appendChild(foreign);

      const sanitized = sanitizeSvg(svg);
      expect(sanitized.querySelector("foreignObject")).toBeFalsy();
    });

    it("should remove javascript: URLs", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const a = document.createElementNS("http://www.w3.org/2000/svg", "a");
      a.setAttribute("href", "javascript:alert('xss')");
      svg.appendChild(a);

      const sanitized = sanitizeSvg(svg);
      expect(sanitized.querySelector("a")?.getAttribute("href")).toBeFalsy();
    });
  });

  describe("getFileExtension", () => {
    it("should return js for javascript", () => {
      expect(getFileExtension("javascript")).toBe("js");
    });

    it("should return ts for typescript", () => {
      expect(getFileExtension("typescript")).toBe("ts");
    });

    it("should return py for python", () => {
      expect(getFileExtension("python")).toBe("py");
    });

    it("should return txt for unknown language", () => {
      expect(getFileExtension("unknown")).toBe("txt");
    });

    it("should handle case-insensitive input", () => {
      expect(getFileExtension("JAVASCRIPT")).toBe("js");
      expect(getFileExtension("JavaScript")).toBe("js");
    });
  });

  describe("downloadCode", () => {
    it("should create download link", () => {
      const originalURL = globalThis.URL;
      const createObjectURL = vi.fn(() => "blob:test");
      const revokeObjectURL = vi.fn();
      (globalThis as unknown as Record<string, unknown>).URL = {
        createObjectURL,
        revokeObjectURL,
      } as unknown as typeof URL;

      const clickSpy = vi
        .spyOn(HTMLElement.prototype, "click")
        .mockImplementation(() => {});

      downloadCode("const x = 10;", "javascript");

      expect(createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalled();

      clickSpy.mockRestore();
      (globalThis as unknown as Record<string, unknown>).URL = originalURL;
    });
  });

  describe("initToolbar", () => {
    it("should initialize with settings and callbacks", () => {
      const settings = { ...DEFAULT_SETTINGS };
      const callbacks = {
        saveSettings: vi.fn(),
        applyTheme: vi.fn(),
      };

      expect(() => initToolbar(settings, callbacks)).not.toThrow();
    });
  });
});

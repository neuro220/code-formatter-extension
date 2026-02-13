/**
 * Test performance optimizations
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LRUMap, detectLanguageFromUrl } from "./shared/utils";

// Mock window.location
const mockLocation = {
  href: "",
};

beforeEach(() => {
  mockLocation.href = "";
});

Object.defineProperty(globalThis, "window", {
  value: {
    location: mockLocation,
  },
  writable: true,
});

describe("LRUMap", () => {
  it("should store and retrieve values", () => {
    const cache = new LRUMap<string, number>(3);
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
  });

  it("should evict oldest entry when full", () => {
    const cache = new LRUMap<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.set("d", 4); // Should evict 'a'

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
    expect(cache.get("d")).toBe(4);
  });

  it("should update position on access", () => {
    const cache = new LRUMap<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.get("a"); // Access 'a' to make it most recent
    cache.set("d", 4); // Should evict 'b'

    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBeUndefined();
  });

  it("should report correct size", () => {
    const cache = new LRUMap<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.size()).toBe(2);
  });
});

describe("detectLanguageFromUrl", () => {
  it("should detect JavaScript from .js extension", () => {
    mockLocation.href = "https://example.com/file.js";
    expect(detectLanguageFromUrl()).toBe("javascript");
  });

  it("should detect TypeScript from .ts extension", () => {
    mockLocation.href = "https://example.com/file.ts";
    expect(detectLanguageFromUrl()).toBe("typescript");
  });

  it("should detect Python from .py extension", () => {
    mockLocation.href = "https://example.com/script.py";
    expect(detectLanguageFromUrl()).toBe("python");
  });

  it("should detect Go from .go extension", () => {
    mockLocation.href = "https://example.com/main.go";
    expect(detectLanguageFromUrl()).toBe("go");
  });

  it("should detect Rust from .rs extension", () => {
    mockLocation.href = "https://example.com/lib.rs";
    expect(detectLanguageFromUrl()).toBe("rust");
  });

  it("should detect HTML from .html extension", () => {
    mockLocation.href = "https://example.com/index.html";
    expect(detectLanguageFromUrl()).toBe("html");
  });

  it("should detect JSON from .json extension", () => {
    mockLocation.href = "https://example.com/data.json";
    expect(detectLanguageFromUrl()).toBe("json");
  });

  it("should return null for non-code URLs", () => {
    mockLocation.href = "https://example.com/article";
    expect(detectLanguageFromUrl()).toBeNull();
  });
});

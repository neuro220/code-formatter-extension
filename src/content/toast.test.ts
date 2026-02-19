import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  showToast,
  showSuccess,
  showError,
  showInfo,
  showWarning,
} from "./toast";

describe("Toast Module", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  describe("showToast", () => {
    it("should create and display a toast element", () => {
      showToast("Test message", "info");
      expect(document.body.textContent).toContain("Test message");
    });

    it("should inject styles only once", () => {
      showToast("First", "info");
      showToast("Second", "info");
      const styles = document.querySelectorAll("#code-formatter-toast-styles");
      expect(styles.length).toBe(1);
    });

    it("should remove toast after duration", () => {
      showToast("Test", "info", 1000);
      expect(document.body.textContent).toContain("Test");

      vi.advanceTimersByTime(1300);
      expect(document.body.textContent).not.toContain("Test");
    });
  });

  describe("showSuccess", () => {
    it("should show toast with success message", () => {
      showSuccess("Success!");
      expect(document.body.textContent).toContain("Success!");
    });
  });

  describe("showError", () => {
    it("should show toast with error message", () => {
      showError("Error!");
      expect(document.body.textContent).toContain("Error!");
    });
  });

  describe("showInfo", () => {
    it("should show toast with info message", () => {
      showInfo("Info!");
      expect(document.body.textContent).toContain("Info!");
    });
  });

  describe("showWarning", () => {
    it("should show toast with warning message", () => {
      showWarning("Warning!");
      expect(document.body.textContent).toContain("Warning!");
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const form = document.getElementById("options-form");
  const saveBtn = document.getElementById("save-btn");
  const resetBtn = document.getElementById("reset-btn");
  const notification = document.getElementById("notification");

  // Form elements
  const indentSize = document.getElementById("indent-size");
  const quoteStyle = document.getElementById("quote-style");
  const lineWrap = document.getElementById("line-wrap");
  const lineWrapRange = document.getElementById("line-wrap-range");
  const lineWrapValue = document.getElementById("line-wrap-value");
  const theme = document.getElementById("theme");
  const wrapLines = document.getElementById("wrap-lines");
  const fontSize = document.getElementById("font-size");

  // Default settings
  const defaultSettings = {
    indentSize: "2",
    quoteStyle: "single",
    lineWrap: 80,
    theme: "dracula",
    wrapLines: false,
    fontSize: "14",
  };

  // Theme management
  document.documentElement.setAttribute("data-theme", "dark");

  // Notification system
  function showNotification(message, type = "success", duration = 3000) {
    notification.textContent = message;
    notification.className = `notification notification-${type}`;

    // Set icon based on type
    const icon = document.createElement("i");
    switch (type) {
      case "success":
        icon.className = "fas fa-check-circle";
        break;
      case "error":
        icon.className = "fas fa-exclamation-circle";
        break;
      case "warning":
        icon.className = "fas fa-exclamation-triangle";
        break;
    }

    notification.textContent = "";
    notification.appendChild(icon);
    notification.appendChild(document.createTextNode(message));

    notification.classList.add("show");

    setTimeout(() => {
      notification.classList.remove("show");
    }, duration);
  }

  // Range slider synchronization
  function syncLineWrapElements() {
    const value = lineWrap.value;
    lineWrapRange.value = value;
    lineWrapValue.textContent = value;

    // Update preview if needed
  }

  lineWrap.addEventListener("input", syncLineWrapElements);
  lineWrapRange.addEventListener("input", function () {
    lineWrap.value = this.value;
    lineWrapValue.textContent = this.value;
  });

  // Load saved settings
  function loadSettings() {
    chrome.storage.sync.get(
      [
        "indentSize",
        "quoteStyle",
        "lineWrap",
        "theme",
        "wrapLines",
        "fontSize",
      ],
      function (result) {
        if (chrome.runtime.lastError) {
          console.warn(
            "[Code Formatter] Storage load error:",
            chrome.runtime.lastError.message,
          );
          showNotification("Failed to load settings", "error");
          return;
        }

        // Apply loaded settings or defaults
        indentSize.value = result.indentSize || defaultSettings.indentSize;
        quoteStyle.value = result.quoteStyle || defaultSettings.quoteStyle;
        lineWrap.value = result.lineWrap || defaultSettings.lineWrap;
        theme.value = result.theme || defaultSettings.theme;
        wrapLines.checked =
          result.wrapLines !== undefined
            ? result.wrapLines
            : defaultSettings.wrapLines;
        fontSize.value = result.fontSize || defaultSettings.fontSize;

        syncLineWrapElements();

        showNotification("Settings loaded successfully", "success", 2000);
      },
    );
  }

  // Update preview based on settings

  // Event listeners for real-time preview updates

  // Save settings
  saveBtn.addEventListener("click", function (e) {
    e.preventDefault();

    const lineWrapValue = parseInt(lineWrap.value, 10);
    if (isNaN(lineWrapValue) || lineWrapValue < 40 || lineWrapValue > 200) {
      showNotification(
        "Line wrap must be between 40 and 200 characters",
        "error",
      );
      lineWrap.focus();
      return;
    }

    const settings = {
      indentSize: indentSize.value,
      quoteStyle: quoteStyle.value,
      lineWrap: lineWrapValue,
      theme: theme.value,
      wrapLines: wrapLines.checked,
      fontSize: fontSize.value,
    };

    chrome.storage.sync.set(settings, function () {
      if (chrome.runtime.lastError) {
        console.warn(
          "[Code Formatter] Storage save error:",
          chrome.runtime.lastError.message,
        );
        showNotification("Failed to save settings", "error");
        return;
      }

      showNotification("Settings saved successfully!", "success");
    });
  });

  // Reset to defaults
  resetBtn.addEventListener("click", function (e) {
    e.preventDefault();

    if (!confirm("Are you sure you want to reset all settings to defaults?")) {
      return;
    }

    indentSize.value = defaultSettings.indentSize;
    quoteStyle.value = defaultSettings.quoteStyle;
    lineWrap.value = defaultSettings.lineWrap;
    theme.value = defaultSettings.theme;
    wrapLines.checked = defaultSettings.wrapLines;
    fontSize.value = defaultSettings.fontSize;

    syncLineWrapElements();

    chrome.storage.sync.set(defaultSettings, function () {
      if (chrome.runtime.lastError) {
        console.warn(
          "[Code Formatter] Storage reset error:",
          chrome.runtime.lastError.message,
        );
        return;
      }

      showNotification("Settings reset to defaults", "success");
    });
  });

  // Form validation for line wrap input
  lineWrap.addEventListener("blur", function () {
    const value = parseInt(this.value, 10);
    if (isNaN(value) || value < 40 || value > 200) {
      showNotification("Line wrap must be between 40-200", "warning");
      this.value = Math.max(40, Math.min(200, value || 80));
      syncLineWrapElements();
    }
  });

  // Initialize
  loadSettings();

  // Add keyboard shortcuts
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveBtn.click();
    }

    if (
      e.key === "Escape" &&
      document.activeElement.tagName !== "INPUT" &&
      document.activeElement.tagName !== "SELECT" &&
      document.activeElement.tagName !== "TEXTAREA"
    ) {
      resetBtn.focus();
    }
  });

  // Accessibility improvements
  const formControls = [
    indentSize,
    quoteStyle,
    lineWrap,
    theme,
    wrapLines,
    fontSize,
  ];
  formControls.forEach((control) => {
    control.addEventListener("focus", function () {
      this.parentElement.style.borderLeft = `3px solid var(--primary-color)`;
      this.parentElement.style.paddingLeft = "0.75rem";
    });
    control.addEventListener("blur", function () {
      this.parentElement.style.borderLeft = "";
      this.parentElement.style.paddingLeft = "";
    });
  });
});

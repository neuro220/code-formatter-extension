import type { ToastType, ToastOptions } from "./types";

const TOAST_FADE_IN_DURATION = 300;
const TOAST_DEFAULT_DURATION = 3000;

const TOAST_COLORS: Record<ToastType, string> = {
  error: "#e53935",
  success: "#43a047",
  info: "#333",
  warning: "#ff9800",
};

let toastStylesInjected = false;

function injectToastStyles(): void {
  if (toastStylesInjected) return;
  const style = document.createElement("style");
  style.id = "code-formatter-toast-styles";
  style.textContent = `
    @keyframes code-formatter-fadeIn { 
      from { opacity: 0; transform: translateX(-50%) translateY(20px); } 
      to { opacity: 1; transform: translateX(-50%) translateY(0); } 
    }
    @keyframes code-formatter-fadeOut { 
      from { opacity: 1; } 
      to { opacity: 0; } 
    }
  `;
  document.head.appendChild(style);
  toastStylesInjected = true;
}

export function showToast(
  message: string,
  type: ToastType = "info",
  duration: number = TOAST_DEFAULT_DURATION,
): void {
  injectToastStyles();

  const toast = document.createElement("div");
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    background: ${TOAST_COLORS[type]};
    color: white;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: code-formatter-fadeIn ${TOAST_FADE_IN_DURATION}ms ease;
  `;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = `code-formatter-fadeOut ${TOAST_FADE_IN_DURATION}ms ease`;
    setTimeout(() => toast.remove(), TOAST_FADE_IN_DURATION);
  }, duration);
}

export function showSuccess(message: string): void {
  showToast(message, "success");
}

export function showError(message: string): void {
  showToast(message, "error");
}

export function showInfo(message: string): void {
  showToast(message, "info");
}

export function showWarning(message: string): void {
  showToast(message, "warning");
}

export function showToastWithOptions(options: ToastOptions): void {
  showToast(options.message, options.type ?? "info", options.duration);
}

export function isDark() {
  return typeof document !== "undefined" && document.documentElement.dataset.theme === "dark";
}

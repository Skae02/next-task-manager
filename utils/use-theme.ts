"use client";

import { useSyncExternalStore } from "react";
import { isDark } from "@/utils/theme";

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("tm_theme"); } catch { /* Storage may be blocked. */ }
    document.documentElement.dataset.theme = saved === "light" || saved === "dark"
      ? saved : media.matches ? "dark" : "light";
    onChange();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === "tm_theme" || event.key === null) sync();
  };
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  media.addEventListener("change", sync);
  window.addEventListener("storage", onStorage);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", sync);
    window.removeEventListener("storage", onStorage);
  };
}

function getServerSnapshot() {
  return false;
}

/** Reactively read the theme, using the same initial value during SSR and hydration. */
export function useIsDark() {
  return useSyncExternalStore(subscribe, isDark, getServerSnapshot);
}

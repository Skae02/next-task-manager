"use client";

import { MoonIcon, SunIcon } from "@/components/icons";
import { Button } from "@/components/ui";
import { isDark } from "@/utils/theme";
import { useIsDark } from "@/utils/use-theme";

export function ThemeToggle() {
  const dark = useIsDark();
  const label = dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro";
  const toggle = () => {
    const theme = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("tm_theme", theme); } catch { /* Keep the current tab usable. */ }
  };
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={label} title={label}>
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}

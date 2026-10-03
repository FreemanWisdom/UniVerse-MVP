"use client";

import { useCallback, useSyncExternalStore } from "react";
import { IconSun, IconMoon } from "@/components/icons";
import { Button } from "@/components/ui/button";

export const THEME_STORAGE_KEY = "universe-theme";
export type ThemeChoice = "light" | "dark";

const THEME_CHANGE_EVENT = "universe:theme-changed";

function readStoredTheme(): ThemeChoice {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function subscribeToTheme(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Appearance settings: light/dark theme switcher. The choice is persisted to
 * localStorage ("universe-theme") and applied by toggling the "light" class on
 * <html>. The pre-paint script in src/app/layout.tsx re-applies it on load.
 */
export function ThemeSettings() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    readStoredTheme,
    () => "dark" as ThemeChoice
  );

  const choose = useCallback((next: ThemeChoice) => {
    document.documentElement.classList.toggle("light", next === "light");
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode): theme applies for this session only.
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  return (
    <div className="rounded-lg border border-surface-200 bg-surface-100/70 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Theme</p>
          <p className="text-xs text-slate-400">
            {theme === "light" ? "Light mode is on" : "Dark mode is on"} · saved on this device
          </p>
        </div>
        <div
          className="flex gap-1 rounded-lg border border-surface-200 bg-surface-100 p-1"
          role="group"
          aria-label="Theme"
        >
          <Button
            type="button"
            variant={theme === "light" ? "default" : "ghost"}
            size="sm"
            onClick={() => choose("light")}
            aria-pressed={theme === "light"}
            className="min-h-[36px] text-xs"
          >
            <IconSun size={14} className="mr-1 inline-block align-[-2px]" /> Light
          </Button>
          <Button
            type="button"
            variant={theme === "dark" ? "default" : "ghost"}
            size="sm"
            onClick={() => choose("dark")}
            aria-pressed={theme === "dark"}
            className="min-h-[36px] text-xs"
          >
            <IconMoon size={14} className="mr-1 inline-block align-[-2px]" /> Dark
          </Button>
        </div>
      </div>
    </div>
  );
}

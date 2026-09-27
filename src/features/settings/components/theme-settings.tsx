"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Appearance</CardTitle>
        <CardDescription>Choose how UniVerse looks on this device</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Theme</p>
            <p className="text-xs text-slate-400">Switch between light and dark mode</p>
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
              className="text-xs"
            >
              ☀️ Light
            </Button>
            <Button
              type="button"
              variant={theme === "dark" ? "default" : "ghost"}
              size="sm"
              onClick={() => choose("dark")}
              aria-pressed={theme === "dark"}
              className="text-xs"
            >
              🌙 Dark
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Your choice is saved on this device and applies every time you open UniVerse.
        </p>
      </CardContent>
    </Card>
  );
}

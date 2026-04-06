"use client";

import { useEffect, useMemo, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "podat-theme-preference";
export const THEME_EVENT = "podat-theme-change";

const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const readThemePreference = (): ThemePreference => {
  if (typeof document === "undefined") return "system";
  const preference = document.documentElement.dataset.themePreference;
  return preference === "light" || preference === "dark" || preference === "system"
    ? preference
    : "system";
};

const readResolvedTheme = (): ResolvedTheme => {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.themeResolved === "dark" ? "dark" : "light";
};

export const applyThemePreference = (preference: ThemePreference) => {
  if (typeof document === "undefined") return;

  const resolvedTheme = preference === "system" ? getSystemTheme() : preference;
  const root = document.documentElement;

  root.dataset.themePreference = preference;
  root.dataset.themeResolved = resolvedTheme;
  root.style.colorScheme = resolvedTheme;

  window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  window.dispatchEvent(
    new CustomEvent(THEME_EVENT, {
      detail: { preference, resolvedTheme },
    })
  );
};

export function useTheme() {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const syncFromDom = () => {
      setThemePreferenceState(readThemePreference());
      setResolvedTheme(readResolvedTheme());
    };

    syncFromDom();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeEvent = () => syncFromDom();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        syncFromDom();
      }
    };
    const handleMediaChange = () => {
      if (readThemePreference() === "system") {
        applyThemePreference("system");
      }
    };

    window.addEventListener(THEME_EVENT, handleThemeEvent);
    window.addEventListener("storage", handleStorage);
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      window.removeEventListener(THEME_EVENT, handleThemeEvent);
      window.removeEventListener("storage", handleStorage);
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  const setThemePreference = (preference: ThemePreference) => {
    applyThemePreference(preference);
    setThemePreferenceState(preference);
    setResolvedTheme(preference === "system" ? getSystemTheme() : preference);
  };

  return useMemo(
    () => ({
      themePreference,
      resolvedTheme,
      setThemePreference,
    }),
    [resolvedTheme, themePreference]
  );
}

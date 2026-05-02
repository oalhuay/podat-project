"use client";

import Image from "next/image";
import { useTheme } from "@/app/hooks/useTheme";

type ThemeToggleProps = {
  compact?: boolean;
};

export default function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { resolvedTheme, setThemePreference } = useTheme();
  const isDark = resolvedTheme === "dark";
  const toggleTheme = () => setThemePreference(isDark ? "light" : "dark");

  return (
    <div
      className={`theme-shell inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-slate-50/90 p-1.5 ${
        compact ? "" : "shadow-sm shadow-slate-200/50"
      }`}
      aria-label={`Tema actual: ${isDark ? "oscuro" : "claro"}`}
    >
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Modo claro"
        title="Modo claro"
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 ${
          !isDark
            ? "bg-[#5D9AD4]/14 text-[#3D73A7] shadow-sm shadow-[#5D9AD4]/20"
            : "text-slate-300 opacity-85 hover:bg-slate-100/10 hover:text-slate-100"
        }`}
      >
        <Image
          src="/sun-shape-svgrepo-com.svg"
          alt=""
          aria-hidden="true"
          width={18}
          height={18}
          className={`h-[18px] w-[18px] ${
            !isDark
              ? "opacity-95 [filter:brightness(0)_saturate(100%)_invert(48%)_sepia(31%)_saturate(952%)_hue-rotate(174deg)_brightness(93%)_contrast(88%)]"
              : "opacity-90 [filter:brightness(0)_saturate(100%)_invert(88%)_sepia(7%)_saturate(552%)_hue-rotate(176deg)_brightness(98%)_contrast(93%)]"
          }`}
        />
      </button>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Modo oscuro"
        title="Modo oscuro"
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 ${
          isDark
            ? "bg-[#5D9AD4]/20 text-[#D7E8FA] shadow-sm shadow-[#5D9AD4]/20"
            : "text-[#5D86B8] opacity-80 hover:bg-[#5D9AD4]/10 hover:text-[#3D73A7]"
        }`}
      >
        <Image
          src="/moon-svgrepo-com.svg"
          alt=""
          aria-hidden="true"
          width={18}
          height={18}
          className={`h-[18px] w-[18px] ${
            isDark
              ? "opacity-95 [filter:brightness(0)_saturate(100%)_invert(92%)_sepia(11%)_saturate(739%)_hue-rotate(178deg)_brightness(101%)_contrast(95%)]"
              : "opacity-90 [filter:brightness(0)_saturate(100%)_invert(50%)_sepia(23%)_saturate(880%)_hue-rotate(174deg)_brightness(92%)_contrast(90%)]"
          }`}
        />
      </button>
    </div>
  );
}

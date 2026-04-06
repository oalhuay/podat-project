"use client";

import { useTheme, type ThemePreference } from "@/app/hooks/useTheme";

const OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Automático" },
];

type ThemeToggleProps = {
  compact?: boolean;
};

export default function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { themePreference, resolvedTheme, setThemePreference } = useTheme();

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white/80 p-2 theme-shell ${
        compact ? "" : "shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-2 pb-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Tema
          </div>
          {!compact && (
            <div className="mt-1 text-xs font-medium text-slate-500">
              Activo: {resolvedTheme === "dark" ? "Oscuro" : "Claro"}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => {
          const isActive = option.value === themePreference;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setThemePreference(option.value)}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                isActive
                  ? "bg-[#5D9AD4] text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

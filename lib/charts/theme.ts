import type { ResolvedTheme } from "@/app/hooks/useTheme";

export const getChartPalette = (theme: ResolvedTheme) => {
  if (theme === "dark") {
    return {
      text: "#dbe4f2",
      mutedText: "#93a4bc",
      grid: "rgba(148, 163, 184, 0.18)",
      border: "rgba(148, 163, 184, 0.24)",
      surface: "rgba(15, 23, 42, 0.35)",
    };
  }

  return {
    text: "#0f172a",
    mutedText: "#64748b",
    grid: "rgba(148, 163, 184, 0.24)",
    border: "rgba(148, 163, 184, 0.3)",
    surface: "rgba(255, 255, 255, 1)",
  };
};

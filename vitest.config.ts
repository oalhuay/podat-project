import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "lib/notas/rules.ts",
        "lib/asistencia/rules.ts",
        "lib/import/alumnos/*.ts",
        "lib/import/estadisticas/parseExcel.ts",
        "components/admin/ImportResults.tsx",
      ],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "types/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

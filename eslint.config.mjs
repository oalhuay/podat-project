import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // EE-R01: No permitir variables declaradas y no utilizadas.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // EE-R02: No permitir console.log, console.warn o console.error.
      "no-console": "error",

      // EE-R03: Exigir comparaciones estrictas con === y !==.
      eqeqeq: ["error", "always"],

      // EE-R04: No permitir imports duplicados.
      "no-duplicate-imports": "error",

      // EE-R05: No permitir expresiones sin efecto en el código.
      "no-unused-expressions": "error",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "node_modules/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

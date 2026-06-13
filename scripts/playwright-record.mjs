/* eslint-disable no-console */

import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

import {
  preparePlaywrightAuth,
  storageStatePath,
} from "./playwright-auth.mjs";

const hasFile = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const injectedSession = await preparePlaywrightAuth();
if (!injectedSession && !(await hasFile(storageStatePath))) {
  console.error(
    [
      "No existe una sesion de Playwright.",
      "Ejecuta primero: npm.cmd run test:ui:login",
      "O completa .env.playwright.local antes de abrir el grabador.",
    ].join("\n")
  );
  process.exit(1);
}

const playwrightExecutable =
  process.platform === "win32"
    ? path.resolve("node_modules", ".bin", "playwright.cmd")
    : path.resolve("node_modules", ".bin", "playwright");

const recorder = spawn(
  playwrightExecutable,
  [
    "codegen",
    "--target=playwright-test",
    `--load-storage=${storageStatePath}`,
    "https://podat-project.vercel.app",
  ],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  }
);

recorder.on("exit", (code) => {
  process.exitCode = code ?? 0;
});

/* eslint-disable no-console */

import { execFileSync } from "node:child_process";

if (process.platform !== "win32") {
  console.error("El modo portapapeles esta preparado para Windows.");
  process.exit(1);
}

const credential = execFileSync(
  "powershell.exe",
  ["-NoProfile", "-Command", "Get-Clipboard -Raw"],
  {
    encoding: "utf8",
    windowsHide: true,
  }
).trim();

if (!credential) {
  console.error("El portapapeles esta vacio.");
  process.exit(1);
}

process.env.PLAYWRIGHT_SUPABASE_CREDENTIAL = credential;
await import("./playwright-record.mjs");

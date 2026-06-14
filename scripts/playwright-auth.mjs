/* eslint-disable no-console */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const authDirectory = path.join(projectDirectory, "playwright", ".auth");
const storageStatePath = path.join(authDirectory, "user.json");
const sessionStorageKey = "podat-backend-session";
const defaultBackendUrl = "https://podat-backend.vercel.app";
const frontendOrigins = [
  "https://podat-project.vercel.app",
  "https://podat-app.vercel.app",
];

const parseEnvFile = (content) =>
  Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator).trim();
        const value = line
          .slice(separator + 1)
          .trim()
          .replace(/^(['"])(.*)\1$/, "$2");
        return [key, value];
      })
  );

const loadLocalEnvironment = async () => {
  const environment = {};
  for (const fileName of [".env.local", ".env.playwright.local"]) {
    try {
      Object.assign(
        environment,
        parseEnvFile(
          await readFile(path.join(projectDirectory, fileName), "utf8")
        )
      );
    } catch {
      // Each local file is optional.
    }
  }
  return environment;
};

const firstNonEmpty = (...values) =>
  values.find((value) => typeof value === "string" && value.trim() !== "");

const decodeJwtPayload = (token) => {
  const payload = token.split(".")[1];
  if (!payload) {
    throw new Error("PLAYWRIGHT_ACCESS_TOKEN no tiene formato JWT.");
  }
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
};

const decodeLegacyCookie = (encodedCookie) => {
  const normalizedCookie = encodedCookie.trim();
  if (!normalizedCookie.startsWith("base64-")) {
    throw new Error("La cookie copiada no comienza con base64-.");
  }

  try {
    return JSON.parse(
      Buffer.from(normalizedCookie.slice("base64-".length), "base64url").toString(
        "utf8"
      )
    );
  } catch {
    throw new Error("No se pudo decodificar la cookie de sesion.");
  }
};

export const parseSupabaseCredential = (rawCredential) => {
  const credential = rawCredential.trim();
  if (!credential) {
    throw new Error("No se proporciono ninguna credencial.");
  }

  if (credential.split(".").length === 3 && credential.startsWith("ey")) {
    return { accessToken: credential, refreshToken: "" };
  }

  if (credential.startsWith("{")) {
    try {
      const session = JSON.parse(credential);
      return {
        accessToken: session.access_token ?? "",
        refreshToken: session.refresh_token ?? "",
      };
    } catch {
      throw new Error("El JSON de sesion no es valido.");
    }
  }

  const cookieParts = Array.from(
    credential.matchAll(
      /sb-[\w-]+-auth-token(?:\.(\d+))?\s*(?:=|\(|\s)\s*([A-Za-z0-9_-]+)\)?/g
    )
  );
  if (cookieParts.length > 0) {
    const joinedCookie = cookieParts
      .sort((left, right) => Number(left[1] ?? 0) - Number(right[1] ?? 0))
      .map((part) => part[2])
      .join("");
    const session = decodeLegacyCookie(joinedCookie);
    return {
      accessToken: session.access_token ?? "",
      refreshToken: session.refresh_token ?? "",
    };
  }

  if (credential.startsWith("base64-")) {
    const session = decodeLegacyCookie(credential);
    return {
      accessToken: session.access_token ?? "",
      refreshToken: session.refresh_token ?? "",
    };
  }

  throw new Error(
    "La credencial no es un JWT, un JSON de sesion ni una cookie compatible."
  );
};

const backendRequest = async (backendUrl, pathName, init = {}) => {
  const response = await fetch(`${backendUrl}${pathName}`, init);
  if (!response.ok) {
    throw new Error(
      `El backend rechazo la sesion con estado ${response.status}.`
    );
  }
  return response.status === 204 ? null : response.json();
};

const resolveSession = async ({
  backendUrl,
  accessToken,
  refreshToken,
}) => {
  if (refreshToken) {
    return backendRequest(backendUrl, "/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  const payload = decodeJwtPayload(accessToken);
  const expiresAt = Number(payload.exp);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    throw new Error(
      "El access token vencio. Proporciona tambien PLAYWRIGHT_REFRESH_TOKEN."
    );
  }

  const authState = await backendRequest(backendUrl, "/api/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return {
    access_token: accessToken,
    refresh_token: "",
    token_type: "bearer",
    expires_in: expiresAt - now,
    expires_at: expiresAt,
    user: authState.user,
  };
};

export const preparePlaywrightAuth = async () => {
  const localEnvironment = await loadLocalEnvironment();
  const backendUrl = (
    firstNonEmpty(
      process.env.NEXT_PUBLIC_API_URL,
      localEnvironment.NEXT_PUBLIC_API_URL
    ) ?? defaultBackendUrl
  ).replace(/\/+$/, "");
  const accessToken = firstNonEmpty(
    process.env.PLAYWRIGHT_ACCESS_TOKEN,
    localEnvironment.PLAYWRIGHT_ACCESS_TOKEN
  );
  const refreshToken = firstNonEmpty(
    process.env.PLAYWRIGHT_REFRESH_TOKEN,
    localEnvironment.PLAYWRIGHT_REFRESH_TOKEN
  );
  const cookieZero = firstNonEmpty(
    process.env.PLAYWRIGHT_SUPABASE_COOKIE_0,
    localEnvironment.PLAYWRIGHT_SUPABASE_COOKIE_0
  );
  const cookieOne = firstNonEmpty(
    process.env.PLAYWRIGHT_SUPABASE_COOKIE_1,
    localEnvironment.PLAYWRIGHT_SUPABASE_COOKIE_1
  );
  const encodedCredential =
    firstNonEmpty(
      process.env.PLAYWRIGHT_SUPABASE_CREDENTIAL,
      localEnvironment.PLAYWRIGHT_SUPABASE_CREDENTIAL
    ) ??
    (cookieZero
      ? [
          `sb-project-auth-token.0=${cookieZero}`,
          cookieOne ? `sb-project-auth-token.1=${cookieOne}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : undefined);

  if (!accessToken && !encodedCredential) {
    return false;
  }

  const parsedCredential = encodedCredential
    ? parseSupabaseCredential(encodedCredential)
    : { accessToken, refreshToken: refreshToken ?? "" };
  if (!parsedCredential.accessToken) {
    throw new Error("La sesion no contiene un access token.");
  }

  const session = await resolveSession({
    backendUrl,
    accessToken: parsedCredential.accessToken,
    refreshToken: refreshToken || parsedCredential.refreshToken,
  });
  const rawSession = JSON.stringify(session);
  const storageState = {
    cookies: [],
    origins: frontendOrigins.map((origin) => ({
      origin,
      localStorage: [{ name: sessionStorageKey, value: rawSession }],
    })),
  };

  await mkdir(authDirectory, { recursive: true });
  await writeFile(storageStatePath, JSON.stringify(storageState, null, 2));
  console.log(
    `Sesion de Playwright preparada para ${session.user?.email ?? session.user?.id ?? "el usuario"}.`
  );
  return true;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  preparePlaywrightAuth().catch((error) => {
    console.error(`No se pudo preparar la sesion: ${error.message}`);
    process.exitCode = 1;
  });
}

export { storageStatePath };

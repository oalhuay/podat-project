/* eslint-disable no-console */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const authDirectory = path.join(projectDirectory, "playwright", ".auth");
const storageStatePath = path.join(authDirectory, "user.json");
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

const decodeSupabaseCookie = (encodedCookie) => {
  const normalizedCookie = encodedCookie.trim();
  if (!normalizedCookie.startsWith("base64-")) {
    throw new Error("La cookie de Supabase no comienza con base64-.");
  }

  try {
    return JSON.parse(
      Buffer.from(normalizedCookie.slice("base64-".length), "base64url").toString(
        "utf8"
      )
    );
  } catch {
    throw new Error("No se pudo decodificar la cookie de sesion de Supabase.");
  }
};

export const parseSupabaseCredential = (rawCredential) => {
  const credential = rawCredential.trim();
  if (!credential) {
    throw new Error("No se proporciono ninguna credencial.");
  }

  if (credential.split(".").length === 3 && credential.startsWith("ey")) {
    return {
      accessToken: credential,
      refreshToken: "",
    };
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
    const session = decodeSupabaseCookie(joinedCookie);
    return {
      accessToken: session.access_token ?? "",
      refreshToken: session.refresh_token ?? "",
    };
  }

  if (credential.startsWith("base64-")) {
    const session = decodeSupabaseCookie(credential);
    return {
      accessToken: session.access_token ?? "",
      refreshToken: session.refresh_token ?? "",
    };
  }

  throw new Error(
    "La credencial no es un JWT, un JSON de sesion ni una cookie de Supabase."
  );
};

const createCookieChunks = (name, value, chunkSize = 3180) => {
  if (encodeURIComponent(value).length <= chunkSize) {
    return [{ name, value }];
  }

  const chunks = [];
  for (let offset = 0; offset < value.length; offset += chunkSize) {
    chunks.push({
      name: `${name}.${chunks.length}`,
      value: value.slice(offset, offset + chunkSize),
    });
  }
  return chunks;
};

const validateAccessToken = async (supabaseUrl, supabaseAnonKey, accessToken) => {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Supabase rechazo el access token con estado ${response.status}.`
    );
  }

  return response.json();
};

const resolveSession = async ({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  refreshToken,
}) => {
  if (refreshToken) {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    const { data, error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new Error(error?.message ?? "Supabase no pudo crear la sesion.");
    }

    return data.session;
  }

  const payload = decodeJwtPayload(accessToken);
  const expiresAt = Number(payload.exp);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    throw new Error(
      "El access token vencio. Proporciona tambien PLAYWRIGHT_REFRESH_TOKEN."
    );
  }

  const user = await validateAccessToken(
    supabaseUrl,
    supabaseAnonKey,
    accessToken
  );

  return {
    access_token: accessToken,
    refresh_token: "",
    token_type: "bearer",
    expires_in: expiresAt - now,
    expires_at: expiresAt,
    user,
  };
};

export const preparePlaywrightAuth = async () => {
  const localEnvironment = await loadLocalEnvironment();
  const supabaseUrl = firstNonEmpty(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    localEnvironment.NEXT_PUBLIC_SUPABASE_URL
  );
  const supabaseAnonKey = firstNonEmpty(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    localEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
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
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const parsedCredential = encodedCredential
    ? parseSupabaseCredential(encodedCredential)
    : { accessToken, refreshToken: refreshToken ?? "" };
  if (!parsedCredential.accessToken) {
    throw new Error("La sesion no contiene un access token.");
  }

  const session = await resolveSession({
    supabaseUrl,
    supabaseAnonKey,
    accessToken: parsedCredential.accessToken,
    refreshToken: refreshToken || parsedCredential.refreshToken,
  });
  const projectReference = new URL(supabaseUrl).hostname.split(".")[0];
  const storageKey = `sb-${projectReference}-auth-token`;
  const rawSession = JSON.stringify(session);
  const encodedSession = `base64-${Buffer.from(rawSession).toString(
    "base64url"
  )}`;
  const cookieChunks = createCookieChunks(storageKey, encodedSession);
  const cookieExpires = Math.floor(Date.now() / 1000) + 400 * 24 * 60 * 60;

  const storageState = {
    cookies: frontendOrigins.flatMap((origin) => {
      const domain = new URL(origin).hostname;
      return cookieChunks.map(({ name, value }) => ({
        name,
        value,
        domain,
        path: "/",
        expires: cookieExpires,
        httpOnly: false,
        secure: true,
        sameSite: "Lax",
      }));
    }),
    origins: frontendOrigins.map((origin) => ({
      origin,
      localStorage: [
        {
          name: storageKey,
          value: rawSession,
        },
      ],
    })),
  };

  await mkdir(authDirectory, { recursive: true });
  await writeFile(storageStatePath, JSON.stringify(storageState, null, 2));
  console.log(
    `Sesion de Playwright preparada para ${session.user.email ?? session.user.id}.`
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

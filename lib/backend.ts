import {
  clearStoredSession,
  getStoredSession,
  isSessionExpiring,
  storeSession,
} from "@/lib/auth/session";
import type { AuthSession } from "@/types/auth";

const DEFAULT_BACKEND_URL = "https://podat-backend.vercel.app";

export const backendUrl = (
  process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_BACKEND_URL
).replace(/\/+$/, "");

type BackendError = {
  detail?: string | Array<{ msg?: string }>;
};

const errorMessageFromResponse = async (response: Response): Promise<string> => {
  let message = `El backend respondio con estado ${response.status}.`;
  try {
    const body = (await response.json()) as BackendError;
    if (typeof body.detail === "string") {
      message = body.detail;
    } else if (Array.isArray(body.detail)) {
      message = body.detail
        .map((item) => item.msg)
        .filter(Boolean)
        .join(" ");
    }
  } catch {
    // The status code still provides a useful fallback error.
  }
  return message;
};

const readResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(await errorMessageFromResponse(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
};

export const publicBackendFetch = async <T>(
  path: string,
  init: RequestInit = {}
): Promise<T> => {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers,
  });
  return readResponse<T>(response);
};

let refreshPromise: Promise<AuthSession> | null = null;

export const refreshBackendSession = async (): Promise<AuthSession> => {
  if (refreshPromise) return refreshPromise;

  const session = getStoredSession();
  if (!session?.refresh_token) {
    throw new Error("No hay una sesion valida para renovar.");
  }

  refreshPromise = publicBackendFetch<AuthSession>("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  })
    .then((nextSession) => {
      storeSession(nextSession);
      return nextSession;
    })
    .catch((error) => {
      clearStoredSession();
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

const validSession = async (): Promise<AuthSession> => {
  const session = getStoredSession();
  if (!session?.access_token) {
    throw new Error("No hay una sesion valida para consultar el backend.");
  }
  if (isSessionExpiring(session)) {
    return refreshBackendSession();
  }
  return session;
};

export const backendFetch = async <T>(
  path: string,
  init: RequestInit = {}
): Promise<T> => {
  let session = await validSession();

  const execute = async () => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(`${backendUrl}${path}`, {
      ...init,
      headers,
    });
  };

  let response = await execute();
  if (response.status === 401 && session.refresh_token) {
    session = await refreshBackendSession();
    response = await execute();
  }

  return readResponse<T>(response);
};

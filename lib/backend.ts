import { supabase } from "@/lib/supabase";

const DEFAULT_BACKEND_URL = "https://podat-backend.vercel.app";

const backendUrl = (
  process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_BACKEND_URL
).replace(/\/+$/, "");

type BackendError = {
  detail?: string;
};

export const backendFetch = async <T>(
  path: string,
  init: RequestInit = {}
): Promise<T> => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error("No hay una sesion valida para consultar el backend.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `El backend respondio con estado ${response.status}.`;
    try {
      const body = (await response.json()) as BackendError;
      if (body.detail) {
        message = body.detail;
      }
    } catch {
      // The status code still provides a useful fallback error.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
};

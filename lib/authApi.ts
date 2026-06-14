import { backendFetch, backendUrl } from "@/lib/backend";
import { clearStoredSession, getStoredSession } from "@/lib/auth/session";
import type { AuthState, AuthUser } from "@/types/auth";
import type { Rol } from "@/types/database";

export const startGoogleOAuth = (role: Exclude<Rol, null>): void => {
  const params = new URLSearchParams({
    role,
    redirect_to: window.location.origin,
  });
  window.location.assign(`${backendUrl}/api/auth/oauth/google?${params.toString()}`);
};

export const bootstrapAuthSession = (role: Exclude<Rol, null>) =>
  backendFetch<AuthState>("/api/auth/bootstrap", {
    method: "POST",
    body: JSON.stringify({ role }),
  });

export const fetchAuthState = () => backendFetch<AuthState>("/api/auth/me");

export const updateAuthUser = (data: Record<string, unknown>) =>
  backendFetch<{ user: AuthUser }>("/api/auth/user", {
    method: "PATCH",
    body: JSON.stringify({ data }),
  });

export const signOutBackend = async (): Promise<void> => {
  const session = getStoredSession();
  try {
    if (session?.access_token) {
      await backendFetch<void>("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
    }
  } finally {
    clearStoredSession();
  }
};

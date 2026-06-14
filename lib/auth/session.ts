import type { AuthSession } from "@/types/auth";

const SESSION_STORAGE_KEY = "podat-backend-session";
export const AUTH_SESSION_CHANGED_EVENT = "podat-auth-session-changed";

const canUseStorage = () => typeof window !== "undefined";

export const getStoredSession = (): AuthSession | null => {
  if (!canUseStorage()) return null;

  try {
    const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawSession) return null;

    const session = JSON.parse(rawSession) as Partial<AuthSession>;
    if (!session.access_token || !session.refresh_token) {
      return null;
    }

    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: Number(session.expires_in ?? 3600),
      expires_at: session.expires_at ? Number(session.expires_at) : undefined,
      token_type: session.token_type ?? "bearer",
      user: session.user,
    };
  } catch {
    return null;
  }
};

export const storeSession = (session: AuthSession): void => {
  if (!canUseStorage()) return;

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
};

export const clearStoredSession = (): void => {
  if (!canUseStorage()) return;

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
};

export const isSessionExpiring = (
  session: AuthSession,
  thresholdSeconds = 30
): boolean => {
  if (!session.expires_at) return false;
  return session.expires_at <= Math.floor(Date.now() / 1000) + thresholdSeconds;
};

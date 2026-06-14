"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchAuthState,
  signOutBackend,
  startGoogleOAuth,
  updateAuthUser,
} from "@/lib/authApi";
import {
  AUTH_SESSION_CHANGED_EVENT,
  getStoredSession,
} from "@/lib/auth/session";
import type { AuthUser } from "@/types/auth";
import type { Perfil, Rol } from "@/types/database";

type AuthContextValue = {
  user: AuthUser | null;
  profile: Perfil | null;
  role: Rol;
  isLoadingAuth: boolean;
  isLoadingProfile: boolean;
  signInWithGoogle: (rol: Exclude<Rol, null>) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserMetadata: (data: Record<string, unknown>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Perfil | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const loadAuthState = useCallback(async () => {
    const session = getStoredSession();
    if (!session) {
      setUser(null);
      setProfile(null);
      setIsLoadingAuth(false);
      setIsLoadingProfile(false);
      return;
    }

    setIsLoadingProfile(true);
    try {
      const state = await fetchAuthState();
      setUser(state.user);
      setProfile(state.profile);
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoadingAuth(false);
      setIsLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAuthState();
    }, 0);

    const handleSessionChange = () => {
      void loadAuthState();
    };
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChange);
    window.addEventListener("storage", handleSessionChange);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChange);
      window.removeEventListener("storage", handleSessionChange);
    };
  }, [loadAuthState]);

  const refreshProfile = useCallback(async () => {
    await loadAuthState();
  }, [loadAuthState]);

  const signInWithGoogle = async (rol: Exclude<Rol, null>) => {
    startGoogleOAuth(rol);
  };

  const signOut = async () => {
    await signOutBackend();
    setUser(null);
    setProfile(null);
  };

  const updateUserMetadata = async (data: Record<string, unknown>) => {
    const result = await updateAuthUser(data);
    setUser(result.user);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      role: profile?.rol ?? null,
      isLoadingAuth,
      isLoadingProfile,
      signInWithGoogle,
      signOut,
      refreshProfile,
      updateUserMetadata,
    }),
    [
      isLoadingAuth,
      isLoadingProfile,
      profile,
      refreshProfile,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

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
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { isAuthSessionMissingError } from "@/lib/auth/isAuthSessionMissingError";
import { supabase } from "@/lib/supabase";
import type { Perfil, Rol } from "@/types/database";

type AuthContextValue = {
  user: User | null;
  profile: Perfil | null;
  role: Rol;
  isLoadingAuth: boolean;
  isLoadingProfile: boolean;
  signInWithGoogle: (rol: Exclude<Rol, null>) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const loadProfileForUser = async (userId: string): Promise<Perfil | null> => {
  const { data, error } = await supabase
    .from("perfiles")
    .select("id, correo, rol, last_login_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Perfil | null) ?? null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Perfil | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const syncUserState = async (nextUser: User | null) => {
      if (!isMounted) return;

      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setIsLoadingProfile(false);
        return;
      }

      setIsLoadingProfile(true);

      try {
        const nextProfile = await loadProfileForUser(nextUser.id);
        if (!isMounted) return;
        setProfile(nextProfile);
      } catch {
        if (!isMounted) return;
        setProfile(null);
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    const loadCurrentUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          if (isAuthSessionMissingError(error)) {
            await syncUserState(null);
            return;
          }
          throw error;
        }

        await syncUserState(data.user);
      } catch {
        if (isMounted) {
          await syncUserState(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAuth(false);
        }
      }
    };

    void loadCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        void syncUserState(session?.user ?? null);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      return;
    }

    setIsLoadingProfile(true);
    try {
      const nextProfile = await loadProfileForUser(user.id);
      setProfile(nextProfile);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user?.id]);

  const signInWithGoogle = async (rol: Exclude<Rol, null>) => {
    document.cookie = `podat_rol=${rol}; path=/; max-age=600; samesite=lax`;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?rol=${rol}`,
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
    }),
    [isLoadingAuth, isLoadingProfile, profile, refreshProfile, user]
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

"use client";

import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Rol } from "@/types/database";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error) {
        setUser(data.user);
      }
    };

    void loadCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async (rol: Exclude<Rol, null>) => {
    document.cookie = `podat_rol=${rol}; path=/; max-age=600; samesite=lax`;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?rol=${rol}`,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, signInWithGoogle, signOut };
};

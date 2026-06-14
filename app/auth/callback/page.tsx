"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { bootstrapAuthSession } from "@/lib/authApi";
import { storeSession } from "@/lib/auth/session";
import type { AuthSession } from "@/types/auth";
import type { Rol } from "@/types/database";

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Validando acceso...");

  useEffect(() => {
    const completeAuthentication = async () => {
      const roleParam = searchParams.get("rol");
      const role: Exclude<Rol, null> | null =
        roleParam === "admin" || roleParam === "docente" ? roleParam : null;
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const expiresIn = Number(hash.get("expires_in") ?? 3600);
      const authError = hash.get("error_description") ?? hash.get("error");

      if (authError || !role || !accessToken || !refreshToken) {
        const errorCode = authError ? "oauth_error" : "missing_session";
        window.location.replace(`/?auth_status=error&auth_error=${errorCode}`);
        return;
      }

      const session: AuthSession = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
        expires_at: Math.floor(Date.now() / 1000) + expiresIn,
        token_type: hash.get("token_type") ?? "bearer",
      };
      storeSession(session);

      try {
        setMessage("Preparando el perfil...");
        await bootstrapAuthSession(role);
        window.history.replaceState(null, "", window.location.pathname);
        window.location.replace(`/?auth_status=ok&rol=${role}`);
      } catch {
        window.location.replace("/?auth_status=error&auth_error=bootstrap_failed");
      }
    };

    void completeAuthentication();
  }, [searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <p className="rounded-2xl border border-slate-200 bg-white px-6 py-4 font-semibold text-slate-700 shadow-sm">
        {message}
      </p>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <p className="rounded-2xl border border-slate-200 bg-white px-6 py-4 font-semibold text-slate-700 shadow-sm">
            Preparando autenticacion...
          </p>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

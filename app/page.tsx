"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import BrandLogo from "@/components/brand/BrandLogo";
import HomeThemeTray from "@/components/home/HomeThemeTray";
import RoleAccessButton from "@/components/home/RoleAccessButton";
import SplashScreen from "@/components/system/SplashScreen";
import UserAvatarMenu from "@/components/UserAvatarMenu";
import type { Rol } from "@/types/database";

function HomeContent() {
  const router = useRouter();
  const { user, role, isLoadingProfile, signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const authStatus = searchParams.get("auth_status");
  const authError = searchParams.get("auth_error");
  const rolParam = searchParams.get("rol");
  const [rolPreferido, setRolPreferido] = useState<Rol>(
    rolParam === "admin" || rolParam === "docente" ? rolParam : null
  );

  const rolActual = role ?? rolPreferido;
  const isRegisteredUser = Boolean(user && rolActual);
  const hasAuthenticatedUser = Boolean(user);
  const shouldShowWelcome = !user;
  const titleText = shouldShowWelcome ? "Bienvenido a PODAT" : "Elija cómo desea continuar";
  const subtitleText = shouldShowWelcome
    ? "Inicie sesión con Google y acceda a su espacio de trabajo académico sin pasos adicionales."
    : "Su cuenta ya está autenticada. Solo falta definir el perfil con el que utilizará la plataforma.";

  useEffect(() => {
    if (!isRegisteredUser || isLoadingProfile) return;
    router.replace("/admin/estadisticas/dashboard");
  }, [isLoadingProfile, isRegisteredUser, router]);

  if (isLoadingProfile || isRegisteredUser) {
    return (
      <SplashScreen
        message={
          isRegisteredUser
            ? "Ingresando al panel principal"
            : "Esperando que el usuario inicie sesión"
        }
        overlay
      />
    );
  }

  const handleLogin = async (nextRol: Exclude<Rol, null>) => {
    setRolPreferido(null);
    await signInWithGoogle(nextRol);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 p-4">
      <HomeThemeTray />

      <div className="auth-shell relative w-full max-w-3xl rounded-2xl border border-slate-100 bg-white p-8 shadow-xl">
        {hasAuthenticatedUser && (
          <div className="absolute right-4 top-4 z-20">
            <UserAvatarMenu />
          </div>
        )}

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-sm">
            <BrandLogo stableRings className="brand-mark h-24 w-24" />
          </div>
          <h1 className="text-5xl font-black tracking-tight text-[#5D9AD4]">PODAT</h1>
          <p className="mt-2 text-xs font-bold tracking-widest text-slate-400">
            DATOS VIVOS, GESTIÓN INTELIGENTE
          </p>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold text-slate-700">{titleText}</h2>
          <p className="mt-2 text-sm text-slate-500">{subtitleText}</p>
        </div>

        {authStatus === "ok" && (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Acceso validado correctamente. Rol guardado: {rolParam}
          </p>
        )}

        {authStatus === "error" && (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Se produjo un error en el callback: {authError}
          </p>
        )}

        <div className="mb-8 space-y-4">
          <div className="auth-guided-panel rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,_rgba(93,154,212,0.08),_rgba(251,197,88,0.12))] p-5 text-left">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
              Acceso guiado
            </p>
            <p className="mt-3 text-base font-semibold text-slate-800">
              {shouldShowWelcome
                ? "Seleccione su perfil para registrarse e iniciar sesión con Google."
                : rolActual
                  ? "Su sesión ya está iniciada. Si lo desea, puede volver a ingresar con otro perfil."
                  : "Su sesión ya está iniciada. Solo falta definir el perfil con el que utilizará PODAT."}
            </p>
            <div className="auth-guided-note mt-4 rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm text-slate-600 shadow-sm">
              Si ya tiene una cuenta o si es su primera vez, el acceso funciona de la misma
              manera: seleccione un perfil y continúe con Google.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <RoleAccessButton
              accentClassName="border-[#5D9AD4] text-[#5D9AD4] hover:border-[#4C86BD]"
              badgeClassName="bg-[#5D9AD4]/12 text-[#3D73A7]"
              icon="D"
              title="Acceso Docente"
              roleLabel="docente"
              helperText="Ideal para ingresar si ya tiene una cuenta o si se registra por primera vez."
              onClick={() => void handleLogin("docente")}
            />

            <RoleAccessButton
              accentClassName="border-[#FBC558] text-[#C79110] hover:border-[#E0B03D]"
              badgeClassName="bg-[#FBC558]/16 text-[#A87800]"
              icon="A"
              title="Acceso Administrador"
              roleLabel="administrador"
              helperText="Utilice este acceso si administra usuarios, materias o importaciones globales."
              onClick={() => void handleLogin("admin")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<SplashScreen message="Cargando aplicación" overlay />}>
      <HomeContent />
    </Suspense>
  );
}

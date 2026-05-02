"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import ThemeToggle from "@/components/theme/ThemeToggle";
import SplashScreen from "@/components/system/SplashScreen";
import type { Rol } from "@/types/database";

function HomeContent() {
  const router = useRouter();
  const { user, role, isLoadingProfile, signInWithGoogle, signOut } = useAuth();
  const searchParams = useSearchParams();
  const authStatus = searchParams.get("auth_status");
  const authError = searchParams.get("auth_error");
  const rolParam = searchParams.get("rol");
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);
  const [rolPreferido, setRolPreferido] = useState<Rol>(
    rolParam === "admin" || rolParam === "docente" ? rolParam : null
  );
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);

  const profileName = useMemo<string>(() => {
    const metadata = user?.user_metadata;
    return (
      metadata?.full_name ??
      metadata?.name ??
      user?.email?.split("@")[0] ??
      "Usuario"
    );
  }, [user]);

  const profileEmail: string = user?.email ?? "Sin correo";
  const profileAvatar: string | null =
    user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null;
  const profileInitials = profileName
    .split(" ")
    .filter((word): word is string => Boolean(word))
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  useEffect(() => {
    if (!isAvatarMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!avatarMenuRef.current?.contains(event.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAvatarMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isAvatarMenuOpen]);

  const rolActual = role ?? rolPreferido;
  const isRegisteredUser = Boolean(user && rolActual);
  const hasAuthenticatedUser = Boolean(user);
  const shouldShowWelcome = !user;
  const titleText = shouldShowWelcome
    ? "Bienvenido a PODAT"
    : "Elige cómo quieres continuar";
  const subtitleText = shouldShowWelcome
    ? "Ingresa con Google y entra a tu espacio de trabajo académico sin pasos extra."
    : "Tu cuenta ya está autenticada. Solo falta definir el perfil con el que vas a usar la plataforma.";

  useEffect(() => {
    if (!isRegisteredUser || isLoadingProfile) return;

    const targetRoute = "/admin/estadisticas/dashboard";

    router.replace(targetRoute);
  }, [isLoadingProfile, isRegisteredUser, router]);

  if (isLoadingProfile || isRegisteredUser) {
    return <SplashScreen message="Entrando al panel principal" />;
  }

  const handleLogin = async (rol: Exclude<Rol, null>) => {
    setRolPreferido(null);
    await signInWithGoogle(rol);
  };

  const handleSignOut = async () => {
    setIsAvatarMenuOpen(false);
    setRolPreferido(null);
    await signOut();
  };

  const cardsDocente = [
    {
      title: "Mis Materias",
      description: "Consulta tus materias asignadas.",
      href: "/admin/mis-materias",
    },
    {
      title: "Cargar Notas",
      description: "Registra notas por evaluación y ausentes.",
      href: "/admin/notas",
    },
    {
      title: "Cargar Asistencia",
      description: "Marca presente, ausente o justificado.",
      href: "/admin/asistencias",
    },
  ];

  const cardsAdmin = [
    {
      title: "Gestión de Usuarios",
      description: "Administra roles y accesos.",
      href: "/admin/usuarios",
    },
    {
      title: "Materias",
      description: "Catálogo y asignaciones.",
      href: "/admin/materias",
    },
    {
      title: "Estadísticas",
      description: "Importa y visualiza indicadores.",
      href: "/admin/estadisticas",
    },
    {
      title: "Dashboard Estadístico",
      description: "Vista completa con todos los gráficos.",
      href: "/admin/estadisticas/dashboard",
    },
    {
      title: "Importar Alumnos",
      description: "Carga masiva desde Excel.",
      href: "/admin/importar",
    },
    {
      title: "Cargar Notas",
      description: "Registra notas por evaluación y ausentes.",
      href: "/admin/notas",
    },
    {
      title: "Cargar Asistencia",
      description: "Marca presente, ausente o justificado.",
      href: "/admin/asistencias",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute right-4 top-4 z-30 w-full max-w-[260px]">
        <ThemeToggle />
      </div>

      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 relative">
        {hasAuthenticatedUser && (
          <div ref={avatarMenuRef} className="absolute right-4 top-4 z-20">
            <button
              type="button"
              onClick={() => setIsAvatarMenuOpen((prev) => !prev)}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
              aria-haspopup="menu"
              aria-expanded={isAvatarMenuOpen}
              aria-label="Abrir menú de perfil"
            >
              {profileAvatar ? (
                // Google avatars are remote and not configured in next/image.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileAvatar}
                  alt={profileName}
                  className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5D9AD4] text-sm font-black text-white">
                  {profileInitials || "U"}
                </div>
              )}
              <div className="hidden text-left sm:block">
                <div className="max-w-32 truncate text-sm font-bold text-slate-900">
                  {profileName}
                </div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  {rolActual ?? "sin rol"}
                </div>
              </div>
            </button>

            {isAvatarMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-3 w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60"
              >
                <div className="bg-[linear-gradient(135deg,_rgba(93,154,212,0.14),_rgba(251,197,88,0.18))] p-4">
                  <div className="flex items-center gap-3">
                    {profileAvatar ? (
                      // Google avatars are remote and not configured in next/image.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profileAvatar}
                        alt={profileName}
                        className="h-12 w-12 rounded-full border border-white/80 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#5D9AD4] text-base font-black text-white">
                        {profileInitials || "U"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-slate-900">
                        {profileName}
                      </div>
                      <div className="truncate text-xs text-slate-600">
                        {profileEmail}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                      Rol activo
                    </div>
                    <div className="mt-1 text-sm font-semibold capitalize text-slate-800">
                      {rolActual ?? "Pendiente"}
                    </div>
                  </div>

                  <ThemeToggle compact />

                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
            <Image src="/logo-podat.svg" alt="PODAT" width={80} height={80} priority />
          </div>
          <h1 className="text-5xl font-black text-[#5D9AD4] tracking-tight">PODAT</h1>
          <p className="text-xs font-bold text-slate-400 mt-2 tracking-widest">
            DATOS VIVOS, GESTIÓN INTELIGENTE
          </p>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold text-slate-700">{titleText}</h2>
          <p className="mt-2 text-sm text-slate-500">{subtitleText}</p>
        </div>

        {authStatus === "ok" && (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Login OK. Rol guardado: {rolParam}
          </p>
        )}

        {authStatus === "error" && (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Error en callback: {authError}
          </p>
        )}

        <div className="mb-8 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,_rgba(93,154,212,0.08),_rgba(251,197,88,0.12))] p-5 text-left">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
              Acceso guiado
            </p>
            <p className="mt-3 text-base font-semibold text-slate-800">
              {shouldShowWelcome
                ? "Elige tu perfil para registrarte e ingresar con Google."
                : rolActual
                ? "Tu sesión ya está iniciada. Si quieres, puedes volver a ingresar con otro perfil."
                : "Tu sesión ya está iniciada. Solo falta definir el perfil con el que usarás PODAT."}
            </p>
          </div>

          <button
            onClick={() => void handleLogin("docente")}
            className="w-full flex items-center justify-center gap-3 border-2 border-[#5D9AD4] text-[#5D9AD4] hover:bg-[#5D9AD4] hover:text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span className="text-xl">📊</span>
            Registrarme como Docente
          </button>

          <button
            onClick={() => void handleLogin("admin")}
            className="w-full flex items-center justify-center gap-3 border-2 border-[#FBC558] text-[#FBC558] hover:bg-[#FBC558] hover:text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span className="text-xl">⚙️</span>
            Registrarme como Administrador
          </button>
        </div>

        {hasAuthenticatedUser && !rolActual && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-800">{profileName}</div>
            <div className="mt-1 text-sm text-slate-500">{profileEmail}</div>
          </div>
        )}

        {isRegisteredUser && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(rolActual === "admin" ? cardsAdmin : cardsDocente).map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-2xl border border-slate-200 p-5 bg-slate-50 hover:bg-white transition-colors shadow-sm hover:shadow-md"
              >
                <div className="text-lg font-black text-slate-900 group-hover:text-[#5D9AD4]">
                  {card.title}
                </div>
                <div className="text-sm text-slate-500 mt-2">{card.description}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={<SplashScreen message="Cargando aplicación" />}
    >
      <HomeContent />
    </Suspense>
  );
}

"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/app/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Rol } from "@/types/database";
import { useSearchParams } from "next/navigation";

function HomeContent() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const searchParams = useSearchParams();
  const authStatus = searchParams.get("auth_status");
  const authError = searchParams.get("auth_error");
  const rolParam = searchParams.get("rol");
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);
  const [rolActual, setRolActual] = useState<Rol>(
    rolParam === "admin" || rolParam === "docente" ? rolParam : null
  );
  const [isLoadingRol, setIsLoadingRol] = useState(false);
  const [view, setView] = useState<"rol" | "accesos">("rol");
  const [showSplash, setShowSplash] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  const [autoViewEnabled, setAutoViewEnabled] = useState(true);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);

  const profileName = useMemo(() => {
    const metadata = user?.user_metadata;
    return (
      metadata?.full_name ??
      metadata?.name ??
      user?.email?.split("@")[0] ??
      "Usuario"
    );
  }, [user]);

  const profileEmail = user?.email ?? "Sin correo";
  const profileAvatar =
    user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null;
  const profileInitials = profileName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  useEffect(() => {
    const loadRol = async () => {
      setIsLoadingRol(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        setIsLoadingRol(false);
        return;
      }

      const { data, error } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data?.rol) {
        setRolActual(data.rol as Rol);
      }

      setIsLoadingRol(false);
    };

    void loadRol();
  }, []);

  useEffect(() => {
    if (isLoadingRol) return;

    const start = Date.now();
    const minDurationMs = 700;

    const startExit = () => {
      setSplashExiting(true);
      const exitTimer = setTimeout(() => {
        setShowSplash(false);
      }, 600);
      return exitTimer;
    };

    const elapsed = Date.now() - start;
    const remaining = Math.max(minDurationMs - elapsed, 0);
    const exitTimer = setTimeout(startExit, remaining);

    return () => clearTimeout(exitTimer);
  }, [isLoadingRol]);

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

  const effectiveView =
    autoViewEnabled && rolActual ? "accesos" : view;

  const handleLogin = async (rol: Exclude<Rol, null>) => {
    await signOut();
    setRolActual(null);
    setAutoViewEnabled(true);
    await signInWithGoogle(rol);
  };

  const handleSignOut = async () => {
    setIsAvatarMenuOpen(false);
    setRolActual(null);
    setAutoViewEnabled(true);
    setView("rol");
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
      {showSplash && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,_#E7F0FB,_#FFFFFF_55%,_#FFF4DB_100%)] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            splashExiting ? "opacity-0 scale-95" : "opacity-100 scale-100"
          }`}
          aria-hidden="true"
        >
          <div className="absolute inset-0">
            <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-[#5D9AD4]/15 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#FBC558]/20 blur-3xl" />
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#5D9AD4]/20" />
          </div>

          <div
            className={`relative flex w-full max-w-md flex-col items-center gap-6 px-6 text-center transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              splashExiting ? "opacity-0 -translate-y-3" : "opacity-100 translate-y-0"
            }`}
          >
            <div className="rounded-3xl bg-white/80 px-4 py-2 text-xs font-bold tracking-[0.35em] text-slate-500 shadow-sm">
              SISTEMA
            </div>

            <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white shadow-xl shadow-slate-200/60">
              <Image src="/logo-podat.svg" alt="PODAT" width={104} height={104} />
            </div>

            <div>
              <div className="text-4xl font-black text-[#5D9AD4] tracking-tight">
                PODAT
              </div>
              <div className="mt-2 text-xs font-extrabold tracking-[0.35em] text-slate-400">
                DATOS VIVOS, GESTIÓN INTELIGENTE
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <span>Preparando panel académico</span>
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 rounded-full bg-[#5D9AD4] animate-pulse" />
                <span className="h-2 w-2 rounded-full bg-[#FBC558] animate-pulse" />
                <span className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" />
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Tarjeta Central */}
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 relative">
        {user && (
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
        
        {/* Logo y Lema */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
            <Image src="/logo-podat.svg" alt="PODAT" width={80} height={80} />
          </div>
          <h1 className="text-5xl font-black text-[#5D9AD4] tracking-tight">PODAT</h1>
          <p className="text-xs font-bold text-slate-400 mt-2 tracking-widest">
            DATOS VIVOS, GESTIÓN INTELIGENTE
          </p>
        </div>

        {/* Título de UX */}
        <h2 className="text-lg font-semibold text-slate-700 text-center mb-6">
          {effectiveView === "accesos" && rolActual
            ? "Accesos disponibles"
            : "Seleccione su rol"}
        </h2>

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

        {effectiveView === "rol" && (
          <div className="space-y-4 mb-8">
          <button
              onClick={() => void handleLogin("docente")}
              className="w-full flex items-center justify-center gap-3 border-2 border-[#5D9AD4] text-[#5D9AD4] hover:bg-[#5D9AD4] hover:text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <span className="text-xl">📊</span>
              Soy Docente
            </button>

            <button
              onClick={() => void handleLogin("admin")}
              className="w-full flex items-center justify-center gap-3 border-2 border-[#FBC558] text-[#FBC558] hover:bg-[#FBC558] hover:text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <span className="text-xl">⚙️</span>
              Soy Administrador
            </button>
          {rolActual && (
            <button
              onClick={() => setView("accesos")}
              className="w-full p-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              Ver accesos disponibles
            </button>
          )}
        </div>
        )}

        {rolActual && effectiveView === "accesos" && (
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
            {isLoadingRol && (
              <div className="col-span-full text-center text-sm text-slate-400">
                Cargando accesos...
              </div>
            )}
            <button
              onClick={() => {
                setAutoViewEnabled(false);
                setView("rol");
              }}
              className="col-span-full w-full p-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              Volver a selección de rol
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
          Cargando...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

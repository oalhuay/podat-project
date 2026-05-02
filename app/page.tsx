"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import BrandLogo from "@/components/brand/BrandLogo";
import ThemeToggle from "@/components/theme/ThemeToggle";
import SplashScreen from "@/components/system/SplashScreen";
import type { Rol } from "@/types/database";

function GoogleIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.239 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.959 3.041l5.657-5.657C34.053 6.053 29.277 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.959 3.041l5.657-5.657C34.053 6.053 29.277 4 24 4c-7.682 0-14.347 4.337-17.694 10.691Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.176 0 9.86-1.977 13.409-5.197l-6.19-5.238C29.146 35.091 26.702 36 24 36c-5.218 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.507 39.556 16.227 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.084 5.565h.003l6.19 5.238C36.973 39.203 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
      />
    </svg>
  );
}

type RoleAccessButtonProps = {
  accentClassName: string;
  badgeClassName: string;
  icon: string;
  title: string;
  roleLabel: string;
  helperText: string;
  onClick: () => void;
};

function RoleAccessButton({
  accentClassName,
  badgeClassName,
  icon,
  title,
  roleLabel,
  helperText,
  onClick,
}: RoleAccessButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`auth-role-card group relative w-full overflow-hidden rounded-[1.75rem] border-2 bg-white px-5 py-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${accentClassName}`}
    >
      <div className="auth-role-overlay pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start gap-4 transition-all duration-300 group-hover:scale-95 group-hover:opacity-0">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${badgeClassName}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
            Entrar o registrarme
          </div>
          <div className="mt-2 text-lg font-black text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-500">
            Continua con Google como {roleLabel}.
          </div>
          <div className="mt-3 text-xs font-medium text-slate-400">{helperText}</div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 transition-all duration-300 group-hover:opacity-100">
        <div className="auth-google-badge flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg shadow-slate-200/80">
          <GoogleIcon className="h-9 w-9" />
        </div>
        <div className="text-center">
          <div className="text-sm font-black uppercase tracking-[0.22em] text-slate-700">
            Acceso con Google
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            Se abrira el inicio de sesion seguro para este perfil.
          </div>
        </div>
      </div>
    </button>
  );
}

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
    : "Elige como quieres continuar";
  const subtitleText = shouldShowWelcome
    ? "Ingresa con Google y entra a tu espacio de trabajo academico sin pasos extra."
    : "Tu cuenta ya esta autenticada. Solo falta definir el perfil con el que vas a usar la plataforma.";

  useEffect(() => {
    if (!isRegisteredUser || isLoadingProfile) return;

    const targetRoute = "/admin/estadisticas/dashboard";
    router.replace(targetRoute);
  }, [isLoadingProfile, isRegisteredUser, router]);

  if (isLoadingProfile || isRegisteredUser) {
    return <SplashScreen message="Entrando al panel principal" />;
  }

  const handleLogin = async (nextRol: Exclude<Rol, null>) => {
    setRolPreferido(null);
    await signInWithGoogle(nextRol);
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
      description: "Registra notas por evaluacion y ausentes.",
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
      title: "Gestion de Usuarios",
      description: "Administra roles y accesos.",
      href: "/admin/usuarios",
    },
    {
      title: "Materias",
      description: "Catalogo y asignaciones.",
      href: "/admin/materias",
    },
    {
      title: "Estadisticas",
      description: "Importa y visualiza indicadores.",
      href: "/admin/estadisticas",
    },
    {
      title: "Dashboard Estadistico",
      description: "Vista completa con todos los graficos.",
      href: "/admin/estadisticas/dashboard",
    },
    {
      title: "Importar Alumnos",
      description: "Carga masiva desde Excel.",
      href: "/admin/importar",
    },
    {
      title: "Cargar Notas",
      description: "Registra notas por evaluacion y ausentes.",
      href: "/admin/notas",
    },
    {
      title: "Cargar Asistencia",
      description: "Marca presente, ausente o justificado.",
      href: "/admin/asistencias",
    },
  ];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 p-4">
      <div className="absolute right-4 top-4 z-30 w-full max-w-[260px]">
        <ThemeToggle />
      </div>

      <div className="auth-shell relative w-full max-w-3xl rounded-2xl border border-slate-100 bg-white p-8 shadow-xl">
        {hasAuthenticatedUser && (
          <div ref={avatarMenuRef} className="absolute right-4 top-4 z-20">
            <button
              type="button"
              onClick={() => setIsAvatarMenuOpen((prev) => !prev)}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
              aria-haspopup="menu"
              aria-expanded={isAvatarMenuOpen}
              aria-label="Abrir menu de perfil"
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
                    Cerrar sesion
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-sm">
            <BrandLogo stableRings className="brand-mark h-24 w-24" />
          </div>
          <h1 className="text-5xl font-black tracking-tight text-[#5D9AD4]">PODAT</h1>
          <p className="mt-2 text-xs font-bold tracking-widest text-slate-400">
            DATOS VIVOS, GESTION INTELIGENTE
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
          <div className="auth-guided-panel rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,_rgba(93,154,212,0.08),_rgba(251,197,88,0.12))] p-5 text-left">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
              Acceso guiado
            </p>
            <p className="mt-3 text-base font-semibold text-slate-800">
              {shouldShowWelcome
                ? "Elige tu perfil para registrarte e ingresar con Google."
                : rolActual
                  ? "Tu sesion ya esta iniciada. Si quieres, puedes volver a ingresar con otro perfil."
                  : "Tu sesion ya esta iniciada. Solo falta definir el perfil con el que usaras PODAT."}
            </p>
            <div className="auth-guided-note mt-4 rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm text-slate-600 shadow-sm">
              Si ya tienes cuenta o si es tu primera vez, el acceso funciona igual: eliges un
              perfil y continuas con Google.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <RoleAccessButton
              accentClassName="border-[#5D9AD4] text-[#5D9AD4] hover:border-[#4C86BD]"
              badgeClassName="bg-[#5D9AD4]/12 text-[#3D73A7]"
              icon="D"
              title="Acceso Docente"
              roleLabel="docente"
              helperText="Ideal para ingresar si ya tienes cuenta o si te registras por primera vez."
              onClick={() => void handleLogin("docente")}
            />

            <RoleAccessButton
              accentClassName="border-[#FBC558] text-[#C79110] hover:border-[#E0B03D]"
              badgeClassName="bg-[#FBC558]/16 text-[#A87800]"
              icon="A"
              title="Acceso Administrador"
              roleLabel="administrador"
              helperText="Usa este acceso si administras usuarios, materias o importaciones globales."
              onClick={() => void handleLogin("admin")}
            />
          </div>
        </div>

        {hasAuthenticatedUser && !rolActual && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-800">{profileName}</div>
            <div className="mt-1 text-sm text-slate-500">{profileEmail}</div>
          </div>
        )}

        {isRegisteredUser && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(rolActual === "admin" ? cardsAdmin : cardsDocente).map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm transition-colors hover:bg-white hover:shadow-md"
              >
                <div className="text-lg font-black text-slate-900 group-hover:text-[#5D9AD4]">
                  {card.title}
                </div>
                <div className="mt-2 text-sm text-slate-500">{card.description}</div>
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
    <Suspense fallback={<SplashScreen message="Cargando aplicacion" />}>
      <HomeContent />
    </Suspense>
  );
}

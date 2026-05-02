"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import ThemeToggle from "@/components/theme/ThemeToggle";
import BrandLogo from "@/components/brand/BrandLogo";

type NavItem = {
  href: string;
  label: string;
  description: string;
};

const adminNavItems: NavItem[] = [
  {
    href: "/admin/estadisticas/dashboard",
    label: "Dashboard",
    description: "Panel principal",
  },
  {
    href: "/admin/perfil",
    label: "Perfil",
    description: "Datos del usuario",
  },
  {
    href: "/admin/usuarios",
    label: "Gestión de usuarios",
    description: "Roles y accesos",
  },
  {
    href: "/admin/importar-archivo",
    label: "Importar",
    description: "Estadísticas e importación",
  },
  {
    href: "/admin/alumnos",
    label: "Alumnos",
    description: "Alumnos, notas y asistencias",
  },
  {
    href: "/admin/materias",
    label: "Materias",
    description: "Catálogo y asignaciones",
  },
];

const docenteNavItems: NavItem[] = [
  {
    href: "/admin/estadisticas/dashboard",
    label: "Dashboard",
    description: "Vista principal de tus materias",
  },
  {
    href: "/admin/perfil",
    label: "Perfil",
    description: "Datos del usuario",
  },
  {
    href: "/admin/importar-archivo",
    label: "Importar",
    description: "Estadísticas de tus materias",
  },
  {
    href: "/admin/alumnos",
    label: "Alumnos",
    description: "Carga, notas y asistencias",
  },
  {
    href: "/admin/mis-materias",
    label: "Mis Materias",
    description: "Asignaciones vigentes",
  },
];

type AdminSidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

export default function AdminSidebar({
  className = "",
  onNavigate,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, signOut } = useAuth();

  const profileName = useMemo<string>(() => {
    const metadata = user?.user_metadata;
    return (
      metadata?.full_name ??
      metadata?.name ??
      user?.email?.split("@")[0] ??
      "Usuario"
    );
  }, [user]);

  const profileAvatar: string | null =
    user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null;
  const profileEmail = user?.email ?? "Sin correo";
  const profileInitials = profileName
    .split(" ")
    .filter((word): word is string => Boolean(word))
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  const navItems = role === "docente" ? docenteNavItems : adminNavItems;
  const panelLabel =
    role === "docente" ? "Panel docente" : "Panel de gestión";

  const handleSignOut = async () => {
    await signOut();
    onNavigate?.();
    router.push("/");
    router.refresh();
  };

  return (
    <aside
      className={`flex min-h-[calc(100vh-2rem)] w-full flex-col rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-xl shadow-slate-200/60 xl:h-[calc(100vh-3rem)] ${className}`}
    >
      <div className="border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/estadisticas/dashboard"
            onClick={onNavigate}
            className="flex min-w-0 items-center gap-3 rounded-2xl transition-transform hover:-translate-y-0.5"
          >
            <BrandLogo className="brand-mark h-13 w-13 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400">
                PODAT
              </div>
              <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                {panelLabel}
              </div>
            </div>
          </Link>
        </div>
      </div>

      <Link
        href="/admin/perfil"
        onClick={onNavigate}
        className="mt-5 block rounded-[1.75rem] bg-[linear-gradient(145deg,_rgba(93,154,212,0.14),_rgba(251,197,88,0.18))] p-4 transition-transform hover:-translate-y-0.5"
      >
        <div className="flex items-center gap-3">
          {profileAvatar ? (
            // Google avatars are remote and not configured in next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileAvatar}
              alt={profileName}
              className="h-14 w-14 rounded-full border border-white/80 object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5D9AD4] text-base font-black text-white">
              {profileInitials || "U"}
            </div>
          )}

          <div className="min-w-0">
            <div className="truncate text-base font-black text-slate-900">
              {profileName}
            </div>
            <div className="truncate text-xs text-slate-600">{profileEmail}</div>
            <div className="mt-2 inline-flex rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600">
              {role ?? "sin rol"}
            </div>
          </div>
        </div>
      </Link>

      <nav className="mt-6 flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin/estadisticas/dashboard" &&
              item.href !== "/admin/estadisticas" &&
              pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`group block rounded-[1.5rem] border px-4 py-3 transition-all duration-300 ${
                isActive
                  ? "border-[#5D9AD4]/30 bg-[#5D9AD4]/10 shadow-sm hover:scale-[1.02]"
                  : "border-slate-200 bg-white hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
              }`}
            >
              <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-700 transition-transform duration-300 group-hover:translate-y-[-1px]">
                {item.label}
              </div>
              <div
                className={`overflow-hidden text-sm text-slate-500 transition-all duration-300 ${
                  isActive
                    ? "mt-1 max-h-12 opacity-100"
                    : "mt-0 max-h-0 opacity-0 group-hover:mt-1 group-hover:max-h-12 group-hover:opacity-100 group-focus-visible:mt-1 group-focus-visible:max-h-12 group-focus-visible:opacity-100"
                }`}
              >
                {item.description}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 xl:fixed xl:right-8 xl:top-8 xl:z-50 xl:mt-0">
        <ThemeToggle />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Inicio
        </button>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800"
        >
          Salir
        </button>
      </div>
    </aside>
  );
}

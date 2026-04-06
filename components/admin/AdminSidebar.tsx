"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/theme/ThemeToggle";
import type { Rol } from "@/types/database";

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
    href: "/admin/importar",
    label: "Importar archivo",
    description: "Carga masiva",
  },
  {
    href: "/admin/alumnos",
    label: "Alumnos",
    description: "Vista operativa",
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
    href: "/admin/mis-materias",
    label: "Mis materias",
    description: "Asignaciones vigentes",
  },
  {
    href: "/admin/notas",
    label: "Notas",
    description: "Carga de evaluaciones",
  },
  {
    href: "/admin/asistencias",
    label: "Asistencias",
    description: "Control diario",
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [rolActual, setRolActual] = useState<Rol>(null);

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

  useEffect(() => {
    const loadRol = async () => {
      const userId = user?.id;
      if (!userId) {
        setRolActual(null);
        return;
      }

      const { data, error } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", userId)
        .maybeSingle();

      if (!error) {
        setRolActual((data?.rol as Rol) ?? null);
      }
    };

    void loadRol();
  }, [user?.id]);

  const navItems = rolActual === "docente" ? docenteNavItems : adminNavItems;

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <aside className="w-full rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-xl shadow-slate-200/60 lg:sticky lg:top-6 lg:w-80">
      <div className="border-b border-slate-100 pb-5">
        <div className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400">
          Panel principal
        </div>
        <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">
          PODAT Admin
        </div>
      </div>

      <div className="mt-5 rounded-[1.75rem] bg-[linear-gradient(145deg,_rgba(93,154,212,0.14),_rgba(251,197,88,0.18))] p-4">
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
              {rolActual ?? "sin rol"}
            </div>
          </div>
        </div>
      </div>

      <nav className="mt-6 space-y-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin/estadisticas/dashboard" &&
              pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-[1.5rem] border px-4 py-3 transition-all ${
                isActive
                  ? "border-[#5D9AD4]/30 bg-[#5D9AD4]/10 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-700">
                {item.label}
              </div>
              <div className="mt-1 text-sm text-slate-500">{item.description}</div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">
        <ThemeToggle />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
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

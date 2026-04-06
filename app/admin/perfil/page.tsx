"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import StatusBanner from "@/components/admin/StatusBanner";
import type { Rol } from "@/types/database";

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

export default function PerfilPage() {
  const { user } = useAuth();
  const [rolActual, setRolActual] = useState<Rol>(null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

  const profileName = useMemo<string>(() => {
    const metadata = user?.user_metadata;
    return (
      metadata?.full_name ??
      metadata?.name ??
      user?.email?.split("@")[0] ??
      "Usuario"
    );
  }, [user]);

  const profileEmail = user?.email ?? "Sin correo";
  const profileAvatar: string | null =
    user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null;
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
        setStatusMessage({
          type: "info",
          text: "Inicia sesión para ver la información de perfil.",
        });
        return;
      }

      const { data, error } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        setStatusMessage({
          type: "error",
          text: `No se pudo cargar el rol: ${error.message}`,
        });
        return;
      }

      setRolActual((data?.rol as Rol) ?? null);
    };

    void loadRol();
  }, [user?.id]);

  const shortcuts =
    rolActual === "docente"
      ? [
          { href: "/admin/mis-materias", label: "Mis materias" },
          { href: "/admin/notas", label: "Notas" },
          { href: "/admin/asistencias", label: "Asistencias" },
        ]
      : [
          { href: "/admin/estadisticas/dashboard", label: "Dashboard" },
          { href: "/admin/usuarios", label: "Gestión de usuarios" },
          { href: "/admin/materias", label: "Materias" },
        ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">
          Perfil
        </h1>
        <p className="mt-2 text-slate-500">
          Resumen de la cuenta autenticada y accesos de trabajo.
        </p>
      </header>

      {statusMessage && <StatusBanner message={statusMessage} />}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {profileAvatar ? (
              // Google avatars are remote and not configured in next/image.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileAvatar}
                alt={profileName}
                className="h-24 w-24 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#5D9AD4] text-3xl font-black text-white">
                {profileInitials || "U"}
              </div>
            )}

            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
                Usuario autenticado
              </div>
              <div className="mt-2 truncate text-3xl font-black text-slate-900">
                {profileName}
              </div>
              <div className="mt-1 truncate text-sm text-slate-600">
                {profileEmail}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Rol activo
              </div>
              <div className="mt-2 text-xl font-black capitalize text-slate-900">
                {rolActual ?? "Pendiente"}
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Identificador
              </div>
              <div className="mt-2 break-all text-sm font-semibold text-slate-700">
                {user?.id ?? "Sin sesión activa"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
            Accesos rápidos
          </div>
          <div className="mt-4 space-y-3">
            {shortcuts.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-3xl border border-slate-200 px-4 py-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

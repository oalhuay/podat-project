"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/theme/ThemeToggle";
import type { Rol } from "@/types/database";

type UserAvatarMenuProps = {
  compact?: boolean;
};

export default function UserAvatarMenu({ compact = false }: UserAvatarMenuProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [rolActual, setRolActual] = useState<Rol>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const profileName = useMemo<string>(() => {
    const metadata = user?.user_metadata;
    return metadata?.full_name ?? metadata?.name ?? user?.email?.split("@")[0] ?? "Usuario";
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

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  if (!user) return null;

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
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

        {!compact && (
          <div className="hidden text-left sm:block">
            <div className="max-w-36 truncate text-sm font-bold text-slate-900">{profileName}</div>
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {rolActual ?? "sin rol"}
            </div>
          </div>
        )}
      </button>

      {isMenuOpen && (
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
                <div className="truncate text-sm font-black text-slate-900">{profileName}</div>
                <div className="truncate text-xs text-slate-600">{profileEmail}</div>
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

            <Link
              href="/"
              onClick={() => setIsMenuOpen(false)}
              className="block w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Ir al inicio
            </Link>

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
  );
}

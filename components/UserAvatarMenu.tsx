"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import ThemeToggle from "@/components/theme/ThemeToggle";
import ProfileAvatar from "@/components/ui/ProfileAvatar";
import { cx, ui } from "@/components/ui/styles";
import { getUserProfileViewModel } from "@/lib/auth/getUserProfileViewModel";

type UserAvatarMenuProps = {
  compact?: boolean;
};

export default function UserAvatarMenu({ compact = false }: UserAvatarMenuProps) {
  const router = useRouter();
  const { user, role, signOut } = useAuth();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const profile = useMemo(() => getUserProfileViewModel(user), [user]);

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
        className={cx(
          "flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm transition-all hover:border-slate-300 hover:shadow-md",
          compact ? "pr-2" : ""
        )}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        aria-label="Abrir menú de perfil"
      >
        <ProfileAvatar
          src={profile.avatar}
          alt={profile.name}
          initials={profile.initials}
          size="sm"
        />

        {!compact && (
          <div className="hidden text-left sm:block">
            <div className="max-w-36 truncate text-sm font-bold text-slate-900">{profile.name}</div>
            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {role ?? "sin rol"}
            </div>
          </div>
        )}
      </button>

      {isMenuOpen && (
        <div
          role="dialog"
          aria-label="Panel de perfil"
          className="absolute right-0 mt-3 w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60"
        >
          <div className="bg-[linear-gradient(135deg,_rgba(93,154,212,0.14),_rgba(251,197,88,0.18))] p-4">
            <div className="flex items-center gap-3">
              <ProfileAvatar
                src={profile.avatar}
                alt={profile.name}
                initials={profile.initials}
                size="md"
              />

              <div className="min-w-0">
                <div className="truncate text-sm font-black text-slate-900">{profile.name}</div>
                <div className="truncate text-xs text-slate-600">{profile.email}</div>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                Rol activo
              </div>
              <div className="mt-1 text-sm font-semibold capitalize text-slate-800">
                {role ?? "Pendiente"}
              </div>
            </div>

            <ThemeToggle compact />

            <Link
              href="/admin/perfil"
              onClick={() => setIsMenuOpen(false)}
              className={cx(ui.secondaryButton, "block w-full text-center")}
            >
              Ir a perfil
            </Link>

            <Link
              href="/"
              onClick={() => setIsMenuOpen(false)}
              className={cx(ui.secondaryButton, "block w-full text-center")}
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

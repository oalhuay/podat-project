"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import BrandLogo from "@/components/brand/BrandLogo";
import { useAuth } from "@/app/hooks/useAuth";
import SplashScreen from "@/components/system/SplashScreen";

const adminOnlyPrefixes = ["/admin/usuarios", "/admin/importar", "/admin/materias"];
const matchesPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, isLoadingAuth, isLoadingProfile } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const isAdminOnly = adminOnlyPrefixes.some((prefix) =>
    matchesPrefix(pathname, prefix)
  );
  const isAllowed = Boolean(
    user && (role === "admin" || (role === "docente" && !isAdminOnly))
  );

  useEffect(() => {
    if (isLoadingAuth || isLoadingProfile || isAllowed) return;
    router.replace("/?auth_status=error&auth_error=forbidden");
  }, [isAllowed, isLoadingAuth, isLoadingProfile, router]);

  useEffect(() => {
    if (!isMobileSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileSidebarOpen]);

  if (isLoadingAuth || isLoadingProfile || !isAllowed) {
    return <SplashScreen message="Validando acceso" overlay />;
  }

  const panelLabel = role === "docente" ? "Panel docente" : "Panel de gestión";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(93,154,212,0.12),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_100%)]">
      <div className="sticky top-0 z-30 border-b border-white/70 bg-white px-4 py-3 shadow-sm sm:px-6 xl:hidden">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <Link
            href="/admin/estadisticas/dashboard"
            className="flex items-center gap-3 rounded-2xl transition-transform hover:-translate-y-0.5"
          >
            <BrandLogo className="brand-mark h-10 w-10 shrink-0" />
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400">
                PODAT
              </div>
              <div className="text-lg font-black tracking-tight text-slate-900">
                {panelLabel}
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Abrir menú lateral"
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm transition-colors hover:bg-slate-50"
          >
            <span className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
            </span>
          </button>
        </div>
      </div>

      {isMobileSidebarOpen && (
        <div className="xl:hidden">
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/35 p-4 backdrop-blur-[2px] sm:p-6"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <div className="w-[min(88vw,22rem)]" onClick={(event) => event.stopPropagation()}>
              <AdminSidebar onNavigate={() => setIsMobileSidebarOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-4 sm:px-6 xl:flex-row xl:px-8 xl:py-6">
        <AdminSidebar className="hidden xl:sticky xl:top-6 xl:z-40 xl:flex xl:w-80" />
        <div className="min-w-0 flex-1">
          <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-xl shadow-slate-200/40 sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

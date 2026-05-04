"use client";

import Image from "next/image";

type SplashScreenProps = {
  message?: string;
  overlay?: boolean;
  exiting?: boolean;
};

export default function SplashScreen({
  message = "Preparando panel académico",
  overlay = false,
  exiting = false,
}: SplashScreenProps) {
  const shellClassName = overlay
    ? "fixed inset-0 z-[100] flex items-center justify-center"
    : "min-h-screen flex items-center justify-center";

  return (
    <div
      className={`${shellClassName} relative overflow-hidden bg-[radial-gradient(circle_at_top,_#E7F0FB,_#FFFFFF_55%,_#FFF4DB_100%)] px-4 py-6 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-6 ${
        overlay ? (exiting ? "scale-95 opacity-0" : "scale-100 opacity-100") : ""
      }`}
      aria-hidden="true"
    >
      <div className="absolute inset-0">
        <div className="absolute -left-16 -top-24 h-64 w-64 rounded-full bg-[#5D9AD4]/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#FBC558]/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[min(64vw,34rem)] w-[min(64vw,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#5D9AD4]/20" />
      </div>

      <div
        className={`relative flex min-h-dvh w-full max-w-5xl flex-col items-center justify-center gap-8 py-8 text-center transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          overlay ? (exiting ? "-translate-y-3 opacity-0" : "translate-y-0 opacity-100") : ""
        }`}
      >
        <div className="splash-chip rounded-3xl bg-white/80 px-4 py-2 text-xs font-bold tracking-[0.35em] text-slate-500 shadow-sm">
          SISTEMA
        </div>

        <div className="splash-logo-shell flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white shadow-xl shadow-slate-200/60 sm:h-32 sm:w-32">
          <Image src="/logo-podat.svg" alt="PODAT" width={104} height={104} priority />
        </div>

        <div>
          <div className="text-4xl font-black tracking-tight text-[#5D9AD4] sm:text-5xl">
            PODAT
          </div>
          <div className="mt-2 text-[11px] font-extrabold tracking-[0.35em] text-slate-400 sm:text-xs">
            DATOS VIVOS, GESTIÓN INTELIGENTE
          </div>
        </div>

        <div className="splash-card w-full max-w-2xl rounded-[2rem] border border-white/70 bg-white/72 px-5 py-5 shadow-lg shadow-slate-200/40 backdrop-blur-sm sm:px-6 sm:py-6">
          <div className="flex flex-col items-center gap-4">
            <div className="splash-card-title flex flex-wrap items-center justify-center gap-2 text-base font-semibold text-slate-700 sm:text-lg">
              <span>{message}</span>
              <span className="inline-flex gap-1">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#5D9AD4]" />
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#FBC558]" />
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-300" />
              </span>
            </div>

            <div className="splash-card-meta text-sm font-medium text-slate-500 sm:text-base">
              ¿Aún no funciona? Actualice la página.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

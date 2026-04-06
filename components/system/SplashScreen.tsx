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
      className={`${shellClassName} relative overflow-hidden bg-[radial-gradient(circle_at_top,_#E7F0FB,_#FFFFFF_55%,_#FFF4DB_100%)] p-6 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        overlay ? (exiting ? "opacity-0 scale-95" : "opacity-100 scale-100") : ""
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
          overlay ? (exiting ? "opacity-0 -translate-y-3" : "opacity-100 translate-y-0") : ""
        }`}
      >
        <div className="rounded-3xl bg-white/80 px-4 py-2 text-xs font-bold tracking-[0.35em] text-slate-500 shadow-sm">
          SISTEMA
        </div>

        <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white shadow-xl shadow-slate-200/60">
          <Image src="/logo-podat.svg" alt="PODAT" width={104} height={104} />
        </div>

        <div>
          <div className="text-4xl font-black tracking-tight text-[#5D9AD4]">
            PODAT
          </div>
          <div className="mt-2 text-xs font-extrabold tracking-[0.35em] text-slate-400">
            DATOS VIVOS, GESTIÓN INTELIGENTE
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <span>{message}</span>
          <span className="inline-flex gap-1">
            <span className="h-2 w-2 rounded-full bg-[#5D9AD4] animate-pulse" />
            <span className="h-2 w-2 rounded-full bg-[#FBC558] animate-pulse" />
            <span className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" />
          </span>
        </div>
      </div>
    </div>
  );
}

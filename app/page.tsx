"use client";

import { useAuth } from "@/app/hooks/useAuth";
import { useSearchParams } from "next/navigation";

export default function Home() {
  const { signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const authStatus = searchParams.get("auth_status");
  const authError = searchParams.get("auth_error");
  const rol = searchParams.get("rol");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      
      {/* Tarjeta Central */}
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        
        {/* Logo y Lema */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-[#5D9AD4] tracking-tight">PODAT</h1>
          <p className="text-xs font-bold text-slate-400 mt-2 tracking-widest">DATOS CON VISIÓN DE FUTURO</p>
        </div>

        {/* Título de UX */}
        <h2 className="text-lg font-semibold text-slate-700 text-center mb-6">
          Seleccioná tu rol para ingresar
        </h2>

        {authStatus === "ok" && (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Login OK. Rol guardado: {rol}
          </p>
        )}

        {authStatus === "error" && (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Error en callback: {authError}
          </p>
        )}

        {/* Botones de Selección */}
        <div className="space-y-4">
          <button
            onClick={() => void signInWithGoogle("docente")}
            className="w-full flex items-center justify-center gap-3 border-2 border-[#5D9AD4] text-[#5D9AD4] hover:bg-[#5D9AD4] hover:text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span className="text-xl">📊</span>
            Soy Docente
          </button>
          
          <button
            onClick={() => void signInWithGoogle("admin")}
            className="w-full flex items-center justify-center gap-3 border-2 border-[#FBC558] text-[#FBC558] hover:bg-[#FBC558] hover:text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span className="text-xl">⚙️</span>
            Soy Administrador
          </button>
        </div>

      </div>
    </div>
  );
}

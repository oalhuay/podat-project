"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/app/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Rol } from "@/types/database";
import { useSearchParams } from "next/navigation";

export default function Home() {
  const { signInWithGoogle, signOut } = useAuth();
  const searchParams = useSearchParams();
  const authStatus = searchParams.get("auth_status");
  const authError = searchParams.get("auth_error");
  const rolParam = searchParams.get("rol");
  const [rolActual, setRolActual] = useState<Rol>(
    rolParam === "admin" || rolParam === "docente" ? rolParam : null
  );
  const [isLoadingRol, setIsLoadingRol] = useState(false);
  const [view, setView] = useState<"rol" | "accesos">("rol");

  useEffect(() => {
    const loadRol = async () => {
      setIsLoadingRol(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        setIsLoadingRol(false);
        return;
      }

      const { data, error } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data?.rol) {
        setRolActual(data.rol as Rol);
      }

      setIsLoadingRol(false);
    };

    void loadRol();
  }, []);

  const handleLogin = async (rol: Exclude<Rol, null>) => {
    await signOut();
    setRolActual(null);
    await signInWithGoogle(rol);
  };

  const cardsDocente = [
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      
      {/* Tarjeta Central */}
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        
        {/* Logo y Lema */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
            <Image src="/logo-podat.svg" alt="PODAT" width={80} height={80} />
          </div>
          <h1 className="text-5xl font-black text-[#5D9AD4] tracking-tight">PODAT</h1>
          <p className="text-xs font-bold text-slate-400 mt-2 tracking-widest">DATOS CON VISIÓN DE FUTURO</p>
        </div>

        {/* Título de UX */}
        <h2 className="text-lg font-semibold text-slate-700 text-center mb-6">
          {view === "accesos" && rolActual ? "Accesos disponibles" : "Seleccioná tu rol para ingresar"}
        </h2>

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

        {view === "rol" && (
          <div className="space-y-4 mb-8">
          <p className="text-sm text-slate-500 text-center">
            ¿Entrar con otra cuenta o rol? Elegí una opción.
          </p>
          <button
              onClick={() => void handleLogin("docente")}
              className="w-full flex items-center justify-center gap-3 border-2 border-[#5D9AD4] text-[#5D9AD4] hover:bg-[#5D9AD4] hover:text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <span className="text-xl">📊</span>
              Soy Docente
            </button>

            <button
              onClick={() => void handleLogin("admin")}
              className="w-full flex items-center justify-center gap-3 border-2 border-[#FBC558] text-[#FBC558] hover:bg-[#FBC558] hover:text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <span className="text-xl">⚙️</span>
              Soy Administrador
            </button>
          {rolActual && (
            <button
              onClick={() => setView("accesos")}
              className="w-full p-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              Ver accesos disponibles
            </button>
          )}
        </div>
        )}

        {rolActual && view === "accesos" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(rolActual === "admin" ? cardsAdmin : cardsDocente).map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-2xl border border-slate-200 p-5 bg-slate-50 hover:bg-white transition-colors shadow-sm hover:shadow-md"
              >
                <div className="text-lg font-black text-slate-900 group-hover:text-[#5D9AD4]">
                  {card.title}
                </div>
                <div className="text-sm text-slate-500 mt-2">{card.description}</div>
              </Link>
            ))}
            {isLoadingRol && (
              <div className="col-span-full text-center text-sm text-slate-400">
                Cargando accesos...
              </div>
            )}
            <button
              onClick={() => setView("rol")}
              className="col-span-full w-full p-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              Volver a selección de rol
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

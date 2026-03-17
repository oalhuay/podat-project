"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import StatusBanner from "@/components/admin/StatusBanner";
import type { Rol } from "@/types/database";

type Materia = {
  id: number;
  nombre: string;
  codigo: string | null;
};

type MateriaDocente = {
  id: number;
  materia_id: number;
  comision: string | null;
  materias?: Materia | null;
};

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

export default function MisMateriasPage() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [asignaciones, setAsignaciones] = useState<MateriaDocente[]>([]);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadMaterias = async () => {
      setIsLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id ?? null;
        if (!userId) {
          setStatusMessage({ type: "error", text: "No se pudo identificar el usuario." });
          return;
        }

        const { data: perfilData } = await supabase
          .from("perfiles")
          .select("rol")
          .eq("id", userId)
          .maybeSingle();
        const rol = (perfilData?.rol as Rol) ?? null;

        if (rol === "admin") {
          const { data, error } = await supabase
            .from("materias")
            .select("id, nombre, codigo")
            .order("nombre", { ascending: true });
          if (error) throw error;
          setMaterias((data ?? []) as Materia[]);
          setAsignaciones([]);
        } else {
          const { data, error } = await supabase
            .from("materias_docentes")
            .select("id, materia_id, comision, materias(id, nombre, codigo)")
            .eq("user_id", userId)
            .order("id", { ascending: false });
          if (error) throw error;
          const asigns = (data ?? []) as MateriaDocente[];
          setAsignaciones(asigns);
          setMaterias(
            asigns
              .map((row) => row.materias)
              .filter(Boolean) as Materia[]
          );
        }
      } catch (error: unknown) {
        const message =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : "Error desconocido";
        setStatusMessage({
          type: "error",
          text: `Error cargando materias: ${message}`,
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadMaterias();
  }, []);

  const materiasUnicas = useMemo(() => {
    const map = new Map<number, Materia>();
    materias.forEach((m) => map.set(m.id, m));
    return Array.from(map.values());
  }, [materias]);

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen bg-white space-y-8">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Mis Materias
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          Materias asignadas a tu perfil.
        </p>
      </header>

      {statusMessage && <StatusBanner message={statusMessage} />}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Cargando materias...
        </div>
      ) : materiasUnicas.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No hay materias asignadas.
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {materiasUnicas.map((materia) => (
            <div
              key={materia.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs uppercase tracking-widest font-bold text-slate-400">
                {materia.codigo ?? "SIN CÓDIGO"}
              </p>
              <p className="text-lg font-black text-slate-900 mt-2">
                {materia.nombre}
              </p>
              {asignaciones.length > 0 && (
                <div className="mt-3 text-sm text-slate-600">
                  {asignaciones
                    .filter((a) => a.materia_id === materia.id)
                    .map((a) => a.comision ?? "Sin comisión")
                    .join(" · ")}
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

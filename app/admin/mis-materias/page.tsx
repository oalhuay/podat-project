"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import StatusBanner from "@/components/admin/StatusBanner";
import {
  dedupeMaterias,
  getAccessibleMaterias,
  getMateriaAssignmentsForUser,
  extractMateriasFromAssignments,
  type Materia,
  type MateriaDocenteAssignment,
} from "@/lib/materias";

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

export default function MisMateriasPage() {
  const { user, role, isLoadingProfile } = useAuth();
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [asignaciones, setAsignaciones] = useState<MateriaDocenteAssignment[]>([]);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadMaterias = async () => {
      setIsLoading(true);
      try {
        if (isLoadingProfile) return;
        if (!user?.id || !role) {
          setStatusMessage({ type: "error", text: "No se pudo identificar el usuario." });
          return;
        }

        if (role === "admin") {
          const allMaterias = await getAccessibleMaterias(user.id, role);
          setMaterias(allMaterias);
          setAsignaciones([]);
        } else {
          const asigns = await getMateriaAssignmentsForUser(user.id);
          setAsignaciones(asigns);
          setMaterias(extractMateriasFromAssignments(asigns));
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
  }, [isLoadingProfile, role, user?.id]);

  const materiasUnicas = useMemo(() => {
    return dedupeMaterias(materias);
  }, [materias]);

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen bg-white space-y-8">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Mis Materias
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          Materias asignadas a su perfil.
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

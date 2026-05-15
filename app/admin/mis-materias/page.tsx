"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import StatusBanner from "@/components/admin/StatusBanner";
import { dedupeMaterias, getAccessibleMaterias, type Materia } from "@/lib/materias";

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

export default function MisMateriasPage() {
  const { user, role, isLoadingProfile } = useAuth();
  const [materias, setMaterias] = useState<Materia[]>([]);
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

        const allMaterias = await getAccessibleMaterias(user.id, role);
        setMaterias(allMaterias);
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

  const materiasUnicas = useMemo(() => dedupeMaterias(materias), [materias]);

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen bg-white space-y-8">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Mis Materias</h1>
        <p className="text-slate-500 mt-2 font-medium">Materias asignadas a su perfil.</p>
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
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {materiasUnicas.map((materia) => (
            <div
              key={materia.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {materia.codigo ?? "SIN CODIGO"}
              </p>
              <p className="mt-2 text-lg font-black text-slate-900">{materia.nombre}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

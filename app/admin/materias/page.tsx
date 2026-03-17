"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import StatusBanner from "@/components/admin/StatusBanner";

type Materia = {
  id: number;
  nombre: string;
  codigo: string | null;
};

type Perfil = {
  id: string;
  correo: string | null;
  rol: "admin" | "docente" | null;
};

type MateriaDocente = {
  id: number;
  materia_id: number;
  user_id: string;
  comision: string | null;
};

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

export default function MateriasAdminPage() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [docentes, setDocentes] = useState<Perfil[]>([]);
  const [asignaciones, setAsignaciones] = useState<MateriaDocente[]>([]);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [nuevaMateria, setNuevaMateria] = useState("");
  const [nuevoCodigo, setNuevoCodigo] = useState("");

  const [selectedMateriaId, setSelectedMateriaId] = useState<number | "">("");
  const [selectedDocenteId, setSelectedDocenteId] = useState<string | "">("");
  const [comision, setComision] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: materiasData, error: materiasError } = await supabase
        .from("materias")
        .select("id, nombre, codigo")
        .order("nombre", { ascending: true });
      if (materiasError) throw materiasError;

      const { data: docentesData, error: docentesError } = await supabase
        .from("perfiles")
        .select("id, correo, rol")
        .eq("rol", "docente")
        .order("correo", { ascending: true });
      if (docentesError) throw docentesError;

      const { data: asignacionesData, error: asignacionesError } = await supabase
        .from("materias_docentes")
        .select("id, materia_id, user_id, comision")
        .order("id", { ascending: false });
      if (asignacionesError) throw asignacionesError;

      setMaterias((materiasData ?? []) as Materia[]);
      setDocentes((docentesData ?? []) as Perfil[]);
      setAsignaciones((asignacionesData ?? []) as MateriaDocente[]);
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `Error cargando datos: ${message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const crearMateria = async () => {
    const nombre = nuevaMateria.trim();
    if (!nombre) {
      setStatusMessage({ type: "error", text: "Ingresa un nombre de materia." });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        nombre,
        codigo: nuevoCodigo.trim() === "" ? null : nuevoCodigo.trim(),
      };
      const { error } = await supabase.from("materias").insert(payload);
      if (error) throw error;
      setNuevaMateria("");
      setNuevoCodigo("");
      setStatusMessage({ type: "success", text: "Materia creada." });
      await loadData();
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `Error creando materia: ${message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const asignarMateria = async () => {
    if (!selectedMateriaId || !selectedDocenteId) {
      setStatusMessage({
        type: "error",
        text: "Selecciona materia y docente.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        materia_id: Number(selectedMateriaId),
        user_id: selectedDocenteId,
        comision: comision.trim() === "" ? null : comision.trim(),
      };
      const { error } = await supabase
        .from("materias_docentes")
        .upsert(payload, { onConflict: "materia_id,user_id,comision" });
      if (error) throw error;
      setSelectedMateriaId("");
      setSelectedDocenteId("");
      setComision("");
      setStatusMessage({ type: "success", text: "Asignación creada." });
      await loadData();
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `Error asignando materia: ${message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const eliminarAsignacion = async (id: number) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("materias_docentes")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setStatusMessage({ type: "success", text: "Asignación eliminada." });
      await loadData();
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `Error eliminando asignación: ${message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const materiaMap = useMemo(() => {
    const map = new Map<number, Materia>();
    materias.forEach((m) => map.set(m.id, m));
    return map;
  }, [materias]);

  const docenteMap = useMemo(() => {
    const map = new Map<string, Perfil>();
    docentes.forEach((d) => map.set(d.id, d));
    return map;
  }, [docentes]);

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen bg-white space-y-10">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Materias & Asignaciones
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          Administra el catálogo de materias y vincula docentes.
        </p>
      </header>

      {statusMessage && <StatusBanner message={statusMessage} />}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-slate-200 p-6 bg-slate-50">
          <h2 className="text-lg font-black text-slate-900">Nueva Materia</h2>
          <div className="mt-4 space-y-3">
            <input
              type="text"
              placeholder="Nombre de materia"
              value={nuevaMateria}
              onChange={(e) => setNuevaMateria(e.target.value)}
              className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-white text-slate-900 focus:border-[#5D9AD4] outline-none"
            />
            <input
              type="text"
              placeholder="Código (opcional)"
              value={nuevoCodigo}
              onChange={(e) => setNuevoCodigo(e.target.value)}
              className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-white text-slate-900 focus:border-[#5D9AD4] outline-none"
            />
            <button
              onClick={crearMateria}
              disabled={isLoading}
              className="w-full p-3 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors disabled:opacity-70"
            >
              {isLoading ? "CREANDO..." : "CREAR MATERIA"}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 p-6 bg-white">
          <h2 className="text-lg font-black text-slate-900">Asignar Materia</h2>
          <div className="mt-4 space-y-3">
            <select
              value={selectedMateriaId}
              onChange={(e) =>
                setSelectedMateriaId(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none"
            >
              <option value="">Seleccionar materia</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>

            <select
              value={selectedDocenteId}
              onChange={(e) => setSelectedDocenteId(e.target.value)}
              className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none"
            >
              <option value="">Seleccionar docente</option>
              {docentes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.correo ?? d.id}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Comisión (opcional)"
              value={comision}
              onChange={(e) => setComision(e.target.value)}
              className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none"
            />

            <button
              onClick={asignarMateria}
              disabled={isLoading}
              className="w-full p-3 rounded-2xl bg-[#5D9AD4] text-white font-bold hover:bg-[#4C86BD] transition-colors disabled:opacity-70"
            >
              {isLoading ? "ASIGNANDO..." : "ASIGNAR"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-900">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="text-left p-3">Materia</th>
                <th className="text-left p-3">Código</th>
                <th className="text-left p-3">Docente</th>
                <th className="text-left p-3">Comisión</th>
                <th className="text-left p-3"></th>
              </tr>
            </thead>
            <tbody>
              {asignaciones.map((asig) => {
                const materia = materiaMap.get(asig.materia_id);
                const docente = docenteMap.get(asig.user_id);
                return (
                  <tr key={asig.id} className="border-t border-slate-100">
                    <td className="p-3">{materia?.nombre ?? "—"}</td>
                    <td className="p-3 text-slate-500">{materia?.codigo ?? "—"}</td>
                    <td className="p-3">{docente?.correo ?? asig.user_id}</td>
                    <td className="p-3">{asig.comision ?? "—"}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => eliminarAsignacion(asig.id)}
                        disabled={isLoading}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {asignaciones.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400">
                    No hay asignaciones todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

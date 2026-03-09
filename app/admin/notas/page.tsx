"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import StatusBanner from "@/components/admin/StatusBanner";

type Materia = {
  id: number;
  nombre: string;
};

type AlumnoFila = {
  alumnoId: number;
  legajo: string;
  apellido: string;
  nombre: string;
  nota: string;
};

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

const EVALUACIONES = ["Parcial1", "Parcial2", "Integrador"] as const;
const TIPOS = ["Parcial", "Recuperatorio"] as const;
const COMISIONES = ["A", "B", "C"] as const;
const MATERIAS_EJEMPLO: Materia[] = [
  { id: 101, nombre: "Programacion I (Ejemplo)" },
  { id: 102, nombre: "Sistemas Operativos (Ejemplo)" },
  { id: 103, nombre: "Base de Datos (Ejemplo)" },
  { id: 104, nombre: "Matematica Discreta (Ejemplo)" },
];

export default function CargarNotasPage() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [materiaId, setMateriaId] = useState("");
  const [anio, setAnio] = useState("2026");
  const [comision, setComision] = useState("");
  const [evaluacionNombre, setEvaluacionNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [comisionId, setComisionId] = useState<number | null>(null);
  const [alumnos, setAlumnos] = useState<AlumnoFila[]>([]);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"seleccion" | "carga">("seleccion");

  const puedeContinuar = useMemo(
    () => Boolean(materiaId && anio && comision && evaluacionNombre),
    [materiaId, anio, comision, evaluacionNombre]
  );
  const materiasMostradas = materias.length > 0 ? materias : MATERIAS_EJEMPLO;

  useEffect(() => {
    const loadMaterias = async () => {
      const { data, error } = await supabase
        .from("materias")
        .select("id, nombre")
        .order("nombre", { ascending: true });

      if (error) {
        setStatusMessage({
          type: "error",
          text: `No se pudieron cargar materias: ${error.message}`,
        });
        return;
      }

      setMaterias((data ?? []) as Materia[]);
      if ((data ?? []).length === 0) {
        setStatusMessage({
          type: "info",
          text: "No hay materias cargadas en base de datos. Se muestran opciones de ejemplo.",
        });
      }
    };

    void loadMaterias();
  }, []);

  const resetToStart = (message?: StatusMessage) => {
    setStep("seleccion");
    setComisionId(null);
    setAlumnos([]);
    if (message) {
      setStatusMessage(message);
    }
  };

  const continuar = async () => {
    if (!puedeContinuar) {
      setStatusMessage({
        type: "error",
        text: "Completa Materia, Año, Comisión y Nombre de evaluación.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const materiaIdNum = Number(materiaId);

      const { data: comisionData, error: comisionError } = await supabase
        .from("comisiones")
        .select("id")
        .eq("materia_id", materiaIdNum)
        .eq("anio", Number(anio))
        .eq("nombre", comision)
        .maybeSingle();

      if (comisionError) throw comisionError;
      if (!comisionData) {
        setStatusMessage({
          type: "error",
          text: "No existe la comisión para esa materia/año. Crea o carga la comisión primero.",
        });
        return;
      }

      setComisionId(comisionData.id as number);

      const { data: alumnosData, error: alumnosError } = await supabase
        .from("alumno_comision")
        .select("alumno_id, alumnos(id, legajo, nombre, apellido)")
        .eq("comision_id", comisionData.id);

      if (alumnosError) throw alumnosError;

      const filas = (alumnosData ?? [])
        .map((row) => {
          const alumnoRaw = Array.isArray(row.alumnos) ? row.alumnos[0] : row.alumnos;
          if (!alumnoRaw) return null;

          return {
            alumnoId: Number(alumnoRaw.id),
            legajo: String(alumnoRaw.legajo),
            apellido: String(alumnoRaw.apellido),
            nombre: String(alumnoRaw.nombre),
            nota: "",
          } as AlumnoFila;
        })
        .filter((row): row is AlumnoFila => row !== null)
        .sort((a, b) => a.apellido.localeCompare(b.apellido));

      if (filas.length === 0) {
        setStatusMessage({
          type: "info",
          text: "No hay alumnos vinculados a esa comisión.",
        });
        return;
      }

      setAlumnos(filas);
      setStep("carga");
      setStatusMessage({
        type: "info",
        text: `Lista cargada. Completa una nota (0 a 10) por alumno y guarda.`,
      });
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `Error al continuar: ${message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onChangeNota = (alumnoId: number, nota: string) => {
    setAlumnos((prev) =>
      prev.map((a) => (a.alumnoId === alumnoId ? { ...a, nota } : a))
    );
  };

  const guardarNotas = async () => {
    if (!comisionId) {
      setStatusMessage({
        type: "error",
        text: "No hay comisión seleccionada para guardar notas.",
      });
      return;
    }

    for (const alumno of alumnos) {
      if (alumno.nota.trim() === "") {
        setStatusMessage({
          type: "error",
          text: "Todas las notas son obligatorias.",
        });
        return;
      }

      const notaNum = Number(alumno.nota);
      if (Number.isNaN(notaNum) || notaNum < 0 || notaNum > 10) {
        setStatusMessage({
          type: "error",
          text: "Cada nota debe estar entre 0 y 10.",
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const tipoValue = tipo || null;

      let query = supabase
        .from("evaluaciones")
        .select("id")
        .eq("comision_id", comisionId)
        .eq("nombre", evaluacionNombre);

      if (tipoValue === null) {
        query = query.is("tipo", null);
      } else {
        query = query.eq("tipo", tipoValue);
      }

      const { data: evaluacionExistente, error: evalSelectError } = await query.maybeSingle();
      if (evalSelectError) throw evalSelectError;

      let evaluacionId: number;
      if (evaluacionExistente?.id) {
        evaluacionId = Number(evaluacionExistente.id);
      } else {
        const { data: evaluacionNueva, error: evalInsertError } = await supabase
          .from("evaluaciones")
          .insert({
            comision_id: comisionId,
            nombre: evaluacionNombre,
            tipo: tipoValue,
          })
          .select("id")
          .single();

        if (evalInsertError) throw evalInsertError;
        evaluacionId = Number(evaluacionNueva.id);
      }

      const payload = alumnos.map((alumno) => ({
        evaluacion_id: evaluacionId,
        alumno_id: alumno.alumnoId,
        nota: Number(alumno.nota),
      }));

      const { error: notasError } = await supabase
        .from("notas")
        .upsert(payload, { onConflict: "evaluacion_id,alumno_id" });

      if (notasError) throw notasError;

      resetToStart({
        type: "success",
        text: `Notas guardadas correctamente para ${alumnos.length} alumnos.`,
      });
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `Error al guardar notas: ${message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen bg-white">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Carga de Notas</h1>
        <p className="text-slate-500 mt-2 font-medium">
          Selecciona evaluación y registra una nota (0 a 10) por alumno.
        </p>
      </header>

      {statusMessage && <StatusBanner message={statusMessage} />}

      {step === "seleccion" && (
        <section className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
                Materia
              </label>
              <select
                className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none transition-all"
                value={materiaId}
                onChange={(e) => setMateriaId(e.target.value)}
              >
                <option value="">Elegir Materia...</option>
                {materiasMostradas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
                Anio
              </label>
              <input
                type="number"
                className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none transition-all"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
                Comision
              </label>
              <select
                className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none transition-all"
                value={comision}
                onChange={(e) => setComision(e.target.value)}
              >
                <option value="">Elegir...</option>
                {COMISIONES.map((c) => (
                  <option key={c} value={c}>
                    Comision {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
                Nombre de la evaluacion
              </label>
              <select
                className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none transition-all"
                value={evaluacionNombre}
                onChange={(e) => setEvaluacionNombre(e.target.value)}
              >
                <option value="">Elegir...</option>
                {EVALUACIONES.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
                Tipo (opcional)
              </label>
              <select
                className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none transition-all"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option value="">Sin tipo</option>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={continuar}
              disabled={!puedeContinuar || isLoading}
              className="w-full p-4 bg-[#5D9AD4] text-white font-black text-lg rounded-2xl hover:scale-[1.01] transition-all disabled:opacity-60 disabled:hover:scale-100"
            >
              {isLoading ? "CARGANDO..." : "CONTINUAR"}
            </button>
            <button
              onClick={() =>
                resetToStart({
                  type: "info",
                  text: "Carga cancelada. No se guardaron cambios.",
                })
              }
              disabled={isLoading}
              className="w-full p-4 bg-slate-200 text-slate-800 font-black text-lg rounded-2xl hover:bg-slate-300 transition-colors disabled:opacity-60"
            >
              CANCELAR
            </button>
          </div>
        </section>
      )}

      {step === "carga" && (
        <section className="mt-8 space-y-6">
          <div className="rounded-3xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-900">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="text-left p-3">Legajo</th>
                    <th className="text-left p-3">Apellido</th>
                    <th className="text-left p-3">Nombre</th>
                    <th className="text-left p-3">Nota (0 a 10)</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {alumnos.map((alumno) => (
                    <tr key={alumno.alumnoId} className="border-t border-slate-100">
                      <td className="p-3 font-mono">{alumno.legajo}</td>
                      <td className="p-3">{alumno.apellido}</td>
                      <td className="p-3">{alumno.nombre}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          min={0}
                          max={10}
                          step={0.1}
                          value={alumno.nota}
                          onChange={(e) => onChangeNota(alumno.alumnoId, e.target.value)}
                          className="w-32 p-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#5D9AD4] outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={guardarNotas}
              disabled={isLoading}
              className="w-full p-4 bg-green-600 text-white font-black text-lg rounded-2xl hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {isLoading ? "GUARDANDO..." : "GUARDAR NOTAS"}
            </button>
            <button
              onClick={() =>
                resetToStart({
                  type: "info",
                  text: "Carga cancelada. No se guardaron cambios.",
                })
              }
              disabled={isLoading}
              className="w-full p-4 bg-slate-200 text-slate-800 font-black text-lg rounded-2xl hover:bg-slate-300 transition-colors disabled:opacity-60"
            >
              CANCELAR
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

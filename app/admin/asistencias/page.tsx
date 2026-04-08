"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import StatusBanner from "@/components/admin/StatusBanner";
import {
  CondicionAsistencia,
  EstadoAsistencia,
  getCondicionAsistencia,
} from "@/lib/asistencia/rules";
import type { Rol } from "@/types/database";

type Materia = {
  id: number;
  nombre: string;
  codigo?: string | null;
};

type MateriaDocenteRow = {
  materias: Materia | Materia[] | null;
};

type AlumnoFila = {
  alumnoId: number;
  legajo: string;
  apellido: string;
  nombre: string;
  estado: EstadoAsistencia;
  condicion: CondicionAsistencia | null;
};

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

const UMBRAL_PORCENTAJE = 75;
const MIN_CLASES_PARA_LIBRE = 3;
const JUSTIFICADO_CUENTA_COMO_PRESENTE = true;
const CURRENT_YEAR = new Date().getFullYear();

const getToday = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function CargarAsistenciaPage() {
  const today = getToday();
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [materiaId, setMateriaId] = useState("");
  const [anio, setAnio] = useState(String(CURRENT_YEAR));
  const [fecha, setFecha] = useState(today);
  const [tema, setTema] = useState("");
  const [claseId, setClaseId] = useState<string | null>(null);
  const [alumnos, setAlumnos] = useState<AlumnoFila[]>([]);
  const [totalClases, setTotalClases] = useState<number>(0);
  const [presentesBaseMap, setPresentesBaseMap] = useState<Map<number, number>>(
    new Map()
  );
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"seleccion" | "carga">("seleccion");

  const puedeContinuar = useMemo(
    () => Boolean(materiaId && anio && fecha),
    [materiaId, anio, fecha]
  );

  useEffect(() => {
    const loadMaterias = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      let rol: Rol | null = null;

      if (userId) {
        const { data: perfilData } = await supabase
          .from("perfiles")
          .select("rol")
          .eq("id", userId)
          .maybeSingle();
        rol = (perfilData?.rol as Rol) ?? null;
      }

      const query =
        rol === "admin"
          ? supabase.from("materias").select("id, nombre, codigo")
          : userId
          ? supabase
              .from("materias_docentes")
              .select("materias(id, nombre, codigo)")
              .eq("user_id", userId)
          : null;

      if (!query) {
        setStatusMessage({
          type: "info",
          text: "No se pudo identificar el usuario actual.",
        });
        return;
      }

      const { data, error } = await query;

      if (error) {
        setStatusMessage({
          type: "error",
          text: `No se pudieron cargar materias: ${error.message}`,
        });
        return;
      }

      const materiasList =
        rol === "admin"
          ? ((data ?? []) as Materia[])
          : ((data ?? []) as MateriaDocenteRow[]).flatMap(({ materias }) =>
              Array.isArray(materias) ? materias : materias ? [materias] : []
            );

      setMaterias(materiasList);
      if (materiasList.length === 0) {
        setStatusMessage({
          type: "info",
          text: "No hay materias cargadas en base de datos.",
        });
      }
    };

    void loadMaterias();
  }, []);

  const resetToStart = (message?: StatusMessage) => {
    setStep("seleccion");
    setClaseId(null);
    setAlumnos([]);
    setTotalClases(0);
    setPresentesBaseMap(new Map());
    if (message) setStatusMessage(message);
  };

  const onChangeEstado = (alumnoId: number, estado: EstadoAsistencia) => {
    setAlumnos((prev) =>
      prev.map((a) => {
        if (a.alumnoId !== alumnoId) return a;
        const base = presentesBaseMap.get(alumnoId) ?? 0;
        const presentesEquivalentes =
          base +
          (estado === "ausente" || (!JUSTIFICADO_CUENTA_COMO_PRESENTE && estado === "justificado")
            ? 0
            : 1);
        const condicion = getCondicionAsistencia({
          totalClases,
          presentesEquivalentes,
          umbralPorcentaje: UMBRAL_PORCENTAJE,
          minClasesParaLibre: MIN_CLASES_PARA_LIBRE,
        });
        return { ...a, estado, condicion };
      })
    );
  };

  const continuar = async () => {
    if (!puedeContinuar) {
      setStatusMessage({
        type: "error",
        text: "Completa Materia, Año y Fecha.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const materiaIdNum = Number(materiaId);

      const anioValue = Number(anio);

      const { data: claseData, error: claseError } = await supabase
        .from("clases")
        .select("id")
        .eq("materia_id", materiaIdNum)
        .eq("anio", anioValue)
        .eq("fecha", fecha)
        .maybeSingle();

      if (claseError) throw claseError;

      const claseIdValue = claseData?.id ? String(claseData.id) : null;
      setClaseId(claseIdValue);

      const { data: alumnosData, error: alumnosError } = await supabase
        .from("alumno_materia_anio")
        .select("alumno_id, alumnos(id, legajo, nombre, apellido)")
        .eq("materia_id", materiaIdNum)
        .eq("anio", anioValue);

      if (alumnosError) throw alumnosError;

      const alumnosBase = (alumnosData ?? [])
        .map((row) => {
          const alumnoRaw = Array.isArray(row.alumnos) ? row.alumnos[0] : row.alumnos;
          if (!alumnoRaw) return null;

          return {
            alumnoId: Number(alumnoRaw.id),
            legajo: String(alumnoRaw.legajo),
            apellido: String(alumnoRaw.apellido),
            nombre: String(alumnoRaw.nombre),
          };
        })
        .filter(
          (row): row is { alumnoId: number; legajo: string; apellido: string; nombre: string } =>
            row !== null
        )
        .sort((a, b) => a.apellido.localeCompare(b.apellido));

      if (alumnosBase.length === 0) {
        setStatusMessage({
          type: "info",
          text: "No hay alumnos vinculados a esa materia y año.",
        });
        return;
      }

      const asistenciasMap = new Map<number, EstadoAsistencia>();
      if (claseIdValue) {
        const { data: asistenciasData, error: asistenciasError } = await supabase
          .from("asistencias")
          .select("alumno_id, estado")
          .eq("clase_id", claseIdValue);

        if (asistenciasError) throw asistenciasError;

        (asistenciasData ?? []).forEach((row) => {
          asistenciasMap.set(Number(row.alumno_id), row.estado as EstadoAsistencia);
        });
      }

      const { data: clasesData, error: clasesDataError } = await supabase
        .from("clases")
        .select("id")
        .eq("materia_id", materiaIdNum)
        .eq("anio", anioValue);

      if (clasesDataError) throw clasesDataError;

      const clasesIds = (clasesData ?? []).map((c) => String(c.id));
      const totalClasesValue = clasesIds.length + (claseIdValue ? 0 : 1);
      setTotalClases(totalClasesValue);

      const presentesEquivalentesMap = new Map<number, number>();
      if (clasesIds.length > 0) {
        const claseIdsSinActual = claseIdValue
          ? clasesIds.filter((id) => id !== claseIdValue)
          : clasesIds;

        if (claseIdsSinActual.length > 0) {
          const { data: asistenciasHistoricas, error: asistenciasHistoricasError } = await supabase
            .from("asistencias")
            .select("alumno_id, estado")
            .in(
              "alumno_id",
              alumnosBase.map((a) => a.alumnoId)
            )
            .in("clase_id", claseIdsSinActual);

          if (asistenciasHistoricasError) throw asistenciasHistoricasError;

          (asistenciasHistoricas ?? []).forEach((row) => {
            const alumnoId = Number(row.alumno_id);
            const estado = row.estado as EstadoAsistencia;
            const suma =
              estado === "ausente" || (!JUSTIFICADO_CUENTA_COMO_PRESENTE && estado === "justificado")
                ? 0
                : 1;
            presentesEquivalentesMap.set(
              alumnoId,
              (presentesEquivalentesMap.get(alumnoId) ?? 0) + suma
            );
          });
        }
      }

      setPresentesBaseMap(presentesEquivalentesMap);

      const filas: AlumnoFila[] = alumnosBase.map((alumno) => {
        const estado = asistenciasMap.get(alumno.alumnoId) ?? "presente";
        const base = presentesEquivalentesMap.get(alumno.alumnoId) ?? 0;
        const presentesEquivalentes =
          base +
          (estado === "ausente" || (!JUSTIFICADO_CUENTA_COMO_PRESENTE && estado === "justificado")
            ? 0
            : 1);
        const condicion = getCondicionAsistencia({
          totalClases: totalClasesValue,
          presentesEquivalentes,
          umbralPorcentaje: UMBRAL_PORCENTAJE,
          minClasesParaLibre: MIN_CLASES_PARA_LIBRE,
        });

        return {
          ...alumno,
          estado,
          condicion,
        };
      });

      setAlumnos(filas);
      setStep("carga");
      setStatusMessage({
        type: "info",
        text: "Lista cargada. Marca Presente/Ausente/Justificado por alumno.",
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

  const guardarAsistencia = async () => {
    if (!materiaId || !anio) {
      setStatusMessage({
        type: "error",
        text: "No hay curso seleccionado para guardar asistencia.",
      });
      return;
    }

    setIsLoading(true);
    try {
      let claseIdValue = claseId;
      if (!claseIdValue) {
        const { data: nuevaClase, error: insertClaseError } = await supabase
          .from("clases")
          .insert({
            materia_id: Number(materiaId),
            anio: Number(anio),
            fecha,
            tema: tema.trim() === "" ? null : tema.trim(),
          })
          .select("id")
          .single();

        if (insertClaseError) throw insertClaseError;
        claseIdValue = String(nuevaClase.id);
        setClaseId(claseIdValue);
      }

      const payload = alumnos.map((alumno) => ({
        clase_id: claseIdValue,
        alumno_id: alumno.alumnoId,
        estado: alumno.estado,
      }));

      const { error } = await supabase
        .from("asistencias")
        .upsert(payload, { onConflict: "clase_id,alumno_id" });

      if (error) throw error;

      resetToStart({
        type: "success",
        text: `Asistencia guardada correctamente para ${alumnos.length} alumnos.`,
      });
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `Error al guardar asistencia: ${message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen bg-white">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Carga de Asistencia
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          Selecciona materia y comisión, luego marca Presente/Ausente/Justificado.
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
                {materias.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
                Año
              </label>
              <input
                type="number"
                min={1900}
                max={CURRENT_YEAR}
                className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none transition-all"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
                Curso interno
              </label>
              <div className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-500">
                Automático por materia y año
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
                Fecha
              </label>
              <input
                type="date"
                max={today}
                className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none transition-all"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
                Tema (opcional)
              </label>
              <input
                type="text"
                className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none transition-all"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="Unidad, tema o práctica"
              />
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
                    <th className="text-left p-3">Estado</th>
                    <th className="text-left p-3">Condición</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {alumnos.map((alumno) => (
                    <tr key={alumno.alumnoId} className="border-t border-slate-100">
                      <td className="p-3 font-mono">{alumno.legajo}</td>
                      <td className="p-3">{alumno.apellido}</td>
                      <td className="p-3">{alumno.nombre}</td>
                      <td className="p-3">
                        <select
                          value={alumno.estado}
                          disabled={isLoading}
                          onChange={(e) =>
                            onChangeEstado(alumno.alumnoId, e.target.value as EstadoAsistencia)
                          }
                          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-[#5D9AD4] outline-none"
                        >
                          <option value="presente">Presente</option>
                          <option value="ausente">Ausente</option>
                          <option value="justificado">Justificado</option>
                        </select>
                      </td>
                      <td className="p-3 text-sm">
                        {alumno.condicion ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-900">
                              {alumno.condicion.porcentaje}%
                            </div>
                            <div
                              className={
                                alumno.condicion.estado === "libre"
                                  ? "text-red-600"
                                  : alumno.condicion.estado === "en_riesgo"
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }
                            >
                              {alumno.condicion.mensaje}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">Sin datos</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={guardarAsistencia}
              disabled={isLoading}
              className="w-full p-4 bg-green-600 text-white font-black text-lg rounded-2xl hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {isLoading ? "GUARDANDO..." : "GUARDAR ASISTENCIA"}
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

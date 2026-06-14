"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { apiClient } from "@/lib/apiClient";
import StatusBanner from "@/components/admin/StatusBanner";
import {
  CondicionAsistencia,
  EstadoAsistencia,
  getCondicionAsistencia,
} from "@/lib/asistencia/rules";
import { getAccessibleMaterias, type Materia } from "@/lib/materias";

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
  const { user, role, isLoadingProfile } = useAuth();
  const today = getToday();
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [materiaId, setMateriaId] = useState("");
  const [anio, setAnio] = useState(String(CURRENT_YEAR));
  const [fecha, setFecha] = useState(today);
  const [tema, setTema] = useState("");
  const [claseId, setClaseId] = useState<string | null>(null);
  const [alumnos, setAlumnos] = useState<AlumnoFila[]>([]);
  const [totalClases, setTotalClases] = useState<number>(0);
  const [presentesBaseMap, setPresentesBaseMap] = useState<Map<number, number>>(new Map());
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"seleccion" | "carga">("seleccion");

  const puedeContinuar = useMemo(() => Boolean(materiaId && anio && fecha), [materiaId, anio, fecha]);
  const selectedMateria =
    materiaId === ""
      ? null
      : materias.find((materia) => String(materia.id) === materiaId) ?? null;

  useEffect(() => {
    const loadMaterias = async () => {
      if (isLoadingProfile) return;
      if (!user?.id || !role) {
        setStatusMessage({
          type: "info",
          text: "No se pudo identificar el usuario actual.",
        });
        return;
      }

      try {
        const materiasList = await getAccessibleMaterias(user.id, role);
        setMaterias(materiasList);
        if (materiasList.length === 0) {
          setStatusMessage({
            type: "info",
            text: "No hay materias cargadas en la base.",
          });
        }
      } catch (error: unknown) {
        const message =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : "Error desconocido";
        setStatusMessage({
          type: "error",
          text: `No se pudieron cargar materias: ${message}`,
        });
      }
    };

    void loadMaterias();
  }, [isLoadingProfile, role, user?.id]);

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
        text: "Complete la materia, el año y la fecha.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const materiaIdNum = Number(materiaId);
      const anioValue = Number(anio);

      const { data: claseData, error: claseError } = await apiClient
        .from("clases")
        .select("id")
        .eq("materia_id", materiaIdNum)
        .eq("anio", anioValue)
        .eq("fecha", fecha)
        .maybeSingle();

      if (claseError) throw claseError;

      const claseIdValue = claseData?.id ? String(claseData.id) : null;
      setClaseId(claseIdValue);

      const { data: alumnosData, error: alumnosError } = await apiClient
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
        const { data: asistenciasData, error: asistenciasError } = await apiClient
          .from("asistencias")
          .select("alumno_id, estado")
          .eq("clase_id", claseIdValue);

        if (asistenciasError) throw asistenciasError;

        (asistenciasData ?? []).forEach((row) => {
          asistenciasMap.set(Number(row.alumno_id), row.estado as EstadoAsistencia);
        });
      }

      const { data: clasesData, error: clasesDataError } = await apiClient
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
          const { data: asistenciasHistoricas, error: asistenciasHistoricasError } = await apiClient
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
        text: "Lista cargada. Marque presente, ausente o justificado por alumno.",
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
        const { data: nuevaClase, error: insertClaseError } = await apiClient
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

      const { error } = await apiClient
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
    <div className="min-h-screen max-w-5xl mx-auto bg-white p-8">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Asistencias</h1>
        <p className="mt-2 font-medium text-slate-500">
          Seleccione la materia y el curso, y después marque presente, ausente o justificado.
        </p>
      </header>

      {statusMessage && <StatusBanner message={statusMessage} />}

      {step === "seleccion" && (
        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6 rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Paso 1
              </p>
              <h2 className="mt-3 text-2xl font-black text-slate-900">Configurá la clase</h2>
              <p className="mt-2 text-sm text-slate-600">
                Defina la materia, el año, la fecha y el tema antes de cargar la lista para tomar asistencia.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
                  Materia
                </label>
                <select
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-slate-900 outline-none transition-all focus:border-[#5D9AD4]"
                  value={materiaId}
                  onChange={(e) => setMateriaId(e.target.value)}
                  aria-label="Seleccionar materia para cargar asistencias"
                >
                  <option value="">Seleccione una materia...</option>
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
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-slate-900 outline-none transition-all focus:border-[#5D9AD4]"
                  value={anio}
                  onChange={(e) => setAnio(e.target.value)}
                  aria-label="Ingresar año para cargar asistencias"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
                  Curso interno
                </label>
                <div className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-slate-500">
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
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-slate-900 outline-none transition-all focus:border-[#5D9AD4]"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  aria-label="Seleccionar fecha de la clase"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
                  Tema
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-slate-900 outline-none transition-all focus:border-[#5D9AD4]"
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  placeholder="Unidad, tema o práctica"
                  aria-label="Ingresar tema opcional de la clase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                onClick={continuar}
                disabled={!puedeContinuar || isLoading}
                className="w-full rounded-2xl bg-[#5D9AD4] p-4 text-lg font-black text-white transition-all hover:scale-[1.01] disabled:opacity-60 disabled:hover:scale-100"
              >
                {isLoading ? "CARGANDO..." : "CARGAR LISTA DEL CURSO"}
              </button>
              <button
                onClick={() =>
                  resetToStart({
                    type: "info",
                    text: "Carga cancelada. No se guardaron cambios.",
                  })
                }
                disabled={isLoading}
                className="w-full rounded-2xl bg-slate-200 p-4 text-lg font-black text-slate-800 transition-colors hover:bg-slate-300 disabled:opacity-60"
              >
                CANCELAR CARGA
              </button>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              Contexto actual
            </p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Materia
                </div>
                <div className="mt-2 text-lg font-black text-slate-900">
                  {selectedMateria?.nombre ?? "Sin seleccionar"}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Año
                </div>
                <div className="mt-2 text-lg font-black text-slate-900">{anio || "—"}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Fecha
                </div>
                <div className="mt-2 text-sm font-black text-slate-900">{fecha || "—"}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Estado
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-700">
                  {puedeContinuar
                    ? "Configuración lista para cargar asistencia"
                    : "Complete la materia, el año y la fecha para continuar"}
                </div>
              </div>
            </div>
          </aside>
        </section>
      )}

      {step === "carga" && (
        <section className="mt-8 space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  Paso 2
                </p>
                <h2 className="mt-3 text-2xl font-black text-slate-900">
                  Tomar y revisar asistencia
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Marque presente, ausente o justificado por alumno y revise la condición acumulada
                  antes de guardar la clase.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[24rem]">
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Materia
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-900">
                    {selectedMateria?.nombre ?? "—"}
                  </div>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Fecha
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-900">{fecha}</div>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Alumnos
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-900">{alumnos.length}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-900">
                <caption className="sr-only">
                  Tabla de asistencia por alumno con selector de estado y condición acumulada.
                </caption>
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-3 text-left">Legajo</th>
                    <th className="p-3 text-left">Apellido</th>
                    <th className="p-3 text-left">Nombre</th>
                    <th className="p-3 text-left">Estado</th>
                    <th className="p-3 text-left">Condición</th>
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
                          aria-label={`Estado de asistencia de ${alumno.apellido} ${alumno.nombre}`}
                          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-900 outline-none focus:border-[#5D9AD4]"
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

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              onClick={guardarAsistencia}
              disabled={isLoading}
              className="w-full rounded-2xl bg-green-600 p-4 text-lg font-black text-white transition-colors hover:bg-green-700 disabled:opacity-60"
            >
              {isLoading ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
            </button>
            <button
              onClick={() =>
                resetToStart({
                  type: "info",
                  text: "Carga cancelada. No se guardaron cambios.",
                })
              }
              disabled={isLoading}
              className="w-full rounded-2xl bg-slate-200 p-4 text-lg font-black text-slate-800 transition-colors hover:bg-slate-300 disabled:opacity-60"
            >
              VOLVER A CONFIGURACION
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import InlineSelect from "@/components/admin/InlineSelect";
import { apiClient } from "@/lib/apiClient";
import StatusBanner from "@/components/admin/StatusBanner";
import {
  EvaluacionNombre,
  TipoEvaluacion,
  formatNota,
  getAlertaCalificacion,
  getHabilitacionRecuperatorio,
  isNotaEnRango,
} from "@/lib/notas/rules";
import { getAccessibleMaterias, type Materia } from "@/lib/materias";
import LoaderOverlay from "@/components/ui/LoaderOverlay";

type NotaRow = {
  alumno_id: number;
  nota: number | null;
  ausente: boolean;
};

type AlumnoFila = {
  alumnoId: number;
  legajo: string;
  apellido: string;
  nombre: string;
  nota: string;
  ausente: boolean;
  alertaEstado: "en_riesgo" | "libre" | null;
  alertaMensaje: string | null;
  habilitado: boolean;
  motivoBloqueo: string | null;
};

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

const EVALUACIONES: EvaluacionNombre[] = ["Parcial1", "Parcial2", "Integrador"];
const TIPOS: TipoEvaluacion[] = ["Parcial", "Recuperatorio"];
const CURRENT_YEAR = new Date().getFullYear();
const EVALUACION_OPTIONS = EVALUACIONES.map((value) => ({ value, label: value }));
const TIPO_OPTIONS = TIPOS.map((value) => ({ value, label: value }));

const parseNotaInput = (value: string): number | null => {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export default function CargarNotasPage() {
  const { user, role, isLoadingProfile } = useAuth();
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [materiaId, setMateriaId] = useState("");
  const [anio, setAnio] = useState(String(CURRENT_YEAR));
  const [evaluacionNombre, setEvaluacionNombre] = useState<EvaluacionNombre | "">("");
  const [tipo, setTipo] = useState<TipoEvaluacion>("Parcial");
  const [alumnos, setAlumnos] = useState<AlumnoFila[]>([]);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"seleccion" | "carga">("seleccion");

  const puedeContinuar = useMemo(
    () => Boolean(materiaId && anio && evaluacionNombre && tipo),
    [materiaId, anio, evaluacionNombre, tipo]
  );

  const materiasMostradas = materias;
  const selectedMateria =
    materiaId === ""
      ? null
      : materias.find((materia) => String(materia.id) === materiaId) ?? null;
  const alumnosHabilitadosCount = alumnos.filter((alumno) => alumno.habilitado).length;

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
    setAlumnos([]);
    if (message) setStatusMessage(message);
  };

  const onChangeNota = (alumnoId: number, nota: string) => {
    setAlumnos((prev) =>
      prev.map((a) =>
        a.alumnoId === alumnoId
          ? (() => {
              const nextAusente = nota.trim() === "" ? a.ausente : false;
              const alerta = getAlertaCalificacion(tipo, parseNotaInput(nota), nextAusente);
              return {
                ...a,
                nota,
                ausente: nextAusente,
                alertaEstado: alerta.estado,
                alertaMensaje: alerta.mensaje,
              };
            })()
          : a
      )
    );
  };

  const onChangeAusente = (alumnoId: number, checked: boolean) => {
    setAlumnos((prev) =>
      prev.map((a) =>
        a.alumnoId === alumnoId
          ? (() => {
              const nextNota = checked ? "" : a.nota;
              const alerta = getAlertaCalificacion(tipo, parseNotaInput(nextNota), checked);
              return {
                ...a,
                ausente: checked,
                nota: nextNota,
                alertaEstado: alerta.estado,
                alertaMensaje: alerta.mensaje,
              };
            })()
          : a
      )
    );
  };

  const continuar = async () => {
    if (!puedeContinuar || !evaluacionNombre) {
      setStatusMessage({
        type: "error",
        text: "Complete la materia, el año, el nombre de la evaluación y el tipo.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const materiaIdNum = Number(materiaId);
      const anioValue = Number(anio);

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

      const { data: evaluacionActualData, error: evalActualError } = await apiClient
        .from("evaluaciones")
        .select("id")
        .eq("materia_id", materiaIdNum)
        .eq("anio", anioValue)
        .eq("nombre", evaluacionNombre)
        .eq("tipo", tipo)
        .maybeSingle();

      if (evalActualError) throw evalActualError;

      const notasActualMap = new Map<number, NotaRow>();
      if (evaluacionActualData?.id) {
        const { data: notasActuales, error: notasActualesError } = await apiClient
          .from("notas")
          .select("alumno_id, nota, ausente")
          .eq("evaluacion_id", Number(evaluacionActualData.id));

        if (notasActualesError) throw notasActualesError;
        (notasActuales ?? []).forEach((n) => {
          notasActualMap.set(Number(n.alumno_id), {
            alumno_id: Number(n.alumno_id),
            nota: n.nota === null ? null : Number(n.nota),
            ausente: Boolean(n.ausente),
          });
        });
      }

      const notasParcialBaseMap = new Map<number, NotaRow>();
      if (tipo === "Recuperatorio") {
        const { data: evalParcialData, error: evalParcialError } = await apiClient
          .from("evaluaciones")
          .select("id")
          .eq("materia_id", materiaIdNum)
          .eq("anio", anioValue)
          .eq("nombre", evaluacionNombre)
          .eq("tipo", "Parcial")
          .maybeSingle();

        if (evalParcialError) throw evalParcialError;

        if (evalParcialData?.id) {
          const { data: notasParcialData, error: notasParcialError } = await apiClient
            .from("notas")
            .select("alumno_id, nota, ausente")
            .eq("evaluacion_id", Number(evalParcialData.id));

          if (notasParcialError) throw notasParcialError;
          (notasParcialData ?? []).forEach((n) => {
            notasParcialBaseMap.set(Number(n.alumno_id), {
              alumno_id: Number(n.alumno_id),
              nota: n.nota === null ? null : Number(n.nota),
              ausente: Boolean(n.ausente),
            });
          });
        }
      }

      const filas: AlumnoFila[] = alumnosBase.map((alumno) => {
        const notaActual = notasActualMap.get(alumno.alumnoId);

        let habilitado = true;
        let motivoBloqueo: string | null = null;

        if (tipo === "Recuperatorio") {
          const notaParcial = notasParcialBaseMap.get(alumno.alumnoId);
          const result = getHabilitacionRecuperatorio(
            notaParcial?.nota ?? null,
            notaParcial?.ausente ?? false,
            evaluacionNombre
          );
          habilitado = result.habilitado;
          motivoBloqueo = result.motivoBloqueo;
        }

        const alerta = getAlertaCalificacion(
          tipo,
          notaActual?.nota ?? null,
          notaActual?.ausente ?? false
        );

        return {
          ...alumno,
          nota: formatNota(notaActual?.nota ?? null),
          ausente: notaActual?.ausente ?? false,
          alertaEstado: alerta.estado,
          alertaMensaje: alerta.mensaje,
          habilitado,
          motivoBloqueo,
        };
      });

      setAlumnos(filas);
      setStep("carga");

      const habilitados = filas.filter((f) => f.habilitado).length;
      if (tipo === "Recuperatorio") {
        setStatusMessage({
          type: "info",
          text: `Lista cargada. Habilitados para recuperatorio: ${habilitados}/${filas.length}.`,
        });
      } else {
        setStatusMessage({
          type: "info",
          text: "Lista cargada. Complete una nota de 1 a 10 o marque ausente por alumno.",
        });
      }
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

  const guardarNotas = async () => {
    if (!materiaId || !anio || !evaluacionNombre) {
      setStatusMessage({
        type: "error",
        text: "No hay curso ni evaluación seleccionados para guardar notas.",
      });
      return;
    }

    const alumnosHabilitados = alumnos.filter((a) => a.habilitado);
    if (alumnosHabilitados.length === 0) {
      setStatusMessage({
        type: "error",
        text: "No hay alumnos habilitados para guardar en esta evaluación.",
      });
      return;
    }

    for (const alumno of alumnosHabilitados) {
      if (!alumno.ausente && alumno.nota.trim() === "") {
        setStatusMessage({
          type: "error",
          text: "En los alumnos habilitados debe cargar una nota o marcar ausente.",
        });
        return;
      }

      if (!alumno.ausente) {
        const notaNum = Number(alumno.nota);
        if (!isNotaEnRango(notaNum)) {
          setStatusMessage({
            type: "error",
            text: "Cada nota tiene que estar entre 1 y 10.",
          });
          return;
        }
      }
    }

    setIsLoading(true);
    try {
      const { data: evaluacionExistente, error: evalSelectError } = await apiClient
        .from("evaluaciones")
        .select("id")
        .eq("materia_id", Number(materiaId))
        .eq("anio", Number(anio))
        .eq("nombre", evaluacionNombre)
        .eq("tipo", tipo)
        .maybeSingle();

      if (evalSelectError) throw evalSelectError;

      let evaluacionId: number;
      if (evaluacionExistente?.id) {
        evaluacionId = Number(evaluacionExistente.id);
      } else {
        const { data: evaluacionNueva, error: evalInsertError } = await apiClient
          .from("evaluaciones")
          .insert({
            materia_id: Number(materiaId),
            anio: Number(anio),
            nombre: evaluacionNombre,
            tipo,
          })
          .select("id")
          .single();

        if (evalInsertError) throw evalInsertError;
        evaluacionId = Number(evaluacionNueva.id);
      }

      const payload = alumnosHabilitados.map((alumno) => ({
        evaluacion_id: evaluacionId,
        alumno_id: alumno.alumnoId,
        nota: alumno.ausente ? null : Number(alumno.nota),
        ausente: alumno.ausente,
      }));

      const { error: notasError } = await apiClient
        .from("notas")
        .upsert(payload, { onConflict: "evaluacion_id,alumno_id" });

      if (notasError) throw notasError;

      setStatusMessage({
        type: "success",
        text: `Notas guardadas correctamente para ${alumnosHabilitados.length} alumnos habilitados.`,
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
    <div className="min-h-screen max-w-5xl mx-auto bg-white p-8">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Notas</h1>
        <p className="mt-2 font-medium text-slate-500">
          Seleccione la evaluación y cargue una nota de 1 a 10 o ausente por alumno.
        </p>
      </header>

      {statusMessage && <StatusBanner message={statusMessage} />}

      {step === "seleccion" && (
        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="relative space-y-6 rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
            <LoaderOverlay isLoading={isLoading} message="Cargando alumnos..." />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Paso 1
              </p>
              <h2 className="mt-3 text-2xl font-black text-slate-900">Configurá la evaluación</h2>
              <p className="mt-2 text-sm text-slate-600">
                Defina la materia, el año, la evaluación y el tipo antes de cargar la lista de alumnos.
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
                  aria-label="Seleccionar materia para cargar notas"
                >
                  <option value="">Seleccione una materia...</option>
                  {materiasMostradas.map((m) => (
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
                  aria-label="Ingresar año para cargar notas"
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
                  Nombre de la evaluación
                </label>
                <InlineSelect
                  value={evaluacionNombre}
                  onChange={setEvaluacionNombre}
                  options={EVALUACION_OPTIONS}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
                  Tipo
                </label>
                <InlineSelect value={tipo} onChange={setTipo} options={TIPO_OPTIONS} />
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
                  Evaluación
                </div>
                <div className="mt-2 text-sm font-black text-slate-900">
                  {evaluacionNombre || "Sin seleccionar"} · {tipo}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Estado
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-700">
                  {puedeContinuar
                    ? "Configuración lista para cargar alumnos"
                    : "Complete todos los campos para continuar"}
                </div>
              </div>
            </div>
          </aside>
        </section>
      )}

      {step === "carga" && (
        <section className="relative mt-8 space-y-6">
          <LoaderOverlay isLoading={isLoading} message="Guardando notas..." className="rounded-3xl" />
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  Paso 2
                </p>
                <h2 className="mt-3 text-2xl font-black text-slate-900">
                  Cargar y revisar notas
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Complete una nota entre 1 y 10 o marque ausente. Los alumnos no habilitados
                  aparecen bloqueados con su motivo.
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
                    Evaluación
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-900">
                    {evaluacionNombre} · {tipo}
                  </div>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Habilitados
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-900">
                    {alumnosHabilitadosCount}/{alumnos.length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-900">
                <caption className="sr-only">
                  Tabla de carga de notas por alumno con campos para nota y estado de ausencia.
                </caption>
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-3 text-left">Legajo</th>
                    <th className="p-3 text-left">Apellido</th>
                    <th className="p-3 text-left">Nombre</th>
                    <th className="p-3 text-left">Nota (1 a 10)</th>
                    <th className="p-3 text-left">Ausente</th>
                    <th className="p-3 text-left">Alerta</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {alumnos.map((alumno) => (
                    <tr
                      key={alumno.alumnoId}
                      className={`border-t border-slate-100 ${alumno.habilitado ? "" : "bg-slate-50"}`}
                    >
                      <td className="p-3 font-mono">{alumno.legajo}</td>
                      <td className="p-3">{alumno.apellido}</td>
                      <td className="p-3">
                        <div className="font-medium">{alumno.nombre}</div>
                        {!alumno.habilitado && alumno.motivoBloqueo && (
                          <div className="mt-1 text-xs text-slate-500">{alumno.motivoBloqueo}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min={1}
                          max={10}
                          step={0.1}
                          value={alumno.nota}
                          disabled={!alumno.habilitado || alumno.ausente || isLoading}
                          onChange={(e) => onChangeNota(alumno.alumnoId, e.target.value)}
                          aria-label={`Nota de ${alumno.apellido} ${alumno.nombre}`}
                          className="w-32 rounded-xl border border-slate-200 bg-white p-2 text-slate-900 outline-none focus:border-[#5D9AD4] placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>
                      <td className="p-3">
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={alumno.ausente}
                            disabled={!alumno.habilitado || isLoading}
                            onChange={(e) => onChangeAusente(alumno.alumnoId, e.target.checked)}
                            aria-label={`Marcar ausente a ${alumno.apellido} ${alumno.nombre}`}
                            className="h-4 w-4"
                          />
                          <span className={alumno.habilitado ? "text-slate-700" : "text-slate-400"}>
                            Ausente
                          </span>
                        </label>
                      </td>
                      <td className="p-3">
                        {alumno.alertaEstado ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                              alumno.alertaEstado === "libre"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {alumno.alertaMensaje}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Sin alerta</span>
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
              onClick={guardarNotas}
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

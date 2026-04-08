"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import StatusBanner from "@/components/admin/StatusBanner";
import {
  EvaluacionNombre,
  TipoEvaluacion,
  formatNota,
  getAlertaCalificacion,
  getHabilitacionRecuperatorio,
  isNotaEnRango,
} from "@/lib/notas/rules";
import type { Rol } from "@/types/database";

type Materia = {
  id: number;
  nombre: string;
  codigo?: string | null;
};

type MateriaDocenteRow = {
  materias: Materia | Materia[] | null;
};

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

const parseNotaInput = (value: string): number | null => {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export default function CargarNotasPage() {
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
        text: "Completa Materia, Año, Nombre de evaluación y Tipo.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const materiaIdNum = Number(materiaId);

      const anioValue = Number(anio);

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

      const { data: evaluacionActualData, error: evalActualError } = await supabase
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
        const { data: notasActuales, error: notasActualesError } = await supabase
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
        const { data: evalParcialData, error: evalParcialError } = await supabase
          .from("evaluaciones")
          .select("id")
          .eq("materia_id", materiaIdNum)
          .eq("anio", anioValue)
          .eq("nombre", evaluacionNombre)
          .eq("tipo", "Parcial")
          .maybeSingle();

        if (evalParcialError) throw evalParcialError;

        if (evalParcialData?.id) {
          const { data: notasParcialData, error: notasParcialError } = await supabase
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
          text: `Lista cargada. Habilitados para recuperatorio: ${habilitados}/${filas.length}. Solo se permiten alumnos con nota < 4, ausente o sin nota en el parcial base.`,
        });
      } else {
        setStatusMessage({
          type: "info",
          text: "Lista cargada. Completa una nota entre 1 y 10 o marca Ausente por alumno.",
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
        text: "No hay curso/evaluación seleccionada para guardar notas.",
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
          text: "En alumnos habilitados debes cargar nota (1 a 10) o marcar Ausente.",
        });
        return;
      }

      if (!alumno.ausente) {
        const notaNum = Number(alumno.nota);
        if (!isNotaEnRango(notaNum)) {
          setStatusMessage({
            type: "error",
            text: "Cada nota debe estar entre 1 y 10.",
          });
          return;
        }
      }
    }

    setIsLoading(true);
    try {
      const { data: evaluacionExistente, error: evalSelectError } = await supabase
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
        const { data: evaluacionNueva, error: evalInsertError } = await supabase
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

      const { error: notasError } = await supabase
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
    <div className="p-8 max-w-5xl mx-auto min-h-screen bg-white">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Carga de Notas</h1>
        <p className="text-slate-500 mt-2 font-medium">
          Selecciona evaluación y registra una nota (1 a 10) o ausente por alumno.
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
                Nombre de la evaluación
              </label>
              <select
                className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none transition-all"
                value={evaluacionNombre}
                onChange={(e) => setEvaluacionNombre(e.target.value as EvaluacionNombre)}
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
                Tipo
              </label>
              <select
                className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none transition-all"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoEvaluacion)}
              >
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
                    <th className="text-left p-3">Nota (1 a 10)</th>
                    <th className="text-left p-3">Ausente</th>
                    <th className="text-left p-3">Alerta</th>
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
                          <div className="text-xs text-slate-500 mt-1">{alumno.motivoBloqueo}</div>
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
                          className="w-32 p-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#5D9AD4] outline-none disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>
                      <td className="p-3">
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={alumno.ausente}
                            disabled={!alumno.habilitado || isLoading}
                            onChange={(e) => onChangeAusente(alumno.alumnoId, e.target.checked)}
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

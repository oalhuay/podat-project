"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/lib/supabase";
import { parseAlumnoDisplay, parseAlumnosFromFile } from "@/lib/import/alumnos/parseExcel";
import type { ImportResult, ImportStatus, ParsedAlumnoRow } from "@/lib/import/alumnos/types";
import {
  ejecutarImportPlan,
  prepararImportAlumnos,
  toImportAlumnosDbClient,
  type ImportPlan,
} from "@/lib/import/alumnos/importAlumnos";
import {
  formatNota,
  getAlertaCalificacion,
  getHabilitacionRecuperatorio,
  isNotaEnRango,
  type EvaluacionNombre,
  type TipoEvaluacion,
} from "@/lib/notas/rules";
import {
  getCondicionAsistencia,
  type EstadoAsistencia,
} from "@/lib/asistencia/rules";
import type {
  AsistenciaAlumnoRow,
  ManualRow,
  NotaAlumnoRow,
  StatusMessage,
} from "@/components/admin/alumnos/types";

const UMBRAL_PORCENTAJE = 75;
const MIN_CLASES_PARA_LIBRE = 3;
const JUSTIFICADO_CUENTA_COMO_PRESENTE = true;

const normalizeText = (value: string): string =>
  value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizeCondicion = (value: string): string | null => {
  const normalized = normalizeText(value);
  if (normalized === "regular") return "Regular";
  if (normalized === "libre") return "Libre";
  return null;
};

export const makeManualRow = (): ManualRow => ({
  id: crypto.randomUUID(),
  legajo: "",
  alumno: "",
  genero: "",
  condicion: "Regular",
});

export const toParsedManualRows = (rows: ManualRow[]): ParsedAlumnoRow[] =>
  rows
    .filter((row) => row.legajo || row.alumno || row.genero || row.condicion)
    .map((row) => {
      const alumno = row.alumno.trim();
      const split = parseAlumnoDisplay(alumno);
      return {
        Legajo: row.legajo.trim(),
        Nombre: split.nombre,
        Apellido: split.apellido,
        Alumno: alumno,
        Genero: row.genero.trim(),
        Condicion: row.condicion.trim(),
      };
    });

const validateRows = (rows: ParsedAlumnoRow[]): string | null => {
  if (rows.length === 0) return "No hay filas listas para importar.";
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row.Legajo.trim()) return `Fila ${index + 1}: falta legajo.`;
    if (!row.Alumno.trim()) return `Fila ${index + 1}: falta Alumno.`;
    if (!row.Apellido.trim() || !row.Nombre.trim()) {
      return `Fila ${index + 1}: Alumno debe venir como "Apellido, Nombre".`;
    }
    if (!row.Genero.trim()) return `Fila ${index + 1}: falta género.`;
    if (!normalizeCondicion(row.Condicion)) return `Fila ${index + 1}: condición inválida.`;
  }
  return null;
};

const parseNotaInput = (value: string): number | null => {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

type StatusSetter = Dispatch<SetStateAction<StatusMessage | null>>;

type PadronOptions = {
  selectedMateriaId: number | "";
  anio: string;
  setStatusMessage: StatusSetter;
};

export function usePadronImport({
  selectedMateriaId,
  anio,
  setStatusMessage,
}: PadronOptions) {
  const [sourceMode, setSourceMode] = useState<"excel" | "manual">("excel");
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedAlumnoRow[]>([]);
  const [manualRows, setManualRows] = useState<ManualRow[]>([makeManualRow(), makeManualRow()]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importPlan, setImportPlan] = useState<ImportPlan | null>(null);
  const [statusFilter, setStatusFilter] = useState<"todos" | ImportStatus>("todos");
  const importDbClient = useMemo(
    () => toImportAlumnosDbClient(supabase, { supportsGenero: true }),
    []
  );

  const rowsDisponibles = useMemo(
    () => (sourceMode === "excel" ? parsedRows : toParsedManualRows(manualRows)),
    [manualRows, parsedRows, sourceMode]
  );

  const resetImportState = () => {
    setImportPlan(null);
    setImportResult(null);
    setStatusFilter("todos");
    setArchivo(null);
    setParsedRows([]);
    setManualRows([makeManualRow(), makeManualRow()]);
  };

  const onManualRowChange = (
    rowId: string,
    field: keyof Omit<ManualRow, "id">,
    value: string
  ) => {
    setManualRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  };

  const onAddManualRow = () => {
    setManualRows((prev) => [...prev, makeManualRow()]);
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    try {
      const rows = await parseAlumnosFromFile(file);
      setArchivo(file);
      setParsedRows(rows);
      setImportPlan(null);
      setImportResult(null);
      setStatusFilter("todos");
      setStatusMessage({ type: "info", text: `Archivo listo. Filas detectadas: ${rows.length}.` });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({ type: "error", text: `No se pudo leer el archivo: ${message}` });
      setArchivo(null);
      setParsedRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const preview = async () => {
    const validation = validateRows(rowsDisponibles);
    if (validation) {
      setStatusMessage({ type: "error", text: validation });
      return;
    }
    setIsLoading(true);
    try {
      const plan = await prepararImportAlumnos(rowsDisponibles, importDbClient);
      setImportPlan(plan);
      setImportResult(plan.result);
      setStatusFilter("todos");
      setStatusMessage({ type: "info", text: "Previsualización lista." });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({ type: "error", text: `Error en previsualización: ${message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const vincularAlumnosAMateriaAnio = async (plan: ImportPlan): Promise<void> => {
    const materiaId = Number(selectedMateriaId);
    const anioValue = Number(anio);
    const legajos = Array.from(new Set(plan.aplicables.map((row) => row.legajo).filter(Boolean)));
    if (legajos.length === 0) return;

    const { data: alumnosData, error: alumnosError } = await supabase
      .from("alumnos")
      .select("id, legajo")
      .in("legajo", legajos);
    if (alumnosError) throw alumnosError;

    const alumnoIdByLegajo = new Map(
      (alumnosData ?? []).map((row) => [String(row.legajo), Number(row.id)] as const)
    );

    const payload = plan.aplicables
      .map((row) => {
        const alumnoId = alumnoIdByLegajo.get(row.legajo);
        if (!alumnoId) return null;
        return {
          alumno_id: alumnoId,
          materia_id: materiaId,
          anio: anioValue,
          condicion: row.condicion?.trim() ? row.condicion.trim() : null,
        };
      })
      .filter(
        (
          row
        ): row is {
          alumno_id: number;
          materia_id: number;
          anio: number;
          condicion: string | null;
        } => row !== null
      );

    if (payload.length === 0) return;

    const { error: upsertError } = await supabase
      .from("alumno_materia_anio")
      .upsert(payload, { onConflict: "alumno_id,materia_id,anio" });
    if (upsertError) throw upsertError;
  };

  const confirmImport = async () => {
    if (!importPlan) return;
    setIsLoading(true);
    try {
      await ejecutarImportPlan(importPlan, importDbClient);
      await vincularAlumnosAMateriaAnio(importPlan);
      setImportPlan(null);
      setStatusMessage({ type: "success", text: "Importación aplicada correctamente." });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({ type: "error", text: `Error al guardar: ${message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const onExcelDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const onExcelDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const onExcelDrop = async (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const onExcelFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await processFile(file);
    event.target.value = "";
  };

  const discardImportPreview = () => {
    setImportPlan(null);
    setStatusMessage({ type: "info", text: "Importación cancelada." });
  };

  return {
    sourceMode,
    setSourceMode,
    isDragActive,
    isLoading,
    archivo,
    manualRows,
    importResult,
    importPlan,
    statusFilter,
    setStatusFilter,
    rowsDisponibles,
    resetImportState,
    onManualRowChange,
    onAddManualRow,
    preview,
    confirmImport,
    onExcelDragOver,
    onExcelDragLeave,
    onExcelDrop,
    onExcelFileChange,
    discardImportPreview,
  };
}

type NotasOptions = {
  selectedMateriaId: number | "";
  anio: string;
  hasCursoConfigurado: boolean;
  setStatusMessage: StatusSetter;
};

export function useNotasWorkflow({
  selectedMateriaId,
  anio,
  hasCursoConfigurado,
  setStatusMessage,
}: NotasOptions) {
  const [evaluacionNombre, setEvaluacionNombre] = useState<EvaluacionNombre>("Parcial1");
  const [tipoEvaluacion, setTipoEvaluacion] = useState<TipoEvaluacion>("Parcial");
  const [notasRows, setNotasRows] = useState<NotaAlumnoRow[]>([]);
  const [isNotasReady, setIsNotasReady] = useState(false);
  const [isLoadingNotas, setIsLoadingNotas] = useState(false);

  const resetNotasState = () => {
    setNotasRows([]);
    setIsNotasReady(false);
  };

  const onEvaluacionNombreChange = (value: EvaluacionNombre) => {
    setEvaluacionNombre(value);
    setStatusMessage(null);
    resetNotasState();
  };

  const onTipoEvaluacionChange = (value: TipoEvaluacion) => {
    setTipoEvaluacion(value);
    setStatusMessage(null);
    resetNotasState();
  };

  const onChangeNota = (alumnoId: number, nota: string) => {
    setNotasRows((prev) =>
      prev.map((row) =>
        row.alumnoId === alumnoId
          ? (() => {
              const nextAusente = nota.trim() === "" ? row.ausente : false;
              const alert = getAlertaCalificacion(
                tipoEvaluacion,
                parseNotaInput(nota),
                nextAusente
              );
              return {
                ...row,
                nota,
                ausente: nextAusente,
                alertaEstado: alert.estado,
                alertaMensaje: alert.mensaje,
              };
            })()
          : row
      )
    );
  };

  const onChangeAusente = (alumnoId: number, checked: boolean) => {
    setNotasRows((prev) =>
      prev.map((row) =>
        row.alumnoId === alumnoId
          ? (() => {
              const nextNota = checked ? "" : row.nota;
              const alert = getAlertaCalificacion(
                tipoEvaluacion,
                parseNotaInput(nextNota),
                checked
              );
              return {
                ...row,
                ausente: checked,
                nota: nextNota,
                alertaEstado: alert.estado,
                alertaMensaje: alert.mensaje,
              };
            })()
          : row
      )
    );
  };

  const onChangeAusenteTodos = (checked: boolean) => {
    setNotasRows((prev) =>
      prev.map((row) => {
        if (!row.habilitado) return row;

        const nextNota = checked ? "" : row.nota;
        const alert = getAlertaCalificacion(tipoEvaluacion, parseNotaInput(nextNota), checked);

        return {
          ...row,
          ausente: checked,
          nota: nextNota,
          alertaEstado: alert.estado,
          alertaMensaje: alert.mensaje,
        };
      })
    );
  };

  const cargarNotas = async () => {
    if (!hasCursoConfigurado) {
      setStatusMessage({
        type: "error",
        text: "Selecciona materia y año antes de cargar notas.",
      });
      return;
    }

    setIsLoadingNotas(true);
    try {
      const materiaId = Number(selectedMateriaId);
      const anioValue = Number(anio);

      const { data: alumnosData, error: alumnosError } = await supabase
        .from("alumno_materia_anio")
        .select("alumno_id, alumnos(id, legajo, nombre, apellido)")
        .eq("materia_id", materiaId)
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
          text: "No hay alumnos vinculados a esta materia y año.",
        });
        setNotasRows([]);
        setIsNotasReady(false);
        return;
      }

      const { data: evaluacionActual, error: evaluacionActualError } = await supabase
        .from("evaluaciones")
        .select("id")
        .eq("materia_id", materiaId)
        .eq("anio", anioValue)
        .eq("nombre", evaluacionNombre)
        .eq("tipo", tipoEvaluacion)
        .maybeSingle();
      if (evaluacionActualError) throw evaluacionActualError;

      const notasActualMap = new Map<number, { nota: number | null; ausente: boolean }>();
      if (evaluacionActual?.id) {
        const { data: notasActuales, error: notasActualesError } = await supabase
          .from("notas")
          .select("alumno_id, nota, ausente")
          .eq("evaluacion_id", Number(evaluacionActual.id));
        if (notasActualesError) throw notasActualesError;
        (notasActuales ?? []).forEach((n) => {
          notasActualMap.set(Number(n.alumno_id), {
            nota: n.nota === null ? null : Number(n.nota),
            ausente: Boolean(n.ausente),
          });
        });
      }

      const notasParcialBaseMap = new Map<number, { nota: number | null; ausente: boolean }>();
      if (tipoEvaluacion === "Recuperatorio") {
        const { data: evalParcial, error: evalParcialError } = await supabase
          .from("evaluaciones")
          .select("id")
          .eq("materia_id", materiaId)
          .eq("anio", anioValue)
          .eq("nombre", evaluacionNombre)
          .eq("tipo", "Parcial")
          .maybeSingle();
        if (evalParcialError) throw evalParcialError;

        if (evalParcial?.id) {
          const { data: notasParcial, error: notasParcialError } = await supabase
            .from("notas")
            .select("alumno_id, nota, ausente")
            .eq("evaluacion_id", Number(evalParcial.id));
          if (notasParcialError) throw notasParcialError;

          (notasParcial ?? []).forEach((n) => {
            notasParcialBaseMap.set(Number(n.alumno_id), {
              nota: n.nota === null ? null : Number(n.nota),
              ausente: Boolean(n.ausente),
            });
          });
        }
      }

      const rows = alumnosBase.map((alumno) => {
        const notaActual = notasActualMap.get(alumno.alumnoId);
        let habilitado = true;
        let motivoBloqueo: string | null = null;

        if (tipoEvaluacion === "Recuperatorio") {
          const parcialPrevio = notasParcialBaseMap.get(alumno.alumnoId);
          const eligibility = getHabilitacionRecuperatorio(
            parcialPrevio?.nota ?? null,
            parcialPrevio?.ausente ?? false,
            evaluacionNombre
          );
          habilitado = eligibility.habilitado;
          motivoBloqueo = eligibility.motivoBloqueo;
        }

        return {
          ...alumno,
          nota: formatNota(notaActual?.nota ?? null),
          ausente: notaActual?.ausente ?? false,
          alertaEstado: getAlertaCalificacion(
            tipoEvaluacion,
            notaActual?.nota ?? null,
            notaActual?.ausente ?? false
          ).estado,
          alertaMensaje: getAlertaCalificacion(
            tipoEvaluacion,
            notaActual?.nota ?? null,
            notaActual?.ausente ?? false
          ).mensaje,
          habilitado,
          motivoBloqueo,
        };
      });

      setNotasRows(rows);
      setIsNotasReady(true);
      setStatusMessage({
        type: "info",
        text:
          tipoEvaluacion === "Recuperatorio"
            ? "Lista de recuperatorio cargada. Solo habilitados: sin nota previa, ausentes o nota menor a 4."
            : "Lista de alumnos cargada para ingreso de notas.",
      });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({ type: "error", text: `Error al cargar notas: ${message}` });
    } finally {
      setIsLoadingNotas(false);
    }
  };

  const guardarNotas = async () => {
    if (!isNotasReady || selectedMateriaId === "" || !anio.trim()) {
      setStatusMessage({ type: "error", text: "Primero carga la lista de alumnos." });
      return;
    }

    const habilitados = notasRows.filter((row) => row.habilitado);
    if (habilitados.length === 0) {
      setStatusMessage({ type: "error", text: "No hay alumnos habilitados para guardar." });
      return;
    }

    for (const alumno of habilitados) {
      if (!alumno.ausente && alumno.nota.trim() === "") {
        setStatusMessage({
          type: "error",
          text: "Cada alumno habilitado debe tener nota (1 a 10) o marcar ausente.",
        });
        return;
      }
      if (!alumno.ausente) {
        const notaNumber = Number(alumno.nota);
        if (!isNotaEnRango(notaNumber)) {
          setStatusMessage({ type: "error", text: "Cada nota debe estar entre 1 y 10." });
          return;
        }
      }
    }

    setIsLoadingNotas(true);
    try {
      const materiaId = Number(selectedMateriaId);
      const anioValue = Number(anio);
      const { data: evalExistente, error: evalSelectError } = await supabase
        .from("evaluaciones")
        .select("id")
        .eq("materia_id", materiaId)
        .eq("anio", anioValue)
        .eq("nombre", evaluacionNombre)
        .eq("tipo", tipoEvaluacion)
        .maybeSingle();
      if (evalSelectError) throw evalSelectError;

      let evaluacionId = Number(evalExistente?.id ?? 0);
      if (!evaluacionId) {
        const { data: evalNueva, error: evalInsertError } = await supabase
          .from("evaluaciones")
          .insert({
            materia_id: materiaId,
            anio: anioValue,
            nombre: evaluacionNombre,
            tipo: tipoEvaluacion,
          })
          .select("id")
          .single();
        if (evalInsertError) throw evalInsertError;
        evaluacionId = Number(evalNueva.id);
      }

      const payload = habilitados.map((row) => ({
        evaluacion_id: evaluacionId,
        alumno_id: row.alumnoId,
        nota: row.ausente ? null : Number(row.nota),
        ausente: row.ausente,
      }));

      const { error: upsertError } = await supabase
        .from("notas")
        .upsert(payload, { onConflict: "evaluacion_id,alumno_id" });
      if (upsertError) throw upsertError;

      setStatusMessage({
        type: "success",
        text: `Notas guardadas correctamente para ${habilitados.length} alumnos.`,
      });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({ type: "error", text: `Error al guardar notas: ${message}` });
    } finally {
      setIsLoadingNotas(false);
    }
  };

  return {
    evaluacionNombre,
    tipoEvaluacion,
    notasRows,
    isNotasReady,
    isLoadingNotas,
    resetNotasState,
    onEvaluacionNombreChange,
    onTipoEvaluacionChange,
    onChangeNota,
    onChangeAusente,
    onChangeAusenteTodos,
    cargarNotas,
    guardarNotas,
  };
}

type AsistenciasOptions = {
  selectedMateriaId: number | "";
  anio: string;
  today: string;
  hasCursoConfigurado: boolean;
  setStatusMessage: StatusSetter;
};

export function useAsistenciasWorkflow({
  selectedMateriaId,
  anio,
  today,
  hasCursoConfigurado,
  setStatusMessage,
}: AsistenciasOptions) {
  const [fecha, setFecha] = useState(today);
  const [tema, setTema] = useState("");
  const [asistenciaRows, setAsistenciaRows] = useState<AsistenciaAlumnoRow[]>([]);
  const [claseIdAsistencia, setClaseIdAsistencia] = useState<string | null>(null);
  const [isAsistenciaReady, setIsAsistenciaReady] = useState(false);
  const [isLoadingAsistencia, setIsLoadingAsistencia] = useState(false);
  const [totalClasesAsistencia, setTotalClasesAsistencia] = useState(0);
  const [presentesBaseMapAsistencia, setPresentesBaseMapAsistencia] = useState<Map<number, number>>(
    new Map()
  );

  const resetAsistenciaState = () => {
    setAsistenciaRows([]);
    setClaseIdAsistencia(null);
    setIsAsistenciaReady(false);
    setTotalClasesAsistencia(0);
    setPresentesBaseMapAsistencia(new Map());
  };

  const onFechaChange = (value: string) => {
    setFecha(value);
    setStatusMessage(null);
    resetAsistenciaState();
  };

  const onChangeAsistenciaEstado = (alumnoId: number, estado: EstadoAsistencia) => {
    setAsistenciaRows((prev) =>
      prev.map((row) => {
        if (row.alumnoId !== alumnoId) return row;

        const base = presentesBaseMapAsistencia.get(alumnoId) ?? 0;
        const presentesEquivalentes =
          base +
          (estado === "ausente" || (!JUSTIFICADO_CUENTA_COMO_PRESENTE && estado === "justificado")
            ? 0
            : 1);
        const condicion = getCondicionAsistencia({
          totalClases: totalClasesAsistencia,
          presentesEquivalentes,
          umbralPorcentaje: UMBRAL_PORCENTAJE,
          minClasesParaLibre: MIN_CLASES_PARA_LIBRE,
        });

        return { ...row, estado, condicion };
      })
    );
  };

  const cargarAsistencias = async () => {
    if (!hasCursoConfigurado) {
      setStatusMessage({
        type: "error",
        text: "Selecciona materia y año antes de cargar asistencia.",
      });
      return;
    }

    setIsLoadingAsistencia(true);
    try {
      const materiaId = Number(selectedMateriaId);
      const anioValue = Number(anio);

      const { data: claseData, error: claseError } = await supabase
        .from("clases")
        .select("id")
        .eq("materia_id", materiaId)
        .eq("anio", anioValue)
        .eq("fecha", fecha)
        .maybeSingle();
      if (claseError) throw claseError;

      const currentClaseId = claseData?.id ? String(claseData.id) : null;
      setClaseIdAsistencia(currentClaseId);

      const { data: alumnosData, error: alumnosError } = await supabase
        .from("alumno_materia_anio")
        .select("alumno_id, alumnos(id, legajo, nombre, apellido)")
        .eq("materia_id", materiaId)
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
          text: "No hay alumnos vinculados a esta materia y año.",
        });
        setAsistenciaRows([]);
        setIsAsistenciaReady(false);
        return;
      }

      const asistenciasMap = new Map<number, EstadoAsistencia>();
      if (currentClaseId) {
        const { data: asistenciasData, error: asistenciasError } = await supabase
          .from("asistencias")
          .select("alumno_id, estado")
          .eq("clase_id", currentClaseId);
        if (asistenciasError) throw asistenciasError;

        (asistenciasData ?? []).forEach((row) => {
          asistenciasMap.set(Number(row.alumno_id), row.estado as EstadoAsistencia);
        });
      }

      const { data: clasesData, error: clasesDataError } = await supabase
        .from("clases")
        .select("id")
        .eq("materia_id", materiaId)
        .eq("anio", anioValue);
      if (clasesDataError) throw clasesDataError;

      const clasesIds = (clasesData ?? []).map((c) => String(c.id));
      const totalClasesValue = clasesIds.length + (currentClaseId ? 0 : 1);
      setTotalClasesAsistencia(totalClasesValue);

      const presentesBaseMap = new Map<number, number>();
      const claseIdsSinActual = currentClaseId
        ? clasesIds.filter((id) => id !== currentClaseId)
        : clasesIds;

      if (claseIdsSinActual.length > 0) {
        const { data: asistenciasHistoricas, error: asistenciasHistoricasError } = await supabase
          .from("asistencias")
          .select("alumno_id, estado")
          .in(
            "alumno_id",
            alumnosBase.map((alumno) => alumno.alumnoId)
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
          presentesBaseMap.set(alumnoId, (presentesBaseMap.get(alumnoId) ?? 0) + suma);
        });
      }
      setPresentesBaseMapAsistencia(presentesBaseMap);

      const rows: AsistenciaAlumnoRow[] = alumnosBase.map((alumno) => {
        const estado = asistenciasMap.get(alumno.alumnoId) ?? "presente";
        const base = presentesBaseMap.get(alumno.alumnoId) ?? 0;
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
        return { ...alumno, estado, condicion };
      });

      setAsistenciaRows(rows);
      setIsAsistenciaReady(true);
      setStatusMessage({
        type: "info",
        text: "Lista de asistencia cargada. Por defecto todos figuran como presentes.",
      });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({ type: "error", text: `Error al cargar asistencia: ${message}` });
    } finally {
      setIsLoadingAsistencia(false);
    }
  };

  const guardarAsistencia = async () => {
    if (!isAsistenciaReady || selectedMateriaId === "" || !anio.trim()) {
      setStatusMessage({ type: "error", text: "Primero carga la lista de asistencia." });
      return;
    }

    setIsLoadingAsistencia(true);
    try {
      const materiaId = Number(selectedMateriaId);
      const anioValue = Number(anio);
      let currentClaseId = claseIdAsistencia;
      if (!currentClaseId) {
        const { data: nuevaClase, error: nuevaClaseError } = await supabase
          .from("clases")
          .insert({
            materia_id: materiaId,
            anio: anioValue,
            fecha,
            tema: tema.trim() === "" ? null : tema.trim(),
          })
          .select("id")
          .single();
        if (nuevaClaseError) throw nuevaClaseError;
        currentClaseId = String(nuevaClase.id);
        setClaseIdAsistencia(currentClaseId);
      }

      const payload = asistenciaRows.map((row) => ({
        clase_id: currentClaseId,
        alumno_id: row.alumnoId,
        estado: row.estado,
      }));

      const { error: upsertError } = await supabase
        .from("asistencias")
        .upsert(payload, { onConflict: "clase_id,alumno_id" });
      if (upsertError) throw upsertError;

      setStatusMessage({
        type: "success",
        text: `Asistencia guardada correctamente para ${asistenciaRows.length} alumnos.`,
      });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({ type: "error", text: `Error al guardar asistencia: ${message}` });
    } finally {
      setIsLoadingAsistencia(false);
    }
  };

  return {
    fecha,
    setTema,
    tema,
    asistenciaRows,
    isAsistenciaReady,
    isLoadingAsistencia,
    resetAsistenciaState,
    onFechaChange,
    onChangeAsistenciaEstado,
    cargarAsistencias,
    guardarAsistencia,
  };
}

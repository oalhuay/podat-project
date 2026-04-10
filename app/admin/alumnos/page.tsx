"use client";

import { useEffect, useMemo, useState } from "react";
import StatusBanner from "@/components/admin/StatusBanner";
import ImportResults from "@/components/admin/ImportResults";
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
  type CondicionAsistencia,
  type EstadoAsistencia,
} from "@/lib/asistencia/rules";
import type { Rol } from "@/types/database";

type Materia = { id: number; nombre: string };
type MateriaDocenteRow = {
  materias: Materia | Materia[] | null;
};
type StatusMessage = { type: "success" | "error" | "info"; text: string };
type ManualRow = { id: string; legajo: string; alumno: string; genero: string; condicion: string };
type NotaAlumnoRow = {
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
type AsistenciaAlumnoRow = {
  alumnoId: number;
  legajo: string;
  apellido: string;
  nombre: string;
  estado: EstadoAsistencia;
  condicion: CondicionAsistencia | null;
};

type ActiveSection = "padron" | "notas" | "asistencias";

const CURRENT_YEAR = new Date().getFullYear();
const EVALUACIONES: EvaluacionNombre[] = ["Parcial1", "Parcial2", "Integrador"];
const UMBRAL_PORCENTAJE = 75;
const MIN_CLASES_PARA_LIBRE = 3;
const JUSTIFICADO_CUENTA_COMO_PRESENTE = true;
const SECTION_META: Record<
  ActiveSection,
  { label: string; description: string; readyLabel: string }
> = {
  padron: {
    label: "Carga de alumnos",
    description: "Importa o escribe el padrón y revisa la previsualización antes de guardar.",
    readyLabel: "Padrón listo para revisar",
  },
  notas: {
    label: "Notas",
    description: "Carga la lista del curso, completa calificaciones y guarda en una sola acción.",
    readyLabel: "Lista de notas cargada",
  },
  asistencias: {
    label: "Asistencias",
    description: "Marca presente, ausente o justificado y controla la condición acumulada.",
    readyLabel: "Lista de asistencia cargada",
  },
};

const getToday = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeText = (value: string): string =>
  value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizeCondicion = (value: string): string | null => {
  const normalized = normalizeText(value);
  if (normalized === "regular") return "Regular";
  if (normalized === "libre") return "Libre";
  return null;
};

const makeManualRow = (): ManualRow => ({
  id: crypto.randomUUID(),
  legajo: "",
  alumno: "",
  genero: "",
  condicion: "Regular",
});

const toParsedManualRows = (rows: ManualRow[]): ParsedAlumnoRow[] =>
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

export default function AlumnosPage() {
  const today = getToday();
  const [rol, setRol] = useState<Rol>(null);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [selectedMateriaId, setSelectedMateriaId] = useState<number | "">("");
  const [anio, setAnio] = useState(String(CURRENT_YEAR));
  const [activeSection, setActiveSection] = useState<ActiveSection>("padron");
  const [sourceMode, setSourceMode] = useState<"excel" | "manual">("excel");
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedAlumnoRow[]>([]);
  const [manualRows, setManualRows] = useState<ManualRow[]>([makeManualRow(), makeManualRow()]);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importPlan, setImportPlan] = useState<ImportPlan | null>(null);
  const [statusFilter, setStatusFilter] = useState<"todos" | ImportStatus>("todos");
  const [evaluacionNombre, setEvaluacionNombre] = useState<EvaluacionNombre>("Parcial1");
  const [tipoEvaluacion, setTipoEvaluacion] = useState<TipoEvaluacion>("Parcial");
  const [notasRows, setNotasRows] = useState<NotaAlumnoRow[]>([]);
  const [isNotasReady, setIsNotasReady] = useState(false);
  const [isLoadingNotas, setIsLoadingNotas] = useState(false);
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
  const importDbClient = useMemo(() => toImportAlumnosDbClient(supabase), []);

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      if (!userId) {
        setStatusMessage({ type: "error", text: "No se pudo identificar al usuario actual." });
        return;
      }

      const { data: perfilData } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", userId)
        .maybeSingle();
      const userRol = (perfilData?.rol as Rol) ?? null;
      setRol(userRol);

      if (userRol === "admin") {
        const { data, error } = await supabase.from("materias").select("id, nombre").order("nombre");
        if (error) {
          setStatusMessage({ type: "error", text: `No se pudieron cargar materias: ${error.message}` });
          return;
        }
        setMaterias((data ?? []) as Materia[]);
        return;
      }

      const { data, error } = await supabase
        .from("materias_docentes")
        .select("materia_id, materias(id, nombre)")
        .eq("user_id", userId);
      if (error) {
        setStatusMessage({ type: "error", text: `No se pudieron cargar materias: ${error.message}` });
        return;
      }

      const rows = (data ?? []) as MateriaDocenteRow[];
      const uniqueMaterias = Array.from(
        new Map(
          rows.flatMap((row) => {
            const materia = Array.isArray(row.materias) ? row.materias[0] : row.materias;
            return materia ? [[materia.id, materia] as const] : [];
          })
        ).values()
      );
      setMaterias(uniqueMaterias);
      if (uniqueMaterias.length === 0) {
        setStatusMessage({ type: "info", text: "No hay materias asignadas para este docente." });
      }
    };

    void load();
  }, []);

  useEffect(() => {
    resetNotasState();
  }, [selectedMateriaId, anio, evaluacionNombre, tipoEvaluacion]);

  useEffect(() => {
    resetAsistenciaState();
  }, [selectedMateriaId, anio, fecha]);

  const hasSelectedMateria = selectedMateriaId !== "";
  const hasCursoConfigurado = Boolean(hasSelectedMateria && anio.trim());
  const rowsDisponibles = sourceMode === "excel" ? parsedRows : toParsedManualRows(manualRows);
  const canPreview = hasCursoConfigurado && rowsDisponibles.length > 0;
  const selectedMateria =
    selectedMateriaId === ""
      ? null
      : materias.find((materia) => materia.id === selectedMateriaId) ?? null;
  const selectedSectionMeta = SECTION_META[activeSection];
  const currentSourceLabel = sourceMode === "excel" ? "Excel .xlsx" : "Carga manual";
  const padronReady = Boolean(importPlan || importResult);
  const notasReadyCount = notasRows.length;
  const asistenciaReadyCount = asistenciaRows.length;

  const resetImportState = () => {
    setImportPlan(null);
    setImportResult(null);
    setStatusFilter("todos");
    setArchivo(null);
    setParsedRows([]);
    setManualRows([makeManualRow(), makeManualRow()]);
  };

  const resetNotasState = () => {
    setNotasRows([]);
    setIsNotasReady(false);
  };

  const resetAsistenciaState = () => {
    setAsistenciaRows([]);
    setClaseIdAsistencia(null);
    setIsAsistenciaReady(false);
    setTotalClasesAsistencia(0);
    setPresentesBaseMapAsistencia(new Map());
  };

  const onMateriaChange = (value: string) => {
    setSelectedMateriaId(value === "" ? "" : Number(value));
    setStatusMessage(null);
    resetImportState();
    resetNotasState();
    resetAsistenciaState();
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

  return (
    <div className="min-h-screen max-w-6xl mx-auto bg-white p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Alumnos</h1>
        <p className="mt-2 text-slate-500">
          Gestiona padrón, notas y asistencias por materia y año desde una sola vista.
        </p>
      </header>

      {statusMessage && <StatusBanner message={statusMessage} />}

      <section className="mb-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            Paso 1
          </p>
          <h2 className="mt-3 text-2xl font-black text-slate-900">Define el curso de trabajo</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Elige la materia y el año antes de pasar a padrón, notas o asistencias. Cada cambio
            reinicia los datos cargados del módulo actual.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                Materia
              </label>
              <select
                value={selectedMateriaId}
                onChange={(event) => onMateriaChange(event.target.value)}
                className="w-full rounded-2xl border-2 border-slate-100 bg-white p-4 text-slate-900 outline-none focus:border-[#5D9AD4]"
              >
                <option value="">Seleccionar materia...</option>
                {materias.map((materia) => (
                  <option key={materia.id} value={materia.id}>
                    {materia.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                Año
              </label>
              <input
                type="number"
                min={1900}
                max={CURRENT_YEAR + 1}
                value={anio}
                onChange={(event) => setAnio(event.target.value)}
                className="w-full rounded-2xl border-2 border-slate-100 bg-white p-4 text-slate-900 outline-none focus:border-[#5D9AD4]"
              />
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            Contexto actual
          </p>
          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Materia
              </div>
              <div className="mt-2 text-lg font-black text-slate-900">
                {selectedMateria?.nombre ?? "Sin seleccionar"}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Año activo
              </div>
              <div className="mt-2 text-lg font-black text-slate-900">{anio || "—"}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Estado
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-700">
                {hasCursoConfigurado
                  ? "Curso listo para trabajar"
                  : "Completa materia y año para desbloquear los módulos"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {hasCursoConfigurado && (
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              Paso 2
            </p>
            <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-black text-slate-900">
                  Elige el bloque que quieres trabajar
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Cambia entre padrón, notas y asistencias sin perder el contexto del curso
                  seleccionado.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-black text-slate-900">{selectedSectionMeta.label}:</span>{" "}
                {selectedSectionMeta.description}
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {(Object.keys(SECTION_META) as ActiveSection[]).map((sectionKey) => {
                const section = SECTION_META[sectionKey];
                const isActive = activeSection === sectionKey;
                const isReady =
                  sectionKey === "padron"
                    ? padronReady
                    : sectionKey === "notas"
                      ? isNotasReady
                      : isAsistenciaReady;
                const itemCount =
                  sectionKey === "notas"
                    ? notasReadyCount
                    : sectionKey === "asistencias"
                      ? asistenciaReadyCount
                      : rowsDisponibles.length;

                return (
                  <button
                    key={sectionKey}
                    type="button"
                    onClick={() => setActiveSection(sectionKey)}
                    className={`rounded-[1.5rem] border p-4 text-left transition-all ${
                      isActive
                        ? "border-[#5D9AD4]/40 bg-[#5D9AD4]/10 shadow-sm"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-700">
                        {section.label}
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                          isReady
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {isReady ? "listo" : "pendiente"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{section.description}</p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      {isReady ? section.readyLabel : "Sin cargar todavía"} · {itemCount} item(s)
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <section className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              Paso 3
            </p>
            <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{selectedSectionMeta.label}</h3>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  {selectedSectionMeta.description}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[22rem]">
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Materia
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-900">
                    {selectedMateria?.nombre ?? "Sin seleccionar"}
                  </div>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Año
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-900">{anio}</div>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Fuente
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-900">
                    {activeSection === "padron" ? currentSourceLabel : selectedSectionMeta.label}
                  </div>
                </div>
              </div>
            </div>

          {activeSection === "padron" && (
            <>
          <div className="mt-6 inline-flex rounded-full border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setSourceMode("excel")}
              className={`rounded-full px-4 py-2 text-sm font-black ${sourceMode === "excel" ? "bg-slate-900 text-white" : "text-slate-700"}`}
            >
              Excel .xlsx
            </button>
            <button
              type="button"
              onClick={() => setSourceMode("manual")}
              className={`rounded-full px-4 py-2 text-sm font-black ${sourceMode === "manual" ? "bg-slate-900 text-white" : "text-slate-700"}`}
            >
              Carga manual
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            {sourceMode === "excel"
              ? "Sube un archivo .xlsx con legajo, alumno, género y condición. Luego revisa la previsualización antes de aplicar."
              : 'Completa el padrón escribiendo "Apellido, Nombre" y usa la previsualización para validar filas antes de guardar.'}
          </div>

          {sourceMode === "excel" && (
            <label
              htmlFor="alumnos-file"
              onDragOver={(event) => { event.preventDefault(); setIsDragActive(true); }}
              onDragLeave={(event) => { event.preventDefault(); setIsDragActive(false); }}
              onDrop={async (event) => {
                event.preventDefault();
                setIsDragActive(false);
                const file = event.dataTransfer.files?.[0];
                if (file) await processFile(file);
              }}
              className={`flex min-h-[13rem] cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed text-center ${isDragActive ? "border-[#5D9AD4] bg-[#5D9AD4]/10" : "border-slate-200 bg-slate-50"}`}
            >
              <input
                id="alumnos-file"
                type="file"
                accept=".xlsx"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (file) await processFile(file);
                  event.target.value = "";
                }}
                className="sr-only"
              />
              <p className="text-xl font-black text-slate-900">Arrastra tu archivo o haz clic</p>
              <p className="mt-2 text-sm text-slate-500">Formato: Legajo | Alumno | Género | Cond.</p>
              {archivo && <p className="mt-3 text-sm font-bold text-slate-700">{archivo.name}</p>}
            </label>
          )}

          {sourceMode === "manual" && (
            <div className="space-y-3 rounded-[1.75rem] border border-slate-200 bg-white p-4">
              {manualRows.map((row) => (
                <div key={row.id} className="grid gap-2 md:grid-cols-4">
                  <input value={row.legajo} placeholder="Legajo" className="rounded-xl border p-3" onChange={(event) => setManualRows((prev) => prev.map((it) => it.id === row.id ? { ...it, legajo: event.target.value } : it))} />
                  <input value={row.alumno} placeholder="Alumno (Apellido, Nombre)" className="rounded-xl border p-3" onChange={(event) => setManualRows((prev) => prev.map((it) => it.id === row.id ? { ...it, alumno: event.target.value } : it))} />
                  <input value={row.genero} placeholder="Género" className="rounded-xl border p-3" onChange={(event) => setManualRows((prev) => prev.map((it) => it.id === row.id ? { ...it, genero: event.target.value } : it))} />
                  <select value={row.condicion} className="rounded-xl border p-3" onChange={(event) => setManualRows((prev) => prev.map((it) => it.id === row.id ? { ...it, condicion: event.target.value } : it))}>
                    <option value="Regular">Regular</option>
                    <option value="Libre">Libre</option>
                  </select>
                </div>
              ))}
              <button type="button" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white" onClick={() => setManualRows((prev) => [...prev, makeManualRow()])}>
                Agregar fila
              </button>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <button type="button" onClick={preview} disabled={!canPreview || isLoading} className="rounded-2xl bg-[#5D9AD4] p-4 text-lg font-black text-white disabled:opacity-60">
              {isLoading ? "ANALIZANDO..." : "REVISAR IMPORTACIÓN"}
            </button>
            <button type="button" onClick={resetImportState} disabled={isLoading} className="rounded-2xl bg-slate-200 p-4 text-lg font-black text-slate-800 disabled:opacity-60">
              LIMPIAR FORMULARIO
            </button>
          </div>

          {importPlan && (
            <div className="grid gap-3 md:grid-cols-2">
              <button type="button" onClick={confirmImport} disabled={isLoading} className="rounded-2xl bg-green-600 p-4 text-lg font-black text-white disabled:opacity-60">
                {isLoading ? "APLICANDO..." : "CONFIRMAR IMPORTACIÓN"}
              </button>
              <button type="button" onClick={() => { setImportPlan(null); setStatusMessage({ type: "info", text: "Importación cancelada." }); }} className="rounded-2xl bg-slate-200 p-4 text-lg font-black text-slate-800">
                DESCARTAR IMPORTACIÓN
              </button>
            </div>
          )}
            </>
          )}

          {activeSection === "notas" && (
            <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    Evaluación
                  </label>
                  <select
                    value={evaluacionNombre}
                    onChange={(event) =>
                      setEvaluacionNombre(event.target.value as EvaluacionNombre)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 p-3"
                  >
                    {EVALUACIONES.map((evalName) => (
                      <option key={evalName} value={evalName}>
                        {evalName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    Tipo
                  </label>
                  <select
                    value={tipoEvaluacion}
                    onChange={(event) => setTipoEvaluacion(event.target.value as TipoEvaluacion)}
                    className="mt-2 w-full rounded-xl border border-slate-200 p-3"
                  >
                    <option value="Parcial">Parcial</option>
                    <option value="Recuperatorio">Recuperatorio</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={cargarNotas}
                    disabled={isLoadingNotas}
                    className="w-full rounded-xl bg-[#5D9AD4] p-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    {isLoadingNotas ? "CARGANDO..." : "CARGAR LISTA DEL CURSO"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Primero carga la lista del curso. Después podrás ingresar notas, marcar ausencias y
                guardar todos los cambios.
              </div>

              {!isNotasReady && (
                <p className="text-sm text-slate-500">
                  Carga la lista para ingresar notas entre 1 y 10 o marcar ausente.
                </p>
              )}

              {isNotasReady && (
                <>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="p-3 text-left">Legajo</th>
                          <th className="p-3 text-left">Apellido</th>
                          <th className="p-3 text-left">Nombre</th>
                          <th className="p-3 text-left">Nota (1-10)</th>
                          <th className="p-3 text-left">Ausente</th>
                          <th className="p-3 text-left">Alerta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notasRows.map((row) => (
                          <tr key={row.alumnoId} className="border-t border-slate-100">
                            <td className="p-3 font-mono">{row.legajo}</td>
                            <td className="p-3">{row.apellido}</td>
                            <td className="p-3">
                              <div>{row.nombre}</div>
                              {!row.habilitado && row.motivoBloqueo && (
                                <div className="mt-1 text-xs text-slate-500">{row.motivoBloqueo}</div>
                              )}
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min={1}
                                max={10}
                                step={0.1}
                                value={row.nota}
                                disabled={!row.habilitado || row.ausente || isLoadingNotas}
                                onChange={(event) => onChangeNota(row.alumnoId, event.target.value)}
                                className="w-28 rounded-xl border border-slate-200 p-2"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={row.ausente}
                                disabled={!row.habilitado || isLoadingNotas}
                                onChange={(event) =>
                                  onChangeAusente(row.alumnoId, event.target.checked)
                                }
                              />
                            </td>
                            <td className="p-3">
                              {row.alertaEstado ? (
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                                    row.alertaEstado === "libre"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {row.alertaMensaje}
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

                  <button
                    type="button"
                    onClick={guardarNotas}
                    disabled={isLoadingNotas}
                    className="w-full rounded-xl bg-green-600 p-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    {isLoadingNotas ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
                  </button>
                </>
              )}
            </div>
          )}

          {activeSection === "asistencias" && (
            <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    Fecha
                  </label>
                  <input
                    type="date"
                    max={today}
                    value={fecha}
                    onChange={(event) => setFecha(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 p-3"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    Tema (opcional)
                  </label>
                  <input
                    value={tema}
                    onChange={(event) => setTema(event.target.value)}
                    placeholder="Unidad o clase"
                    className="mt-2 w-full rounded-xl border border-slate-200 p-3"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={cargarAsistencias}
                    disabled={isLoadingAsistencia || !fecha}
                    className="w-full rounded-xl bg-[#5D9AD4] p-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    {isLoadingAsistencia ? "CARGANDO..." : "CARGAR LISTA DEL CURSO"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Carga la clase del día y revisa la condición acumulada antes de guardar la
                asistencia definitiva.
              </div>

              {!isAsistenciaReady && (
                <p className="text-sm text-slate-500">
                  Carga la lista para marcar presente, ausente o justificado por alumno.
                </p>
              )}

              {isAsistenciaReady && (
                <>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="p-3 text-left">Legajo</th>
                          <th className="p-3 text-left">Apellido</th>
                          <th className="p-3 text-left">Nombre</th>
                          <th className="p-3 text-left">Estado</th>
                          <th className="p-3 text-left">Asistencia acumulada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {asistenciaRows.map((row) => (
                          <tr key={row.alumnoId} className="border-t border-slate-100">
                            <td className="p-3 font-mono">{row.legajo}</td>
                            <td className="p-3">{row.apellido}</td>
                            <td className="p-3">{row.nombre}</td>
                            <td className="p-3">
                              <select
                                value={row.estado}
                                disabled={isLoadingAsistencia}
                                onChange={(event) =>
                                  onChangeAsistenciaEstado(
                                    row.alumnoId,
                                    event.target.value as EstadoAsistencia
                                  )
                                }
                                className="rounded-xl border border-slate-200 p-2"
                              >
                                <option value="presente">Presente</option>
                                <option value="ausente">Ausente</option>
                                <option value="justificado">Justificado</option>
                              </select>
                            </td>
                            <td className="p-3">
                              {row.condicion ? (
                                <div className="space-y-1">
                                  <div className="font-semibold text-slate-900">
                                    {row.condicion.porcentaje}%
                                  </div>
                                  <div
                                    className={
                                      row.condicion.estado === "libre"
                                        ? "text-red-600"
                                        : row.condicion.estado === "en_riesgo"
                                        ? "text-amber-600"
                                        : "text-emerald-600"
                                    }
                                  >
                                    {row.condicion.mensaje}
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

                  <button
                    type="button"
                    onClick={guardarAsistencia}
                    disabled={isLoadingAsistencia}
                    className="w-full rounded-xl bg-green-600 p-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    {isLoadingAsistencia ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
                  </button>
                </>
              )}
            </div>
          )}
          </section>
        </section>
      )}

      {importResult && (
        <ImportResults
          result={importResult}
          statusFilter={statusFilter}
          onChangeStatusFilter={setStatusFilter}
        />
      )}

      {rol === "docente" && !hasSelectedMateria && (
        <p className="mt-6 text-sm text-slate-500">Selecciona una materia para continuar.</p>
      )}
    </div>
  );
}

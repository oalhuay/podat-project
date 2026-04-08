"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useTheme } from "@/app/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import StatusBanner from "@/components/admin/StatusBanner";
import { getChartPalette } from "@/lib/charts/theme";
import { parseEstadisticasFromFile } from "@/lib/import/estadisticas/parseExcel";
import type {
  EstadisticaImportSummary,
  EstadisticaPreviewRow,
  EstadisticaImportStatus,
} from "@/lib/import/estadisticas/types";
import type { ParsedEstadisticaRow } from "@/lib/import/estadisticas/parseExcel";
import {
  ALL_INDICATORS,
  INDICATOR_BY_CODE,
  getIndicatorFromLabel,
  type IndicatorCode,
} from "@/lib/estadisticas/catalog";
import type { Rol } from "@/types/database";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type Materia = {
  id: number;
  nombre: string;
  codigo?: string | null;
};

type MateriaDocenteRow = {
  materias: Materia | Materia[] | null;
};

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

type ChangeSummary = {
  revisados: number;
  nuevos: number;
  actualizados: number;
  sinCambios: number;
};

type ImportDefaults = {
  materiaId: number | null;
  anio: number | null;
};

type StatRow = {
  anio: number;
  indicador: IndicatorCode;
  valor: number;
};

const CURRENT_YEAR = new Date().getFullYear();

const normalizeText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");

const buildSummary = (rows: EstadisticaPreviewRow[]): EstadisticaImportSummary => {
  const summary = {
    total: rows.length,
    validos: 0,
    calculados: 0,
    materiaFaltante: 0,
    materiaDesconocida: 0,
    anioFaltante: 0,
    indicadorDesconocido: 0,
    valorInvalido: 0,
  };

  rows.forEach((row) => {
    switch (row.status) {
      case "valido":
        summary.validos += 1;
        break;
      case "calculado_ignorado":
        summary.calculados += 1;
        break;
      case "materia_faltante":
        summary.materiaFaltante += 1;
        break;
      case "materia_desconocida":
        summary.materiaDesconocida += 1;
        break;
      case "anio_faltante":
        summary.anioFaltante += 1;
        break;
      case "indicador_desconocido":
        summary.indicadorDesconocido += 1;
        break;
      case "valor_invalido":
        summary.valorInvalido += 1;
        break;
      default:
        break;
    }
  });

  return summary;
};

const statusLabels: Record<EstadisticaImportStatus, string> = {
  valido: "Válido",
  calculado_ignorado: "Calculado (no se guarda)",
  materia_faltante: "Materia faltante",
  materia_desconocida: "Materia desconocida",
  anio_faltante: "Año faltante",
  indicador_desconocido: "Indicador desconocido",
  valor_invalido: "Valor inválido",
};

const statusClasses: Record<EstadisticaImportStatus, string> = {
  valido: "bg-emerald-50 text-emerald-700",
  calculado_ignorado: "bg-amber-50 text-amber-700",
  materia_faltante: "bg-rose-50 text-rose-700",
  materia_desconocida: "bg-rose-50 text-rose-700",
  anio_faltante: "bg-rose-50 text-rose-700",
  indicador_desconocido: "bg-rose-50 text-rose-700",
  valor_invalido: "bg-rose-50 text-rose-700",
};

const buildSeries = (
  rows: StatRow[],
  indicatorCode: IndicatorCode
): { labels: string[]; values: number[] } => {
  const byYear = new Map<number, Record<IndicatorCode, number>>();
  rows.forEach((row) => {
    if (!byYear.has(row.anio)) {
      byYear.set(row.anio, {} as Record<IndicatorCode, number>);
    }
    byYear.get(row.anio)![row.indicador] = row.valor;
  });

  const indicator = INDICATOR_BY_CODE[indicatorCode];
  const years = Array.from(byYear.keys()).sort((a, b) => a - b);

  const labels: string[] = [];
  const values: number[] = [];

  years.forEach((year) => {
    const data = byYear.get(year);
    if (!data) return;
    let value: number | null = null;

    if (indicator.isCalculated && indicator.compute) {
      const computed = indicator.compute(data as Record<IndicatorCode, number | null>);
      value = computed ?? null;
    } else {
      value = data[indicatorCode] ?? null;
    }

    if (value === null || Number.isNaN(value)) return;

    labels.push(String(year));
    values.push(value);
  });

  return { labels, values };
};

export default function EstadisticasPage() {
  const { resolvedTheme } = useTheme();
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedEstadisticaRow[]>([]);
  const [previewRows, setPreviewRows] = useState<EstadisticaPreviewRow[]>([]);
  const [summary, setSummary] = useState<EstadisticaImportSummary | null>(null);
  const [changeSummary, setChangeSummary] = useState<ChangeSummary | null>(null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isCheckingChanges, setIsCheckingChanges] = useState(false);
  const [statusFilter, setStatusFilter] = useState<EstadisticaImportStatus | "todos">("todos");
  const [currentRole, setCurrentRole] = useState<Rol | null>(null);
  const [fallbackMateriaId, setFallbackMateriaId] = useState<number | "">("");
  const [fallbackYear, setFallbackYear] = useState("");

  const [selectedMateriaId, setSelectedMateriaId] = useState<number | "">("");
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorCode>("VAR_INS");
  const [yearFrom, setYearFrom] = useState("2010");
  const [yearTo, setYearTo] = useState(String(CURRENT_YEAR));
  const [statsRows, setStatsRows] = useState<StatRow[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

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

      setCurrentRole(rol);

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
          text: "No hay materias disponibles. Crea o asigna materias para mapear el Excel.",
        });
      }
    };

    void loadMaterias();
  }, []);

  const buildPreview = (
    parsed: ParsedEstadisticaRow[],
    materiasList: Materia[],
    defaults: ImportDefaults
  ): EstadisticaPreviewRow[] => {
    const materiaMap = new Map(
      materiasList.map((m) => [normalizeText(m.nombre), m])
    );
    const fallbackMateria =
      defaults.materiaId === null
        ? null
        : materiasList.find((m) => m.id === defaults.materiaId) ?? null;

    const preview = parsed.map((row) => {
      const materiaName = row.materia?.trim() || fallbackMateria?.nombre || "";
      const materiaKey = materiaName ? normalizeText(materiaName) : "";
      const materia = materiaKey ? materiaMap.get(materiaKey) : fallbackMateria;
      const indicator = getIndicatorFromLabel(row.indicador);
      const anio = row.anio ?? defaults.anio;

      let status: EstadisticaImportStatus = "valido";
      let mensaje = "OK";

      if (!materiaName) {
        status = "materia_faltante";
        mensaje = "Completa la materia en el formulario o dentro del archivo.";
      } else if (!materia) {
        status = "materia_desconocida";
        mensaje = "Materia no encontrada en la base.";
      } else if (anio === null) {
        status = "anio_faltante";
        mensaje = "Completa el año en el formulario o dentro del archivo.";
      } else if (!indicator) {
        status = "indicador_desconocido";
        mensaje = "Indicador no reconocido en el catálogo.";
      } else if (indicator.isCalculated) {
        status = "calculado_ignorado";
        mensaje = "Indicador calculado. Se calcula en el dashboard.";
      } else if (!Number.isFinite(row.valor)) {
        status = "valor_invalido";
        mensaje = "Valor inválido.";
      }

      return {
        materia: materiaName || "—",
        materiaId: materia?.id ?? null,
        indicadorRaw: row.indicador,
        indicadorCode: indicator?.code ?? null,
        anio,
        valor: Number.isFinite(row.valor) ? row.valor : null,
        status,
        mensaje,
      };
    });

    return preview;
  };

  const importDefaults = useMemo<ImportDefaults>(() => {
    const parsedYear = Number(fallbackYear);
    const normalizedYear =
      fallbackYear.trim() !== "" && Number.isFinite(parsedYear)
        ? Math.trunc(parsedYear)
        : null;

    return {
      materiaId: fallbackMateriaId === "" ? null : Number(fallbackMateriaId),
      anio: normalizedYear,
    };
  }, [fallbackMateriaId, fallbackYear]);

  const computeChangeSummary = async (preview: EstadisticaPreviewRow[]) => {
    const validRows = preview.filter(
      (row) =>
        row.status === "valido" &&
        row.materiaId &&
        row.indicadorCode &&
        row.anio !== null &&
        row.valor !== null
    );

    if (validRows.length === 0) {
      setChangeSummary(null);
      return;
    }

    setIsCheckingChanges(true);
    try {
      const materiaIds = Array.from(new Set(validRows.map((r) => r.materiaId as number)));
      const years = Array.from(new Set(validRows.map((r) => r.anio)));
      const indicators = Array.from(new Set(validRows.map((r) => r.indicadorCode as string)));

      const { data, error } = await supabase
        .from("estadisticas")
        .select("materia_id, anio, indicador, valor")
        .in("materia_id", materiaIds)
        .in("anio", years)
        .in("indicador", indicators);

      if (error) throw error;

      const existingMap = new Map<string, number>();
      (data ?? []).forEach((row) => {
        const key = `${row.materia_id}|${row.anio}|${row.indicador}`;
        existingMap.set(key, Number(row.valor));
      });

      let nuevos = 0;
      let actualizados = 0;
      let sinCambios = 0;

      validRows.forEach((row) => {
        const key = `${row.materiaId}|${row.anio}|${row.indicadorCode}`;
        const existing = existingMap.get(key);
        if (existing === undefined) {
          nuevos += 1;
          return;
        }

        const diff = Math.abs(existing - (row.valor ?? 0));
        if (diff > 1e-6) {
          actualizados += 1;
        } else {
          sinCambios += 1;
        }
      });

      setChangeSummary({
        revisados: validRows.length,
        nuevos,
        actualizados,
        sinCambios,
      });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `No se pudo analizar cambios: ${message}`,
      });
      setChangeSummary(null);
    } finally {
      setIsCheckingChanges(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setArchivo(file);

    setIsImporting(true);
    try {
      const parsed = await parseEstadisticasFromFile(file);
      setParsedRows(parsed);
      if (parsed.length === 0) {
        setPreviewRows([]);
        setSummary(null);
        setChangeSummary(null);
        setStatusMessage({
          type: "info",
          text: "No se encontraron datos válidos en el Excel.",
        });
      } else {
        setStatusMessage({
          type: "info",
          text: `Archivo listo. Filas detectadas: ${parsed.length}.`,
        });
      }
    } catch {
      setParsedRows([]);
      setPreviewRows([]);
      setSummary(null);
      setChangeSummary(null);
      setStatusMessage({
        type: "error",
        text: "No se pudo leer el archivo. Verifica que sea un Excel .xlsx válido.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    if (parsedRows.length === 0) return;
    const preview = buildPreview(parsedRows, materias, importDefaults);
    setPreviewRows(preview);
    setSummary(buildSummary(preview));
    void computeChangeSummary(preview);
  }, [parsedRows, materias, importDefaults]);

  const crearMateriasFaltantes = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    try {
      const existentes = new Set(materias.map((m) => normalizeText(m.nombre)));
      const faltantes = new Set<string>();

      parsedRows.forEach((row) => {
        const indicator = getIndicatorFromLabel(row.indicador);
        if (!indicator || indicator.isCalculated) return;
        const materiaName = row.materia?.trim();
        if (!materiaName) return;
        const key = normalizeText(materiaName);
        if (!existentes.has(key)) {
          faltantes.add(materiaName);
        }
      });

      if (faltantes.size === 0) {
        setStatusMessage({
          type: "info",
          text: "No hay materias nuevas para crear.",
        });
        return;
      }

      const payload = Array.from(faltantes).map((nombre) => ({ nombre }));
      const { error } = await supabase.from("materias").insert(payload);
      if (error) throw error;

      const { data: refreshed, error: refreshError } = await supabase
        .from("materias")
        .select("id, nombre")
        .order("nombre", { ascending: true });
      if (refreshError) throw refreshError;

      const materiasList = (refreshed ?? []) as Materia[];
      setMaterias(materiasList);
      const preview = buildPreview(parsedRows, materiasList, importDefaults);
      setPreviewRows(preview);
      setSummary(buildSummary(preview));
      await computeChangeSummary(preview);
      setStatusMessage({
        type: "success",
        text: `Materias creadas: ${faltantes.size}.`,
      });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `Error creando materias: ${message}`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const rowsFiltradas = useMemo(() => {
    if (statusFilter === "todos") return previewRows;
    return previewRows.filter((row) => row.status === statusFilter);
  }, [previewRows, statusFilter]);

  const clearPreview = () => {
    setArchivo(null);
    setParsedRows([]);
    setPreviewRows([]);
    setSummary(null);
    setChangeSummary(null);
    setStatusFilter("todos");
  };

  const aceptarImportacion = async () => {
    if (previewRows.length === 0) {
      setStatusMessage({
        type: "error",
        text: "No hay filas para importar.",
      });
      return;
    }

    const payload = previewRows
      .filter((row) => row.status === "valido" && row.materiaId && row.indicadorCode)
      .filter((row) => row.anio !== null)
      .map((row) => ({
        materia_id: row.materiaId,
        anio: row.anio as number,
        indicador: row.indicadorCode,
        valor: row.valor,
      }));

    if (payload.length === 0) {
      setStatusMessage({
        type: "error",
        text: "No hay filas válidas para guardar.",
      });
      return;
    }

    setIsImporting(true);
    try {
      const { error } = await supabase
        .from("estadisticas")
        .upsert(payload, { onConflict: "materia_id,anio,indicador" });

      if (error) throw error;

      setStatusMessage({
        type: "success",
        text: `Importación lista. Filas guardadas: ${payload.length}.`,
      });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `Error al guardar estadísticas: ${message}`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const cargarEstadisticas = useCallback(async () => {
    if (!selectedMateriaId) return;
    setIsLoadingStats(true);

    try {
      const { data, error } = await supabase
        .from("estadisticas")
        .select("anio, indicador, valor")
        .eq("materia_id", Number(selectedMateriaId))
        .gte("anio", Number(yearFrom))
        .lte("anio", Number(yearTo))
        .order("anio", { ascending: true });

      if (error) throw error;

      const cleaned = (data ?? [])
        .map((row) => ({
          anio: Number(row.anio),
          indicador: row.indicador as IndicatorCode,
          valor: Number(row.valor),
        }))
        .filter((row) => Number.isFinite(row.anio) && Number.isFinite(row.valor));

      setStatsRows(cleaned);
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `No se pudieron cargar estadísticas: ${message}`,
      });
    } finally {
      setIsLoadingStats(false);
    }
  }, [selectedMateriaId, yearFrom, yearTo]);

  useEffect(() => {
    if (!selectedMateriaId) return;
    void cargarEstadisticas();
  }, [selectedMateriaId, cargarEstadisticas]);

  const series = useMemo(
    () => buildSeries(statsRows, selectedIndicator),
    [statsRows, selectedIndicator]
  );

  const indicatorUnit = INDICATOR_BY_CODE[selectedIndicator]?.unit ?? "count";

  const chartData = useMemo(() => {
    return {
      labels: series.labels,
      datasets: [
        {
          label: INDICATOR_BY_CODE[selectedIndicator]?.label ?? "Indicador",
          data: series.values,
          borderColor: "#5D9AD4",
          backgroundColor: "rgba(93, 154, 212, 0.15)",
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
        },
      ],
    };
  }, [series, selectedIndicator]);

  const chartOptions = useMemo(
    () => {
      const palette = getChartPalette(resolvedTheme);
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom" as const,
            labels: {
              color: palette.text,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: palette.mutedText,
            },
            grid: {
              color: palette.grid,
            },
          },
          y: {
            ticks: {
              color: palette.mutedText,
              callback: (value: string | number) => {
                if (indicatorUnit === "percent") return `${value}%`;
                if (indicatorUnit === "ratio") return Number(value).toFixed(2);
                return value;
              },
            },
            grid: {
              color: palette.grid,
            },
          },
        },
      };
    },
    [indicatorUnit, resolvedTheme]
  );

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen bg-white space-y-12">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Estadísticas
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          Importa archivos .xlsx de estadísticas y construye el dashboard de tus materias.
        </p>
      </header>

      <section className="space-y-6">
        <div className="rounded-3xl border-2 border-dashed border-slate-200 p-6 md:p-8 bg-slate-50">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
                Materia opcional
              </label>
              <select
                className="w-full rounded-2xl border-2 border-slate-100 bg-white p-3 text-slate-900 outline-none focus:border-[#5D9AD4]"
                value={fallbackMateriaId}
                onChange={(e) =>
                  setFallbackMateriaId(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
              >
                <option value="">Tomar del archivo...</option>
                {materias.map((materia) => (
                  <option key={materia.id} value={materia.id}>
                    {materia.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
                Año opcional
              </label>
              <input
                type="number"
                min={1900}
                max={3000}
                className="w-full rounded-2xl border-2 border-slate-100 bg-white p-3 text-slate-900 outline-none focus:border-[#5D9AD4]"
                value={fallbackYear}
                onChange={(e) => setFallbackYear(e.target.value)}
                placeholder="Tomar del archivo..."
              />
            </div>
          </div>

          <div className="mt-5">
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500"
            />
            <p className="mt-4 text-slate-600 font-medium">
              Puedes subir una tabla tipo SyO o un Excel simple con columnas de materia, año,
              varones inscriptos y mujeres inscriptas.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Si el archivo no trae materia o año, puedes completarlos aquí antes de importar.
            </p>
            {archivo && (
              <p className="mt-2 text-xs text-slate-400">Archivo: {archivo.name}</p>
            )}
          </div>
        </div>

        {statusMessage && <StatusBanner message={statusMessage} />}

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="rounded-2xl p-4 bg-slate-100">
              <p className="text-xs uppercase text-slate-500 font-bold">Total</p>
              <p className="text-2xl font-black text-slate-800">{summary.total}</p>
            </div>
            <div className="rounded-2xl p-4 bg-emerald-50">
              <p className="text-xs uppercase text-emerald-700 font-bold">Válidos</p>
              <p className="text-2xl font-black text-emerald-800">{summary.validos}</p>
            </div>
            <div className="rounded-2xl p-4 bg-amber-50">
              <p className="text-xs uppercase text-amber-700 font-bold">Calculados</p>
              <p className="text-2xl font-black text-amber-800">{summary.calculados}</p>
            </div>
            <div className="rounded-2xl p-4 bg-rose-50">
              <p className="text-xs uppercase text-rose-700 font-bold">Materia faltante</p>
              <p className="text-2xl font-black text-rose-800">
                {summary.materiaFaltante}
              </p>
            </div>
            <div className="rounded-2xl p-4 bg-rose-50">
              <p className="text-xs uppercase text-rose-700 font-bold">Materia inválida</p>
              <p className="text-2xl font-black text-rose-800">
                {summary.materiaDesconocida}
              </p>
            </div>
            <div className="rounded-2xl p-4 bg-rose-50">
              <p className="text-xs uppercase text-rose-700 font-bold">Año faltante</p>
              <p className="text-2xl font-black text-rose-800">{summary.anioFaltante}</p>
            </div>
            <div className="rounded-2xl p-4 bg-rose-50">
              <p className="text-xs uppercase text-rose-700 font-bold">Indicador inválido</p>
              <p className="text-2xl font-black text-rose-800">
                {summary.indicadorDesconocido}
              </p>
            </div>
            <div className="rounded-2xl p-4 bg-rose-50">
              <p className="text-xs uppercase text-rose-700 font-bold">Valor inválido</p>
              <p className="text-2xl font-black text-rose-800">{summary.valorInvalido}</p>
            </div>
          </div>
        )}

        {isCheckingChanges && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Analizando cambios contra la base actual...
          </div>
        )}

        {changeSummary && !isCheckingChanges && (
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-4">
              Cambios detectados
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-2xl p-4 bg-slate-100">
                <p className="text-xs uppercase text-slate-500 font-bold">Revisados</p>
                <p className="text-2xl font-black text-slate-800">
                  {changeSummary.revisados}
                </p>
              </div>
              <div className="rounded-2xl p-4 bg-emerald-50">
                <p className="text-xs uppercase text-emerald-700 font-bold">Nuevos</p>
                <p className="text-2xl font-black text-emerald-800">
                  {changeSummary.nuevos}
                </p>
              </div>
              <div className="rounded-2xl p-4 bg-amber-50">
                <p className="text-xs uppercase text-amber-700 font-bold">Actualizados</p>
                <p className="text-2xl font-black text-amber-800">
                  {changeSummary.actualizados}
                </p>
              </div>
              <div className="rounded-2xl p-4 bg-slate-50">
                <p className="text-xs uppercase text-slate-500 font-bold">Sin cambios</p>
                <p className="text-2xl font-black text-slate-800">
                  {changeSummary.sinCambios}
                </p>
              </div>
            </div>
          </div>
        )}

        {summary && summary.materiaDesconocida > 0 && currentRole === "admin" && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={crearMateriasFaltantes}
              disabled={isImporting}
              className="px-4 py-2 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-70"
            >
              {isImporting ? "CREANDO..." : "CREAR MATERIAS FALTANTES"}
            </button>
            <span className="text-sm text-slate-500 self-center">
              Esto toma las materias del Excel y las agrega a la base.
            </span>
          </div>
        )}

        {previewRows.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {([
                "todos",
                "valido",
                "calculado_ignorado",
                "materia_faltante",
                "materia_desconocida",
                "anio_faltante",
                "indicador_desconocido",
                "valor_invalido",
              ] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    statusFilter === status
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {status === "todos" ? "Todos" : statusLabels[status]}
                </button>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-900">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                    <tr>
                      <th className="text-left p-3">Materia</th>
                      <th className="text-left p-3">Indicador</th>
                      <th className="text-left p-3">Año</th>
                      <th className="text-left p-3">Valor</th>
                      <th className="text-left p-3">Estado</th>
                      <th className="text-left p-3">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowsFiltradas.map((row, index) => (
                      <tr key={`${row.materia}-${row.anio}-${index}`} className="border-t">
                        <td className="p-3">{row.materia}</td>
                        <td className="p-3">{row.indicadorRaw}</td>
                        <td className="p-3">{row.anio}</td>
                        <td className="p-3">{row.valor ?? "—"}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                              statusClasses[row.status]
                            }`}
                          >
                            {statusLabels[row.status]}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{row.mensaje}</td>
                      </tr>
                    ))}
                    {rowsFiltradas.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-500">
                          No hay filas para el filtro seleccionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={aceptarImportacion}
                disabled={isImporting}
                className="w-full p-4 bg-green-600 text-white font-black text-lg rounded-2xl hover:bg-green-700 transition-colors disabled:opacity-70"
              >
                {isImporting ? "GUARDANDO..." : "GUARDAR ESTADÍSTICAS"}
              </button>
              <button
                onClick={clearPreview}
                disabled={isImporting}
                className="w-full p-4 bg-slate-200 text-slate-800 font-black text-lg rounded-2xl hover:bg-slate-300 transition-colors disabled:opacity-70"
              >
                LIMPIAR PREVISUALIZACIÓN
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Dashboard</h2>
          <p className="text-slate-500 mt-2">
            Selecciona materia, indicador y rango de años para visualizar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
              Materia
            </label>
            <select
              className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none"
              value={selectedMateriaId}
              onChange={(e) =>
                setSelectedMateriaId(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
            >
              <option value="">Elegir materia...</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
              Indicador
            </label>
            <select
              className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none"
              value={selectedIndicator}
              onChange={(e) => setSelectedIndicator(e.target.value as IndicatorCode)}
            >
              {ALL_INDICATORS.map((indicator) => (
                <option key={indicator.code} value={indicator.code}>
                  {indicator.label} {indicator.isCalculated ? "(calc)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
              Desde
            </label>
            <input
              type="number"
              min={1900}
              max={CURRENT_YEAR}
              className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none"
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
              Hasta
            </label>
            <input
              type="number"
              min={1900}
              max={CURRENT_YEAR}
              className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none"
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-4">
            Serie temporal ({indicatorUnit === "percent" ? "%" : indicatorUnit})
          </p>
          <div className="h-80">
            {isLoadingStats ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Cargando gráfico...
              </div>
            ) : series.labels.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                Sin datos para el filtro seleccionado.
              </div>
            ) : (
              <Line data={chartData} options={chartOptions} />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

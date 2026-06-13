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
import { useAuth } from "@/app/hooks/useAuth";
import { useEstadisticasImport } from "@/app/hooks/useEstadisticasImport";
import { useTheme } from "@/app/hooks/useTheme";
import StatusBanner from "@/components/admin/StatusBanner";
import {
  createMissingMaterias,
  fetchEstadisticas,
} from "@/lib/academicApi";
import { getChartPalette } from "@/lib/charts/theme";
import {
  ALL_INDICATORS,
  INDICATOR_BY_CODE,
  type IndicatorCode,
} from "@/lib/estadisticas/catalog";
import {
  ESTADISTICA_STATUS_CLASSES,
  ESTADISTICA_STATUS_LABELS,
  getMissingMateriaNames,
  type ImportDefaults,
  type StatusMessage,
} from "@/lib/import/estadisticas/workflow";
import { getAccessibleMaterias, type Materia } from "@/lib/materias";
import { supabase } from "@/lib/supabase";
import type { Rol } from "@/types/database";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type StatRow = {
  anio: number;
  indicador: IndicatorCode;
  valor: number;
};

const CURRENT_YEAR = new Date().getFullYear();

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
  const { user, role, isLoadingProfile } = useAuth();
  const { resolvedTheme } = useTheme();
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [currentRole, setCurrentRole] = useState<Rol | null>(null);
  const [fallbackMateriaId, setFallbackMateriaId] = useState<number | "">("");
  const [fallbackYear, setFallbackYear] = useState("");

  const [selectedMateriaId, setSelectedMateriaId] = useState<number | "">("");
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorCode>("VAR_INS");
  const [yearFrom, setYearFrom] = useState("2010");
  const [yearTo, setYearTo] = useState(String(CURRENT_YEAR));
  const [statsRows, setStatsRows] = useState<StatRow[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isCreatingMaterias, setIsCreatingMaterias] = useState(false);

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

  const {
    archivo,
    parsedRows,
    previewRows,
    summary,
    rowsFiltradas,
    changeSummary,
    isImporting,
    isCheckingChanges,
    statusFilter,
    setStatusFilter,
    processFile,
    clearPreview: clearImportPreview,
    aceptarImportacion,
  } = useEstadisticasImport({
    materias,
    importDefaults,
    onStatusMessage: setStatusMessage,
  });

  useEffect(() => {
    const loadMaterias = async () => {
      if (isLoadingProfile) return;
      setCurrentRole(role);

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
            text: "No hay materias disponibles. Cree o asigne materias para mapear el Excel.",
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

    const timeoutId = window.setTimeout(() => {
      void loadMaterias();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isLoadingProfile, role, user?.id]);

  const crearMateriasFaltantes = async () => {
    if (parsedRows.length === 0) return;
    setIsCreatingMaterias(true);
    try {
      const faltantes = getMissingMateriaNames(parsedRows, materias);

      if (faltantes.length === 0) {
        setStatusMessage({
          type: "info",
          text: "No hay materias nuevas para crear.",
        });
        return;
      }

      const response = await createMissingMaterias(faltantes);
      setMaterias(response.materias);
      setStatusMessage({
        type: "success",
        text: `Materias creadas: ${response.creadas}.`,
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
      setIsCreatingMaterias(false);
    }
  };

  const selectedDashboardMateria =
    selectedMateriaId === ""
      ? null
      : materias.find((materia) => materia.id === selectedMateriaId) ?? null;
  const importReady = previewRows.length > 0;
  const dashboardReady = selectedMateriaId !== "";

  const cargarEstadisticas = useCallback(async () => {
    if (!selectedMateriaId) return;
    setIsLoadingStats(true);

    try {
      const data = await fetchEstadisticas({
        materiaId: Number(selectedMateriaId),
        anioDesde: Number(yearFrom),
        anioHasta: Number(yearTo),
      });

      const cleaned = data
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
    const timeoutId = window.setTimeout(() => {
      void cargarEstadisticas();
    }, 0);

    return () => window.clearTimeout(timeoutId);
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

  const chartOptions = useMemo(() => {
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
  }, [indicatorUnit, resolvedTheme]);

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen bg-white space-y-12">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Estadísticas</h1>
        <p className="text-slate-500 mt-2 font-medium">
          Importe archivos `.xlsx` de estadísticas y construya el dashboard de sus materias.
        </p>
      </header>

      <section className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Paso 1</p>
            <h2 className="mt-3 text-2xl font-black text-slate-900">Preparar importación</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Suba un archivo `.xlsx`, complete materia o año solo si faltan en el Excel y revise
              la previsualización antes de guardar cambios en la base.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="stats-fallback-materia"
                  className="text-xs uppercase tracking-widest font-bold text-slate-400"
                >
                  Materia opcional
                </label>
                <select
                  id="stats-fallback-materia"
                  className="w-full rounded-2xl border-2 border-slate-100 bg-white p-3 text-slate-900 outline-none focus:border-[#5D9AD4]"
                  value={fallbackMateriaId}
                  onChange={(e) =>
                    setFallbackMateriaId(e.target.value === "" ? "" : Number(e.target.value))
                  }
                >
                  <option value="">Usar la del archivo...</option>
                  {materias.map((materia) => (
                    <option key={materia.id} value={materia.id}>
                      {materia.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="stats-fallback-year"
                  className="text-xs uppercase tracking-widest font-bold text-slate-400"
                >
                  Año opcional
                </label>
                <input
                  id="stats-fallback-year"
                  type="number"
                  min={1900}
                  max={3000}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-white p-3 text-slate-900 outline-none focus:border-[#5D9AD4]"
                  value={fallbackYear}
                  onChange={(e) => setFallbackYear(e.target.value)}
                  placeholder="Usar el del archivo..."
                />
              </div>
            </div>

            <div className="mt-6 rounded-[1.75rem] border-2 border-dashed border-slate-200 bg-white p-5">
              <input
                type="file"
                accept=".xlsx"
                aria-label="Seleccionar archivo de estadísticas en formato Excel"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  await processFile(file);
                  event.target.value = "";
                }}
                className="block w-full text-sm text-slate-500"
              />
              <p className="mt-4 text-slate-600 font-medium">
                Puede subir una tabla tipo SyO o un Excel simple con columnas de materia, año,
                varones inscriptos y mujeres inscriptas.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Si el archivo no trae materia o año, podés completarlos acá antes de importar.
              </p>
              {archivo && (
                <p className="mt-3 rounded-full bg-[#5D9AD4]/10 px-4 py-2 text-xs font-bold text-slate-600">
                  Archivo cargado: {archivo.name}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              Contexto actual
            </p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Materia de apoyo
                </div>
                <div className="mt-2 text-sm font-black text-slate-900">
                  {fallbackMateriaId === ""
                    ? "Se leerá desde el archivo"
                    : materias.find((materia) => materia.id === fallbackMateriaId)?.nombre ??
                      "No disponible"}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Año de apoyo
                </div>
                <div className="mt-2 text-sm font-black text-slate-900">
                  {fallbackYear.trim() === "" ? "Se leerá desde el archivo" : fallbackYear}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Estado de importación
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-700">
                  {importReady
                    ? "Previsualización lista para revisar y guardar"
                    : "Cargue un archivo para generar la previsualización"}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Estado del dashboard
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-700">
                  {dashboardReady
                    ? "Dashboard listo para explorar"
                    : "Seleccione una materia para visualizar datos"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {statusMessage && <StatusBanner message={statusMessage} />}

        {summary && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  Paso 2
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  Revisar calidad del archivo
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Antes de guardar, verificá cuántas filas son válidas y qué datos necesitan
                  corrección o intervención manual.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-6">
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
                <p className="text-2xl font-black text-rose-800">{summary.materiaFaltante}</p>
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
          </div>
        )}

        {previewRows.length > 0 && (
          <div className="min-h-[11.5rem]">
            {isCheckingChanges ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Analizando cambios contra la base actual...
              </div>
            ) : changeSummary ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                  Cambios detectados
                </p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-2xl bg-slate-100 p-4">
                    <p className="text-xs font-bold uppercase text-slate-500">Revisados</p>
                    <p className="text-2xl font-black text-slate-800">{changeSummary.revisados}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-xs font-bold uppercase text-emerald-700">Nuevos</p>
                    <p className="text-2xl font-black text-emerald-800">{changeSummary.nuevos}</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-4">
                    <p className="text-xs font-bold uppercase text-amber-700">Actualizados</p>
                    <p className="text-2xl font-black text-amber-800">
                      {changeSummary.actualizados}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-500">Sin cambios</p>
                    <p className="text-2xl font-black text-slate-800">
                      {changeSummary.sinCambios}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                No hay filas validas para comparar contra la base actual.
              </div>
            )}
          </div>
        )}

        {summary && summary.materiaDesconocida > 0 && currentRole === "admin" && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={crearMateriasFaltantes}
              disabled={isCreatingMaterias}
              className="px-4 py-2 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-70"
            >
              {isCreatingMaterias ? "CREANDO..." : "CREAR MATERIAS FALTANTES"}
            </button>
            <span className="text-sm text-slate-500 self-center">
              Esto toma las materias del Excel y las agrega a la base.
            </span>
          </div>
        )}

        {previewRows.length > 0 && (
          <div className="space-y-4 rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Paso 3
              </p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">Confirmar importación</h3>
              <p className="mt-2 text-sm text-slate-600">
                Utilice los filtros para revisar las filas y guarde solo cuando esté conforme con la
                previsualización.
              </p>
            </div>

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
                  {status === "todos" ? "Todos" : ESTADISTICA_STATUS_LABELS[status]}
                </button>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-900">
                  <caption className="sr-only">
                    Previsualización de estadísticas importadas con materia, indicador, año, valor
                    y estado.
                  </caption>
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
                    {rowsFiltradas.map((row) => (
                      <tr
                        key={`${row.materiaId ?? "sin-materia"}-${row.indicadorCode ?? row.indicadorRaw}-${row.anio ?? "sin-anio"}-${row.valor ?? "sin-valor"}-${row.status}`}
                        className="border-t"
                      >
                        <td className="p-3">{row.materia}</td>
                        <td className="p-3">{row.indicadorRaw}</td>
                        <td className="p-3">{row.anio}</td>
                        <td className="p-3">{row.valor ?? "-"}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                              ESTADISTICA_STATUS_CLASSES[row.status]
                            }`}
                          >
                            {ESTADISTICA_STATUS_LABELS[row.status]}
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
                onClick={() => void aceptarImportacion()}
                disabled={isImporting}
                className="w-full p-4 bg-green-600 text-white font-black text-lg rounded-2xl hover:bg-green-700 transition-colors disabled:opacity-70"
              >
                {isImporting ? "GUARDANDO..." : "GUARDAR ESTADÍSTICAS"}
              </button>
              <button
                onClick={clearImportPreview}
                disabled={isImporting}
                className="w-full p-4 bg-slate-200 text-slate-800 font-black text-lg rounded-2xl hover:bg-slate-300 transition-colors disabled:opacity-70"
              >
                LIMPIAR REVISIÓN
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              Paso 4
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Explorar dashboard</h2>
            <p className="mt-2 text-slate-500">
              Seleccione materia, indicador y rango de años para visualizar la serie temporal.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[24rem]">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Materia activa
              </div>
              <div className="mt-2 text-sm font-black text-slate-900">
                {selectedDashboardMateria?.nombre ?? "Sin seleccionar"}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Indicador
              </div>
              <div className="mt-2 text-sm font-black text-slate-900">
                {INDICATOR_BY_CODE[selectedIndicator]?.label ?? "Sin indicador"}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Rango
              </div>
              <div className="mt-2 text-sm font-black text-slate-900">
                {yearFrom} - {yearTo}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label
              htmlFor="dashboard-materia"
              className="text-xs uppercase tracking-widest font-bold text-slate-400"
            >
              Materia
            </label>
            <select
              id="dashboard-materia"
              className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none"
              value={selectedMateriaId}
              onChange={(e) =>
                setSelectedMateriaId(e.target.value === "" ? "" : Number(e.target.value))
              }
            >
              <option value="">Seleccionar materia...</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="dashboard-indicador"
              className="text-xs uppercase tracking-widest font-bold text-slate-400"
            >
              Indicador
            </label>
            <select
              id="dashboard-indicador"
              className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none"
              value={selectedIndicator}
              onChange={(e) => setSelectedIndicator(e.target.value as IndicatorCode)}
            >
              {ALL_INDICATORS.map((indicator) => (
                <option key={indicator.code} value={indicator.code}>
                  {indicator.label} {indicator.isCalculated ? "(calculado)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="dashboard-year-from"
              className="text-xs uppercase tracking-widest font-bold text-slate-400"
            >
              Desde
            </label>
            <input
              id="dashboard-year-from"
              type="number"
              min={1900}
              max={CURRENT_YEAR}
              className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none"
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="dashboard-year-to"
              className="text-xs uppercase tracking-widest font-bold text-slate-400"
            >
              Hasta
            </label>
            <input
              id="dashboard-year-to"
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

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut, Radar, Scatter, Chart } from "react-chartjs-2";
import { supabase } from "@/lib/supabase";
import StatusBanner from "@/components/admin/StatusBanner";
import {
  INDICATOR_BY_CODE,
  type IndicatorCode,
} from "@/lib/estadisticas/catalog";
import type { Rol } from "@/types/database";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler
);

type Materia = {
  id: number;
  nombre: string;
  codigo?: string | null;
};

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

type StatRow = {
  anio: number;
  indicador: IndicatorCode;
  valor: number;
};

const DASHBOARD_INDICATORS: IndicatorCode[] = [
  "VAR_INS",
  "MUJ_INS",
  "VAR_REG",
  "MUJ_REG",
  "VAR_REC",
  "MUJ_REC",
  "PCT_VAR_REC",
  "PCT_MUJ_REC",
  "REL_MUJ_VAR_INS",
  "PCT_MUJ_REG",
];

const buildByYear = (rows: StatRow[]) => {
  const map = new Map<number, Record<IndicatorCode, number>>();
  rows.forEach((row) => {
    if (!map.has(row.anio)) {
      map.set(row.anio, {} as Record<IndicatorCode, number>);
    }
    map.get(row.anio)![row.indicador] = row.valor;
  });
  return map;
};

const getIndicatorValue = (
  byYear: Map<number, Record<IndicatorCode, number>>,
  year: number,
  indicatorCode: IndicatorCode
): number | null => {
  const data = byYear.get(year);
  if (!data) return null;
  const indicator = INDICATOR_BY_CODE[indicatorCode];
  if (indicator.isCalculated && indicator.compute) {
    return indicator.compute(data as Record<IndicatorCode, number | null>);
  }
  return data[indicatorCode] ?? null;
};

const buildSeriesForIndicator = (
  byYear: Map<number, Record<IndicatorCode, number>>,
  indicatorCode: IndicatorCode
): { labels: string[]; values: number[] } => {
  const indicator = INDICATOR_BY_CODE[indicatorCode];
  const years = Array.from(byYear.keys()).sort((a, b) => a - b);

  const labels: string[] = [];
  const values: number[] = [];

  years.forEach((year) => {
    const data = byYear.get(year);
    if (!data) return;

    let value: number | null = null;
    if (indicator.isCalculated && indicator.compute) {
      value = indicator.compute(data as Record<IndicatorCode, number | null>);
    } else {
      value = data[indicatorCode] ?? null;
    }

    if (value === null || Number.isNaN(value)) return;
    labels.push(String(year));
    values.push(value);
  });

  return { labels, values };
};

export default function EstadisticasDashboardPage() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [selectedMateriaId, setSelectedMateriaId] = useState<number | "">("");
  const [yearFrom, setYearFrom] = useState("2010");
  const [yearTo, setYearTo] = useState("2020");
  const [statsRows, setStatsRows] = useState<StatRow[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

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
          : ((data ?? [])
              .map((row) => row.materias)
              .filter(Boolean) as Materia[]);

      setMaterias(materiasList);
      if (materiasList.length === 0) {
        setStatusMessage({
          type: "info",
          text: "No hay materias asignadas para mostrar.",
        });
      }
    };

    void loadMaterias();
  }, []);

  const cargarEstadisticas = async () => {
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
  };

  useEffect(() => {
    if (!selectedMateriaId) return;
    void cargarEstadisticas();
  }, [selectedMateriaId, yearFrom, yearTo]);

  const byYear = useMemo(() => buildByYear(statsRows), [statsRows]);
  const years = useMemo(() => Array.from(byYear.keys()).sort((a, b) => a - b), [byYear]);
  const focusYear = useMemo(() => {
    const requested = Number(yearTo);
    if (years.includes(requested)) return requested;
    return years.length > 0 ? years[years.length - 1] : requested;
  }, [years, yearTo]);

  const seriesByIndicator = useMemo(() => {
    const map = new Map<IndicatorCode, { labels: string[]; values: number[] }>();
    DASHBOARD_INDICATORS.forEach((code) => {
      map.set(code, buildSeriesForIndicator(byYear, code));
    });
    return map;
  }, [byYear]);

  const chartOptionsFor = (indicatorCode: IndicatorCode, showLegend = false) => {
    const unit = INDICATOR_BY_CODE[indicatorCode]?.unit ?? "count";
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: showLegend,
          position: "bottom" as const,
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (value: string | number) => {
              if (unit === "percent") return `${value}%`;
              if (unit === "ratio") return Number(value).toFixed(2);
              return value;
            },
          },
        },
      },
    } as const;
  };

  const getCount = (year: number, code: IndicatorCode) =>
    getIndicatorValue(byYear, year, code) ?? 0;

  const totalInscriptos = (year: number) =>
    getCount(year, "VAR_INS") + getCount(year, "MUJ_INS");

  const totalRegulares = (year: number) =>
    getCount(year, "VAR_REG") + getCount(year, "MUJ_REG");

  const totalRecursantes = (year: number) =>
    getCount(year, "VAR_REC") + getCount(year, "MUJ_REC");

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-white space-y-10">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Dashboard Estadístico
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          Todos los gráficos en una sola vista, con filtros globales.
        </p>
      </header>

      {statusMessage && <StatusBanner message={statusMessage} />}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
            Materia
          </label>
          <select
            className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none"
            value={selectedMateriaId}
            onChange={(e) =>
              setSelectedMateriaId(e.target.value === "" ? "" : Number(e.target.value))
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
            Desde
          </label>
          <input
            type="number"
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
            className="w-full p-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none"
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value)}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-2">
            Alumnos Inscriptos (línea)
          </p>
          <div className="h-56">
            {isLoadingStats ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Cargando...
              </div>
            ) : (
              <Line
                data={{
                  labels: years.map(String),
                  datasets: [
                    {
                      label: "Varones",
                      data: years.map((y) => getCount(y, "VAR_INS")),
                      borderColor: "#5D9AD4",
                      backgroundColor: "rgba(93, 154, 212, 0.15)",
                      pointRadius: 2,
                      pointHoverRadius: 4,
                      tension: 0.3,
                    },
                    {
                      label: "Mujeres",
                      data: years.map((y) => getCount(y, "MUJ_INS")),
                      borderColor: "#FBC558",
                      backgroundColor: "rgba(251, 197, 88, 0.2)",
                      pointRadius: 2,
                      pointHoverRadius: 4,
                      tension: 0.3,
                    },
                  ],
                }}
                options={{ ...chartOptionsFor("VAR_INS", true) }}
              />
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-2">
            Alumnos Inscriptos (área)
          </p>
          <div className="h-56">
            {isLoadingStats ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Cargando...
              </div>
            ) : (
              <Line
                data={{
                  labels: years.map(String),
                  datasets: [
                    {
                      label: "Varones",
                      data: years.map((y) => getCount(y, "VAR_INS")),
                      borderColor: "#5D9AD4",
                      backgroundColor: "rgba(93, 154, 212, 0.25)",
                      fill: true,
                      pointRadius: 2,
                      tension: 0.3,
                    },
                    {
                      label: "Mujeres",
                      data: years.map((y) => getCount(y, "MUJ_INS")),
                      borderColor: "#FBC558",
                      backgroundColor: "rgba(251, 197, 88, 0.25)",
                      fill: true,
                      pointRadius: 2,
                      tension: 0.3,
                    },
                  ],
                }}
                options={{ ...chartOptionsFor("VAR_INS", true) }}
              />
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-2">
            Estado de Alumnos - Año {focusYear}
          </p>
          <div className="h-56">
            {isLoadingStats ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Cargando...
              </div>
            ) : (
              <Bar
                data={{
                  labels: [
                    "Varones Regulares",
                    "Varones Recursantes",
                    "Mujeres Inscriptas",
                    "Mujeres Regulares",
                    "Mujeres Recursantes",
                  ],
                  datasets: [
                    {
                      label: `Año ${focusYear}`,
                      data: [
                        getCount(focusYear, "VAR_REG"),
                        getCount(focusYear, "VAR_REC"),
                        getCount(focusYear, "MUJ_INS"),
                        getCount(focusYear, "MUJ_REG"),
                        getCount(focusYear, "MUJ_REC"),
                      ],
                      backgroundColor: [
                        "rgba(93, 154, 212, 0.8)",
                        "rgba(251, 197, 88, 0.8)",
                        "rgba(59, 130, 246, 0.7)",
                        "rgba(16, 185, 129, 0.7)",
                        "rgba(244, 63, 94, 0.7)",
                      ],
                      borderRadius: 8,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }}
              />
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-2">
            Ranking de Indicadores
          </p>
          <div className="h-56">
            {isLoadingStats ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Cargando...
              </div>
            ) : (
              <Bar
                data={{
                  labels: years.map(String),
                  datasets: [
                    {
                      label: "% Varones Regulares",
                      data: years.map((y) => getIndicatorValue(byYear, y, "PCT_VAR_REG") ?? 0),
                      backgroundColor: "rgba(93, 154, 212, 0.7)",
                    },
                    {
                      label: "% Mujeres Regulares",
                      data: years.map((y) => getIndicatorValue(byYear, y, "PCT_MUJ_REG") ?? 0),
                      backgroundColor: "rgba(16, 185, 129, 0.7)",
                    },
                    {
                      label: "% Mujeres Recursantes",
                      data: years.map((y) => getIndicatorValue(byYear, y, "PCT_MUJ_REC") ?? 0),
                      backgroundColor: "rgba(244, 63, 94, 0.7)",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom" as const } },
                }}
              />
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-2">
            Proporción del género total de Inscriptos
          </p>
          <div className="h-56">
            {isLoadingStats ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Cargando...
              </div>
            ) : (
              <Doughnut
                data={{
                  labels: ["Varones", "Mujeres"],
                  datasets: [
                    {
                      data: [getCount(focusYear, "VAR_INS"), getCount(focusYear, "MUJ_INS")],
                      backgroundColor: ["#5D9AD4", "#FBC558"],
                      borderWidth: 2,
                      borderColor: "#fff",
                    },
                  ],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" as const } } }}
              />
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-2">
            Recursantes vs Regularidad
          </p>
          <div className="h-56">
            {isLoadingStats ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Cargando...
              </div>
            ) : (
              <Radar
                data={{
                  labels: ["Regulares", "Recursantes"],
                  datasets: [
                    {
                      label: "Varones",
                      data: [getCount(focusYear, "VAR_REG"), getCount(focusYear, "VAR_REC")],
                      backgroundColor: "rgba(93, 154, 212, 0.3)",
                      borderColor: "#5D9AD4",
                    },
                    {
                      label: "Mujeres",
                      data: [getCount(focusYear, "MUJ_REG"), getCount(focusYear, "MUJ_REC")],
                      backgroundColor: "rgba(251, 197, 88, 0.3)",
                      borderColor: "#FBC558",
                    },
                  ],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" as const } } }}
              />
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-2">
            Dispersión (Regulares vs Recursantes)
          </p>
          <div className="h-56">
            {isLoadingStats ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Cargando...
              </div>
            ) : (
              <Scatter
                data={{
                  datasets: [
                    {
                      label: "Años",
                      data: years.map((y) => ({
                        x: totalRegulares(y),
                        y: totalRecursantes(y),
                      })),
                      backgroundColor: "rgba(93, 154, 212, 0.8)",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom" as const } },
                  scales: {
                    x: { title: { display: true, text: "Regulares" } },
                    y: { title: { display: true, text: "Recursantes" } },
                  },
                }}
              />
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-2">
            Combinado (Inscriptos Totales vs Mujeres)
          </p>
          <div className="h-56">
            {isLoadingStats ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Cargando...
              </div>
            ) : (
              <Chart
                type="bar"
                data={{
                  labels: years.map(String),
                  datasets: [
                    {
                      type: "bar" as const,
                      label: "Total Inscriptos",
                      data: years.map((y) => totalInscriptos(y)),
                      backgroundColor: "rgba(93, 154, 212, 0.5)",
                      borderRadius: 6,
                    },
                    {
                      type: "line" as const,
                      label: "Mujeres Inscriptas",
                      data: years.map((y) => getCount(y, "MUJ_INS")),
                      borderColor: "#FBC558",
                      backgroundColor: "rgba(251, 197, 88, 0.2)",
                      tension: 0.3,
                      pointRadius: 2,
                    },
                  ],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" as const } } }}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

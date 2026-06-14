"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  RadarController,
  BubbleController,
  type ScriptableContext,
  type TooltipItem,
} from "chart.js";
import { Bar, Bubble, Doughnut, Line, PolarArea, Radar } from "react-chartjs-2";
import { useAuth } from "@/app/hooks/useAuth";
import { useTheme } from "@/app/hooks/useTheme";
import { fetchEstadisticas } from "@/lib/academicApi";
import StatusBanner from "@/components/admin/StatusBanner";
import { getChartPalette } from "@/lib/charts/theme";
import {
  INDICATOR_BY_CODE,
  type IndicatorCode,
} from "@/lib/estadisticas/catalog";
import { getAccessibleMaterias, type Materia } from "@/lib/materias";

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
  Filler,
  RadarController,
  BubbleController,
);

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

type StatRow = {
  materia_id: number;
  anio: number;
  indicador: IndicatorCode;
  valor: number;
};

type ChartKey =
  | "linea"
  | "area"
  | "estado"
  | "participacion"
  | "genero"
  | "combinado";

type ChartSelections = Record<ChartKey, number | "">;

const CURRENT_YEAR = new Date().getFullYear();
const CHART_KEYS: ChartKey[] = [
  "linea",
  "area",
  "estado",
  "participacion",
  "genero",
  "combinado",
];
const LEGACY_COUNT_FALLBACKS: Partial<Record<IndicatorCode, IndicatorCode>> = {
  VAR_REG: "PCT_VAR_REG",
  VAR_REC: "PCT_VAR_REC",
  MUJ_REG: "PCT_MUJ_REG",
  MUJ_REC: "PCT_MUJ_REC",
};
const ESTADO_ALUMNADO_METRICS: Array<{
  label: string;
  code: IndicatorCode;
  color: string;
  gradient: [string, string, string];
}> = [
  {
    label: "Varones Inscriptos",
    code: "VAR_INS",
    color: "rgba(93, 154, 212, 0.86)",
    gradient: ["#B7DCF7", "#5D9AD4", "#2563EB"],
  },
  {
    label: "Mujeres Inscriptas",
    code: "MUJ_INS",
    color: "rgba(251, 197, 88, 0.86)",
    gradient: ["#FDE9A6", "#FBC558", "#D97706"],
  },
  {
    label: "Varones Regulares",
    code: "VAR_REG",
    color: "rgba(16, 185, 129, 0.82)",
    gradient: ["#A7F3D0", "#10B981", "#047857"],
  },
  {
    label: "Mujeres Regulares",
    code: "MUJ_REG",
    color: "rgba(244, 63, 94, 0.78)",
    gradient: ["#FDA4AF", "#F43F5E", "#BE123C"],
  },
];

const radialGradientCache = new Map<string, CanvasGradient>();
let radialGradientWidth = 0;
let radialGradientHeight = 0;

type RadialGradientContext =
  | Pick<ScriptableContext<"polarArea">, "chart">
  | Pick<ScriptableContext<"doughnut">, "chart">;

const createRadialGradient = (
  context: RadialGradientContext,
  colors: [string, string, string],
) => {
  const { chartArea, ctx } = context.chart;
  if (!chartArea) return colors[1];

  const chartWidth = chartArea.right - chartArea.left;
  const chartHeight = chartArea.bottom - chartArea.top;
  if (
    radialGradientWidth !== chartWidth ||
    radialGradientHeight !== chartHeight
  ) {
    radialGradientCache.clear();
    radialGradientWidth = chartWidth;
    radialGradientHeight = chartHeight;
  }

  const cacheKey = colors.join("|");
  const cached = radialGradientCache.get(cacheKey);
  if (cached) return cached;

  const centerX = (chartArea.left + chartArea.right) / 2;
  const centerY = (chartArea.top + chartArea.bottom) / 2;
  const radius = Math.min(chartWidth / 2, chartHeight / 2);
  const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    radius,
  );
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.55, colors[1]);
  gradient.addColorStop(1, colors[2]);
  radialGradientCache.set(cacheKey, gradient);
  return gradient;
};

const standardFastAnimation = {
  duration: 600,
  easing: "easeOutQuart" as const,
};

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
  indicatorCode: IndicatorCode,
): number | null => {
  const data = byYear.get(year);
  if (!data) return null;

  const indicator = INDICATOR_BY_CODE[indicatorCode];
  if (indicator.isCalculated && indicator.compute) {
    return indicator.compute(data as Record<IndicatorCode, number | null>);
  }

  return data[indicatorCode] ?? null;
};

const createInitialSelections = (materiaId: number | ""): ChartSelections => ({
  linea: materiaId,
  area: materiaId,
  estado: materiaId,
  participacion: materiaId,
  genero: materiaId,
  combinado: materiaId,
});

type ChartCardProps = {
  title: string;
  description: string;
  materiaId: number | "";
  materias: Materia[];
  onMateriaChange: (value: number | "") => void;
  children: ReactNode;
  footer?: ReactNode;
};

function ChartCard({
  title,
  description,
  materiaId,
  materias,
  onMateriaChange,
  children,
  footer,
}: ChartCardProps) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Materia
          </label>
          <select
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-[#5D9AD4]"
            value={materiaId}
            onChange={(event) =>
              onMateriaChange(
                event.target.value === "" ? "" : Number(event.target.value),
              )
            }
          >
            <option value="">Seleccionar materia...</option>
            {materias.map((materia) => (
              <option key={materia.id} value={materia.id}>
                {materia.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-64">{children}</div>
      {footer && <div className="mt-4">{footer}</div>}
    </article>
  );
}

function EmptyChartState({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm font-medium text-slate-500">
      {text}
    </div>
  );
}

export default function EstadisticasDashboardPage() {
  const { user, role, isLoadingProfile } = useAuth();
  const { resolvedTheme } = useTheme();
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR));
  const [chartSelections, setChartSelections] = useState<ChartSelections>(
    createInitialSelections(""),
  );
  const [loadedStatsRows, setLoadedStatsRows] = useState<StatRow[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(
    null,
  );

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
        const uniqueMaterias = await getAccessibleMaterias(user.id, role);
        setMaterias(uniqueMaterias);

        if (uniqueMaterias.length === 0) {
          setStatusMessage({
            type: "info",
            text: "No hay materias asignadas para mostrar.",
          });
          setChartSelections(createInitialSelections(""));
          return;
        }

        const defaultMateriaId = uniqueMaterias[0]?.id ?? "";
        setChartSelections((current) => {
          const hasExistingSelection = CHART_KEYS.some(
            (key) => current[key] !== "",
          );
          if (!hasExistingSelection) {
            return createInitialSelections(defaultMateriaId);
          }

          const availableIds = new Set(
            uniqueMaterias.map((materia) => materia.id),
          );
          return CHART_KEYS.reduce((acc, key) => {
            const currentValue = current[key];
            acc[key] =
              currentValue !== "" && availableIds.has(currentValue)
                ? currentValue
                : defaultMateriaId;
            return acc;
          }, {} as ChartSelections);
        });
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

  const distinctMateriaIds = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(chartSelections).filter(
            (value): value is number => typeof value === "number",
          ),
        ),
      ),
    [chartSelections],
  );

  const shouldQueryStats =
    Number.isFinite(Number(selectedYear)) && distinctMateriaIds.length > 0;

  useEffect(() => {
    if (!shouldQueryStats) {
      return;
    }

    const yearLimit = Number(selectedYear);

    const loadStats = async () => {
      setIsLoadingStats(true);

      try {
        const data = await fetchEstadisticas({
          materiaIds: distinctMateriaIds,
          anioHasta: yearLimit,
        });

        const cleaned = data
          .map((row) => ({
            materia_id: Number(row.materia_id),
            anio: Number(row.anio),
            indicador: row.indicador as IndicatorCode,
            valor: Number(row.valor),
          }))
          .filter(
            (row) =>
              Number.isFinite(row.materia_id) &&
              Number.isFinite(row.anio) &&
              Number.isFinite(row.valor),
          );

        setLoadedStatsRows(cleaned);
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

    const timeoutId = window.setTimeout(() => {
      void loadStats();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [distinctMateriaIds, selectedYear, shouldQueryStats]);

  const statsRows = useMemo(
    () => (shouldQueryStats ? loadedStatsRows : []),
    [loadedStatsRows, shouldQueryStats],
  );

  const statsByMateria = useMemo(() => {
    const map = new Map<number, StatRow[]>();
    statsRows.forEach((row) => {
      const current = map.get(row.materia_id) ?? [];
      current.push(row);
      map.set(row.materia_id, current);
    });
    return map;
  }, [statsRows]);

  const byYearForMateria = (materiaId: number | "") =>
    materiaId === ""
      ? new Map<number, Record<IndicatorCode, number>>()
      : buildByYear(statsByMateria.get(materiaId) ?? []);

  const yearsForMateria = (materiaId: number | "") => {
    const byYear = byYearForMateria(materiaId);
    return Array.from(byYear.keys()).sort((a, b) => a - b);
  };

  const focusYearForMateria = (materiaId: number | "") => {
    const requestedYear = Number(selectedYear);
    const years = yearsForMateria(materiaId);
    if (years.includes(requestedYear)) return requestedYear;
    return years.length > 0 ? years[years.length - 1] : requestedYear;
  };

  const getStoredCount = (
    byYear: Map<number, Record<IndicatorCode, number>>,
    year: number,
    code: IndicatorCode,
  ) => {
    const value = getIndicatorValue(byYear, year, code);
    if (value !== null) return value;

    const legacyCode = LEGACY_COUNT_FALLBACKS[code];
    if (!legacyCode) return null;

    return byYear.get(year)?.[legacyCode] ?? null;
  };

  const getCount = (
    materiaId: number | "",
    year: number,
    code: IndicatorCode,
  ) => {
    const byYear = byYearForMateria(materiaId);
    const storedValue = getStoredCount(byYear, year, code);
    if (storedValue !== null) return storedValue;

    const values = byYear.get(year);
    if (!values) return 0;

    if (code === "VAR_REG") {
      const inscriptos = getStoredCount(byYear, year, "VAR_INS");
      const recursantes = getStoredCount(byYear, year, "VAR_REC");
      if (inscriptos !== null && recursantes !== null) {
        return Math.max(inscriptos - recursantes, 0);
      }
    }

    if (code === "MUJ_REG") {
      const inscriptas = getStoredCount(byYear, year, "MUJ_INS");
      const recursantes = getStoredCount(byYear, year, "MUJ_REC");
      if (inscriptas !== null && recursantes !== null) {
        return Math.max(inscriptas - recursantes, 0);
      }
    }

    if (code === "VAR_REC") {
      const inscriptos = getStoredCount(byYear, year, "VAR_INS");
      const regulares = getStoredCount(byYear, year, "VAR_REG");
      if (inscriptos !== null && regulares !== null) {
        return Math.max(inscriptos - regulares, 0);
      }
    }

    if (code === "MUJ_REC") {
      const inscriptas = getStoredCount(byYear, year, "MUJ_INS");
      const regulares = getStoredCount(byYear, year, "MUJ_REG");
      if (inscriptas !== null && regulares !== null) {
        return Math.max(inscriptas - regulares, 0);
      }
    }

    return 0;
  };

  const totalInscriptos = (materiaId: number | "", year: number) =>
    getCount(materiaId, year, "VAR_INS") + getCount(materiaId, year, "MUJ_INS");

  const porcentajeInscriptos = (
    materiaId: number | "",
    year: number,
    code: "VAR_INS" | "MUJ_INS",
  ) => {
    const total = totalInscriptos(materiaId, year);
    if (total === 0) return 0;
    return Number(((getCount(materiaId, year, code) / total) * 100).toFixed(1));
  };

  const handleSelectionChange = (chartKey: ChartKey, value: number | "") => {
    setChartSelections((current) => ({
      ...current,
      [chartKey]: value,
    }));
  };

  const chartPalette = useMemo(
    () => getChartPalette(resolvedTheme),
    [resolvedTheme],
  );

  const chartOptionsFor = (
    indicatorCode: IndicatorCode,
    showLegend = false,
  ) => {
    const unit = INDICATOR_BY_CODE[indicatorCode]?.unit ?? "count";
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: showLegend,
          position: "bottom" as const,
          labels: {
            color: chartPalette.text,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: chartPalette.mutedText,
          },
          grid: {
            color: chartPalette.grid,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: chartPalette.mutedText,
            callback: (value: string | number) => {
              if (unit === "percent") return `${value}%`;
              if (unit === "ratio") return Number(value).toFixed(2);
              return value;
            },
          },
          grid: {
            color: chartPalette.grid,
          },
        },
      },
    } as const;
  };

  const percentStackedBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: chartPalette.text,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: {
          color: chartPalette.mutedText,
          maxRotation: 35,
          minRotation: 0,
        },
        grid: {
          color: chartPalette.grid,
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        max: 100,
        ticks: {
          color: chartPalette.mutedText,
          callback: (value: string | number) => `${value}%`,
        },
        grid: {
          color: chartPalette.grid,
        },
      },
    },
  } as const;

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: standardFastAnimation,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: chartPalette.text,
        },
      },
    },
  } as const;

  const estadoRadialOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: standardFastAnimation,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: chartPalette.text,
        },
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        ticks: {
          color: chartPalette.mutedText,
          backdropColor: "transparent",
          precision: 0,
        },
        grid: {
          color: chartPalette.grid,
        },
        angleLines: {
          color: chartPalette.grid,
        },
        pointLabels: {
          color: chartPalette.mutedText,
        },
      },
    },
  } as const;

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: standardFastAnimation,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: chartPalette.text,
        },
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        ticks: {
          color: chartPalette.mutedText,
          backdropColor: "transparent",
          precision: 0,
        },
        grid: {
          color: chartPalette.grid,
        },
        angleLines: {
          color: chartPalette.grid,
        },
        pointLabels: {
          color: chartPalette.mutedText,
          font: {
            size: 11,
          },
        },
      },
    },
  } as const;

  const bubbleOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: standardFastAnimation,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"bubble">) => {
            const dataPoint = context.raw as { x: number; y: number; r: number };
            const year = dataPoint.x;
            const total = dataPoint.y;
            const radius = dataPoint.r;
            const retention = Math.round(((radius - 4) / 15) * 100);
            return `Año ${year}: ${total} inscriptos (Retención: ${retention}%)`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: chartPalette.mutedText,
          precision: 0,
        },
        grid: {
          color: chartPalette.grid,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: chartPalette.mutedText,
        },
        grid: {
          color: chartPalette.grid,
        },
      },
    },
  } as const;

  const getBubbleData = (materiaId: number | "", years: number[]) => {
    return years.map((year) => {
      const ins = totalInscriptos(materiaId, year);
      const reg = getCount(materiaId, year, "VAR_REG") + getCount(materiaId, year, "MUJ_REG");
      const retention = ins > 0 ? reg / ins : 0;
      return {
        x: year,
        y: ins,
        r: Math.round(retention * 15) + 4,
      };
    });
  };

  const renderLoadingOrEmpty = (materiaId: number | "", years: number[]) => {
    if (isLoadingStats) {
      return <EmptyChartState text="Cargando gráfico..." />;
    }

    if (materiaId === "") {
      return (
        <EmptyChartState text="Selecciona una materia para visualizar el gráfico." />
      );
    }

    if (years.length === 0) {
      return (
        <EmptyChartState text="No hay datos disponibles para la materia y el año seleccionados." />
      );
    }

    return null;
  };

  const estadoYear = Number(selectedYear);
  const lineaMateriaId = chartSelections.linea;
  const lineaYears = yearsForMateria(lineaMateriaId);
  const areaMateriaId = chartSelections.area;
  const areaYears = yearsForMateria(areaMateriaId);
  const areaHasSelectedYear = areaYears.includes(estadoYear);
  const estadoMateriaId = chartSelections.estado;
  const estadoYears = yearsForMateria(estadoMateriaId);
  const estadoHasSelectedYear = estadoYears.includes(estadoYear);
  const estadoChartValues = ESTADO_ALUMNADO_METRICS.map((metric) => ({
    ...metric,
    value: getCount(estadoMateriaId, estadoYear, metric.code),
  }));
  const participacionMateriaId = chartSelections.participacion;
  const participacionYears = yearsForMateria(participacionMateriaId);
  const generoMateriaId = chartSelections.genero;
  const generoYear = focusYearForMateria(generoMateriaId);
  const generoYears = yearsForMateria(generoMateriaId);
  const combinadoMateriaId = chartSelections.combinado;
  const combinadoYears = yearsForMateria(combinadoMateriaId);
  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Dashboard principal
          </h1>
          <p className="mt-2 max-w-3xl text-slate-500">
            Cada gráfico trabaja con su propia materia, mientras que el selector
            global de año actualiza toda la línea de visualizaciones del panel.
          </p>
        </div>

        <div className="w-full max-w-sm rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
          <label className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            Año global del dashboard
          </label>
          <input
            type="number"
            min={1900}
            max={CURRENT_YEAR}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-colors focus:border-[#5D9AD4]"
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
          />
        </div>
      </header>

      {statusMessage && <StatusBanner message={statusMessage} />}

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Inscriptos en serie"
          description="Evolución histórica de inscriptos por género hasta el año global seleccionado."
          materiaId={lineaMateriaId}
          materias={materias}
          onMateriaChange={(value) => handleSelectionChange("linea", value)}
        >
          {renderLoadingOrEmpty(lineaMateriaId, lineaYears) ?? (
            <Line
              data={{
                labels: lineaYears.map(String),
                datasets: [
                  {
                    label: "Varones",
                    data: lineaYears.map((year) =>
                      getCount(lineaMateriaId, year, "VAR_INS"),
                    ),
                    borderColor: "#5D9AD4",
                    backgroundColor: "rgba(93, 154, 212, 0.15)",
                    pointRadius: 2,
                    pointHoverRadius: 4,
                    tension: 0.3,
                  },
                  {
                    label: "Mujeres",
                    data: lineaYears.map((year) =>
                      getCount(lineaMateriaId, year, "MUJ_INS"),
                    ),
                    borderColor: "#FBC558",
                    backgroundColor: "rgba(251, 197, 88, 0.2)",
                    pointRadius: 2,
                    pointHoverRadius: 4,
                    tension: 0.3,
                  },
                ],
              }}
              options={{
                ...chartOptionsFor("VAR_INS", true),
                animation: standardFastAnimation,
              }}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Distribución y rendimiento"
          description={`Comparativa de inscripción, regularidad y recursado por género del año ${estadoYear}.`}
          materiaId={areaMateriaId}
          materias={materias}
          onMateriaChange={(value) => handleSelectionChange("area", value)}
        >
          {isLoadingStats ? (
            <EmptyChartState text="Cargando gráfico..." />
          ) : areaMateriaId === "" ? (
            <EmptyChartState text="Selecciona una materia para visualizar el gráfico." />
          ) : !areaHasSelectedYear ? (
            <EmptyChartState text={`No hay datos cargados para el año ${estadoYear}.`} />
          ) : (
            <Radar
              data={{
                labels: ["Inscriptos", "Regulares", "Recursantes"],
                datasets: [
                  {
                    label: "Varones",
                    data: [
                      getCount(areaMateriaId, estadoYear, "VAR_INS"),
                      getCount(areaMateriaId, estadoYear, "VAR_REG"),
                      getCount(areaMateriaId, estadoYear, "VAR_REC"),
                    ],
                    borderColor: "#5D9AD4",
                    backgroundColor: "rgba(93, 154, 212, 0.2)",
                    borderWidth: 2,
                    pointBackgroundColor: "#5D9AD4",
                  },
                  {
                    label: "Mujeres",
                    data: [
                      getCount(areaMateriaId, estadoYear, "MUJ_INS"),
                      getCount(areaMateriaId, estadoYear, "MUJ_REG"),
                      getCount(areaMateriaId, estadoYear, "MUJ_REC"),
                    ],
                    borderColor: "#FBC558",
                    backgroundColor: "rgba(251, 197, 88, 0.2)",
                    borderWidth: 2,
                    pointBackgroundColor: "#FBC558",
                  },
                ],
              }}
              options={radarOptions}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Estado del alumnado"
          description={`Fotografia del ano ${estadoYear}: cuatro valores principales del alumnado.`}
          materiaId={estadoMateriaId}
          materias={materias}
          onMateriaChange={(value) => handleSelectionChange("estado", value)}

        >
          {isLoadingStats ? (
            <EmptyChartState text="Cargando gráfico..." />
          ) : estadoMateriaId === "" ? (
            <EmptyChartState text="Selecciona una materia para visualizar el gráfico." />
          ) : !estadoHasSelectedYear ? (
            <EmptyChartState
              text={`No hay datos cargados para el año ${estadoYear}.`}
            />
          ) : (
            <PolarArea
              data={{
                labels: estadoChartValues.map((metric) => metric.label),
                datasets: [
                  {
                    label: `Año ${estadoYear}`,
                    data: estadoChartValues.map((metric) => metric.value),
                    backgroundColor: (context) => {
                      const metric = estadoChartValues[context.dataIndex];
                      return metric
                        ? createRadialGradient(context, metric.gradient)
                        : "rgba(93, 154, 212, 0.76)";
                    },
                    borderColor: estadoChartValues.map(
                      (metric) => metric.color,
                    ),
                    borderWidth: 2,
                  },
                ],
              }}
              options={estadoRadialOptions}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Participacion de genero"
          description="Composicion porcentual de inscriptos por genero en cada ano."
          materiaId={participacionMateriaId}
          materias={materias}
          onMateriaChange={(value) =>
            handleSelectionChange("participacion", value)
          }
        >
          {renderLoadingOrEmpty(participacionMateriaId, participacionYears) ?? (
            <Bar
              data={{
                labels: participacionYears.map(String),
                datasets: [
                  {
                    label: "% Varones",
                    data: participacionYears.map((year) =>
                      porcentajeInscriptos(
                        participacionMateriaId,
                        year,
                        "VAR_INS",
                      ),
                    ),
                    backgroundColor: "rgba(93, 154, 212, 0.78)",
                    borderRadius: 6,
                  },
                  {
                    label: "% Mujeres",
                    data: participacionYears.map((year) =>
                      porcentajeInscriptos(
                        participacionMateriaId,
                        year,
                        "MUJ_INS",
                      ),
                    ),
                    backgroundColor: "rgba(251, 197, 88, 0.82)",
                    borderRadius: 6,
                  },
                ],
              }}
              options={{
                ...percentStackedBarOptions,
                animation: standardFastAnimation,
              }}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Proporción de género"
          description={`Distribución de inscriptos del año ${generoYear}.`}
          materiaId={generoMateriaId}
          materias={materias}
          onMateriaChange={(value) => handleSelectionChange("genero", value)}
        >
          {renderLoadingOrEmpty(generoMateriaId, generoYears) ?? (
            <Doughnut
              data={{
                labels: ["Varones", "Mujeres"],
                datasets: [
                  {
                    data: [
                      getCount(generoMateriaId, generoYear, "VAR_INS"),
                      getCount(generoMateriaId, generoYear, "MUJ_INS"),
                    ],
                    backgroundColor: ["#5D9AD4", "#FBC558"],
                    borderWidth: 2,
                    borderColor: "#ffffff",
                  },
                ],
              }}
              options={doughnutOptions}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Evolución y retención histórica"
          description="Relación anual entre inscriptos totales (Y), año (X) y tasa de retención (tamaño de la burbuja)."
          materiaId={combinadoMateriaId}
          materias={materias}
          onMateriaChange={(value) => handleSelectionChange("combinado", value)}
        >
          {renderLoadingOrEmpty(combinadoMateriaId, combinadoYears) ?? (
            <Bubble
              data={{
                datasets: [
                  {
                    label: "Matrícula vs Retención",
                    data: getBubbleData(combinadoMateriaId, combinadoYears),
                    backgroundColor: "rgba(93, 154, 212, 0.6)",
                    borderColor: "#5D9AD4",
                    borderWidth: 2,
                  },
                ],
              }}
              options={bubbleOptions}
            />
          )}
        </ChartCard>
      </section>
    </div>
  );
}

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
} from "chart.js";
import { Bar, Chart, Doughnut, Line, Radar, Scatter } from "react-chartjs-2";
import { useAuth } from "@/app/hooks/useAuth";
import { useTheme } from "@/app/hooks/useTheme";
import { supabase } from "@/lib/supabase";
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
  Filler
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
  | "ranking"
  | "genero"
  | "radar"
  | "dispersion"
  | "combinado";

type ChartSelections = Record<ChartKey, number | "">;

const CURRENT_YEAR = new Date().getFullYear();
const CHART_KEYS: ChartKey[] = [
  "linea",
  "area",
  "estado",
  "ranking",
  "genero",
  "radar",
  "dispersion",
  "combinado",
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

const createInitialSelections = (materiaId: number | ""): ChartSelections => ({
  linea: materiaId,
  area: materiaId,
  estado: materiaId,
  ranking: materiaId,
  genero: materiaId,
  radar: materiaId,
  dispersion: materiaId,
  combinado: materiaId,
});

type ChartCardProps = {
  title: string;
  description: string;
  materiaId: number | "";
  materias: Materia[];
  onMateriaChange: (value: number | "") => void;
  children: ReactNode;
};

function ChartCard({
  title,
  description,
  materiaId,
  materias,
  onMateriaChange,
  children,
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
                event.target.value === "" ? "" : Number(event.target.value)
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
    createInitialSelections("")
  );
  const [loadedStatsRows, setLoadedStatsRows] = useState<StatRow[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

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
          const hasExistingSelection = CHART_KEYS.some((key) => current[key] !== "");
          if (!hasExistingSelection) {
            return createInitialSelections(defaultMateriaId);
          }

          const availableIds = new Set(uniqueMaterias.map((materia) => materia.id));
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
            (value): value is number => typeof value === "number"
          )
        )
      ),
    [chartSelections]
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
        const { data, error } = await supabase
          .from("estadisticas")
          .select("materia_id, anio, indicador, valor")
          .in("materia_id", distinctMateriaIds)
          .lte("anio", yearLimit)
          .order("anio", { ascending: true });

        if (error) throw error;

        const cleaned = (data ?? [])
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
              Number.isFinite(row.valor)
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
    [loadedStatsRows, shouldQueryStats]
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

  const getCount = (materiaId: number | "", year: number, code: IndicatorCode) =>
    getIndicatorValue(byYearForMateria(materiaId), year, code) ?? 0;

  const totalInscriptos = (materiaId: number | "", year: number) =>
    getCount(materiaId, year, "VAR_INS") + getCount(materiaId, year, "MUJ_INS");

  const totalRegulares = (materiaId: number | "", year: number) =>
    getCount(materiaId, year, "VAR_REG") + getCount(materiaId, year, "MUJ_REG");

  const totalRecursantes = (materiaId: number | "", year: number) =>
    getCount(materiaId, year, "VAR_REC") + getCount(materiaId, year, "MUJ_REC");

  const handleSelectionChange = (chartKey: ChartKey, value: number | "") => {
    setChartSelections((current) => ({
      ...current,
      [chartKey]: value,
    }));
  };

  const chartPalette = useMemo(() => getChartPalette(resolvedTheme), [resolvedTheme]);

  const chartOptionsFor = (indicatorCode: IndicatorCode, showLegend = false) => {
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

  const barChartOptions = {
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
        },
        grid: {
          color: chartPalette.grid,
        },
      },
    },
  } as const;

  const radarOptions = {
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
      r: {
        angleLines: {
          color: chartPalette.grid,
        },
        grid: {
          color: chartPalette.grid,
        },
        pointLabels: {
          color: chartPalette.mutedText,
        },
        ticks: {
          color: chartPalette.mutedText,
          backdropColor: chartPalette.surface,
        },
      },
    },
  } as const;

  const doughnutOptions = {
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
  } as const;

  const scatterOptions = {
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
        title: {
          display: true,
          text: "Regulares",
          color: chartPalette.text,
        },
        ticks: {
          color: chartPalette.mutedText,
        },
        grid: {
          color: chartPalette.grid,
        },
      },
      y: {
        title: {
          display: true,
          text: "Recursantes",
          color: chartPalette.text,
        },
        ticks: {
          color: chartPalette.mutedText,
        },
        grid: {
          color: chartPalette.grid,
        },
      },
    },
  } as const;

  const renderLoadingOrEmpty = (materiaId: number | "", years: number[]) => {
    if (isLoadingStats) {
      return <EmptyChartState text="Cargando gráfico..." />;
    }

    if (materiaId === "") {
      return <EmptyChartState text="Selecciona una materia para visualizar el gráfico." />;
    }

    if (years.length === 0) {
      return (
        <EmptyChartState text="No hay datos disponibles para la materia y el año seleccionados." />
      );
    }

    return null;
  };

  const lineaMateriaId = chartSelections.linea;
  const lineaYears = yearsForMateria(lineaMateriaId);
  const areaMateriaId = chartSelections.area;
  const areaYears = yearsForMateria(areaMateriaId);
  const estadoMateriaId = chartSelections.estado;
  const estadoYear = focusYearForMateria(estadoMateriaId);
  const estadoYears = yearsForMateria(estadoMateriaId);
  const rankingMateriaId = chartSelections.ranking;
  const rankingYears = yearsForMateria(rankingMateriaId);
  const generoMateriaId = chartSelections.genero;
  const generoYear = focusYearForMateria(generoMateriaId);
  const generoYears = yearsForMateria(generoMateriaId);
  const radarMateriaId = chartSelections.radar;
  const radarYear = focusYearForMateria(radarMateriaId);
  const radarYears = yearsForMateria(radarMateriaId);
  const dispersionMateriaId = chartSelections.dispersion;
  const dispersionYears = yearsForMateria(dispersionMateriaId);
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
                    data: lineaYears.map((year) => getCount(lineaMateriaId, year, "VAR_INS")),
                    borderColor: "#5D9AD4",
                    backgroundColor: "rgba(93, 154, 212, 0.15)",
                    pointRadius: 2,
                    pointHoverRadius: 4,
                    tension: 0.3,
                  },
                  {
                    label: "Mujeres",
                    data: lineaYears.map((year) => getCount(lineaMateriaId, year, "MUJ_INS")),
                    borderColor: "#FBC558",
                    backgroundColor: "rgba(251, 197, 88, 0.2)",
                    pointRadius: 2,
                    pointHoverRadius: 4,
                    tension: 0.3,
                  },
                ],
              }}
              options={chartOptionsFor("VAR_INS", true)}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Inscriptos acumulados"
          description="Vista de área para seguir la presencia histórica por materia."
          materiaId={areaMateriaId}
          materias={materias}
          onMateriaChange={(value) => handleSelectionChange("area", value)}
        >
          {renderLoadingOrEmpty(areaMateriaId, areaYears) ?? (
            <Line
              data={{
                labels: areaYears.map(String),
                datasets: [
                  {
                    label: "Varones",
                    data: areaYears.map((year) => getCount(areaMateriaId, year, "VAR_INS")),
                    borderColor: "#5D9AD4",
                    backgroundColor: "rgba(93, 154, 212, 0.25)",
                    fill: true,
                    pointRadius: 2,
                    tension: 0.3,
                  },
                  {
                    label: "Mujeres",
                    data: areaYears.map((year) => getCount(areaMateriaId, year, "MUJ_INS")),
                    borderColor: "#FBC558",
                    backgroundColor: "rgba(251, 197, 88, 0.25)",
                    fill: true,
                    pointRadius: 2,
                    tension: 0.3,
                  },
                ],
              }}
              options={chartOptionsFor("VAR_INS", true)}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Estado del alumnado"
          description={`Fotografía del año ${estadoYear} para regulares, recursantes e inscripción.`}
          materiaId={estadoMateriaId}
          materias={materias}
          onMateriaChange={(value) => handleSelectionChange("estado", value)}
        >
          {renderLoadingOrEmpty(estadoMateriaId, estadoYears) ?? (
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
                    label: `Año ${estadoYear}`,
                    data: [
                      getCount(estadoMateriaId, estadoYear, "VAR_REG"),
                      getCount(estadoMateriaId, estadoYear, "VAR_REC"),
                      getCount(estadoMateriaId, estadoYear, "MUJ_INS"),
                      getCount(estadoMateriaId, estadoYear, "MUJ_REG"),
                      getCount(estadoMateriaId, estadoYear, "MUJ_REC"),
                    ],
                    backgroundColor: [
                      "rgba(93, 154, 212, 0.8)",
                      "rgba(251, 197, 88, 0.8)",
                      "rgba(59, 130, 246, 0.7)",
                      "rgba(16, 185, 129, 0.7)",
                      "rgba(244, 63, 94, 0.7)",
                    ],
                    borderRadius: 10,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: {
                    ticks: { color: chartPalette.mutedText },
                    grid: { color: chartPalette.grid },
                  },
                  y: {
                    beginAtZero: true,
                    ticks: { color: chartPalette.mutedText },
                    grid: { color: chartPalette.grid },
                  },
                },
              }}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Ranking de indicadores"
          description="Comparación histórica de porcentajes clave por materia."
          materiaId={rankingMateriaId}
          materias={materias}
          onMateriaChange={(value) => handleSelectionChange("ranking", value)}
        >
          {renderLoadingOrEmpty(rankingMateriaId, rankingYears) ?? (
            <Bar
              data={{
                labels: rankingYears.map(String),
                datasets: [
                  {
                    label: "% Varones Regulares",
                    data: rankingYears.map(
                      (year) =>
                        getIndicatorValue(
                          byYearForMateria(rankingMateriaId),
                          year,
                          "PCT_VAR_REG"
                        ) ?? 0
                    ),
                    backgroundColor: "rgba(93, 154, 212, 0.75)",
                  },
                  {
                    label: "% Mujeres Regulares",
                    data: rankingYears.map(
                      (year) =>
                        getIndicatorValue(
                          byYearForMateria(rankingMateriaId),
                          year,
                          "PCT_MUJ_REG"
                        ) ?? 0
                    ),
                    backgroundColor: "rgba(16, 185, 129, 0.75)",
                  },
                  {
                    label: "% Mujeres Recursantes",
                    data: rankingYears.map(
                      (year) =>
                        getIndicatorValue(
                          byYearForMateria(rankingMateriaId),
                          year,
                          "PCT_MUJ_REC"
                        ) ?? 0
                    ),
                    backgroundColor: "rgba(244, 63, 94, 0.75)",
                  },
                ],
              }}
              options={barChartOptions}
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
          title="Recursantes vs regularidad"
          description={`Comparación radial del año ${radarYear}.`}
          materiaId={radarMateriaId}
          materias={materias}
          onMateriaChange={(value) => handleSelectionChange("radar", value)}
        >
          {renderLoadingOrEmpty(radarMateriaId, radarYears) ?? (
            <Radar
              data={{
                labels: ["Regulares", "Recursantes"],
                datasets: [
                  {
                    label: "Varones",
                    data: [
                      getCount(radarMateriaId, radarYear, "VAR_REG"),
                      getCount(radarMateriaId, radarYear, "VAR_REC"),
                    ],
                    backgroundColor: "rgba(93, 154, 212, 0.3)",
                    borderColor: "#5D9AD4",
                  },
                  {
                    label: "Mujeres",
                    data: [
                      getCount(radarMateriaId, radarYear, "MUJ_REG"),
                      getCount(radarMateriaId, radarYear, "MUJ_REC"),
                    ],
                    backgroundColor: "rgba(251, 197, 88, 0.3)",
                    borderColor: "#FBC558",
                  },
                ],
              }}
              options={radarOptions}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Dispersión académica"
          description="Relación entre regulares y recursantes para cada año disponible."
          materiaId={dispersionMateriaId}
          materias={materias}
          onMateriaChange={(value) => handleSelectionChange("dispersion", value)}
        >
          {renderLoadingOrEmpty(dispersionMateriaId, dispersionYears) ?? (
            <Scatter
              data={{
                datasets: [
                  {
                    label: "Años",
                    data: dispersionYears.map((year) => ({
                      x: totalRegulares(dispersionMateriaId, year),
                      y: totalRecursantes(dispersionMateriaId, year),
                    })),
                    backgroundColor: "rgba(93, 154, 212, 0.8)",
                  },
                ],
              }}
              options={scatterOptions}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Vista combinada"
          description="Cruce histórico entre inscriptos totales y mujeres inscriptas."
          materiaId={combinadoMateriaId}
          materias={materias}
          onMateriaChange={(value) => handleSelectionChange("combinado", value)}
        >
          {renderLoadingOrEmpty(combinadoMateriaId, combinadoYears) ?? (
            <Chart
              type="bar"
              data={{
                labels: combinadoYears.map(String),
                datasets: [
                  {
                    type: "bar" as const,
                    label: "Total Inscriptos",
                    data: combinadoYears.map((year) =>
                      totalInscriptos(combinadoMateriaId, year)
                    ),
                    backgroundColor: "rgba(93, 154, 212, 0.5)",
                    borderRadius: 8,
                  },
                  {
                    type: "line" as const,
                    label: "Mujeres Inscriptas",
                    data: combinadoYears.map((year) =>
                      getCount(combinadoMateriaId, year, "MUJ_INS")
                    ),
                    borderColor: "#FBC558",
                    backgroundColor: "rgba(251, 197, 88, 0.2)",
                    tension: 0.3,
                    pointRadius: 2,
                  },
                ],
              }}
              options={barChartOptions}
            />
          )}
        </ChartCard>
      </section>
    </div>
  );
}

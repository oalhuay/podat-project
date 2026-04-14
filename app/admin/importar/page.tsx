"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";
import { useTheme } from "@/app/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { parseAlumnosFromFile } from "@/lib/import/alumnos/parseExcel";
import {
  ImportStatus,
  ImportResult,
  ParsedAlumnoRow,
} from "@/lib/import/alumnos/types";
import {
  ImportPlan,
  ejecutarImportPlan,
  prepararImportAlumnos,
  toImportAlumnosDbClient,
} from "@/lib/import/alumnos/importAlumnos";
import ImportResults from "@/components/admin/ImportResults";
import FileDropzone from "@/components/admin/FileDropzone";
import StatusBanner from "@/components/admin/StatusBanner";
import { getChartPalette } from "@/lib/charts/theme";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

type Materia = {
  id: number;
  nombre: string;
  codigo?: string | null;
};

const CURRENT_YEAR = new Date().getFullYear();

export default function ImportarAlumnos() {
  const { resolvedTheme } = useTheme();
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [materia, setMateria] = useState("");
  const [anio, setAnio] = useState(String(CURRENT_YEAR));
  const [comision, setComision] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [datosPrevia, setDatosPrevia] = useState<ParsedAlumnoRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importPlan, setImportPlan] = useState<ImportPlan | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [statusFilter, setStatusFilter] = useState<"todos" | ImportStatus>("todos");
  const importDbClient = toImportAlumnosDbClient(supabase, { supportsGenero: true });

  const puedeSubir = materia && anio && comision && archivo;

  useEffect(() => {
    const loadMaterias = async () => {
      const { data, error } = await supabase
        .from("materias")
        .select("id, nombre, codigo")
        .order("nombre", { ascending: true });

      if (error) {
        setStatusMessage({
          type: "error",
          text: `No se pudieron cargar materias: ${error.message}`,
        });
        return;
      }

      const materiasList = (data ?? []) as Materia[];
      setMaterias(materiasList);

      if (materiasList.length === 0) {
        setStatusMessage({
          type: "info",
          text: "No hay materias cargadas en la base de datos.",
        });
      }
    };

    void loadMaterias();
  }, []);

  const chartSummary = useMemo(() => {
    if (!importResult) return null;

    const labels = ["Nuevos", "Actualizados", "Duplicados", "Inválidos"];
    const values = [
      importResult.summary.nuevos,
      importResult.summary.actualizados,
      importResult.summary.duplicados,
      importResult.summary.invalidos,
    ];

    return { labels, values };
  }, [importResult]);

  const pieData = useMemo(() => {
    if (!chartSummary) return null;
    return {
      labels: chartSummary.labels,
      datasets: [
        {
          data: chartSummary.values,
          backgroundColor: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"],
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    };
  }, [chartSummary]);

  const barData = useMemo(() => {
    if (!chartSummary) return null;
    return {
      labels: chartSummary.labels,
      datasets: [
        {
          label: "Alumnos",
          data: chartSummary.values,
          backgroundColor: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"],
          borderRadius: 12,
          borderSkipped: false,
        },
      ],
    };
  }, [chartSummary]);

  const lineData = useMemo(() => {
    if (!importResult) return null;

    const labels = importResult.rows.map((_, index) => `#${index + 1}`);
    const cumulative = {
      nuevo: [] as number[],
      actualizado: [] as number[],
      duplicado: [] as number[],
      invalido: [] as number[],
    };
    const running = {
      nuevo: 0,
      actualizado: 0,
      duplicado: 0,
      invalido: 0,
    };

    importResult.rows.forEach((row) => {
      running[row.status] += 1;
      cumulative.nuevo.push(running.nuevo);
      cumulative.actualizado.push(running.actualizado);
      cumulative.duplicado.push(running.duplicado);
      cumulative.invalido.push(running.invalido);
    });

    return {
      labels,
      datasets: [
        {
          label: "Nuevos",
          data: cumulative.nuevo,
          borderColor: "#22c55e",
          backgroundColor: "rgba(34, 197, 94, 0.15)",
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
        },
        {
          label: "Actualizados",
          data: cumulative.actualizado,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.15)",
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
        },
        {
          label: "Duplicados",
          data: cumulative.duplicado,
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.15)",
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
        },
        {
          label: "Inválidos",
          data: cumulative.invalido,
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.15)",
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
        },
      ],
    };
  }, [importResult]);

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
              boxWidth: 12,
              usePointStyle: true,
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
            },
            grid: {
              color: palette.grid,
            },
          },
        },
      };
    },
    [resolvedTheme]
  );

  const handleLecturaArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivo(file);

    try {
      const data = await parseAlumnosFromFile(file);
      if (data.length === 0) {
        setStatusMessage({
          type: "info",
          text: "No se encontraron encabezados válidos o filas con datos.",
        });
      } else {
        setStatusMessage({
          type: "info",
          text: `Archivo listo. Filas detectadas: ${data.length}.`,
        });
      }
      setDatosPrevia(data);
      setImportResult(null);
      setImportPlan(null);
      setStatusFilter("todos");
    } catch {
      setDatosPrevia([]);
      setImportResult(null);
      setImportPlan(null);
      setStatusFilter("todos");
      setStatusMessage({
        type: "error",
        text: "No se pudo leer el archivo. Verifica que sea un Excel .xlsx válido.",
      });
    }
  };

  const previsualizarCarga = async () => {
    if (datosPrevia.length === 0) {
      setStatusMessage({
        type: "error",
        text: "Primero carga un archivo válido con filas detectadas.",
      });
      return;
    }

    setIsImporting(true);

    try {
      const plan = await prepararImportAlumnos(datosPrevia, importDbClient);
      setImportPlan(plan);
      setImportResult(plan.result);
      setStatusMessage({
        type: "info",
        text: `Análisis listo. Revisa el detalle y elige Aceptar o Cancelar. Nuevos: ${plan.result.summary.nuevos}, Actualizados: ${plan.result.summary.actualizados}, Duplicados: ${plan.result.summary.duplicados}, Inválidos: ${plan.result.summary.invalidos}.`,
      });
    } catch (err: unknown) {
      const fallbackMessage = "Error desconocido";
      const errorMessage =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : fallbackMessage;
      setStatusMessage({
        type: "error",
        text: `Error al subir los datos: ${errorMessage}`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const aceptarImportacion = async () => {
    if (!importPlan) return;

    setIsImporting(true);
    try {
      await ejecutarImportPlan(importPlan, importDbClient);
      setStatusMessage({
        type: "success",
        text: `Importación confirmada. Nuevos: ${importPlan.result.summary.nuevos}, Actualizados: ${importPlan.result.summary.actualizados}, Duplicados: ${importPlan.result.summary.duplicados}, Inválidos: ${importPlan.result.summary.invalidos}.`,
      });
      setImportPlan(null);
    } catch (err: unknown) {
      const fallbackMessage = "Error desconocido";
      const errorMessage =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : fallbackMessage;
      setStatusMessage({
        type: "error",
        text: `Error al confirmar la importación: ${errorMessage}`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const cancelarImportacion = () => {
    setImportPlan(null);
    setImportResult(null);
    setStatusFilter("todos");
    setStatusMessage({
      type: "info",
      text: "Importación cancelada. No se aplicaron cambios en la base de datos.",
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen bg-white">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Importación de Alumnos
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          Configura el curso y arrastra el Excel (.xlsx)
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
            Materia
          </label>
          <select
            className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none transition-all appearance-none cursor-pointer"
            value={materia}
            onChange={(e) => setMateria(e.target.value)}
          >
            <option value="">Elegir Materia...</option>
            {materias.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.nombre}
                {item.codigo ? ` (${item.codigo})` : ""}
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
            Comisión
          </label>
          <input
            type="text"
            placeholder="Ej. A, B, mañana, comisión única"
            className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none transition-all"
            value={comision}
            onChange={(e) => setComision(e.target.value)}
          />
        </div>
      </section>

      <FileDropzone archivo={archivo} onFileChange={handleLecturaArchivo} />

      {statusMessage && <StatusBanner message={statusMessage} />}

      {puedeSubir && (
        <div className="mt-10 space-y-3">
          {!importPlan && (
            <button
              onClick={previsualizarCarga}
              disabled={isImporting}
              className="w-full p-5 bg-[#5D9AD4] text-white font-black text-xl rounded-3xl shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70"
            >
              {isImporting ? "ANALIZANDO..." : "REVISAR IMPORTACIÓN"}
            </button>
          )}

          {importPlan && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-widest font-bold text-slate-400">
                  Previsualización
                </p>
                <p className="text-slate-700 mt-2 font-medium">
                  Esta vista es solo informativa. Nada se guarda hasta que presiones{" "}
                  <span className="font-bold text-slate-900">Aceptar</span>.
                </p>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div className="rounded-2xl bg-white p-3 border border-slate-100">
                    <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                      Nuevos
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {importPlan.result.summary.nuevos}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 border border-slate-100">
                    <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                      Actualizados
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {importPlan.result.summary.actualizados}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 border border-slate-100">
                    <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                      Duplicados
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {importPlan.result.summary.duplicados}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 border border-slate-100">
                    <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                      Inválidos
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {importPlan.result.summary.invalidos}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={aceptarImportacion}
                  disabled={isImporting}
                  className="w-full p-4 bg-green-600 text-white font-black text-lg rounded-2xl hover:bg-green-700 transition-colors disabled:opacity-70"
                >
                  {isImporting ? "APLICANDO..." : "CONFIRMAR IMPORTACIÓN"}
                </button>
                <button
                  onClick={cancelarImportacion}
                  disabled={isImporting}
                  className="w-full p-4 bg-slate-200 text-slate-800 font-black text-lg rounded-2xl hover:bg-slate-300 transition-colors disabled:opacity-70"
                >
                  DESCARTAR IMPORTACIÓN
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {importResult && (
        <section className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-4">
              Distribución (Pie)
            </p>
            <div className="h-64">
              {pieData && <Pie data={pieData} options={chartOptions} />}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-4">
              Resumen (Barras)
            </p>
            <div className="h-64">
              {barData && <Bar data={barData} options={chartOptions} />}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
            <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-4">
              Evolución por fila (Líneas con puntos)
            </p>
            <div className="h-72">
              {lineData && <Line data={lineData} options={chartOptions} />}
            </div>
          </div>
        </section>
      )}

      {importResult && (
        <ImportResults
          result={importResult}
          statusFilter={statusFilter}
          onChangeStatusFilter={setStatusFilter}
        />
      )}
    </div>
  );
}

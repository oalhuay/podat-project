"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import StatusBanner from "@/components/admin/StatusBanner";
import { parseEstadisticasFromFile } from "@/lib/import/estadisticas/parseExcel";
import type { ParsedEstadisticaRow } from "@/lib/import/estadisticas/parseExcel";
import type {
  EstadisticaImportStatus,
  EstadisticaImportSummary,
  EstadisticaPreviewRow,
} from "@/lib/import/estadisticas/types";
import { getIndicatorFromLabel } from "@/lib/estadisticas/catalog";
import type { Rol } from "@/types/database";

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

export default function ImportarArchivoDocentePage() {
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
  const [fallbackMateriaId, setFallbackMateriaId] = useState<number | "">("");
  const [fallbackYear, setFallbackYear] = useState("");

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
          text: "No hay materias disponibles para importar.",
        });
      }
    };

    void loadMaterias();
  }, []);

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

  const buildPreview = (
    parsed: ParsedEstadisticaRow[],
    materiasList: Materia[],
    defaults: ImportDefaults
  ): EstadisticaPreviewRow[] => {
    const materiaMap = new Map(materiasList.map((m) => [normalizeText(m.nombre), m]));
    const fallbackMateria =
      defaults.materiaId === null
        ? null
        : materiasList.find((m) => m.id === defaults.materiaId) ?? null;

    return parsed.map((row) => {
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
  };

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
      const years = Array.from(new Set(validRows.map((r) => r.anio as number)));
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

  useEffect(() => {
    if (parsedRows.length === 0) return;
    const preview = buildPreview(parsedRows, materias, importDefaults);
    setPreviewRows(preview);
    setSummary(buildSummary(preview));
    void computeChangeSummary(preview);
  }, [parsedRows, materias, importDefaults]);

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
    } catch (error) {
      console.error(error);
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

  const rowsFiltradas = useMemo(() => {
    if (statusFilter === "todos") return previewRows;
    return previewRows.filter((row) => row.status === statusFilter);
  }, [previewRows, statusFilter]);

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

  return (
    <div className="min-h-screen max-w-5xl mx-auto bg-white p-8">
      <header className="mb-10">
        <h1 className="text-4xl font-black tracking-tight text-slate-900">
          Importar archivo
        </h1>
        <p className="mt-2 font-medium text-slate-500">
          Carga un archivo .xlsx con datos de tus materias y registra estadísticas en el sistema.
        </p>
      </header>

      <section className="space-y-6">
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Materia opcional
              </label>
              <select
                className="w-full rounded-2xl border-2 border-slate-100 bg-white p-3 text-slate-900 outline-none focus:border-[#5D9AD4]"
                value={fallbackMateriaId}
                onChange={(e) =>
                  setFallbackMateriaId(e.target.value === "" ? "" : Number(e.target.value))
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
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
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
            <p className="mt-4 font-medium text-slate-600">
              Puedes subir una tabla tipo SyO o un Excel simple con columnas de materia, año,
              varones inscriptos y mujeres inscriptas.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Si el archivo no trae materia o año, puedes completarlos aquí antes de importar.
            </p>
            {archivo && <p className="mt-2 text-xs text-slate-400">Archivo: {archivo.name}</p>}
          </div>
        </div>

        {statusMessage && <StatusBanner message={statusMessage} />}

        {summary && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <div className="rounded-2xl bg-slate-100 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Total</p>
              <p className="text-2xl font-black text-slate-800">{summary.total}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase text-emerald-700">Válidos</p>
              <p className="text-2xl font-black text-emerald-800">{summary.validos}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase text-amber-700">Calculados</p>
              <p className="text-2xl font-black text-amber-800">{summary.calculados}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4">
              <p className="text-xs font-bold uppercase text-rose-700">Materia faltante</p>
              <p className="text-2xl font-black text-rose-800">{summary.materiaFaltante}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4">
              <p className="text-xs font-bold uppercase text-rose-700">Materia inválida</p>
              <p className="text-2xl font-black text-rose-800">{summary.materiaDesconocida}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4">
              <p className="text-xs font-bold uppercase text-rose-700">Año faltante</p>
              <p className="text-2xl font-black text-rose-800">{summary.anioFaltante}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4">
              <p className="text-xs font-bold uppercase text-rose-700">Indic./valor</p>
              <p className="text-2xl font-black text-rose-800">
                {summary.indicadorDesconocido + summary.valorInvalido}
              </p>
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
                <p className="text-2xl font-black text-amber-800">{changeSummary.actualizados}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Sin cambios</p>
                <p className="text-2xl font-black text-slate-800">{changeSummary.sinCambios}</p>
              </div>
            </div>
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
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                    statusFilter === status
                      ? "border-slate-800 bg-slate-800 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {status === "todos" ? "Todos" : statusLabels[status]}
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-900">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="p-3 text-left">Materia</th>
                      <th className="p-3 text-left">Indicador</th>
                      <th className="p-3 text-left">Año</th>
                      <th className="p-3 text-left">Valor</th>
                      <th className="p-3 text-left">Estado</th>
                      <th className="p-3 text-left">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowsFiltradas.map((row, index) => (
                      <tr key={`${row.materia}-${row.anio}-${index}`} className="border-t">
                        <td className="p-3">{row.materia}</td>
                        <td className="p-3">{row.indicadorRaw}</td>
                        <td className="p-3">{row.anio ?? "—"}</td>
                        <td className="p-3">{row.valor ?? "—"}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
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

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                onClick={aceptarImportacion}
                disabled={isImporting}
                className="w-full rounded-2xl bg-green-600 p-4 text-lg font-black text-white transition-colors hover:bg-green-700 disabled:opacity-70"
              >
                {isImporting ? "GUARDANDO..." : "GUARDAR ESTADÍSTICAS"}
              </button>
              <button
                onClick={() => {
                  setArchivo(null);
                  setParsedRows([]);
                  setPreviewRows([]);
                  setSummary(null);
                  setChangeSummary(null);
                  setStatusFilter("todos");
                }}
                disabled={isImporting}
                className="w-full rounded-2xl bg-slate-200 p-4 text-lg font-black text-slate-800 transition-colors hover:bg-slate-300 disabled:opacity-70"
              >
                LIMPIAR PREVISUALIZACIÓN
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

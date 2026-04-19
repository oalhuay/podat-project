"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
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
import { getAccessibleMaterias, type Materia } from "@/lib/materias";

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
  const { user, role, isLoadingProfile } = useAuth();
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedEstadisticaRow[]>([]);
  const [changeSummary, setChangeSummary] = useState<ChangeSummary | null>(null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isCheckingChanges, setIsCheckingChanges] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [statusFilter, setStatusFilter] = useState<EstadisticaImportStatus | "todos">("todos");

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
        const materiasList = await getAccessibleMaterias(user.id, role);
        setMaterias(materiasList);
        if (materiasList.length === 0) {
          setStatusMessage({
            type: "info",
            text: "No hay materias disponibles para importar.",
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

  const buildPreview = (
    parsed: ParsedEstadisticaRow[],
    materiasList: Materia[]
  ): EstadisticaPreviewRow[] => {
    const materiaMap = new Map(materiasList.map((m) => [normalizeText(m.nombre), m]));

    return parsed.map((row) => {
      const materiaName = row.materia?.trim() || "";
      const materiaKey = materiaName ? normalizeText(materiaName) : "";
      const materia = materiaKey ? materiaMap.get(materiaKey) : null;
      const indicator = getIndicatorFromLabel(row.indicador);
      const anio = row.anio;

      let status: EstadisticaImportStatus = "valido";
      let mensaje = "OK";

      if (!materiaName) {
        status = "materia_faltante";
        mensaje = "El archivo debe incluir la materia en la columna o encabezado del bloque.";
      } else if (!materia) {
        status = "materia_desconocida";
        mensaje = "Materia no encontrada en la base.";
      } else if (anio === null) {
        status = "anio_faltante";
        mensaje = "El archivo debe incluir el año para cada fila o columna de datos.";
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

  const previewRows = useMemo(
    () => buildPreview(parsedRows, materias),
    [materias, parsedRows]
  );

  const summary = useMemo<EstadisticaImportSummary | null>(
    () => (previewRows.length > 0 ? buildSummary(previewRows) : null),
    [previewRows]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void computeChangeSummary(previewRows);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [previewRows]);

  const processFile = async (file: File) => {
    if (!file) return;

    setArchivo(file);
    setStatusMessage(null);

    setIsImporting(true);
    try {
      const parsed = await parseEstadisticasFromFile(file);
      setParsedRows(parsed);
      if (parsed.length === 0) {
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
      setChangeSummary(null);
      setStatusMessage({
        type: "error",
        text: "No se pudo leer el archivo. Verifica que sea un Excel .xlsx válido.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
    event.target.value = "";
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
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
          Importación de Estadísticas
        </h1>
        <p className="mt-2 font-medium text-slate-500">
          Carga un archivo .xlsx con datos de tus materias y registra estadísticas en el sistema.
        </p>
      </header>

      <section className="space-y-6">
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 md:p-8">
          <input
            id="docente-import-file"
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="sr-only"
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
            <label
              htmlFor="docente-import-file"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`group flex min-h-[18rem] cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed px-8 py-10 text-center shadow-sm transition-all ${
                isDragActive
                  ? "border-[#5D9AD4] bg-slate-100 shadow-md"
                  : "border-slate-200 bg-slate-100 hover:border-[#5D9AD4]/45 hover:shadow-md"
              }`}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#5D9AD4]/12 text-[#5D9AD4] ring-8 ring-[#5D9AD4]/5 transition-transform duration-200 group-hover:scale-105">
                <span className="text-4xl font-black">+</span>
              </div>
              <p className="mt-6 text-2xl font-black tracking-tight text-slate-900">
                Arrastra tu archivo o selecciónalo
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Sube un archivo de Excel `.xlsx` desde tu PC. El sistema leerá automáticamente la
                hoja útil y te mostrará una previsualización antes de guardar.
              </p>
              <div className="mt-6 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
                Elegir archivo `.xlsx`
              </div>
              {archivo && (
                <p className="mt-4 rounded-full bg-[#5D9AD4]/12 px-4 py-2 text-sm font-bold text-slate-700">
                  Archivo cargado: {archivo.name}
                </p>
              )}
            </label>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Guía rápida
              </p>
              <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
                <p>
                  Usa solo archivos <span className="font-black text-slate-900">`.xlsx`</span>.
                </p>
                <p>
                  El archivo debe incluir <span className="font-black text-slate-900">materia</span>{" "}
                  y <span className="font-black text-slate-900">año</span> dentro del propio Excel.
                </p>
                <p>
                  <span className="font-black text-slate-900">Formato docente PODAT:</span> bloque
                  por materia con encabezado y luego una fila por año.
                </p>
                <p>
                  <span className="font-black text-slate-900">Formato simple:</span>{" "}
                  `Materia | Año | Varones inscriptos | Mujeres inscriptas`.
                </p>
                <p>
                  <span className="font-black text-slate-900">Formato tipo SyO:</span> columna
                  `Materia`, columna `Indicadores` y columnas por año.
                </p>
              </div>
            </div>
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

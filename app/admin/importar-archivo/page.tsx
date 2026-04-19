"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { useEstadisticasImport } from "@/app/hooks/useEstadisticasImport";
import StatusBanner from "@/components/admin/StatusBanner";
import { getAccessibleMaterias, type Materia } from "@/lib/materias";
import {
  ESTADISTICA_STATUS_CLASSES,
  ESTADISTICA_STATUS_LABELS,
  type StatusMessage,
} from "@/lib/import/estadisticas/workflow";

export default function ImportarArchivoDocentePage() {
  const { user, role, isLoadingProfile } = useAuth();
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const {
    archivo,
    previewRows,
    summary,
    rowsFiltradas,
    changeSummary,
    isImporting,
    isCheckingChanges,
    statusFilter,
    setStatusFilter,
    processFile,
    clearPreview,
    aceptarImportacion,
  } = useEstadisticasImport({
    materias,
    messages: {
      missingMateria:
        "El archivo debe incluir la materia en la columna o encabezado del bloque.",
      missingYear: "El archivo debe incluir el ano para cada fila o columna de datos.",
    },
    onStatusMessage: setStatusMessage,
  });

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

  return (
    <div className="min-h-screen max-w-5xl mx-auto bg-white p-8">
      <header className="mb-10">
        <h1 className="text-4xl font-black tracking-tight text-slate-900">
          Importacion de Estadisticas
        </h1>
        <p className="mt-2 font-medium text-slate-500">
          Carga un archivo .xlsx con datos de tus materias y registra estadisticas en el sistema.
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
                Arrastra tu archivo o seleccionalo
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Sube un archivo de Excel `.xlsx` desde tu PC. El sistema leera automaticamente la
                hoja util y te mostrara una previsualizacion antes de guardar.
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
                Guia rapida
              </p>
              <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
                <p>
                  Usa solo archivos <span className="font-black text-slate-900">`.xlsx`</span>.
                </p>
                <p>
                  El archivo debe incluir <span className="font-black text-slate-900">materia</span>{" "}
                  y <span className="font-black text-slate-900">ano</span> dentro del propio Excel.
                </p>
                <p>
                  <span className="font-black text-slate-900">Formato docente PODAT:</span> bloque
                  por materia con encabezado y luego una fila por ano.
                </p>
                <p>
                  <span className="font-black text-slate-900">Formato simple:</span>{" "}
                  `Materia | Ano | Varones inscriptos | Mujeres inscriptas`.
                </p>
                <p>
                  <span className="font-black text-slate-900">Formato tipo SyO:</span> columna
                  `Materia`, columna `Indicadores` y columnas por ano.
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
              <p className="text-xs font-bold uppercase text-emerald-700">Validos</p>
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
              <p className="text-xs font-bold uppercase text-rose-700">Materia invalida</p>
              <p className="text-2xl font-black text-rose-800">{summary.materiaDesconocida}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4">
              <p className="text-xs font-bold uppercase text-rose-700">Ano faltante</p>
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
                  {status === "todos" ? "Todos" : ESTADISTICA_STATUS_LABELS[status]}
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
                      <th className="p-3 text-left">Ano</th>
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
                        <td className="p-3">{row.anio ?? "-"}</td>
                        <td className="p-3">{row.valor ?? "-"}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
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

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                onClick={() => void aceptarImportacion()}
                disabled={isImporting}
                className="w-full rounded-2xl bg-green-600 p-4 text-lg font-black text-white transition-colors hover:bg-green-700 disabled:opacity-70"
              >
                {isImporting ? "GUARDANDO..." : "GUARDAR ESTADISTICAS"}
              </button>
              <button
                onClick={clearPreview}
                disabled={isImporting}
                className="w-full rounded-2xl bg-slate-200 p-4 text-lg font-black text-slate-800 transition-colors hover:bg-slate-300 disabled:opacity-70"
              >
                LIMPIAR PREVISUALIZACION
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

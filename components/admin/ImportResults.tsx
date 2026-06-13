"use client";

import { cx, ui } from "@/components/ui/styles";
import { ImportResult, ImportStatus } from "@/lib/import/alumnos/types";

type ImportResultsProps = {
  result: ImportResult;
  statusFilter: "todos" | ImportStatus;
  onChangeStatusFilter: (value: "todos" | ImportStatus) => void;
};

const badgeClasses: Record<ImportStatus, string> = {
  nuevo: "bg-green-100 text-green-800",
  actualizado: "bg-blue-100 text-blue-800",
  duplicado: "bg-yellow-100 text-yellow-800",
  invalido: "bg-red-100 text-red-800",
};

export default function ImportResults({
  result,
  statusFilter,
  onChangeStatusFilter,
}: ImportResultsProps) {
  const showGenero = result.rows.some((row) => Boolean(row.genero));
  const showCondicion = result.rows.some((row) => Boolean(row.condicion));
  const rowsFiltradas =
    statusFilter === "todos"
      ? result.rows
      : result.rows.filter((row) => row.status === statusFilter);

  return (
    <section className="mt-10 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className={ui.sectionEyebrow}>Resultado de importación</p>
          <h3 className={cx(ui.sectionTitle, "mt-2")}>Resumen y detalle de filas</h3>
          <p className={cx(ui.sectionText, "mt-2 max-w-3xl")}>
            Revise rápidamente cuántos registros son nuevos, cuáles se actualizaron y qué filas
            necesitan corrección antes de volver a intentar la carga.
          </p>
        </div>
        <div className={cx(ui.mutedCard, "px-4 py-3 text-sm text-slate-600")}>
          <span className="font-black text-slate-900">{rowsFiltradas.length}</span> fila(s) en la
          vista actual
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-2xl bg-slate-100 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Total</p>
          <p className="text-2xl font-black text-slate-800">{result.summary.total}</p>
        </div>
        <div className="rounded-2xl bg-green-50 p-4">
          <p className="text-xs font-bold uppercase text-green-700">Nuevos</p>
          <p className="text-2xl font-black text-green-800">{result.summary.nuevos}</p>
        </div>
        <div className="rounded-2xl bg-blue-50 p-4">
          <p className="text-xs font-bold uppercase text-blue-700">Actualizados</p>
          <p className="text-2xl font-black text-blue-800">{result.summary.actualizados}</p>
        </div>
        <div className="rounded-2xl bg-yellow-50 p-4">
          <p className="text-xs font-bold uppercase text-yellow-700">Duplicados</p>
          <p className="text-2xl font-black text-yellow-800">{result.summary.duplicados}</p>
        </div>
        <div className="rounded-2xl bg-red-50 p-4">
          <p className="text-xs font-bold uppercase text-red-700">Inválidos</p>
          <p className="text-2xl font-black text-red-800">{result.summary.invalidos}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: "todos", label: "Todos" },
          { value: "nuevo", label: "Nuevos" },
          { value: "actualizado", label: "Actualizados" },
          { value: "duplicado", label: "Duplicados" },
          { value: "invalido", label: "Inválidos" },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChangeStatusFilter(option.value as "todos" | ImportStatus)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
              statusFilter === option.value
                ? "border-slate-800 bg-slate-800 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-900">
            <caption className="sr-only">
              Resumen detallado de filas importadas con su estado y mensaje de validación.
            </caption>
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3 text-left">Legajo</th>
                <th className="p-3 text-left">Apellido</th>
                <th className="p-3 text-left">Nombre</th>
                {showGenero && <th className="p-3 text-left">Género</th>}
                {showCondicion && <th className="p-3 text-left">Condición</th>}
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-left">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {rowsFiltradas.length === 0 && (
                <tr className="border-t border-slate-100">
                  <td
                    colSpan={5 + (showGenero ? 1 : 0) + (showCondicion ? 1 : 0)}
                    className="p-4 text-center text-slate-500"
                  >
                    No hay filas para el filtro seleccionado.
                  </td>
                </tr>
              )}
              {rowsFiltradas.map((row, index) => (
                <tr key={`${row.legajo}-${index}`} className="border-t border-slate-100">
                  <td className="p-3 font-mono text-slate-900">{row.legajo}</td>
                  <td className="p-3 text-slate-900">{row.apellido}</td>
                  <td className="p-3 text-slate-900">{row.nombre}</td>
                  {showGenero && <td className="p-3 text-slate-900">{row.genero ?? "-"}</td>}
                  {showCondicion && <td className="p-3 text-slate-900">{row.condicion ?? "-"}</td>}
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${badgeClasses[row.status]}`}
                    >
                      {row.status.toUpperCase().replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-3 text-slate-700">{row.mensaje ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

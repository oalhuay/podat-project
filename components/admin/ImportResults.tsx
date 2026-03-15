"use client";

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
  const rowsFiltradas =
    statusFilter === "todos"
      ? result.rows
      : result.rows.filter((row) => row.status === statusFilter);

  return (
    <section className="mt-10 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-2xl p-4 bg-slate-100">
          <p className="text-xs uppercase text-slate-500 font-bold">Total</p>
          <p className="text-2xl font-black text-slate-800">{result.summary.total}</p>
        </div>
        <div className="rounded-2xl p-4 bg-green-50">
          <p className="text-xs uppercase text-green-700 font-bold">Nuevos</p>
          <p className="text-2xl font-black text-green-800">{result.summary.nuevos}</p>
        </div>
        <div className="rounded-2xl p-4 bg-blue-50">
          <p className="text-xs uppercase text-blue-700 font-bold">Actualizados</p>
          <p className="text-2xl font-black text-blue-800">{result.summary.actualizados}</p>
        </div>
        <div className="rounded-2xl p-4 bg-yellow-50">
          <p className="text-xs uppercase text-yellow-700 font-bold">Duplicados</p>
          <p className="text-2xl font-black text-yellow-800">{result.summary.duplicados}</p>
        </div>
        <div className="rounded-2xl p-4 bg-red-50">
          <p className="text-xs uppercase text-red-700 font-bold">Invalidos</p>
          <p className="text-2xl font-black text-red-800">{result.summary.invalidos}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: "todos", label: "Todos" },
          { value: "nuevo", label: "Nuevos" },
          { value: "actualizado", label: "Actualizados" },
          { value: "duplicado", label: "Duplicados" },
          { value: "invalido", label: "Invalidos" },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChangeStatusFilter(option.value as "todos" | ImportStatus)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              statusFilter === option.value
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-900">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="text-left p-3">Legajo</th>
                <th className="text-left p-3">Apellido</th>
                <th className="text-left p-3">Nombre</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-left p-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {rowsFiltradas.length === 0 && (
                <tr className="border-t border-slate-100">
                  <td colSpan={5} className="p-4 text-center text-slate-500">
                    No hay filas para el filtro seleccionado.
                  </td>
                </tr>
              )}
              {rowsFiltradas.map((row, index) => (
                <tr key={`${row.legajo}-${index}`} className="border-t border-slate-100">
                  <td className="p-3 font-mono text-slate-900">{row.legajo}</td>
                  <td className="p-3 text-slate-900">{row.apellido}</td>
                  <td className="p-3 text-slate-900">{row.nombre}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${badgeClasses[row.status]}`}
                    >
                      {row.status.toUpperCase()}
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

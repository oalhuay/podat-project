"use client";

import InlineSelect from "@/components/admin/InlineSelect";
import type { EstadoAsistencia } from "@/lib/asistencia/rules";
import type { EvaluacionNombre, TipoEvaluacion } from "@/lib/notas/rules";
import type {
  AsistenciaAlumnoRow,
  ManualRow,
  NotaAlumnoRow,
} from "@/components/admin/alumnos/types";

type PadronPanelProps = {
  sourceMode: "excel" | "manual";
  isDragActive: boolean;
  archivoNombre: string | null;
  manualRows: ManualRow[];
  canPreview: boolean;
  isLoading: boolean;
  hasImportPlan: boolean;
  onSourceModeChange: (value: "excel" | "manual") => void;
  onDragOver: (event: React.DragEvent<HTMLLabelElement>) => void;
  onDragLeave: (event: React.DragEvent<HTMLLabelElement>) => void;
  onDrop: (event: React.DragEvent<HTMLLabelElement>) => Promise<void>;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onManualRowChange: (
    id: string,
    field: keyof Omit<ManualRow, "id">,
    value: string
  ) => void;
  onAddManualRow: () => void;
  onPreview: () => Promise<void>;
  onReset: () => void;
  onConfirmImport: () => Promise<void>;
  onDiscardImport: () => void;
};

export function PadronPanel({
  sourceMode,
  isDragActive,
  archivoNombre,
  manualRows,
  canPreview,
  isLoading,
  hasImportPlan,
  onSourceModeChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onManualRowChange,
  onAddManualRow,
  onPreview,
  onReset,
  onConfirmImport,
  onDiscardImport,
}: PadronPanelProps) {
  return (
    <>
      <div className="mt-6 inline-flex rounded-full border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => onSourceModeChange("excel")}
          className={`rounded-full px-4 py-2 text-sm font-black ${sourceMode === "excel" ? "bg-slate-900 text-white" : "text-slate-700"}`}
        >
          Excel .xlsx
        </button>
        <button
          type="button"
          onClick={() => onSourceModeChange("manual")}
          className={`rounded-full px-4 py-2 text-sm font-black ${sourceMode === "manual" ? "bg-slate-900 text-white" : "text-slate-700"}`}
        >
          Carga manual
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        {sourceMode === "excel"
          ? "Sube un archivo .xlsx con legajo, alumno, género y condición. Luego revisa la previsualización antes de aplicar."
          : 'Completa el padrón escribiendo "Apellido, Nombre" y usa la previsualización para validar filas antes de guardar.'}
      </div>

      {sourceMode === "excel" && (
        <label
          htmlFor="alumnos-file"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={(event) => void onDrop(event)}
          className={`flex min-h-[13rem] cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed text-center ${isDragActive ? "border-[#5D9AD4] bg-[#5D9AD4]/10" : "border-slate-200 bg-slate-50"}`}
        >
          <input
            id="alumnos-file"
            type="file"
            accept=".xlsx"
            onChange={(event) => void onFileChange(event)}
            className="sr-only"
          />
          <p className="text-xl font-black text-slate-900">Arrastra tu archivo o haz clic</p>
          <p className="mt-2 text-sm text-slate-500">Formato: Legajo | Alumno | Género | Cond.</p>
          {archivoNombre && <p className="mt-3 text-sm font-bold text-slate-700">{archivoNombre}</p>}
        </label>
      )}

      {sourceMode === "manual" && (
        <div className="space-y-3 rounded-[1.75rem] border border-slate-200 bg-white p-4">
          {manualRows.map((row) => (
            <div key={row.id} className="grid gap-2 md:grid-cols-4">
              <input
                value={row.legajo}
                placeholder="Legajo"
                className="rounded-xl border p-3"
                onChange={(event) => onManualRowChange(row.id, "legajo", event.target.value)}
              />
              <input
                value={row.alumno}
                placeholder="Alumno (Apellido, Nombre)"
                className="rounded-xl border p-3"
                onChange={(event) => onManualRowChange(row.id, "alumno", event.target.value)}
              />
              <input
                value={row.genero}
                placeholder="Género"
                className="rounded-xl border p-3"
                onChange={(event) => onManualRowChange(row.id, "genero", event.target.value)}
              />
              <select
                value={row.condicion}
                className="rounded-xl border p-3"
                onChange={(event) => onManualRowChange(row.id, "condicion", event.target.value)}
              >
                <option value="Regular">Regular</option>
                <option value="Libre">Libre</option>
              </select>
            </div>
          ))}
          <button
            type="button"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white"
            onClick={onAddManualRow}
          >
            Agregar fila
          </button>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => void onPreview()}
          disabled={!canPreview || isLoading}
          className="rounded-2xl bg-[#5D9AD4] p-4 text-lg font-black text-white disabled:opacity-60"
        >
          {isLoading ? "ANALIZANDO..." : "REVISAR IMPORTACIÓN"}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={isLoading}
          className="rounded-2xl bg-slate-200 p-4 text-lg font-black text-slate-800 disabled:opacity-60"
        >
          LIMPIAR FORMULARIO
        </button>
      </div>

      {hasImportPlan && (
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => void onConfirmImport()}
            disabled={isLoading}
            className="rounded-2xl bg-green-600 p-4 text-lg font-black text-white disabled:opacity-60"
          >
            {isLoading ? "APLICANDO..." : "CONFIRMAR IMPORTACIÓN"}
          </button>
          <button
            type="button"
            onClick={onDiscardImport}
            className="rounded-2xl bg-slate-200 p-4 text-lg font-black text-slate-800"
          >
            DESCARTAR IMPORTACIÓN
          </button>
        </div>
      )}
    </>
  );
}

type NotasPanelProps = {
  evaluacionNombre: EvaluacionNombre;
  tipoEvaluacion: TipoEvaluacion;
  evaluacionOptions: Array<{ value: EvaluacionNombre; label: string }>;
  tipoEvaluacionOptions: Array<{ value: TipoEvaluacion; label: string }>;
  isLoadingNotas: boolean;
  isNotasReady: boolean;
  notasRows: NotaAlumnoRow[];
  onEvaluacionNombreChange: (value: EvaluacionNombre) => void;
  onTipoEvaluacionChange: (value: TipoEvaluacion) => void;
  onCargarNotas: () => Promise<void>;
  onChangeNota: (alumnoId: number, nota: string) => void;
  onChangeAusente: (alumnoId: number, checked: boolean) => void;
  onGuardarNotas: () => Promise<void>;
};

export function NotasPanel({
  evaluacionNombre,
  tipoEvaluacion,
  evaluacionOptions,
  tipoEvaluacionOptions,
  isLoadingNotas,
  isNotasReady,
  notasRows,
  onEvaluacionNombreChange,
  onTipoEvaluacionChange,
  onCargarNotas,
  onChangeNota,
  onChangeAusente,
  onGuardarNotas,
}: NotasPanelProps) {
  return (
    <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            Evaluación
          </label>
          <InlineSelect
            value={evaluacionNombre}
            onChange={onEvaluacionNombreChange}
            options={evaluacionOptions}
          />
        </div>
        <div>
          <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            Tipo
          </label>
          <InlineSelect
            value={tipoEvaluacion}
            onChange={onTipoEvaluacionChange}
            options={tipoEvaluacionOptions}
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void onCargarNotas()}
            disabled={isLoadingNotas}
            className="w-full rounded-xl bg-[#5D9AD4] p-3 text-sm font-black text-white disabled:opacity-60"
          >
            {isLoadingNotas ? "CARGANDO..." : "CARGAR LISTA DEL CURSO"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Primero carga la lista del curso. Después podrás ingresar notas, marcar ausencias y
        guardar todos los cambios.
      </div>

      {!isNotasReady && (
        <p className="text-sm text-slate-500">
          Carga la lista para ingresar notas entre 1 y 10 o marcar ausente.
        </p>
      )}

      {isNotasReady && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3 text-left">Legajo</th>
                  <th className="p-3 text-left">Apellido</th>
                  <th className="p-3 text-left">Nombre</th>
                  <th className="p-3 text-left">Nota (1-10)</th>
                  <th className="p-3 text-left">Ausente</th>
                  <th className="p-3 text-left">Alerta</th>
                </tr>
              </thead>
              <tbody>
                {notasRows.map((row) => (
                  <tr key={row.alumnoId} className="border-t border-slate-100">
                    <td className="p-3 font-mono">{row.legajo}</td>
                    <td className="p-3">{row.apellido}</td>
                    <td className="p-3">
                      <div>{row.nombre}</div>
                      {!row.habilitado && row.motivoBloqueo && (
                        <div className="mt-1 text-xs text-slate-500">{row.motivoBloqueo}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        step={0.1}
                        value={row.nota}
                        disabled={!row.habilitado || row.ausente || isLoadingNotas}
                        onChange={(event) => onChangeNota(row.alumnoId, event.target.value)}
                        className="w-28 rounded-xl border border-slate-200 p-2"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={row.ausente}
                        disabled={!row.habilitado || isLoadingNotas}
                        onChange={(event) => onChangeAusente(row.alumnoId, event.target.checked)}
                      />
                    </td>
                    <td className="p-3">
                      {row.alertaEstado ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                            row.alertaEstado === "libre"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {row.alertaMensaje}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Sin alerta</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => void onGuardarNotas()}
            disabled={isLoadingNotas}
            className="w-full rounded-xl bg-green-600 p-3 text-sm font-black text-white disabled:opacity-60"
          >
            {isLoadingNotas ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
          </button>
        </>
      )}
    </div>
  );
}

type AsistenciasPanelProps = {
  today: string;
  fecha: string;
  tema: string;
  isLoadingAsistencia: boolean;
  isAsistenciaReady: boolean;
  asistenciaRows: AsistenciaAlumnoRow[];
  onFechaChange: (value: string) => void;
  onTemaChange: (value: string) => void;
  onCargarAsistencias: () => Promise<void>;
  onChangeAsistenciaEstado: (alumnoId: number, estado: EstadoAsistencia) => void;
  onGuardarAsistencia: () => Promise<void>;
};

export function AsistenciasPanel({
  today,
  fecha,
  tema,
  isLoadingAsistencia,
  isAsistenciaReady,
  asistenciaRows,
  onFechaChange,
  onTemaChange,
  onCargarAsistencias,
  onChangeAsistenciaEstado,
  onGuardarAsistencia,
}: AsistenciasPanelProps) {
  return (
    <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            Fecha
          </label>
          <input
            type="date"
            max={today}
            value={fecha}
            onChange={(event) => onFechaChange(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 p-3"
          />
        </div>
        <div>
          <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            Tema (opcional)
          </label>
          <input
            value={tema}
            onChange={(event) => onTemaChange(event.target.value)}
            placeholder="Unidad o clase"
            className="mt-2 w-full rounded-xl border border-slate-200 p-3"
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void onCargarAsistencias()}
            disabled={isLoadingAsistencia || !fecha}
            className="w-full rounded-xl bg-[#5D9AD4] p-3 text-sm font-black text-white disabled:opacity-60"
          >
            {isLoadingAsistencia ? "CARGANDO..." : "CARGAR LISTA DEL CURSO"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Carga la clase del día y revisa la condición acumulada antes de guardar la asistencia
        definitiva.
      </div>

      {!isAsistenciaReady && (
        <p className="text-sm text-slate-500">
          Carga la lista para marcar presente, ausente o justificado por alumno.
        </p>
      )}

      {isAsistenciaReady && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3 text-left">Legajo</th>
                  <th className="p-3 text-left">Apellido</th>
                  <th className="p-3 text-left">Nombre</th>
                  <th className="p-3 text-left">Estado</th>
                  <th className="p-3 text-left">Asistencia acumulada</th>
                </tr>
              </thead>
              <tbody>
                {asistenciaRows.map((row) => (
                  <tr key={row.alumnoId} className="border-t border-slate-100">
                    <td className="p-3 font-mono">{row.legajo}</td>
                    <td className="p-3">{row.apellido}</td>
                    <td className="p-3">{row.nombre}</td>
                    <td className="p-3">
                      <select
                        value={row.estado}
                        disabled={isLoadingAsistencia}
                        onChange={(event) =>
                          onChangeAsistenciaEstado(
                            row.alumnoId,
                            event.target.value as EstadoAsistencia
                          )
                        }
                        className="rounded-xl border border-slate-200 p-2"
                      >
                        <option value="presente">Presente</option>
                        <option value="ausente">Ausente</option>
                        <option value="justificado">Justificado</option>
                      </select>
                    </td>
                    <td className="p-3">
                      {row.condicion ? (
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-900">
                            {row.condicion.porcentaje}%
                          </div>
                          <div
                            className={
                              row.condicion.estado === "libre"
                                ? "text-red-600"
                                : row.condicion.estado === "en_riesgo"
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                            }
                          >
                            {row.condicion.mensaje}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">Sin datos</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => void onGuardarAsistencia()}
            disabled={isLoadingAsistencia}
            className="w-full rounded-xl bg-green-600 p-3 text-sm font-black text-white disabled:opacity-60"
          >
            {isLoadingAsistencia ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
          </button>
        </>
      )}
    </div>
  );
}

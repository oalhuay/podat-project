"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import {
  AsistenciasPanel,
  NotasPanel,
  PadronPanel,
} from "@/components/admin/alumnos/AlumnosWorkspace";
import {
  useAsistenciasWorkflow,
  useNotasWorkflow,
  usePadronImport,
} from "@/components/admin/alumnos/useAlumnosWorkflows";
import StatusBanner from "@/components/admin/StatusBanner";
import ImportResults from "@/components/admin/ImportResults";
import type {
  ActiveSection,
  StatusMessage,
} from "@/components/admin/alumnos/types";
import type { EvaluacionNombre, TipoEvaluacion } from "@/lib/notas/rules";
import { getAccessibleMaterias, type Materia } from "@/lib/materias";
import type { Rol } from "@/types/database";

const CURRENT_YEAR = new Date().getFullYear();
const EVALUACIONES: EvaluacionNombre[] = ["Parcial1", "Parcial2", "Integrador"];
const EVALUACION_OPTIONS = EVALUACIONES.map((value) => ({ value, label: value }));
const TIPO_EVALUACION_OPTIONS: Array<{ value: TipoEvaluacion; label: string }> = [
  { value: "Parcial", label: "Parcial" },
  { value: "Recuperatorio", label: "Recuperatorio" },
];

const SECTION_META: Record<
  ActiveSection,
  { label: string; description: string; readyLabel: string }
> = {
  padron: {
    label: "Carga de alumnos",
    description: "Importá o escribí el padrón y revisá la previsualización antes de guardar.",
    readyLabel: "Padrón listo para revisar",
  },
  notas: {
    label: "Notas",
    description: "Cargue la lista del curso, complete las calificaciones y guarde en una sola acción.",
    readyLabel: "Lista de notas cargada",
  },
  asistencias: {
    label: "Asistencias",
    description: "Marque presente, ausente o justificado y controle la condición acumulada.",
    readyLabel: "Lista de asistencia cargada",
  },
};

const getToday = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function AlumnosPage() {
  const { user, role, isLoadingProfile } = useAuth();
  const today = getToday();
  const [rol, setRol] = useState<Rol>(null);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [selectedMateriaId, setSelectedMateriaId] = useState<number | "">("");
  const [anio, setAnio] = useState(String(CURRENT_YEAR));
  const [activeSection, setActiveSection] = useState<ActiveSection>("padron");
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

  useEffect(() => {
    const load = async () => {
      if (isLoadingProfile) return;
      if (!user?.id || !role) {
        setStatusMessage({ type: "error", text: "No se pudo identificar al usuario actual." });
        return;
      }

      setRol(role);

      try {
        const accessibleMaterias = await getAccessibleMaterias(user.id, role);
        setMaterias(accessibleMaterias);
        if (accessibleMaterias.length === 0) {
          setStatusMessage({ type: "info", text: "No hay materias asignadas para este docente." });
        }
      } catch (error: unknown) {
        const message =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : "Error desconocido";
        setStatusMessage({ type: "error", text: `No se pudieron cargar materias: ${message}` });
      }
    };

    void load();
  }, [isLoadingProfile, role, user?.id]);

  const hasSelectedMateria = selectedMateriaId !== "";
  const hasCursoConfigurado = Boolean(hasSelectedMateria && anio.trim());

  const {
    sourceMode,
    setSourceMode,
    isDragActive,
    isLoading,
    archivo,
    manualRows,
    importResult,
    importPlan,
    statusFilter,
    setStatusFilter,
    rowsDisponibles,
    resetImportState,
    onManualRowChange,
    onAddManualRow,
    preview,
    confirmImport,
    onExcelDragOver,
    onExcelDragLeave,
    onExcelDrop,
    onExcelFileChange,
    discardImportPreview,
  } = usePadronImport({ selectedMateriaId, anio, setStatusMessage });

  const {
    evaluacionNombre,
    tipoEvaluacion,
    notasRows,
    isNotasReady,
    isLoadingNotas,
    resetNotasState,
    onEvaluacionNombreChange,
    onTipoEvaluacionChange,
    onChangeNota,
    onChangeAusente,
    onChangeAusenteTodos,
    cargarNotas,
    guardarNotas,
  } = useNotasWorkflow({
    selectedMateriaId,
    anio,
    hasCursoConfigurado,
    setStatusMessage,
  });

  const {
    fecha,
    setTema,
    tema,
    asistenciaRows,
    isAsistenciaReady,
    isLoadingAsistencia,
    resetAsistenciaState,
    onFechaChange,
    onChangeAsistenciaEstado,
    cargarAsistencias,
    guardarAsistencia,
  } = useAsistenciasWorkflow({
    selectedMateriaId,
    anio,
    today,
    hasCursoConfigurado,
    setStatusMessage,
  });

  const canPreview = hasCursoConfigurado && rowsDisponibles.length > 0;
  const selectedMateria =
    selectedMateriaId === ""
      ? null
      : materias.find((materia) => materia.id === selectedMateriaId) ?? null;
  const selectedSectionMeta = SECTION_META[activeSection];
  const currentSourceLabel = sourceMode === "excel" ? "Excel .xlsx" : "Carga manual";
  const padronReady = Boolean(importPlan || importResult);
  const notasReadyCount = notasRows.length;
  const asistenciaReadyCount = asistenciaRows.length;

  const onMateriaChange = (value: string) => {
    setSelectedMateriaId(value === "" ? "" : Number(value));
    setStatusMessage(null);
    resetImportState();
    resetNotasState();
    resetAsistenciaState();
  };

  const onAnioChange = (value: string) => {
    setAnio(value);
    setStatusMessage(null);
    resetImportState();
    resetNotasState();
    resetAsistenciaState();
  };

  return (
    <div className="min-h-screen max-w-6xl mx-auto bg-white p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Alumnos</h1>
        <p className="mt-2 text-slate-500">
          Gestioná padrón, notas y asistencias por materia y año desde una sola vista.
        </p>
      </header>

      {statusMessage && <StatusBanner message={statusMessage} />}

      <section className="mb-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            Paso 1
          </p>
          <h2 className="mt-3 text-2xl font-black text-slate-900">Defina el curso de trabajo</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Seleccione la materia y el año antes de pasar a padrón, notas o asistencias. Cada cambio
            reinicia los datos cargados del módulo actual.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                Materia
              </label>
              <select
                value={selectedMateriaId}
                onChange={(event) => onMateriaChange(event.target.value)}
                aria-label="Seleccionar materia para trabajar"
                className="w-full rounded-2xl border-2 border-slate-100 bg-white p-4 text-slate-900 outline-none focus:border-[#5D9AD4]"
              >
                <option value="">Seleccione una materia...</option>
                {materias.map((materia) => (
                  <option key={materia.id} value={materia.id}>
                    {materia.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                Año
              </label>
              <input
                type="number"
                min={1900}
                max={CURRENT_YEAR + 1}
                value={anio}
                onChange={(event) => onAnioChange(event.target.value)}
                aria-label="Ingresar año del curso"
                className="w-full rounded-2xl border-2 border-slate-100 bg-white p-4 text-slate-900 outline-none focus:border-[#5D9AD4]"
              />
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            Contexto actual
          </p>
          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Materia
              </div>
              <div className="mt-2 text-lg font-black text-slate-900">
                {selectedMateria?.nombre ?? "Sin seleccionar"}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Año activo
              </div>
              <div className="mt-2 text-lg font-black text-slate-900">{anio || "—"}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Estado
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-700">
                {hasCursoConfigurado
                  ? "Curso listo para trabajar"
                  : "Complete la materia y el año para habilitar los módulos"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {hasCursoConfigurado && (
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              Paso 2
            </p>
            <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-black text-slate-900">
                  Seleccione el bloque que desea trabajar
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Cambiá entre padrón, notas y asistencias sin perder el contexto del curso
                  seleccionado.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-black text-slate-900">{selectedSectionMeta.label}:</span>{" "}
                {selectedSectionMeta.description}
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {(Object.keys(SECTION_META) as ActiveSection[]).map((sectionKey) => {
                const section = SECTION_META[sectionKey];
                const isActive = activeSection === sectionKey;
                const isReady =
                  sectionKey === "padron"
                    ? padronReady
                    : sectionKey === "notas"
                      ? isNotasReady
                      : isAsistenciaReady;
                const itemCount =
                  sectionKey === "notas"
                    ? notasReadyCount
                    : sectionKey === "asistencias"
                      ? asistenciaReadyCount
                      : rowsDisponibles.length;

                return (
                  <button
                    key={sectionKey}
                    type="button"
                    onClick={() => setActiveSection(sectionKey)}
                    className={`rounded-[1.5rem] border p-4 text-left transition-all ${
                      isActive
                        ? "border-[#5D9AD4]/40 bg-[#5D9AD4]/10 shadow-sm"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-700">
                        {section.label}
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                          isReady
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {isReady ? "listo" : "pendiente"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{section.description}</p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      {isReady ? section.readyLabel : "Todavía sin cargar"} · {itemCount} item(s)
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <section className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              Paso 3
            </p>
            <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{selectedSectionMeta.label}</h3>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  {selectedSectionMeta.description}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[22rem]">
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Materia
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-900">
                    {selectedMateria?.nombre ?? "Sin seleccionar"}
                  </div>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Año
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-900">{anio}</div>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Fuente
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-900">
                    {activeSection === "padron" ? currentSourceLabel : selectedSectionMeta.label}
                  </div>
                </div>
              </div>
            </div>

            {activeSection === "padron" && (
              <PadronPanel
                sourceMode={sourceMode}
                isDragActive={isDragActive}
                archivoNombre={archivo?.name ?? null}
                manualRows={manualRows}
                canPreview={canPreview}
                isLoading={isLoading}
                hasImportPlan={Boolean(importPlan)}
                onSourceModeChange={setSourceMode}
                onDragOver={onExcelDragOver}
                onDragLeave={onExcelDragLeave}
                onDrop={onExcelDrop}
                onFileChange={onExcelFileChange}
                onManualRowChange={onManualRowChange}
                onAddManualRow={onAddManualRow}
                onPreview={preview}
                onReset={resetImportState}
                onConfirmImport={confirmImport}
                onDiscardImport={discardImportPreview}
              />
            )}

            {activeSection === "notas" && (
              <NotasPanel
                evaluacionNombre={evaluacionNombre}
                tipoEvaluacion={tipoEvaluacion}
                evaluacionOptions={EVALUACION_OPTIONS}
                tipoEvaluacionOptions={TIPO_EVALUACION_OPTIONS}
                isLoadingNotas={isLoadingNotas}
                isNotasReady={isNotasReady}
                notasRows={notasRows}
                onEvaluacionNombreChange={onEvaluacionNombreChange}
                onTipoEvaluacionChange={onTipoEvaluacionChange}
                onCargarNotas={cargarNotas}
                onChangeNota={onChangeNota}
                onChangeAusente={onChangeAusente}
                onChangeAusenteTodos={onChangeAusenteTodos}
                onGuardarNotas={guardarNotas}
              />
            )}

            {activeSection === "asistencias" && (
              <AsistenciasPanel
                today={today}
                fecha={fecha}
                tema={tema}
                isLoadingAsistencia={isLoadingAsistencia}
                isAsistenciaReady={isAsistenciaReady}
                asistenciaRows={asistenciaRows}
                onFechaChange={onFechaChange}
                onTemaChange={setTema}
                onCargarAsistencias={cargarAsistencias}
                onChangeAsistenciaEstado={onChangeAsistenciaEstado}
                onGuardarAsistencia={guardarAsistencia}
              />
            )}
          </section>
        </section>
      )}

      {importResult && (
        <ImportResults
          result={importResult}
          statusFilter={statusFilter}
          onChangeStatusFilter={setStatusFilter}
        />
      )}

      {rol === "docente" && !hasSelectedMateria && (
        <p className="mt-6 text-sm text-slate-500">Seleccione una materia para continuar.</p>
      )}
    </div>
  );
}

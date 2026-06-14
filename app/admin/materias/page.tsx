"use client";

import { useEffect, useMemo, useState } from "react";
import StatusBanner from "@/components/admin/StatusBanner";
import { readWorkbookMatrix } from "@/lib/import/excel/readWorkbookMatrix";
import { apiClient } from "@/lib/apiClient";

type Materia = {
  id: number;
  nombre: string;
  codigo: string | null;
};

type Perfil = {
  id: string;
  correo: string | null;
  rol: "admin" | "docente" | null;
};

type MateriaDocente = {
  id: number;
  materia_id: number;
  user_id: string;
};

type ParsedMateriaRow = {
  nombre: string;
  codigo: string;
};

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

const normalizeHeader = (value: string): string =>
  value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

const normalizeMateriaName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

const pickText = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const parseMateriasFromMatrix = (matrix: unknown[][]): ParsedMateriaRow[] => {
  const materiaAliases = new Set(["materia", "nombremateria", "asignatura"]);
  const codigoAliases = new Set(["codigo", "codigomateria", "codigodemateria", "cod"]);

  let headerRowIndex = -1;
  let materiaCol = -1;
  let codigoCol = -1;

  for (let rowIndex = 0; rowIndex < Math.min(matrix.length, 30); rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];
    let foundMateria = -1;
    let foundCodigo = -1;

    for (let col = 0; col < row.length; col += 1) {
      const normalized = normalizeHeader(pickText(row[col]));
      if (foundMateria === -1 && materiaAliases.has(normalized)) foundMateria = col;
      if (foundCodigo === -1 && codigoAliases.has(normalized)) foundCodigo = col;
    }

    if (foundMateria !== -1 && foundCodigo !== -1) {
      headerRowIndex = rowIndex;
      materiaCol = foundMateria;
      codigoCol = foundCodigo;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error("No se detectó el encabezado requerido. Utilice las columnas: Materia | Código.");
  }

  const parsed = matrix
    .slice(headerRowIndex + 1)
    .map((row) => ({
      nombre: pickText(row[materiaCol]),
      codigo: pickText(row[codigoCol]),
    }))
    .filter((row) => row.nombre || row.codigo);

  if (parsed.length === 0) {
    throw new Error("El archivo no tiene filas de materias para importar.");
  }

  return parsed;
};

export default function MateriasAdminPage() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [docentes, setDocentes] = useState<Perfil[]>([]);
  const [asignaciones, setAsignaciones] = useState<MateriaDocente[]>([]);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [isSavingExcel, setIsSavingExcel] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const [nuevaMateria, setNuevaMateria] = useState("");
  const [nuevoCodigo, setNuevoCodigo] = useState("");

  const [selectedMateriaId, setSelectedMateriaId] = useState<number | "">("");
  const [selectedDocenteId, setSelectedDocenteId] = useState<string | "">("");

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [parsedExcelRows, setParsedExcelRows] = useState<ParsedMateriaRow[]>([]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const { data: materiasData, error: materiasError } = await apiClient
        .from("materias")
        .select("id, nombre, codigo")
        .order("nombre", { ascending: true });
      if (materiasError) throw materiasError;

      const { data: docentesData, error: docentesError } = await apiClient
        .from("perfiles")
        .select("id, correo, rol")
        .eq("rol", "docente")
        .order("correo", { ascending: true });
      if (docentesError) throw docentesError;

      const { data: asignacionesData, error: asignacionesError } = await apiClient
        .from("materias_docentes")
        .select("id, materia_id, user_id")
        .order("id", { ascending: false });
      if (asignacionesError) throw asignacionesError;

      setMaterias((materiasData ?? []) as Materia[]);
      setDocentes((docentesData ?? []) as Perfil[]);
      setAsignaciones((asignacionesData ?? []) as MateriaDocente[]);
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `Error cargando datos: ${message}`,
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const processExcelFile = async (file: File) => {
    try {
      const matrix = await readWorkbookMatrix(file);
      const rows = parseMateriasFromMatrix(matrix);
      setExcelFile(file);
      setParsedExcelRows(rows);
      setStatusMessage({
        type: "info",
        text: `Archivo listo. Filas detectadas: ${rows.length}.`,
      });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setExcelFile(null);
      setParsedExcelRows([]);
      setStatusMessage({
        type: "error",
        text: `No se pudo procesar el archivo: ${message}`,
      });
    }
  };

  const crearMateriaManual = async () => {
    const nombre = nuevaMateria.trim();
    const codigo = nuevoCodigo.trim();
    if (!nombre) {
      setStatusMessage({ type: "error", text: "Ingrese el nombre de la materia." });
      return;
    }
    if (!codigo) {
      setStatusMessage({ type: "error", text: "Ingrese el código de la materia." });
      return;
    }

    setIsSavingManual(true);
    try {
      const materiaExistente = materias.find(
        (m) => normalizeMateriaName(m.nombre) === normalizeMateriaName(nombre)
      );

      if (materiaExistente) {
        const { error: updateError } = await apiClient
          .from("materias")
          .update({ codigo })
          .eq("id", materiaExistente.id);
        if (updateError) throw updateError;
        setStatusMessage({
          type: "success",
          text: "La materia existente se actualizó con el nuevo código.",
        });
      } else {
        const { error: insertError } = await apiClient.from("materias").insert({
          nombre,
          codigo,
        });
        if (insertError) throw insertError;
        setStatusMessage({ type: "success", text: "Materia creada correctamente." });
      }

      setNuevaMateria("");
      setNuevoCodigo("");
      await loadData();
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `Error guardando materia: ${message}`,
      });
    } finally {
      setIsSavingManual(false);
    }
  };

  const importarMateriasDesdeExcel = async () => {
    if (parsedExcelRows.length === 0) {
      setStatusMessage({ type: "error", text: "Primero cargá un archivo válido." });
      return;
    }

    setIsSavingExcel(true);
    try {
      const existingByName = new Map(
        materias.map((m) => [normalizeMateriaName(m.nombre), m] as const)
      );

      let creadas = 0;
      let actualizadas = 0;
      let sinCambios = 0;

      for (const row of parsedExcelRows) {
        const nombre = row.nombre.trim();
        const codigo = row.codigo.trim();
        if (!nombre) continue;

        const existing = existingByName.get(normalizeMateriaName(nombre));
        if (!existing) {
          const { error: insertError } = await apiClient.from("materias").insert({
            nombre,
            codigo: codigo || null,
          });
          if (insertError) throw insertError;
          creadas += 1;
          continue;
        }

        const codigoActual = existing.codigo?.trim() ?? "";
        if (codigoActual !== codigo) {
          const { error: updateError } = await apiClient
            .from("materias")
            .update({ codigo: codigo || null })
            .eq("id", existing.id);
          if (updateError) throw updateError;
          actualizadas += 1;
        } else {
          sinCambios += 1;
        }
      }

      setStatusMessage({
        type: "success",
        text: `Importación completada. Creadas: ${creadas}, actualizadas: ${actualizadas}, sin cambios: ${sinCambios}.`,
      });
      setExcelFile(null);
      setParsedExcelRows([]);
      await loadData();
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `Error importando materias: ${message}`,
      });
    } finally {
      setIsSavingExcel(false);
    }
  };

  const asignarMateria = async () => {
    if (!selectedMateriaId || !selectedDocenteId) {
      setStatusMessage({
        type: "error",
        text: "Seleccione la materia y el docente.",
      });
      return;
    }

    setIsAssigning(true);
    try {
      const { data: existing, error: existingError } = await apiClient
        .from("materias_docentes")
        .select("id")
        .eq("materia_id", Number(selectedMateriaId))
        .eq("user_id", selectedDocenteId)
        .limit(1);
      if (existingError) throw existingError;

      if ((existing ?? []).length > 0) {
        setStatusMessage({
          type: "info",
          text: "Esa materia ya está asignada a este docente.",
        });
        return;
      }

      const { error } = await apiClient.from("materias_docentes").insert({
        materia_id: Number(selectedMateriaId),
        user_id: selectedDocenteId,
      });
      if (error) throw error;

      setSelectedMateriaId("");
      setSelectedDocenteId("");
      setStatusMessage({ type: "success", text: "Asignación creada." });
      await loadData();
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `Error asignando materia: ${message}`,
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const eliminarAsignacion = async (id: number) => {
    setIsAssigning(true);
    try {
      const { error } = await apiClient.from("materias_docentes").delete().eq("id", id);
      if (error) throw error;
      setStatusMessage({ type: "success", text: "Asignación eliminada." });
      await loadData();
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `Error eliminando asignación: ${message}`,
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const materiaMap = useMemo(() => {
    const map = new Map<number, Materia>();
    materias.forEach((m) => map.set(m.id, m));
    return map;
  }, [materias]);

  const docenteMap = useMemo(() => {
    const map = new Map<string, Perfil>();
    docentes.forEach((d) => map.set(d.id, d));
    return map;
  }, [docentes]);

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen bg-white space-y-10">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Materias y asignaciones
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          Gestione materias, ya sea desde Excel o de forma manual, y asígnelas a docentes.
        </p>
      </header>

      {statusMessage && <StatusBanner message={statusMessage} />}

      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 space-y-5">
        <h2 className="text-lg font-black text-slate-900">Importar materias desde Excel</h2>
        <p className="text-sm text-slate-500">
          Formato requerido: dos columnas con encabezados <span className="font-black">Materia</span>{" "}
          y <span className="font-black">Código</span>.
        </p>
        <label
          htmlFor="materias-xlsx"
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragActive(false);
          }}
          onDrop={async (event) => {
            event.preventDefault();
            setIsDragActive(false);
            const file = event.dataTransfer.files?.[0];
            if (file) await processExcelFile(file);
          }}
          className={`flex min-h-[12rem] cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed text-center transition-colors ${
            isDragActive ? "border-[#5D9AD4] bg-[#5D9AD4]/10" : "border-slate-200 bg-white"
          }`}
        >
          <input
            id="materias-xlsx"
            type="file"
            accept=".xlsx"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) await processExcelFile(file);
              event.target.value = "";
            }}
            className="sr-only"
            aria-label="Seleccionar archivo de materias en formato Excel"
          />
          <p className="text-xl font-black text-slate-900">Arrastre un `.xlsx` o haga clic</p>
          <p className="mt-2 text-sm text-slate-500">Columnas: Materia | Código</p>
          {excelFile && <p className="mt-3 text-sm font-bold text-slate-700">{excelFile.name}</p>}
        </label>

        {parsedExcelRows.length > 0 && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Filas listas para importar:{" "}
              <span className="font-black text-slate-900">{parsedExcelRows.length}</span>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Vista previa de materias detectadas en el archivo Excel.
                </caption>
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-3 text-left">Materia</th>
                    <th className="p-3 text-left">Código</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedExcelRows.slice(0, 20).map((row, index) => (
                    <tr key={`${row.nombre}-${index}`} className="border-t border-slate-100">
                      <td className="p-3">{row.nombre}</td>
                      <td className="p-3">{row.codigo || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={importarMateriasDesdeExcel}
              disabled={isSavingExcel}
              className="w-full rounded-2xl bg-[#5D9AD4] p-3 text-white font-black disabled:opacity-70"
            >
              {isSavingExcel ? "IMPORTANDO..." : "IMPORTAR MATERIAS"}
            </button>
          </>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 p-6 bg-slate-50">
          <h2 className="text-lg font-black text-slate-900">Carga manual de materia</h2>
          <p className="mt-2 text-sm text-slate-500">
            Mismo formato que Excel: <span className="font-black">Materia</span> y{" "}
            <span className="font-black">Código</span>.
          </p>
          <div className="mt-4 space-y-3">
            <label htmlFor="manual-materia-nombre" className="sr-only">
              Nombre de la materia
            </label>
            <input
              id="manual-materia-nombre"
              type="text"
              placeholder="Materia"
              value={nuevaMateria}
              onChange={(e) => setNuevaMateria(e.target.value)}
              className="w-full rounded-2xl border-2 border-slate-100 bg-white p-3 text-slate-900 outline-none focus:border-[#5D9AD4]"
            />
            <label htmlFor="manual-materia-codigo" className="sr-only">
              Código de la materia
            </label>
            <input
              id="manual-materia-codigo"
              type="text"
              placeholder="Código de la materia"
              value={nuevoCodigo}
              onChange={(e) => setNuevoCodigo(e.target.value)}
              className="w-full rounded-2xl border-2 border-slate-100 bg-white p-3 text-slate-900 outline-none focus:border-[#5D9AD4]"
            />
            <button
              onClick={crearMateriaManual}
              disabled={isSavingManual}
              className="w-full rounded-2xl bg-slate-900 p-3 font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-70"
            >
              {isSavingManual ? "GUARDANDO..." : "GUARDAR MATERIA"}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 p-6 bg-white">
          <h2 className="text-lg font-black text-slate-900">Asignar materia a docente</h2>
          <div className="mt-4 space-y-3">
            <label htmlFor="assign-materia" className="sr-only">
              Seleccionar materia
            </label>
            <select
              id="assign-materia"
              value={selectedMateriaId}
              onChange={(e) =>
                setSelectedMateriaId(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-3 text-slate-900 outline-none focus:border-[#5D9AD4]"
            >
              <option value="">Seleccionar materia</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} {m.codigo ? `(${m.codigo})` : ""}
                </option>
              ))}
            </select>

            <label htmlFor="assign-docente" className="sr-only">
              Seleccionar docente
            </label>
            <select
              id="assign-docente"
              value={selectedDocenteId}
              onChange={(e) => setSelectedDocenteId(e.target.value)}
              className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-3 text-slate-900 outline-none focus:border-[#5D9AD4]"
            >
              <option value="">Seleccionar docente</option>
              {docentes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.correo ?? d.id}
                </option>
              ))}
            </select>

            <button
              onClick={asignarMateria}
              disabled={isAssigning}
              className="w-full rounded-2xl bg-[#5D9AD4] p-3 font-bold text-white transition-colors hover:bg-[#4C86BD] disabled:opacity-70"
            >
              {isAssigning ? "ASIGNANDO..." : "ASIGNAR"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-900">
            <caption className="sr-only">
              Listado de asignaciones entre materias y docentes.
            </caption>
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="text-left p-3">Materia</th>
                <th className="text-left p-3">Código</th>
                <th className="text-left p-3">Docente</th>
                <th className="text-left p-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {asignaciones.map((asig) => {
                const materia = materiaMap.get(asig.materia_id);
                const docente = docenteMap.get(asig.user_id);
                return (
                  <tr key={asig.id} className="border-t border-slate-100">
                    <td className="p-3">{materia?.nombre ?? "-"}</td>
                    <td className="p-3 text-slate-500">{materia?.codigo ?? "-"}</td>
                    <td className="p-3">{docente?.correo ?? asig.user_id}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => eliminarAsignacion(asig.id)}
                        disabled={isAssigning}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 disabled:opacity-70"
                        aria-label={`Quitar asignación de ${materia?.nombre ?? "materia"} para ${docente?.correo ?? "este docente"}`}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {asignaciones.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-400">
                    No hay asignaciones todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isLoadingData && <p className="text-sm text-slate-500">Cargando datos...</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
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

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

export default function ImportarAlumnos() {
  const [materia, setMateria] = useState("");
  const [anio, setAnio] = useState("2026");
  const [comision, setComision] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [datosPrevia, setDatosPrevia] = useState<ParsedAlumnoRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importPlan, setImportPlan] = useState<ImportPlan | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [statusFilter, setStatusFilter] = useState<"todos" | ImportStatus>("todos");
  const importDbClient = toImportAlumnosDbClient(supabase);

  const puedeSubir = materia && anio && comision && archivo;

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
      console.log("Datos leidos:", data);
      setDatosPrevia(data);
      setImportResult(null);
      setImportPlan(null);
      setStatusFilter("todos");
    } catch (err) {
      console.error("Error al procesar el archivo:", err);
      setDatosPrevia([]);
      setImportResult(null);
      setImportPlan(null);
      setStatusFilter("todos");
      setStatusMessage({
        type: "error",
        text: "No se pudo leer el archivo. Verifica que sea un Excel válido.",
      });
    }
  };

  const previsualizarCarga = async () => {
    if (datosPrevia.length === 0) {
      setStatusMessage({
        type: "error",
        text: "Primero carga un archivo valido con filas detectadas.",
      });
      return;
    }

    console.log("Iniciando análisis previo de importación...");
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
      console.error("Error en la carga (detalle completo):", err);
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
      console.error("Error confirmando importacion:", err);
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
          Carga de Alumnos
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
            <option value="1">Programacion I</option>
            <option value="2">Sistemas Operativos</option>
            <option value="3">Base de Datos</option>
            <option value="4">Matematica Discreta</option>
            <option value="5">Arquitectura de Computadoras</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
            Año
          </label>
          <input
            type="number"
            className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none transition-all"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
            Comisión
          </label>
          <select
            className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-[#5D9AD4] outline-none transition-all appearance-none cursor-pointer"
            value={comision}
            onChange={(e) => setComision(e.target.value)}
          >
            <option value="">Elegir...</option>
            <option value="A">Comisión A</option>
            <option value="B">Comisión B</option>
            <option value="C">Comisión C</option>
          </select>
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
              {isImporting ? "ANALIZANDO..." : "PREVISUALIZAR IMPORTACIÓN"}
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
                  {isImporting ? "APLICANDO..." : "ACEPTAR IMPORTACIÓN"}
                </button>
                <button
                  onClick={cancelarImportacion}
                  disabled={isImporting}
                  className="w-full p-4 bg-slate-200 text-slate-800 font-black text-lg rounded-2xl hover:bg-slate-300 transition-colors disabled:opacity-70"
                >
                  CANCELAR IMPORTACIÓN
                </button>
              </div>
            </div>
          )}
        </div>
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

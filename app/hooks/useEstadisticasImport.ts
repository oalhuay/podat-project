"use client";

import { useEffect, useMemo, useState } from "react";
import {
  parseEstadisticasFromFile,
  type ParsedEstadisticaRow,
} from "@/lib/import/estadisticas/parseExcel";
import type { EstadisticaImportStatus } from "@/lib/import/estadisticas/types";
import type { Materia } from "@/lib/materias";
import {
  buildEstadisticaImportSummary,
  buildEstadisticaPreviewRows,
  computeEstadisticaChangeSummary,
  getEstadisticaRowsForStatus,
  saveEstadisticaPreviewRows,
  type ChangeSummary,
  type ImportDefaults,
  type StatusMessage,
} from "@/lib/import/estadisticas/workflow";

type UseEstadisticasImportOptions = {
  materias: Materia[];
  importDefaults?: ImportDefaults;
  messages?: {
    missingMateria?: string;
    missingYear?: string;
  };
  onStatusMessage: (message: StatusMessage | null) => void;
};

export function useEstadisticasImport({
  materias,
  importDefaults,
  messages,
  onStatusMessage,
}: UseEstadisticasImportOptions) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedEstadisticaRow[]>([]);
  const [changeSummary, setChangeSummary] = useState<ChangeSummary | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isCheckingChanges, setIsCheckingChanges] = useState(false);
  const [statusFilter, setStatusFilter] = useState<EstadisticaImportStatus | "todos">("todos");

  const previewRows = useMemo(
    () => buildEstadisticaPreviewRows(parsedRows, materias, importDefaults, messages),
    [importDefaults, materias, messages, parsedRows]
  );

  const summary = useMemo(
    () => (previewRows.length > 0 ? buildEstadisticaImportSummary(previewRows) : null),
    [previewRows]
  );

  const rowsFiltradas = useMemo(
    () => getEstadisticaRowsForStatus(previewRows, statusFilter),
    [previewRows, statusFilter]
  );

  useEffect(() => {
    let isCancelled = false;

    const syncChangeSummary = async () => {
      if (previewRows.length === 0) {
        setChangeSummary(null);
        return;
      }

      setIsCheckingChanges(true);
      try {
        const nextSummary = await computeEstadisticaChangeSummary(previewRows);
        if (!isCancelled) {
          setChangeSummary(nextSummary);
        }
      } catch (error: unknown) {
        const message =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : "Error desconocido";

        if (!isCancelled) {
          setChangeSummary(null);
          onStatusMessage({
            type: "error",
            text: `No se pudo analizar cambios: ${message}`,
          });
        }
      } finally {
        if (!isCancelled) {
          setIsCheckingChanges(false);
        }
      }
    };

    const timeoutId = window.setTimeout(() => {
      void syncChangeSummary();
    }, 0);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [onStatusMessage, previewRows]);

  const processFile = async (file: File) => {
    setArchivo(file);
    setIsImporting(true);

    try {
      const parsed = await parseEstadisticasFromFile(file);
      setParsedRows(parsed);

      if (parsed.length === 0) {
        setChangeSummary(null);
        onStatusMessage({
          type: "info",
          text: "No se encontraron datos validos en el Excel.",
        });
      } else {
        onStatusMessage({
          type: "info",
          text: `Archivo listo. Filas detectadas: ${parsed.length}.`,
        });
      }
    } catch {
      setParsedRows([]);
      setChangeSummary(null);
      onStatusMessage({
        type: "error",
        text: "No se pudo leer el archivo. Verifica que sea un Excel .xlsx valido.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const clearPreview = () => {
    setArchivo(null);
    setParsedRows([]);
    setChangeSummary(null);
    setStatusFilter("todos");
  };

  const aceptarImportacion = async () => {
    setIsImporting(true);

    try {
      const savedRows = await saveEstadisticaPreviewRows(previewRows);
      if (savedRows === 0) {
        onStatusMessage({
          type: "error",
          text: "No hay filas validas para guardar.",
        });
        return 0;
      }

      onStatusMessage({
        type: "success",
        text: `Importacion lista. Filas guardadas: ${savedRows}.`,
      });
      return savedRows;
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";

      onStatusMessage({
        type: "error",
        text: `Error al guardar estadisticas: ${message}`,
      });
      return 0;
    } finally {
      setIsImporting(false);
    }
  };

  return {
    archivo,
    parsedRows,
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
  };
}

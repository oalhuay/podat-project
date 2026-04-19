import { supabase } from "@/lib/supabase";
import { getIndicatorFromLabel } from "@/lib/estadisticas/catalog";
import type { ParsedEstadisticaRow } from "@/lib/import/estadisticas/parseExcel";
import type {
  EstadisticaImportStatus,
  EstadisticaImportSummary,
  EstadisticaPreviewRow,
} from "@/lib/import/estadisticas/types";
import type { Materia } from "@/lib/materias";

export type ChangeSummary = {
  revisados: number;
  nuevos: number;
  actualizados: number;
  sinCambios: number;
};

export type ImportDefaults = {
  materiaId: number | null;
  anio: number | null;
};

export type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

export const ESTADISTICA_STATUS_LABELS: Record<EstadisticaImportStatus, string> = {
  valido: "Valido",
  calculado_ignorado: "Calculado (no se guarda)",
  materia_faltante: "Materia faltante",
  materia_desconocida: "Materia desconocida",
  anio_faltante: "Ano faltante",
  indicador_desconocido: "Indicador desconocido",
  valor_invalido: "Valor invalido",
};

export const ESTADISTICA_STATUS_CLASSES: Record<EstadisticaImportStatus, string> = {
  valido: "bg-emerald-50 text-emerald-700",
  calculado_ignorado: "bg-amber-50 text-amber-700",
  materia_faltante: "bg-rose-50 text-rose-700",
  materia_desconocida: "bg-rose-50 text-rose-700",
  anio_faltante: "bg-rose-50 text-rose-700",
  indicador_desconocido: "bg-rose-50 text-rose-700",
  valor_invalido: "bg-rose-50 text-rose-700",
};

export const normalizeEstadisticaText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");

export const buildEstadisticaImportSummary = (
  rows: EstadisticaPreviewRow[]
): EstadisticaImportSummary => {
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

export const buildEstadisticaPreviewRows = (
  parsedRows: ParsedEstadisticaRow[],
  materias: Materia[],
  defaults?: ImportDefaults,
  messages?: {
    missingMateria?: string;
    missingYear?: string;
  }
): EstadisticaPreviewRow[] => {
  const materiaMap = new Map(
    materias.map((materia) => [normalizeEstadisticaText(materia.nombre), materia])
  );
  const fallbackMateria =
    defaults?.materiaId === null || defaults?.materiaId === undefined
      ? null
      : materias.find((materia) => materia.id === defaults.materiaId) ?? null;

  return parsedRows.map((row) => {
    const materiaName = row.materia?.trim() || fallbackMateria?.nombre || "";
    const materiaKey = materiaName ? normalizeEstadisticaText(materiaName) : "";
    const materia = materiaKey ? materiaMap.get(materiaKey) : fallbackMateria;
    const indicator = getIndicatorFromLabel(row.indicador);
    const anio = row.anio ?? defaults?.anio ?? null;

    let status: EstadisticaImportStatus = "valido";
    let mensaje = "OK";

    if (!materiaName) {
      status = "materia_faltante";
      mensaje =
        messages?.missingMateria ?? "Completa la materia en el formulario o dentro del archivo.";
    } else if (!materia) {
      status = "materia_desconocida";
      mensaje = "Materia no encontrada en la base.";
    } else if (anio === null) {
      status = "anio_faltante";
      mensaje = messages?.missingYear ?? "Completa el ano en el formulario o dentro del archivo.";
    } else if (!indicator) {
      status = "indicador_desconocido";
      mensaje = "Indicador no reconocido en el catalogo.";
    } else if (indicator.isCalculated) {
      status = "calculado_ignorado";
      mensaje = "Indicador calculado. Se calcula en el dashboard.";
    } else if (!Number.isFinite(row.valor)) {
      status = "valor_invalido";
      mensaje = "Valor invalido.";
    }

    return {
      materia: materiaName || "-",
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

export const getEstadisticaRowsForStatus = (
  rows: EstadisticaPreviewRow[],
  statusFilter: EstadisticaImportStatus | "todos"
) => {
  if (statusFilter === "todos") {
    return rows;
  }

  return rows.filter((row) => row.status === statusFilter);
};

export const getValidEstadisticaPayload = (rows: EstadisticaPreviewRow[]) =>
  rows
    .filter((row) => row.status === "valido" && row.materiaId && row.indicadorCode)
    .filter((row) => row.anio !== null)
    .map((row) => ({
      materia_id: row.materiaId as number,
      anio: row.anio as number,
      indicador: row.indicadorCode!,
      valor: row.valor,
    }));

export const computeEstadisticaChangeSummary = async (
  rows: EstadisticaPreviewRow[]
): Promise<ChangeSummary | null> => {
  const validRows = getValidEstadisticaPayload(rows);
  if (validRows.length === 0) {
    return null;
  }

  const materiaIds = Array.from(new Set(validRows.map((row) => row.materia_id)));
  const years = Array.from(new Set(validRows.map((row) => row.anio)));
  const indicators = Array.from(new Set(validRows.map((row) => row.indicador)));

  const { data, error } = await supabase
    .from("estadisticas")
    .select("materia_id, anio, indicador, valor")
    .in("materia_id", materiaIds)
    .in("anio", years)
    .in("indicador", indicators);

  if (error) {
    throw error;
  }

  const existingMap = new Map<string, number>();
  (data ?? []).forEach((row) => {
    existingMap.set(`${row.materia_id}|${row.anio}|${row.indicador}`, Number(row.valor));
  });

  let nuevos = 0;
  let actualizados = 0;
  let sinCambios = 0;

  validRows.forEach((row) => {
    const key = `${row.materia_id}|${row.anio}|${row.indicador}`;
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

  return {
    revisados: validRows.length,
    nuevos,
    actualizados,
    sinCambios,
  };
};

export const saveEstadisticaPreviewRows = async (rows: EstadisticaPreviewRow[]) => {
  const payload = getValidEstadisticaPayload(rows);
  if (payload.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from("estadisticas")
    .upsert(payload, { onConflict: "materia_id,anio,indicador" });

  if (error) {
    throw error;
  }

  return payload.length;
};

export const getMissingMateriaNames = (
  parsedRows: ParsedEstadisticaRow[],
  materias: Materia[]
) => {
  const existentes = new Set(materias.map((materia) => normalizeEstadisticaText(materia.nombre)));
  const faltantes = new Set<string>();

  parsedRows.forEach((row) => {
    const indicator = getIndicatorFromLabel(row.indicador);
    if (!indicator || indicator.isCalculated) return;

    const materiaName = row.materia?.trim();
    if (!materiaName) return;

    if (!existentes.has(normalizeEstadisticaText(materiaName))) {
      faltantes.add(materiaName);
    }
  });

  return Array.from(faltantes);
};

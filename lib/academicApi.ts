import { backendFetch } from "@/lib/backend";
import type { IndicatorCode } from "@/lib/estadisticas/catalog";
import type { Materia, MateriaDocenteAssignment } from "@/lib/materias";

export type EstadisticaApiRow = {
  materia_id: number;
  anio: number;
  indicador: IndicatorCode;
  valor: number;
};

export type EstadisticaPayloadRow = {
  materia_id: number;
  anio: number;
  indicador: string;
  valor: number;
};

export type ChangeSummaryResponse = {
  revisados: number;
  nuevos: number;
  actualizados: number;
  sinCambios: number;
};

export const fetchAccessibleMaterias = () =>
  backendFetch<Materia[]>("/api/materias/accessibles");

export const fetchMateriaAssignments = () =>
  backendFetch<MateriaDocenteAssignment[]>("/api/materias/asignaciones");

export const createMissingMaterias = (nombres: string[]) =>
  backendFetch<{ creadas: number; materias: Materia[] }>("/api/materias/faltantes", {
    method: "POST",
    body: JSON.stringify({ nombres }),
  });

export const fetchEstadisticas = (filters: {
  materiaId?: number;
  materiaIds?: number[];
  anioDesde?: number;
  anioHasta?: number;
}) => {
  const params = new URLSearchParams();
  if (filters.materiaId !== undefined) {
    params.set("materia_id", String(filters.materiaId));
  }
  filters.materiaIds?.forEach((materiaId) => {
    params.append("materia_ids", String(materiaId));
  });
  if (filters.anioDesde !== undefined) {
    params.set("anio_desde", String(filters.anioDesde));
  }
  if (filters.anioHasta !== undefined) {
    params.set("anio_hasta", String(filters.anioHasta));
  }

  return backendFetch<EstadisticaApiRow[]>(
    `/api/estadisticas?${params.toString()}`
  );
};

export const fetchEstadisticaChangeSummary = (filas: EstadisticaPayloadRow[]) =>
  backendFetch<ChangeSummaryResponse>("/api/estadisticas/cambios", {
    method: "POST",
    body: JSON.stringify({ filas }),
  });

export const saveEstadisticas = (filas: EstadisticaPayloadRow[]) =>
  backendFetch<{ guardadas: number }>("/api/estadisticas/importacion", {
    method: "PUT",
    body: JSON.stringify({ filas }),
  });

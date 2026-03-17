import type { IndicatorCode } from "@/lib/estadisticas/catalog";

export type EstadisticaImportStatus =
  | "valido"
  | "calculado_ignorado"
  | "materia_desconocida"
  | "indicador_desconocido"
  | "valor_invalido";

export type EstadisticaPreviewRow = {
  materia: string;
  materiaId: number | null;
  indicadorRaw: string;
  indicadorCode: IndicatorCode | null;
  anio: number;
  valor: number | null;
  status: EstadisticaImportStatus;
  mensaje: string;
};

export type EstadisticaImportSummary = {
  total: number;
  validos: number;
  calculados: number;
  materiaDesconocida: number;
  indicadorDesconocido: number;
  valorInvalido: number;
};

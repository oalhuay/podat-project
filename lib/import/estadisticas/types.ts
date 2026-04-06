import type { IndicatorCode } from "@/lib/estadisticas/catalog";

export type EstadisticaImportStatus =
  | "valido"
  | "calculado_ignorado"
  | "materia_faltante"
  | "materia_desconocida"
  | "anio_faltante"
  | "indicador_desconocido"
  | "valor_invalido";

export type EstadisticaPreviewRow = {
  materia: string;
  materiaId: number | null;
  indicadorRaw: string;
  indicadorCode: IndicatorCode | null;
  anio: number | null;
  valor: number | null;
  status: EstadisticaImportStatus;
  mensaje: string;
};

export type EstadisticaImportSummary = {
  total: number;
  validos: number;
  calculados: number;
  materiaFaltante: number;
  materiaDesconocida: number;
  anioFaltante: number;
  indicadorDesconocido: number;
  valorInvalido: number;
};

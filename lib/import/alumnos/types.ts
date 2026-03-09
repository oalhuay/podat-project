export type ParsedAlumnoRow = {
  Legajo: string;
  Nombre: string;
  Apellido: string;
};

export type ImportStatus = "nuevo" | "duplicado" | "actualizado" | "invalido";

export type ImportRowResult = {
  legajo: string;
  nombre: string;
  apellido: string;
  status: ImportStatus;
  mensaje?: string;
};

export type ImportSummary = {
  total: number;
  nuevos: number;
  duplicados: number;
  actualizados: number;
  invalidos: number;
};

export type ImportResult = {
  summary: ImportSummary;
  rows: ImportRowResult[];
};

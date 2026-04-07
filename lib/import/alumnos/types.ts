export type ParsedAlumnoRow = {
  Legajo: string;
  Nombre: string;
  Apellido: string;
  Alumno: string;
  Genero: string;
  Condicion: string;
};

export type ImportStatus = "nuevo" | "duplicado" | "actualizado" | "invalido";

export type ImportRowResult = {
  legajo: string;
  nombre: string;
  apellido: string;
  genero?: string | null;
  condicion?: string | null;
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

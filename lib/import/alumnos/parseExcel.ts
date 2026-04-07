import { ParsedAlumnoRow } from "./types";
import { readWorkbookMatrix } from "@/lib/import/excel/readWorkbookMatrix";

const normalizeHeader = (value: string) =>
  value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();

const HEADER_ALIASES = {
  legajo: ["Legajo", "NroLegajo", "NumeroLegajo", "Nro", "NroLeg"],
  alumno: ["Alumno", "ApellidoNombre", "ApellidoYNombre", "ApellidoyNombre"],
  nombre: ["Nombre", "Nombres"],
  apellido: ["Apellido", "Apellidos"],
  genero: ["Genero", "Género", "Sexo", "Gener"],
  condicion: ["Cond", "Cond.", "Condicion", "Condición"],
};

const pickText = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const splitAlumnoCell = (value: string): { apellido: string; nombre: string } => {
  const normalized = value.trim();
  if (!normalized) {
    return { apellido: "", nombre: "" };
  }

  const commaIndex = normalized.indexOf(",");
  if (commaIndex === -1) {
    return { apellido: normalized, nombre: "" };
  }

  return {
    apellido: normalized.slice(0, commaIndex).trim(),
    nombre: normalized.slice(commaIndex + 1).trim(),
  };
};

export const parseAlumnoDisplay = splitAlumnoCell;

const detectHeaderRow = (rows: unknown[][]) => {
  const normalizedAliases = {
    legajo: new Set(HEADER_ALIASES.legajo.map(normalizeHeader)),
    alumno: new Set(HEADER_ALIASES.alumno.map(normalizeHeader)),
    nombre: new Set(HEADER_ALIASES.nombre.map(normalizeHeader)),
    apellido: new Set(HEADER_ALIASES.apellido.map(normalizeHeader)),
    genero: new Set(HEADER_ALIASES.genero.map(normalizeHeader)),
    condicion: new Set(HEADER_ALIASES.condicion.map(normalizeHeader)),
  };

  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 30); rowIndex++) {
    const row = rows[rowIndex] ?? [];
    const colIndex = {
      legajo: -1,
      alumno: -1,
      nombre: -1,
      apellido: -1,
      genero: -1,
      condicion: -1,
    };

    for (let i = 0; i < row.length; i++) {
      const cell = pickText(row[i]);
      if (!cell) continue;
      const normalized = normalizeHeader(cell);

      if (colIndex.legajo === -1 && normalizedAliases.legajo.has(normalized)) {
        colIndex.legajo = i;
      }
      if (colIndex.alumno === -1 && normalizedAliases.alumno.has(normalized)) {
        colIndex.alumno = i;
      }
      if (colIndex.nombre === -1 && normalizedAliases.nombre.has(normalized)) {
        colIndex.nombre = i;
      }
      if (colIndex.apellido === -1 && normalizedAliases.apellido.has(normalized)) {
        colIndex.apellido = i;
      }
      if (colIndex.genero === -1 && normalizedAliases.genero.has(normalized)) {
        colIndex.genero = i;
      }
      if (colIndex.condicion === -1 && normalizedAliases.condicion.has(normalized)) {
        colIndex.condicion = i;
      }
    }

    const hasSeparateNameCols = colIndex.nombre !== -1 && colIndex.apellido !== -1;
    const hasCombinedNameCol = colIndex.alumno !== -1;

    if (colIndex.legajo !== -1 && (hasSeparateNameCols || hasCombinedNameCol)) {
      return { rowIndex, colIndex };
    }
  }

  return null;
};

export const parseAlumnosFromMatrix = (
  matrix: unknown[][]
): ParsedAlumnoRow[] => {
  const headerInfo = detectHeaderRow(matrix);
  if (!headerInfo) {
    return [];
  }

  const { rowIndex, colIndex } = headerInfo;
  return matrix
    .slice(rowIndex + 1)
    .map((row) => {
      const alumnoRaw =
        colIndex.alumno === -1 ? "" : pickText(row[colIndex.alumno]);
      const splitAlumno = splitAlumnoCell(alumnoRaw);
      const nombre =
        colIndex.nombre === -1 ? splitAlumno.nombre : pickText(row[colIndex.nombre]);
      const apellido =
        colIndex.apellido === -1 ? splitAlumno.apellido : pickText(row[colIndex.apellido]);

      return {
        Legajo: pickText(row[colIndex.legajo]),
        Nombre: nombre,
        Apellido: apellido,
        Alumno: alumnoRaw || [apellido, nombre].filter(Boolean).join(", "),
        Genero: colIndex.genero === -1 ? "" : pickText(row[colIndex.genero]),
        Condicion: colIndex.condicion === -1 ? "" : pickText(row[colIndex.condicion]),
      };
    })
    .filter(
      (fila) =>
        fila.Legajo || fila.Nombre || fila.Apellido || fila.Genero || fila.Condicion
    );
};

export const parseAlumnosFromFile = async (
  file: File
): Promise<ParsedAlumnoRow[]> => {
  const matrix = await readWorkbookMatrix(file);
  return parseAlumnosFromMatrix(matrix);
};

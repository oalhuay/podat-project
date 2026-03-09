import * as XLSX from "xlsx";
import { ParsedAlumnoRow } from "./types";

const normalizeHeader = (value: string) =>
  value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();

const HEADER_ALIASES = {
  legajo: ["Legajo", "NroLegajo", "NumeroLegajo", "Nro", "NroLeg"],
  nombre: ["Nombre", "Nombres"],
  apellido: ["Apellido", "Apellidos"],
};

const pickText = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const detectHeaderRow = (rows: unknown[][]) => {
  const normalizedAliases = {
    legajo: new Set(HEADER_ALIASES.legajo.map(normalizeHeader)),
    nombre: new Set(HEADER_ALIASES.nombre.map(normalizeHeader)),
    apellido: new Set(HEADER_ALIASES.apellido.map(normalizeHeader)),
  };

  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 30); rowIndex++) {
    const row = rows[rowIndex] ?? [];
    const colIndex = {
      legajo: -1,
      nombre: -1,
      apellido: -1,
    };

    for (let i = 0; i < row.length; i++) {
      const cell = pickText(row[i]);
      if (!cell) continue;
      const normalized = normalizeHeader(cell);

      if (colIndex.legajo === -1 && normalizedAliases.legajo.has(normalized)) {
        colIndex.legajo = i;
      }
      if (colIndex.nombre === -1 && normalizedAliases.nombre.has(normalized)) {
        colIndex.nombre = i;
      }
      if (colIndex.apellido === -1 && normalizedAliases.apellido.has(normalized)) {
        colIndex.apellido = i;
      }
    }

    if (colIndex.legajo !== -1 && colIndex.nombre !== -1 && colIndex.apellido !== -1) {
      return { rowIndex, colIndex };
    }
  }

  return null;
};

const readAsBinaryString = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result;
      if (!result || typeof result !== "string") {
        reject(new Error("No se pudo leer el archivo."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo."));
    reader.readAsBinaryString(file);
  });

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
    .map((row) => ({
      Legajo: pickText(row[colIndex.legajo]),
      Nombre: pickText(row[colIndex.nombre]),
      Apellido: pickText(row[colIndex.apellido]),
    }))
    .filter((fila) => fila.Legajo || fila.Nombre || fila.Apellido);
};

export const parseAlumnosFromFile = async (
  file: File
): Promise<ParsedAlumnoRow[]> => {
  const binary = await readAsBinaryString(file);
  const wb = XLSX.read(binary, { type: "binary" });
  const wsname = wb.SheetNames[0];
  const ws = wb.Sheets[wsname];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: false,
    defval: "",
  });

  return parseAlumnosFromMatrix(matrix);
};

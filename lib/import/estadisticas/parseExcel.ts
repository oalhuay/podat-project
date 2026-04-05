import { readWorkbookMatrix } from "@/lib/import/excel/readWorkbookMatrix";

export type ParsedEstadisticaRow = {
  materia: string;
  indicador: string;
  anio: number;
  valor: number;
};

const normalizeHeader = (value: string) =>
  value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();

const HEADER_ALIASES = {
  materia: ["Materia"],
  indicador: [
    "Indicadores de Alumnos",
    "Indicadores de Alumno",
    "Indicadores",
    "Datos",
    "IndicadoresdeAlumnos",
  ],
};

const pickText = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const pickNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (normalized === "") return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const pickYear = (value: unknown): number | null => {
  const year = pickNumber(value);
  if (year === null) return null;
  const truncated = Math.trunc(year);
  return truncated >= 1900 && truncated <= 3000 ? truncated : null;
};

const detectAllHeaderRows = (rows: unknown[][]) => {
  const headers: Array<{ rowIndex: number; materiaCol: number; indicadorCol: number }> = [];
  const normalizedAliases = {
    materia: new Set(HEADER_ALIASES.materia.map(normalizeHeader)),
    indicador: new Set(HEADER_ALIASES.indicador.map(normalizeHeader)),
  };

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] ?? [];
    let materiaCol = -1;
    let indicadorCol = -1;

    for (let i = 0; i < row.length; i++) {
      const cell = pickText(row[i]);
      if (!cell) continue;
      const normalized = normalizeHeader(cell);
      if (materiaCol === -1 && normalizedAliases.materia.has(normalized)) {
        materiaCol = i;
      }
      if (indicadorCol === -1 && normalizedAliases.indicador.has(normalized)) {
        indicadorCol = i;
      }
    }

    if (materiaCol !== -1 && indicadorCol !== -1) {
      headers.push({ rowIndex, materiaCol, indicadorCol });
    }
  }

  return headers;
};

export const parseEstadisticasFromMatrix = (
  matrix: unknown[][]
): ParsedEstadisticaRow[] => {
  const headerInfos = detectAllHeaderRows(matrix);
  if (headerInfos.length === 0) return [];

  const rows: ParsedEstadisticaRow[] = [];

  for (let h = 0; h < headerInfos.length; h++) {
    const { rowIndex, materiaCol, indicadorCol } = headerInfos[h];
    const headerRow = matrix[rowIndex] ?? [];

    const yearCols: Array<{ col: number; year: number }> = [];
    for (let i = indicadorCol + 1; i < headerRow.length; i++) {
      const year = pickYear(headerRow[i]);
      if (year !== null) yearCols.push({ col: i, year });
    }

    if (yearCols.length === 0) continue;

    const nextHeaderRow = headerInfos[h + 1]?.rowIndex ?? matrix.length;
    let currentMateria = "";

    for (const row of matrix.slice(rowIndex + 1, nextHeaderRow)) {
      if (!row || row.length === 0) continue;
      const materiaCell = pickText(row[materiaCol]);
      if (materiaCell) currentMateria = materiaCell;

      const indicadorCell = pickText(row[indicadorCol]);
      if (!currentMateria || !indicadorCell) continue;

      for (const { col, year } of yearCols) {
        const value = pickNumber(row[col]);
        if (value === null) continue;
        rows.push({
          materia: currentMateria,
          indicador: indicadorCell,
          anio: year,
          valor: value,
        });
      }
    }
  }

  return rows;
};

export const parseEstadisticasFromFile = async (
  file: File
): Promise<ParsedEstadisticaRow[]> => {
  const matrix = await readWorkbookMatrix(file, {
    preferredSheetNameIncludes: "estadistica",
  });
  return parseEstadisticasFromMatrix(matrix);
};

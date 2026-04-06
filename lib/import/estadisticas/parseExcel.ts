import { readWorkbookMatrix } from "@/lib/import/excel/readWorkbookMatrix";

export type ParsedEstadisticaRow = {
  materia: string | null;
  indicador: string;
  anio: number | null;
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
  anio: ["Año", "Anio"],
  indicador: [
    "Indicadores de Alumnos",
    "Indicadores de Alumno",
    "Indicadores",
    "Datos",
    "IndicadoresdeAlumnos",
  ],
  varones: [
    "Varones inscriptos",
    "Varones inscritos",
    "Varones",
    "Cantidad de varones",
  ],
  mujeres: [
    "Mujeres inscriptas",
    "Mujeres inscritas",
    "Mujeres",
    "Cantidad de mujeres",
  ],
};

type RowBasedHeaderInfo = {
  rowIndex: number;
  materiaCol: number;
  materiaTitle: string | null;
  anioCol: number;
  indicatorCols: Array<{ col: number; label: string }>;
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

const detectRowBasedHeaders = (rows: unknown[][]): RowBasedHeaderInfo[] => {
  const normalizedAliases = {
    materia: new Set(HEADER_ALIASES.materia.map(normalizeHeader)),
    anio: new Set(HEADER_ALIASES.anio.map(normalizeHeader)),
  };
  const headers: RowBasedHeaderInfo[] = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] ?? [];
    let materiaCol = -1;
    let anioCol = -1;

    for (let i = 0; i < row.length; i++) {
      const cell = pickText(row[i]);
      if (!cell) continue;
      const normalized = normalizeHeader(cell);
      if (materiaCol === -1 && normalizedAliases.materia.has(normalized)) {
        materiaCol = i;
      }
      if (anioCol === -1 && normalizedAliases.anio.has(normalized)) {
        anioCol = i;
      }
    }

    if (anioCol === -1) continue;

    const indicatorCols: Array<{ col: number; label: string }> = [];
    for (let i = anioCol + 1; i < row.length; i++) {
      const label = pickText(row[i]);
      if (!label) continue;
      indicatorCols.push({ col: i, label });
    }

    if (indicatorCols.length === 0) continue;

    let materiaTitle: string | null = null;
    if (materiaCol === -1) {
      for (let i = anioCol - 1; i >= 0; i--) {
        const cell = pickText(row[i]);
        if (!cell) continue;

        const normalized = normalizeHeader(cell);
        if (
          normalizedAliases.materia.has(normalized) ||
          normalizedAliases.anio.has(normalized)
        ) {
          continue;
        }

        materiaCol = i;
        materiaTitle = cell;
        break;
      }
    }

    headers.push({
      rowIndex,
      materiaCol,
      materiaTitle,
      anioCol,
      indicatorCols,
    });
  }

  return headers;
};

const parseRowBasedRows = (matrix: unknown[][]): ParsedEstadisticaRow[] => {
  const headers = detectRowBasedHeaders(matrix);
  if (headers.length === 0) return [];

  const rows: ParsedEstadisticaRow[] = [];

  for (let h = 0; h < headers.length; h++) {
    const { rowIndex, materiaCol, materiaTitle, anioCol, indicatorCols } = headers[h];
    const nextHeaderRow = headers[h + 1]?.rowIndex ?? matrix.length;
    let currentMateria = materiaTitle ?? "";

    for (const row of matrix.slice(rowIndex + 1, nextHeaderRow)) {
      if (!row || row.length === 0) continue;

      const materiaCell = materiaCol === -1 ? "" : pickText(row[materiaCol]);
      if (materiaCell) {
        currentMateria = materiaCell;
      }

      const anio = pickYear(row[anioCol]);
      if (anio === null) continue;

      for (const { col, label } of indicatorCols) {
        const value = pickNumber(row[col]);
        if (value === null) continue;

        rows.push({
          materia: currentMateria || materiaTitle || null,
          indicador: label,
          anio,
          valor: value,
        });
      }
    }
  }

  return rows;
};

export const parseEstadisticasFromMatrix = (
  matrix: unknown[][]
): ParsedEstadisticaRow[] => {
  const rowBasedRows = parseRowBasedRows(matrix);
  if (rowBasedRows.length > 0) return rowBasedRows;

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

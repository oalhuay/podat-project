import * as XLSX from "xlsx";

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

const detectHeaderRow = (rows: unknown[][]) => {
  const normalizedAliases = {
    materia: new Set(HEADER_ALIASES.materia.map(normalizeHeader)),
    indicador: new Set(HEADER_ALIASES.indicador.map(normalizeHeader)),
  };

  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 40); rowIndex++) {
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
      return { rowIndex, materiaCol, indicadorCol };
    }
  }

  return null;
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
      const raw = headerRow[i];
      if (typeof raw === "number" && raw >= 1900 && raw <= 3000) {
        yearCols.push({ col: i, year: Math.trunc(raw) });
      }
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
        const value = row[col];
        if (typeof value !== "number") continue;
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
  const binary = await readAsBinaryString(file);
  const wb = XLSX.read(binary, { type: "binary" });
  const preferred = wb.SheetNames.find((name) =>
    name.toLowerCase().includes("estadistica")
  );
  const sheetName = preferred ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: true,
    defval: "",
  });

  return parseEstadisticasFromMatrix(matrix);
};

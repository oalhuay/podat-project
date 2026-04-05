import { Workbook, type CellValue } from "exceljs";

const SUPPORTED_EXTENSION = ".xlsx";

const ensureSupportedSpreadsheet = (file: File) => {
  if (file.name.toLowerCase().endsWith(SUPPORTED_EXTENSION)) return;
  throw new Error("Solo se admiten archivos .xlsx.");
};

const normalizeCellValue = (value: CellValue): unknown => {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if ("result" in value && value.result !== undefined) {
    return value.result;
  }

  if ("text" in value && typeof value.text === "string") {
    return value.text;
  }

  if ("richText" in value) {
    return value.richText.map((part) => part.text).join("");
  }

  if ("error" in value) {
    return value.error;
  }

  return "";
};

const rowToArray = (rowValues: CellValue[] | { [key: string]: CellValue }): unknown[] => {
  if (!Array.isArray(rowValues)) return [];

  const cells = rowValues.slice(1).map((value) => normalizeCellValue(value));
  let lastNonEmptyIndex = cells.length - 1;

  while (
    lastNonEmptyIndex >= 0 &&
    (cells[lastNonEmptyIndex] === "" ||
      cells[lastNonEmptyIndex] === null ||
      cells[lastNonEmptyIndex] === undefined)
  ) {
    lastNonEmptyIndex -= 1;
  }

  return cells.slice(0, lastNonEmptyIndex + 1);
};

type ReadWorkbookMatrixOptions = {
  preferredSheetNameIncludes?: string;
};

export const readWorkbookMatrix = async (
  file: File,
  options?: ReadWorkbookMatrixOptions
): Promise<unknown[][]> => {
  ensureSupportedSpreadsheet(file);

  const workbook = new Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const preferredSheetNameIncludes = options?.preferredSheetNameIncludes?.toLowerCase();
  const worksheet =
    (preferredSheetNameIncludes
      ? workbook.worksheets.find((sheet) =>
          sheet.name.toLowerCase().includes(preferredSheetNameIncludes)
        )
      : undefined) ?? workbook.worksheets[0];

  if (!worksheet) {
    return [];
  }

  const matrix: unknown[][] = [];
  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    matrix.push(rowToArray(worksheet.getRow(rowNumber).values));
  }

  return matrix;
};

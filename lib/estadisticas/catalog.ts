export type IndicatorCode =
  | "VAR_INS"
  | "VAR_REG"
  | "VAR_REC"
  | "MUJ_INS"
  | "MUJ_REG"
  | "MUJ_REC"
  | "VAR_ID4"
  | "MUJ_ID4"
  | "PCT_VAR_REG"
  | "PCT_VAR_REC"
  | "PCT_MUJ_REG"
  | "PCT_MUJ_REC"
  | "REL_MUJ_VAR_INS"
  | "REL_MUJ_VAR_REG"
  | "REL_MUJ_VAR_REC"
  | "PCT_MUJ_ID4";

export type IndicatorUnit = "count" | "percent" | "ratio";

export type IndicatorDefinition = {
  code: IndicatorCode;
  label: string;
  isCalculated: boolean;
  unit: IndicatorUnit;
  aliases: string[];
  dependencies?: IndicatorCode[];
  compute?: (values: Record<IndicatorCode, number | null>) => number | null;
};

const normalizeText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");

const safeDivide = (num: number, den: number): number | null =>
  den === 0 ? null : num / den;

export const INDICATORS: IndicatorDefinition[] = [
  {
    code: "VAR_INS",
    label: "Varones inscriptos",
    isCalculated: false,
    unit: "count",
    aliases: ["varonesinscriptos", "varonesinscritos"],
  },
  {
    code: "VAR_REG",
    label: "Varones regulares",
    isCalculated: false,
    unit: "count",
    aliases: ["varonesregulares"],
  },
  {
    code: "VAR_REC",
    label: "Varones recursantes",
    isCalculated: false,
    unit: "count",
    aliases: ["varonesrecursantes"],
  },
  {
    code: "MUJ_INS",
    label: "Mujeres inscriptas",
    isCalculated: false,
    unit: "count",
    aliases: ["mujeresinscriptas", "mujeresinscritas", "mujeresinscriptos"],
  },
  {
    code: "MUJ_REG",
    label: "Mujeres regulares",
    isCalculated: false,
    unit: "count",
    aliases: ["mujeresregulares"],
  },
  {
    code: "MUJ_REC",
    label: "Mujeres recursantes",
    isCalculated: false,
    unit: "count",
    aliases: ["mujeresrecursantes"],
  },
  {
    code: "VAR_ID4",
    label: "Varones que llegan a IdS (4to)",
    isCalculated: false,
    unit: "count",
    aliases: ["varonesquelleganaids4to", "varonesquelleganaids", "varonesquelleganaids4"],
  },
  {
    code: "MUJ_ID4",
    label: "Mujeres que llegan a IdS (4to)",
    isCalculated: false,
    unit: "count",
    aliases: ["mujeresquelleganaids4to", "mujeresquelleganaids", "mujeresquelleganaids4"],
  },
  {
    code: "PCT_VAR_REG",
    label: "% Varones regulares (s/inscriptos)",
    isCalculated: true,
    unit: "percent",
    aliases: [
      "%varonesregularessinscriptos",
      "%varonesregulares",
      "%varonesregularesinscriptos",
    ],
    dependencies: ["VAR_REG", "VAR_INS"],
    compute: (values) => {
      const result = safeDivide(values.VAR_REG ?? 0, values.VAR_INS ?? 0);
      return result === null ? null : result * 100;
    },
  },
  {
    code: "PCT_VAR_REC",
    label: "% Varones recursantes (s/inscriptos)",
    isCalculated: true,
    unit: "percent",
    aliases: [
      "%varonesrecursantessinscriptos",
      "%varonesrecursantes",
      "%varonesrecursantesinscriptos",
    ],
    dependencies: ["VAR_REC", "VAR_INS"],
    compute: (values) => {
      const result = safeDivide(values.VAR_REC ?? 0, values.VAR_INS ?? 0);
      return result === null ? null : result * 100;
    },
  },
  {
    code: "PCT_MUJ_REG",
    label: "% Mujeres regulares (s/inscriptas)",
    isCalculated: true,
    unit: "percent",
    aliases: [
      "%mujeresregularessinscriptas",
      "%mujeresregulares",
      "%mujeresregularesinscriptas",
    ],
    dependencies: ["MUJ_REG", "MUJ_INS"],
    compute: (values) => {
      const result = safeDivide(values.MUJ_REG ?? 0, values.MUJ_INS ?? 0);
      return result === null ? null : result * 100;
    },
  },
  {
    code: "PCT_MUJ_REC",
    label: "% Mujeres recursantes (s/inscriptas)",
    isCalculated: true,
    unit: "percent",
    aliases: [
      "%mujeresrecursantessinscriptas",
      "%mujeresrecursantes",
      "%mujeresrecursantesinscriptas",
    ],
    dependencies: ["MUJ_REC", "MUJ_INS"],
    compute: (values) => {
      const result = safeDivide(values.MUJ_REC ?? 0, values.MUJ_INS ?? 0);
      return result === null ? null : result * 100;
    },
  },
  {
    code: "REL_MUJ_VAR_INS",
    label: "Relación Mujeres/Varones inscriptos",
    isCalculated: true,
    unit: "ratio",
    aliases: [
      "relacionmujeresvaronesinscriptos",
      "%mujeresvaronesinscriptos",
      "%mujeresvaronesinscritos",
    ],
    dependencies: ["MUJ_INS", "VAR_INS"],
    compute: (values) => safeDivide(values.MUJ_INS ?? 0, values.VAR_INS ?? 0),
  },
  {
    code: "REL_MUJ_VAR_REG",
    label: "Relación Mujeres/Varones regulares",
    isCalculated: true,
    unit: "ratio",
    aliases: [
      "relacionmujeresvaronesregulares",
      "%mujeresvaronesregulares",
    ],
    dependencies: ["MUJ_REG", "VAR_REG"],
    compute: (values) => safeDivide(values.MUJ_REG ?? 0, values.VAR_REG ?? 0),
  },
  {
    code: "REL_MUJ_VAR_REC",
    label: "Relación Mujeres/Varones recursantes",
    isCalculated: true,
    unit: "ratio",
    aliases: [
      "relacionmujeresvaronesrecursantes",
      "%mujeresvaronesrecursantes",
    ],
    dependencies: ["MUJ_REC", "VAR_REC"],
    compute: (values) => safeDivide(values.MUJ_REC ?? 0, values.VAR_REC ?? 0),
  },
  {
    code: "PCT_MUJ_ID4",
    label: "% Mujeres que llegan a IdS",
    isCalculated: true,
    unit: "percent",
    aliases: ["%mujeresquelleganaids", "%muejeresquelleganaids", "%mujeresquelleganaids4"],
    dependencies: ["MUJ_ID4", "MUJ_INS"],
    compute: (values) => {
      const result = safeDivide(values.MUJ_ID4 ?? 0, values.MUJ_INS ?? 0);
      return result === null ? null : result * 100;
    },
  },
];

export const INDICATOR_BY_CODE: Record<IndicatorCode, IndicatorDefinition> =
  INDICATORS.reduce((acc, item) => {
    acc[item.code] = item;
    return acc;
  }, {} as Record<IndicatorCode, IndicatorDefinition>);

const aliasToCode = new Map<string, IndicatorCode>();
INDICATORS.forEach((indicator) => {
  const normalizedLabel = normalizeText(indicator.label);
  if (!aliasToCode.has(normalizedLabel)) {
    aliasToCode.set(normalizedLabel, indicator.code);
  }
  indicator.aliases.forEach((alias) => {
    const normalizedAlias = normalizeText(alias);
    if (!aliasToCode.has(normalizedAlias)) {
      aliasToCode.set(normalizedAlias, indicator.code);
    }
  });
});

export const getIndicatorFromLabel = (label: string): IndicatorDefinition | null => {
  const code = aliasToCode.get(normalizeText(label));
  return code ? INDICATOR_BY_CODE[code] : null;
};

export const BASE_INDICATORS = INDICATORS.filter((i) => !i.isCalculated);
export const ALL_INDICATORS = INDICATORS;

export const normalizeIndicatorLabel = (label: string): string =>
  normalizeText(label);

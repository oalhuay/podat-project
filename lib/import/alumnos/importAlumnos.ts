import {
  ImportResult,
  ImportRowResult,
  ParsedAlumnoRow,
} from "./types";

type AlumnoRecord = {
  legajo: string;
  nombre: string;
  apellido: string;
  genero?: string | null;
};

type ProcesableAlumnoRecord = AlumnoRecord & {
  condicion?: string | null;
};

type Awaitable<T> = PromiseLike<T> | Promise<T>;

export type ImportPlan = {
  result: ImportResult;
  nuevos: AlumnoRecord[];
  actualizados: AlumnoRecord[];
  aplicables: ProcesableAlumnoRecord[];
};

type SelectInResponse = Awaitable<{
  data: Array<{ legajo: string; nombre: string; apellido: string; genero?: string | null }> | null;
  error: unknown;
}>;

type MutationResponse = Awaitable<{ error: unknown }>;

export type ImportAlumnosDbClient = {
  from: (table: "alumnos") => {
    select: (columns: string) => {
      in: (column: "legajo", values: string[]) => SelectInResponse;
    };
    insert: (rows: AlumnoRecord[]) => MutationResponse;
    upsert: (
      rows: AlumnoRecord[],
      options: { onConflict: "legajo" }
    ) => MutationResponse;
  };
};

export const toImportAlumnosDbClient = (
  client: { from: (table: "alumnos") => unknown },
  options?: { supportsGenero?: boolean }
): ImportAlumnosDbClient => ({
  from: (table) => {
    const supportsGenero = options?.supportsGenero ?? false;
    const raw = client.from(table) as {
      select: (columns: string) => { in: (column: "legajo", values: string[]) => Awaitable<unknown> };
      insert: (rows: AlumnoRecord[]) => Awaitable<unknown>;
      upsert: (
        rows: AlumnoRecord[],
        options: { onConflict: "legajo" }
      ) => Awaitable<unknown>;
    };

    return {
      select: (columns) => ({
        in: async (column, values) => {
          const selectedColumns = supportsGenero
            ? "legajo, nombre, apellido, genero"
            : columns;
          const result = (await raw.select(selectedColumns).in(column, values)) as {
            data: Array<{ legajo: string; nombre: string; apellido: string; genero?: string | null }> | null;
            error: unknown;
          };
          return { data: result.data, error: result.error };
        },
      }),
      insert: async (rows) => {
        const payload = rows.map((row) =>
          supportsGenero ? row : { legajo: row.legajo, nombre: row.nombre, apellido: row.apellido }
        );
        const result = (await raw.insert(payload)) as { error: unknown };
        return { error: result.error };
      },
      upsert: async (rows, options) => {
        const payload = rows.map((row) =>
          supportsGenero ? row : { legajo: row.legajo, nombre: row.nombre, apellido: row.apellido }
        );
        const result = (await raw.upsert(payload, options)) as { error: unknown };
        return { error: result.error };
      },
    };
  },
});

const normalize = (value: string) => value.trim();

const buildSummary = (rows: ImportRowResult[]): ImportResult["summary"] => ({
  total: rows.length,
  nuevos: rows.filter((r) => r.status === "nuevo").length,
  duplicados: rows.filter((r) => r.status === "duplicado").length,
  actualizados: rows.filter((r) => r.status === "actualizado").length,
  invalidos: rows.filter((r) => r.status === "invalido").length,
});

export const importAlumnos = async (
  parsedRows: ParsedAlumnoRow[],
  dbClient: ImportAlumnosDbClient
): Promise<ImportResult> => {
  const plan = await prepararImportAlumnos(parsedRows, dbClient);
  await ejecutarImportPlan(plan, dbClient);
  return plan.result;
};

export const prepararImportAlumnos = async (
  parsedRows: ParsedAlumnoRow[],
  dbClient: ImportAlumnosDbClient
): Promise<ImportPlan> => {
  const preRows = parsedRows.map((row) => ({
    legajo: normalize(row.Legajo),
    nombre: normalize(row.Nombre),
    apellido: normalize(row.Apellido),
    genero: normalize(row.Genero),
    condicion: normalize(row.Condicion),
  }));

  const resultRows: ImportRowResult[] = [];
  const uniqueByLegajo = new Map<string, ProcesableAlumnoRecord>();

  for (const row of preRows) {
    if (!row.legajo || !row.nombre || !row.apellido) {
      resultRows.push({
        ...row,
        status: "invalido",
        mensaje: "Fila incompleta. Requiere Legajo, Nombre y Apellido.",
      });
      continue;
    }

    if (uniqueByLegajo.has(row.legajo)) {
      resultRows.push({
        ...row,
        status: "duplicado",
        mensaje: "Legajo repetido dentro del archivo.",
      });
      continue;
    }

    uniqueByLegajo.set(row.legajo, row);
    resultRows.push({
      ...row,
      status: "invalido",
      mensaje: "Pendiente de procesar.",
    });
  }

  const uniqueRows = Array.from(uniqueByLegajo.values());
  if (uniqueRows.length === 0) {
    return {
      result: {
        summary: buildSummary(resultRows),
        rows: resultRows,
      },
      nuevos: [],
      actualizados: [],
      aplicables: [],
    };
  }

  const legajos = uniqueRows.map((r) => r.legajo);
  const { data: existentes, error: existingError } = await dbClient
    .from("alumnos")
    .select("legajo, nombre, apellido")
    .in("legajo", legajos);

  if (existingError) {
    throw existingError;
  }

  const existentesMap = new Map(
    (existentes ?? []).map((alumno) => [String(alumno.legajo), alumno])
  );

  const nuevos: AlumnoRecord[] = [];
  const actualizados: AlumnoRecord[] = [];

  for (const row of uniqueRows) {
    const existing = existentesMap.get(row.legajo);
    if (!existing) {
      nuevos.push(row);
      continue;
    }

    const sameNombre = normalize(String(existing.nombre ?? "")) === row.nombre;
    const sameApellido = normalize(String(existing.apellido ?? "")) === row.apellido;
    const canCompareGenero = "genero" in existing;
    const sameGenero =
      !canCompareGenero ||
      row.genero === "" ||
      normalize(String(existing.genero ?? "")) === row.genero;
    if (!sameNombre || !sameApellido || !sameGenero) {
      actualizados.push(row);
    }
  }

  const finalRows: ImportRowResult[] = resultRows.map((row): ImportRowResult => {
    if (row.status === "duplicado" || row.status === "invalido") {
      if (row.mensaje !== "Pendiente de procesar.") return row;
    }

    const wasInserted = nuevos.some((n) => n.legajo === row.legajo);
    if (wasInserted) {
      return { ...row, status: "nuevo", mensaje: "Alumno creado." };
    }

    const wasUpdated = actualizados.some((n) => n.legajo === row.legajo);
    if (wasUpdated) {
      return {
        ...row,
        status: "actualizado",
        mensaje: "Alumno existente actualizado.",
      };
    }

    return {
      ...row,
      status: "duplicado",
      mensaje: "Alumno ya existente sin cambios.",
    };
  });

  return {
    result: {
      summary: buildSummary(finalRows),
      rows: finalRows,
    },
    nuevos,
    actualizados,
    aplicables: uniqueRows,
  };
};

export const ejecutarImportPlan = async (
  plan: ImportPlan,
  dbClient: ImportAlumnosDbClient
): Promise<void> => {
  if (plan.nuevos.length > 0) {
    const { error } = await dbClient.from("alumnos").insert(plan.nuevos);
    if (error) throw error;
  }

  if (plan.actualizados.length > 0) {
    const { error } = await dbClient
      .from("alumnos")
      .upsert(plan.actualizados, { onConflict: "legajo" });
    if (error) throw error;
  }
};

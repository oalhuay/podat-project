import { describe, expect, it } from "vitest";
import { importAlumnos, ImportAlumnosDbClient } from "./importAlumnos";
import { ParsedAlumnoRow } from "./types";

type ExistingAlumno = { legajo: string; nombre: string; apellido: string };

const createDbClientMock = (existing: ExistingAlumno[]) => {
  const inserted: ExistingAlumno[] = [];
  const upserted: ExistingAlumno[] = [];

  const client: ImportAlumnosDbClient = {
    from: () => ({
      select: () => ({
        in: async () => ({
          data: existing,
          error: null,
        }),
      }),
      insert: async (rows) => {
        inserted.push(...rows);
        return { error: null };
      },
      upsert: async (rows) => {
        upserted.push(...rows);
        return { error: null };
      },
    }),
  };

  return { client, inserted, upserted };
};

describe("importAlumnos", () => {
  it("marca invalidos y duplicados internos del Excel", async () => {
    const { client, inserted, upserted } = createDbClientMock([]);
    const rows: ParsedAlumnoRow[] = [
      { Legajo: "1001", Nombre: "Lionel", Apellido: "Messi" },
      { Legajo: "1001", Nombre: "Leo", Apellido: "Messi" },
      { Legajo: "", Nombre: "Paulo", Apellido: "Dybala" },
    ];

    const result = await importAlumnos(rows, client);

    expect(result.summary).toEqual({
      total: 3,
      nuevos: 1,
      duplicados: 1,
      actualizados: 0,
      invalidos: 1,
    });
    expect(inserted).toHaveLength(1);
    expect(upserted).toHaveLength(0);
  });

  it("distingue entre nuevos, actualizados y duplicados sin cambios", async () => {
    const existing: ExistingAlumno[] = [
      { legajo: "1001", nombre: "Lionel", apellido: "Messi" },
      { legajo: "1002", nombre: "Angel", apellido: "Di Maria" },
    ];
    const { client, inserted, upserted } = createDbClientMock(existing);
    const rows: ParsedAlumnoRow[] = [
      { Legajo: "1001", Nombre: "Lionel", Apellido: "Messi" },
      { Legajo: "1002", Nombre: "Angel", Apellido: "Di Maria Jr" },
      { Legajo: "1003", Nombre: "Julian", Apellido: "Alvarez" },
    ];

    const result = await importAlumnos(rows, client);

    expect(result.summary).toEqual({
      total: 3,
      nuevos: 1,
      duplicados: 1,
      actualizados: 1,
      invalidos: 0,
    });
    expect(inserted).toEqual([
      { legajo: "1003", nombre: "Julian", apellido: "Alvarez" },
    ]);
    expect(upserted).toEqual([
      { legajo: "1002", nombre: "Angel", apellido: "Di Maria Jr" },
    ]);
  });
});


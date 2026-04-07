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
      {
        Legajo: "1001",
        Nombre: "Lionel",
        Apellido: "Messi",
        Alumno: "Messi, Lionel",
        Genero: "Masculino",
        Condicion: "Regular",
      },
      {
        Legajo: "1001",
        Nombre: "Leo",
        Apellido: "Messi",
        Alumno: "Messi, Leo",
        Genero: "Masculino",
        Condicion: "Regular",
      },
      {
        Legajo: "",
        Nombre: "Paulo",
        Apellido: "Dybala",
        Alumno: "Dybala, Paulo",
        Genero: "Masculino",
        Condicion: "Libre",
      },
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
      {
        Legajo: "1001",
        Nombre: "Lionel",
        Apellido: "Messi",
        Alumno: "Messi, Lionel",
        Genero: "Masculino",
        Condicion: "Regular",
      },
      {
        Legajo: "1002",
        Nombre: "Angel",
        Apellido: "Di Maria Jr",
        Alumno: "Di Maria Jr, Angel",
        Genero: "Masculino",
        Condicion: "Libre",
      },
      {
        Legajo: "1003",
        Nombre: "Julian",
        Apellido: "Alvarez",
        Alumno: "Alvarez, Julian",
        Genero: "Masculino",
        Condicion: "Regular",
      },
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
      {
        legajo: "1003",
        nombre: "Julian",
        apellido: "Alvarez",
        genero: "Masculino",
        condicion: "Regular",
      },
    ]);
    expect(upserted).toEqual([
      {
        legajo: "1002",
        nombre: "Angel",
        apellido: "Di Maria Jr",
        genero: "Masculino",
        condicion: "Libre",
      },
    ]);
  });
});

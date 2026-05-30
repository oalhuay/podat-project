import { describe, expect, it } from "vitest";
import { parseEstadisticasFromMatrix } from "./parseExcel";

describe("parseEstadisticasFromMatrix", () => {
  it("parsea bloques con encabezados repetidos", () => {
    const matrix = [
      ["Resumen"],
      ["Materia", "Indicadores de Alumnos", 2022, 2023],
      ["Programacion I", "Varones inscriptos", 10, 12],
      ["", "Mujeres inscriptas", 8, 11],
      [],
      ["Materia", "Indicadores de Alumnos", 2024],
      ["Sistemas Operativos", "Varones inscriptos", 15],
    ];

    expect(parseEstadisticasFromMatrix(matrix)).toEqual([
      {
        materia: "Programacion I",
        indicador: "Varones inscriptos",
        anio: 2022,
        valor: 10,
      },
      {
        materia: "Programacion I",
        indicador: "Varones inscriptos",
        anio: 2023,
        valor: 12,
      },
      {
        materia: "Programacion I",
        indicador: "Mujeres inscriptas",
        anio: 2022,
        valor: 8,
      },
      {
        materia: "Programacion I",
        indicador: "Mujeres inscriptas",
        anio: 2023,
        valor: 11,
      },
      {
        materia: "Sistemas Operativos",
        indicador: "Varones inscriptos",
        anio: 2024,
        valor: 15,
      },
    ]);
  });

  it("acepta años y valores numéricos como texto", () => {
    const matrix = [
      ["Materia", "Indicadores", "2022", "2023"],
      ["Base de Datos", "Varones regulares", "4", "5.5"],
    ];

    expect(parseEstadisticasFromMatrix(matrix)).toEqual([
      {
        materia: "Base de Datos",
        indicador: "Varones regulares",
        anio: 2022,
        valor: 4,
      },
      {
        materia: "Base de Datos",
        indicador: "Varones regulares",
        anio: 2023,
        valor: 5.5,
      },
    ]);
  });

  it("parsea el formato docente por bloques de materia y años en filas", () => {
    const matrix = [
      [],
      [null, "SISTEMAS Y ORGANIZACIONES", "Ano", "Varones Inscriptos", "Varones Regulares", "Mujeres Inscriptas", "Mujeres Regulares"],
      [null, "SISTEMAS Y ORGANIZACIONES", "2010", "110", "44", "12", "10"],
      [null, "SISTEMAS Y ORGANIZACIONES", "2011", "105", "40", "10", "9"],
      [],
      [null, "INGENIERIA DE SOFTWARE", "Ano", "Varones Inscriptos", "Varones Regulares", "Mujeres Inscriptas", "Mujeres Regulares"],
      [null, "INGENIERIA DE SOFTWARE", "2010", "115", "42", "14", "12"],
    ];

    expect(parseEstadisticasFromMatrix(matrix)).toEqual([
      {
        materia: "SISTEMAS Y ORGANIZACIONES",
        indicador: "Varones Inscriptos",
        anio: 2010,
        valor: 110,
      },
      {
        materia: "SISTEMAS Y ORGANIZACIONES",
        indicador: "Varones Regulares",
        anio: 2010,
        valor: 44,
      },
      {
        materia: "SISTEMAS Y ORGANIZACIONES",
        indicador: "Mujeres Inscriptas",
        anio: 2010,
        valor: 12,
      },
      {
        materia: "SISTEMAS Y ORGANIZACIONES",
        indicador: "Mujeres Regulares",
        anio: 2010,
        valor: 10,
      },
      {
        materia: "SISTEMAS Y ORGANIZACIONES",
        indicador: "Varones Inscriptos",
        anio: 2011,
        valor: 105,
      },
      {
        materia: "SISTEMAS Y ORGANIZACIONES",
        indicador: "Varones Regulares",
        anio: 2011,
        valor: 40,
      },
      {
        materia: "SISTEMAS Y ORGANIZACIONES",
        indicador: "Mujeres Inscriptas",
        anio: 2011,
        valor: 10,
      },
      {
        materia: "SISTEMAS Y ORGANIZACIONES",
        indicador: "Mujeres Regulares",
        anio: 2011,
        valor: 9,
      },
      {
        materia: "INGENIERIA DE SOFTWARE",
        indicador: "Varones Inscriptos",
        anio: 2010,
        valor: 115,
      },
      {
        materia: "INGENIERIA DE SOFTWARE",
        indicador: "Varones Regulares",
        anio: 2010,
        valor: 42,
      },
      {
        materia: "INGENIERIA DE SOFTWARE",
        indicador: "Mujeres Inscriptas",
        anio: 2010,
        valor: 14,
      },
      {
        materia: "INGENIERIA DE SOFTWARE",
        indicador: "Mujeres Regulares",
        anio: 2010,
        valor: 12,
      },
      {
        materia: "SISTEMAS Y ORGANIZACIONES",
        indicador: "Varones Recursantes",
        anio: 2010,
        valor: 66,
      },
      {
        materia: "SISTEMAS Y ORGANIZACIONES",
        indicador: "Mujeres Recursantes",
        anio: 2010,
        valor: 2,
      },
      {
        materia: "SISTEMAS Y ORGANIZACIONES",
        indicador: "Varones Recursantes",
        anio: 2011,
        valor: 65,
      },
      {
        materia: "SISTEMAS Y ORGANIZACIONES",
        indicador: "Mujeres Recursantes",
        anio: 2011,
        valor: 1,
      },
      {
        materia: "INGENIERIA DE SOFTWARE",
        indicador: "Varones Recursantes",
        anio: 2010,
        valor: 73,
      },
      {
        materia: "INGENIERIA DE SOFTWARE",
        indicador: "Mujeres Recursantes",
        anio: 2010,
        valor: 2,
      },
    ]);
  });

  it("no duplica recursantes si el Excel ya los trae", () => {
    const matrix = [
      [
        null,
        "INGENIERIA DE SOFTWARE",
        "Ano",
        "Varones Inscriptos",
        "Varones Regulares",
        "Varones Recursantes",
      ],
      [null, "INGENIERIA DE SOFTWARE", 2025, 45, 10, 30],
    ];

    const parsed = parseEstadisticasFromMatrix(matrix);

    expect(parsed.filter((row) => row.indicador === "Varones Recursantes")).toEqual([
      {
        materia: "INGENIERIA DE SOFTWARE",
        indicador: "Varones Recursantes",
        anio: 2025,
        valor: 30,
      },
    ]);
  });

  it("deriva cantidades a partir de porcentajes", () => {
    const matrix = [
      [],
      [null, "SISTEMAS Y ORGANIZACIONES", "Ano", "Varones Inscriptos", "% Varones Regulares (s/inscriptos)", "Mujeres Inscriptas", "% Mujeres Regulares (s/inscriptas)"],
      [null, "SISTEMAS Y ORGANIZACIONES", "2010", "100", "40", "50", "20"],
    ];

    const parsed = parseEstadisticasFromMatrix(matrix);

    // Should derive Varones Regulares count as 40 (40% of 100)
    expect(parsed.find((row) => row.indicador === "Varones Regulares")).toEqual({
      materia: "SISTEMAS Y ORGANIZACIONES",
      indicador: "Varones Regulares",
      anio: 2010,
      valor: 40,
    });

    // Should derive Mujeres Regulares count as 10 (20% of 50)
    expect(parsed.find((row) => row.indicador === "Mujeres Regulares")).toEqual({
      materia: "SISTEMAS Y ORGANIZACIONES",
      indicador: "Mujeres Regulares",
      anio: 2010,
      valor: 10,
    });

    // Should also derive Recursantes since we now have both Inscriptos and Regulares counts
    expect(parsed.find((row) => row.indicador === "Varones Recursantes")).toEqual({
      materia: "SISTEMAS Y ORGANIZACIONES",
      indicador: "Varones Recursantes",
      anio: 2010,
      valor: 60,
    });
  });

  it("devuelve vacio cuando no encuentra encabezados", () => {
    const matrix = [
      ["Materia", "Dato", "Valor"],
      ["Programacion I", "Varones", 10],
    ];

    expect(parseEstadisticasFromMatrix(matrix)).toEqual([]);
  });
});

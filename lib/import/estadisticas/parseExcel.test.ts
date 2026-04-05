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

  it("devuelve vacio cuando no encuentra encabezados", () => {
    const matrix = [
      ["Materia", "Dato", "Valor"],
      ["Programacion I", "Varones", 10],
    ];

    expect(parseEstadisticasFromMatrix(matrix)).toEqual([]);
  });
});

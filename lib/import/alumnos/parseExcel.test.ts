import { describe, expect, it } from "vitest";
import { parseAlumnosFromMatrix } from "./parseExcel";

describe("parseAlumnosFromMatrix", () => {
  it("parsea filas cuando encuentra encabezados validos", () => {
    const matrix = [
      ["Reporte de alumnos"],
      ["Nro Leg", "Nombres", "Apellidos"],
      [1001, "Lionel", "Messi"],
      [1002, "Julian", "Alvarez"],
    ];

    const result = parseAlumnosFromMatrix(matrix);

    expect(result).toEqual([
      { Legajo: "1001", Nombre: "Lionel", Apellido: "Messi" },
      { Legajo: "1002", Nombre: "Julian", Apellido: "Alvarez" },
    ]);
  });

  it("devuelve vacio cuando faltan encabezados requeridos", () => {
    const matrix = [
      ["Legajo", "Nombre", "Curso"],
      [1001, "Lionel", "1A"],
    ];

    const result = parseAlumnosFromMatrix(matrix);

    expect(result).toEqual([]);
  });
});


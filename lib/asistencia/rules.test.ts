import { describe, expect, it } from "vitest";
import {
  calcularPorcentajeAsistencia,
  getCondicionAsistencia,
} from "./rules";

describe("CP-12 - Registro de asistencia y cálculo de condición académica", () => {
  it("calcula el porcentaje de asistencia del alumno", () => {
    expect(calcularPorcentajeAsistencia(8, 10)).toBe(80);
  });

  it("determina condición regular cuando el alumno cumple el umbral de asistencia", () => {
    const resultado = getCondicionAsistencia({
      totalClases: 10,
      presentesEquivalentes: 8,
      umbralPorcentaje: 75,
      minClasesParaLibre: 4,
    });

    expect(resultado.estado).toBe("regular");
    expect(resultado.porcentaje).toBe(80);
  });

  it("determina condición en riesgo cuando el alumno no alcanza el umbral pero aún no queda libre", () => {
    const resultado = getCondicionAsistencia({
      totalClases: 3,
      presentesEquivalentes: 2,
      umbralPorcentaje: 75,
      minClasesParaLibre: 4,
    });

    expect(resultado.estado).toBe("en_riesgo");
    expect(resultado.porcentaje).toBe(67);
  });

  it("determina condición libre cuando el alumno supera las faltas permitidas", () => {
    const resultado = getCondicionAsistencia({
      totalClases: 10,
      presentesEquivalentes: 6,
      umbralPorcentaje: 75,
      minClasesParaLibre: 4,
    });

    expect(resultado.estado).toBe("libre");
    expect(resultado.porcentaje).toBe(60);
  });
});

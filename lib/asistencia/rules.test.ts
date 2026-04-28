import { describe, expect, it } from "vitest";
import {
  calcularPorcentajeAsistencia,
  getCondicionAsistencia,
} from "./rules";

describe("asistencia rules", () => {
  it("calcula porcentaje de asistencia redondeado", () => {
    expect(calcularPorcentajeAsistencia(7, 10)).toBe(70);
    expect(calcularPorcentajeAsistencia(2, 3)).toBe(67);
  });

  it("devuelve 0 si no hay clases registradas", () => {
    expect(calcularPorcentajeAsistencia(3, 0)).toBe(0);
    expect(
      getCondicionAsistencia({
        totalClases: 0,
        presentesEquivalentes: 0,
        umbralPorcentaje: 75,
        minClasesParaLibre: 4,
      })
    ).toEqual({
      porcentaje: 0,
      estado: "regular",
      faltasRestantes: 0,
      mensaje: "Sin clases registradas.",
    });
  });

  it("marca regular cuando cumple el umbral requerido", () => {
    const result = getCondicionAsistencia({
      totalClases: 10,
      presentesEquivalentes: 8,
      umbralPorcentaje: 75,
      minClasesParaLibre: 4,
    });

    expect(result.estado).toBe("regular");
    expect(result.porcentaje).toBe(80);
    expect(result.faltasRestantes).toBe(0);
  });

  it("marca en riesgo cuando no alcanza el umbral pero aun no queda libre", () => {
    const result = getCondicionAsistencia({
      totalClases: 3,
      presentesEquivalentes: 2,
      umbralPorcentaje: 75,
      minClasesParaLibre: 4,
    });

    expect(result.estado).toBe("en_riesgo");
    expect(result.porcentaje).toBe(67);
    expect(result.mensaje).toContain("En riesgo");
  });

  it("marca libre cuando supera las faltas permitidas con clases suficientes", () => {
    const result = getCondicionAsistencia({
      totalClases: 10,
      presentesEquivalentes: 6,
      umbralPorcentaje: 75,
      minClasesParaLibre: 4,
    });

    expect(result.estado).toBe("libre");
    expect(result.porcentaje).toBe(60);
    expect(result.faltasRestantes).toBeLessThan(0);
    expect(result.mensaje).toContain("Alumno libre por asistencia");
  });
});

import { describe, expect, it } from "vitest";
import {
  formatNota,
  getAlertaCalificacion,
  getHabilitacionRecuperatorio,
  isNotaEnRango,
} from "./rules";

describe("notas rules", () => {
  it("habilita recuperatorio si no hay nota previa", () => {
    const result = getHabilitacionRecuperatorio(null, false, "Parcial1");
    expect(result).toEqual({ habilitado: true, motivoBloqueo: null });
  });

  it("habilita recuperatorio si estuvo ausente", () => {
    const result = getHabilitacionRecuperatorio(null, true, "Parcial1");
    expect(result).toEqual({ habilitado: true, motivoBloqueo: null });
  });

  it("habilita recuperatorio si nota previa es menor a 4", () => {
    const result = getHabilitacionRecuperatorio(3.5, false, "Parcial1");
    expect(result).toEqual({ habilitado: true, motivoBloqueo: null });
  });

  it("bloquea recuperatorio si nota previa es 4 o mayor", () => {
    const result = getHabilitacionRecuperatorio(7, false, "Parcial1");
    expect(result.habilitado).toBe(false);
    expect(result.motivoBloqueo).toContain("No habilitado para recuperatorio");
  });

  it("valida rango de notas entre 1 y 10", () => {
    expect(isNotaEnRango(1)).toBe(true);
    expect(isNotaEnRango(10)).toBe(true);
    expect(isNotaEnRango(0.5)).toBe(false);
    expect(isNotaEnRango(11)).toBe(false);
  });

  it("formatea nota nullable para inputs", () => {
    expect(formatNota(null)).toBe("");
    expect(formatNota(8)).toBe("8");
    expect(formatNota(7.5)).toBe("7.5");
  });

  it("genera alerta de riesgo para parcial desaprobado", () => {
    expect(getAlertaCalificacion("Parcial", 3, false)).toEqual({
      estado: "en_riesgo",
      mensaje: "En riesgo de quedar libre",
    });
  });

  it("genera alerta de condicion libre para recuperatorio desaprobado", () => {
    expect(getAlertaCalificacion("Recuperatorio", 2, false)).toEqual({
      estado: "libre",
      mensaje: "Condición libre",
    });
  });

  it("no genera alerta cuando el alumno esta ausente o sin nota valida", () => {
    expect(getAlertaCalificacion("Parcial", 8, true)).toEqual({
      estado: null,
      mensaje: null,
    });
    expect(getAlertaCalificacion("Parcial", null, false)).toEqual({
      estado: null,
      mensaje: null,
    });
    expect(getAlertaCalificacion("Parcial", Number.NaN, false)).toEqual({
      estado: null,
      mensaje: null,
    });
  });

  it("no genera alerta para calificaciones aprobadas", () => {
    expect(getAlertaCalificacion("Parcial", 6, false)).toEqual({
      estado: null,
      mensaje: null,
    });
    expect(getAlertaCalificacion("Recuperatorio", 4, false)).toEqual({
      estado: null,
      mensaje: null,
    });
  });
});

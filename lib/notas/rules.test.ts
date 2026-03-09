import { describe, expect, it } from "vitest";
import {
  formatNota,
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
});

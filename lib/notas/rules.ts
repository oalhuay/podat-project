export type EvaluacionNombre = "Parcial1" | "Parcial2" | "Integrador";
export type TipoEvaluacion = "Parcial" | "Recuperatorio";

export type RecuperatorioEligibility = {
  habilitado: boolean;
  motivoBloqueo: string | null;
};

export const formatNota = (value: number | null): string => {
  if (value === null) return "";
  return Number.isInteger(value) ? String(value) : String(value);
};

export const isNotaEnRango = (value: number): boolean =>
  !Number.isNaN(value) && value >= 1 && value <= 10;

export const getHabilitacionRecuperatorio = (
  notaParcial: number | null,
  ausenteParcial: boolean,
  evaluacionNombre: EvaluacionNombre
): RecuperatorioEligibility => {
  if (notaParcial === null || ausenteParcial || notaParcial < 4) {
    return { habilitado: true, motivoBloqueo: null };
  }

  return {
    habilitado: false,
    motivoBloqueo: `No habilitado para recuperatorio de ${evaluacionNombre}. Nota previa: ${notaParcial}.`,
  };
};

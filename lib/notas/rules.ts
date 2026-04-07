export type EvaluacionNombre = "Parcial1" | "Parcial2" | "Integrador";
export type TipoEvaluacion = "Parcial" | "Recuperatorio";

export type RecuperatorioEligibility = {
  habilitado: boolean;
  motivoBloqueo: string | null;
};

export type AlertaCalificacionEstado = "en_riesgo" | "libre" | null;

export type AlertaCalificacion = {
  estado: AlertaCalificacionEstado;
  mensaje: string | null;
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

export const getAlertaCalificacion = (
  tipo: TipoEvaluacion,
  nota: number | null,
  ausente: boolean
): AlertaCalificacion => {
  if (ausente || nota === null || Number.isNaN(nota)) {
    return { estado: null, mensaje: null };
  }

  if (tipo === "Parcial" && nota < 4) {
    return { estado: "en_riesgo", mensaje: "En riesgo de quedar libre" };
  }

  if (tipo === "Recuperatorio" && nota < 4) {
    return { estado: "libre", mensaje: "Condición libre" };
  }

  return { estado: null, mensaje: null };
};

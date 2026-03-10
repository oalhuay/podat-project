export type EstadoAsistencia = "presente" | "ausente" | "justificado";

export type CondicionEstado = "regular" | "en_riesgo" | "libre";

export type CondicionAsistencia = {
  porcentaje: number;
  estado: CondicionEstado;
  faltasRestantes: number;
  mensaje: string;
};

export type CondicionParams = {
  totalClases: number;
  presentesEquivalentes: number;
  umbralPorcentaje: number;
  minClasesParaLibre: number;
};

export const calcularPorcentajeAsistencia = (
  presentesEquivalentes: number,
  totalClases: number
): number => {
  if (totalClases <= 0) return 0;
  return Math.round((presentesEquivalentes / totalClases) * 100);
};

export const getCondicionAsistencia = ({
  totalClases,
  presentesEquivalentes,
  umbralPorcentaje,
  minClasesParaLibre,
}: CondicionParams): CondicionAsistencia => {
  if (totalClases <= 0) {
    return {
      porcentaje: 0,
      estado: "regular",
      faltasRestantes: 0,
      mensaje: "Sin clases registradas.",
    };
  }

  const porcentaje = calcularPorcentajeAsistencia(presentesEquivalentes, totalClases);
  const minPresentes = Math.ceil((umbralPorcentaje / 100) * totalClases);
  const faltasMax = totalClases - minPresentes;
  const faltasUsadas = totalClases - presentesEquivalentes;
  const faltasRestantes = faltasMax - faltasUsadas;

  if (faltasRestantes < 0 && totalClases >= minClasesParaLibre) {
    return {
      porcentaje,
      estado: "libre",
      faltasRestantes,
      mensaje: `Alumno libre por asistencia. Porcentaje ${porcentaje}% (umbral ${umbralPorcentaje}%).`,
    };
  }

  if (porcentaje < umbralPorcentaje) {
    return {
      porcentaje,
      estado: "en_riesgo",
      faltasRestantes,
      mensaje: `En riesgo. Porcentaje ${porcentaje}%. Le quedan ${faltasRestantes} falta(s) antes de quedar libre.`,
    };
  }

  return {
    porcentaje,
    estado: "regular",
    faltasRestantes,
    mensaje: `Regular. Porcentaje ${porcentaje}% (umbral ${umbralPorcentaje}%).`,
  };
};

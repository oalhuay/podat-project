import type { CondicionAsistencia, EstadoAsistencia } from "@/lib/asistencia/rules";

export type ManualRow = {
  id: string;
  legajo: string;
  alumno: string;
  genero: string;
  condicion: string;
};

export type NotaAlumnoRow = {
  alumnoId: number;
  legajo: string;
  apellido: string;
  nombre: string;
  nota: string;
  ausente: boolean;
  alertaEstado: "en_riesgo" | "libre" | null;
  alertaMensaje: string | null;
  habilitado: boolean;
  motivoBloqueo: string | null;
};

export type AsistenciaAlumnoRow = {
  alumnoId: number;
  legajo: string;
  apellido: string;
  nombre: string;
  estado: EstadoAsistencia;
  condicion: CondicionAsistencia | null;
};

export type ActiveSection = "padron" | "notas" | "asistencias";

export type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

import {
  fetchAccessibleMaterias,
  fetchMateriaAssignments,
} from "@/lib/academicApi";
import type { Rol } from "@/types/database";

export type Materia = {
  id: number;
  nombre: string;
  codigo: string | null;
};

export type MateriaDocenteAssignment = {
  id: number;
  materia_id: number;
  user_id?: string;
  comision: string | null;
  materias?: Materia | Materia[] | null;
};

export const dedupeMaterias = (materias: Materia[]): Materia[] =>
  Array.from(new Map(materias.map((materia) => [materia.id, materia])).values());

export const extractMateriasFromAssignments = (
  assignments: MateriaDocenteAssignment[]
): Materia[] =>
  dedupeMaterias(
    assignments.flatMap(({ materias }) =>
      Array.isArray(materias) ? materias : materias ? [materias] : []
    )
  );

export const getAccessibleMaterias = async (
  userId: string | null,
  rol: Rol
): Promise<Materia[]> => {
  if (!userId || !rol) {
    return [];
  }

  return fetchAccessibleMaterias();
};

export const getMateriaAssignmentsForUser = async (
  userId: string
): Promise<MateriaDocenteAssignment[]> => {
  if (!userId) {
    return [];
  }

  return fetchMateriaAssignments();
};

import { supabase } from "@/lib/supabase";
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
  if (rol === "admin") {
    const { data, error } = await supabase
      .from("materias")
      .select("id, nombre, codigo")
      .order("nombre", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as Materia[];
  }

  if (!userId || rol !== "docente") {
    return [];
  }

  const { data, error } = await supabase
    .from("materias_docentes")
    .select("id, materia_id, user_id, comision, materias(id, nombre, codigo)")
    .eq("user_id", userId)
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  return extractMateriasFromAssignments((data ?? []) as MateriaDocenteAssignment[]);
};

export const getMateriaAssignmentsForUser = async (
  userId: string
): Promise<MateriaDocenteAssignment[]> => {
  const { data, error } = await supabase
    .from("materias_docentes")
    .select("id, materia_id, user_id, comision, materias(id, nombre, codigo)")
    .eq("user_id", userId)
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as MateriaDocenteAssignment[];
};

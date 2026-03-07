// Definimos los únicos roles que acepta nuestro sistema
export type Rol = 'admin' | 'docente' | null;

// Definimos cómo luce un Perfil en la base de datos
export interface Perfil {
  id: string;   // El ID que nos da Google
  rol: Rol;     // Si es admin o docente
}
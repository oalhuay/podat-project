export type Rol = "admin" | "docente" | null;

export interface Perfil {
  id: string;
  rol: Rol;
  correo?: string | null;
  last_login_at?: string | null;
}

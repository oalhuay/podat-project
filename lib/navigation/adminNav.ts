import type { Rol } from "@/types/database";

export type AdminNavItem = {
  href: string;
  label: string;
  description: string;
};

export const adminNavItems: AdminNavItem[] = [
  {
    href: "/admin/estadisticas/dashboard",
    label: "Dashboard",
    description: "Panel principal",
  },
  {
    href: "/admin/perfil",
    label: "Perfil",
    description: "Datos del usuario",
  },
  {
    href: "/admin/usuarios",
    label: "Gestion de usuarios",
    description: "Roles y accesos",
  },
  {
    href: "/admin/importar-archivo",
    label: "Importar",
    description: "Estadisticas e importacion",
  },
  {
    href: "/admin/alumnos",
    label: "Alumnos",
    description: "Alumnos, notas y asistencias",
  },
  {
    href: "/admin/materias",
    label: "Materias",
    description: "Catalogo y asignaciones",
  },
];

export const docenteNavItems: AdminNavItem[] = [
  {
    href: "/admin/estadisticas/dashboard",
    label: "Dashboard",
    description: "Vista principal de tus materias",
  },
  {
    href: "/admin/perfil",
    label: "Perfil",
    description: "Datos del usuario",
  },
  {
    href: "/admin/importar-archivo",
    label: "Importar",
    description: "Estadisticas de tus materias",
  },
  {
    href: "/admin/alumnos",
    label: "Alumnos",
    description: "Carga, notas y asistencias",
  },
  {
    href: "/admin/mis-materias",
    label: "Mis Materias",
    description: "Asignaciones vigentes",
  },
];

export function getAdminNavItems(role: Rol): AdminNavItem[] {
  return role === "docente" ? docenteNavItems : adminNavItems;
}

export function getPanelLabel(role: Rol) {
  return role === "docente" ? "Panel docente" : "Panel de gestion";
}

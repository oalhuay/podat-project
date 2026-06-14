"use client";

import { useEffect, useMemo, useState } from "react";
import { isAuthSessionMissingError } from "@/lib/auth/isAuthSessionMissingError";
import { supabase } from "@/lib/supabase";
import StatusBanner from "@/components/admin/StatusBanner";
import type { Rol } from "@/types/database";
import LoaderOverlay from "@/components/ui/LoaderOverlay";

type PerfilRow = {
  id: string;
  correo: string | null;
  rol: Rol;
  last_login_at: string | null;
};

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

const formatLastLogin = (value: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const rolLabel = (rol: Rol): string => (rol === null ? "Pendiente" : rol);

export default function GestionUsuariosPage() {
  const [perfiles, setPerfiles] = useState<PerfilRow[]>([]);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [adminCount, setAdminCount] = useState(0);

  const perfilesFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    if (!query) return perfiles;
    return perfiles.filter((p) => (p.correo ?? "").toLowerCase().includes(query));
  }, [busqueda, perfiles]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError && !isAuthSessionMissingError(userError)) {
        throw userError;
      }

      const userId = userData.user?.id ?? null;
      setCurrentUserId(userId);

      const { data, error } = await supabase
        .from("perfiles")
        .select("id, correo, rol, last_login_at")
        .order("last_login_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      const perfilesList = (data ?? []) as PerfilRow[];
      setPerfiles(perfilesList);

      const admins = perfilesList.filter((p) => p.rol === "admin").length;
      setAdminCount(admins);

      if (perfilesList.length === 0) {
        setStatusMessage({
          type: "info",
          text: "No hay usuarios registrados en perfiles.",
        });
      }
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `Error cargando usuarios: ${message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const updateRol = async (perfilId: string, nuevoRol: Rol) => {
    if (perfilId === currentUserId && adminCount <= 1 && nuevoRol !== "admin") {
      setStatusMessage({
        type: "error",
        text: "No puede quitarse el rol de administrador si es la única persona administradora.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc("set_user_role", {
        p_user_id: perfilId,
        p_new_role: nuevoRol ?? "pendiente",
      });

      if (error) throw error;

      setPerfiles((prev) =>
        prev.map((p) => (p.id === perfilId ? { ...p, rol: nuevoRol } : p))
      );

      const admins = perfiles.filter((p) =>
        p.id === perfilId ? nuevoRol === "admin" : p.rol === "admin"
      ).length;
      setAdminCount(admins);

      setStatusMessage({
        type: "success",
        text: "Rol actualizado correctamente.",
      });
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `Error actualizando rol: ${message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-5xl mx-auto bg-white p-8">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Gestión de Usuarios
        </h1>
        <p className="mt-2 font-medium text-slate-500">
          Administrá roles y accesos para docentes y administradores.
        </p>
      </header>

      {statusMessage && <StatusBanner message={statusMessage} />}

      <section className="mb-6">
        <label className="text-xs uppercase tracking-widest font-bold text-slate-400">
          Buscar por correo
        </label>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="correo@instituto.edu"
          aria-label="Buscar usuario por correo"
          className="mt-2 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-slate-900 outline-none transition-all focus:border-[#5D9AD4]"
        />
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-slate-200">
        <LoaderOverlay isLoading={isLoading} message="Actualizando..." className="rounded-3xl" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-900">
            <caption className="sr-only">
              Tabla de usuarios con correo, última conexión, rol actual y selector para cambiar
              rol.
            </caption>
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3 text-left">Correo</th>
                <th className="p-3 text-left">Última conexión</th>
                <th className="p-3 text-left">Rol actual</th>
                <th className="p-3 text-left">Cambiar rol</th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              {perfilesFiltrados.map((perfil) => (
                <tr key={perfil.id} className="border-t border-slate-100">
                  <td className="p-3">
                    <div className="font-medium">{perfil.correo ?? "—"}</div>
                    <div className="text-xs text-slate-400">{perfil.id}</div>
                  </td>
                  <td className="p-3">{formatLastLogin(perfil.last_login_at)}</td>
                  <td className="p-3 font-semibold">{rolLabel(perfil.rol)}</td>
                  <td className="p-3">
                    <select
                      value={perfil.rol ?? "pendiente"}
                      disabled={isLoading}
                      onChange={(e) => {
                        const value = e.target.value;
                        const newRol: Rol =
                          value === "admin" ? "admin" : value === "docente" ? "docente" : null;
                        void updateRol(perfil.id, newRol);
                      }}
                      aria-label={`Cambiar rol de ${perfil.correo ?? perfil.id}`}
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-900 outline-none focus:border-[#5D9AD4]"
                    >
                      <option value="docente">Docente</option>
                      <option value="admin">Administrador</option>
                      <option value="pendiente">Pendiente</option>
                    </select>
                  </td>
                </tr>
              ))}
              {perfilesFiltrados.length === 0 && (
                <tr>
                  <td className="p-4 text-slate-400" colSpan={4}>
                    {isLoading ? "Cargando usuarios..." : "No hay usuarios para mostrar."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

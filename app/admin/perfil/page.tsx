"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import StatusBanner from "@/components/admin/StatusBanner";
import type { Rol } from "@/types/database";

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

type Materia = {
  id: number;
  nombre: string;
  codigo: string | null;
};

type MateriaDocente = {
  id: number;
  materia_id: number;
  comision: string | null;
  materias?: Materia | Materia[] | null;
};

type EditableProfile = {
  displayName: string;
  phone: string;
  department: string;
  bio: string;
  declaredSubjects: string;
};

export default function PerfilPage() {
  const { user } = useAuth();
  const [rolActual, setRolActual] = useState<Rol>(null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [assignedSubjects, setAssignedSubjects] = useState<Materia[]>([]);
  const [profileForm, setProfileForm] = useState<EditableProfile>({
    displayName: "",
    phone: "",
    department: "",
    bio: "",
    declaredSubjects: "",
  });

  const profileName = useMemo<string>(() => {
    const metadata = user?.user_metadata;
    return (
      metadata?.display_name ??
      metadata?.full_name ??
      metadata?.name ??
      user?.email?.split("@")[0] ??
      "Usuario"
    );
  }, [user]);

  const profileEmail = user?.email ?? "Sin correo";
  const profileAvatar: string | null =
    user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null;
  const profileInitials = profileName
    .split(" ")
    .filter((word): word is string => Boolean(word))
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  useEffect(() => {
    const metadata = user?.user_metadata;
    const declaredSubjects = Array.isArray(metadata?.declared_subjects)
      ? metadata.declared_subjects.filter(
          (subject): subject is string => typeof subject === "string"
        )
      : [];

    setProfileForm({
      displayName: String(metadata?.display_name ?? metadata?.full_name ?? metadata?.name ?? ""),
      phone: String(metadata?.phone ?? ""),
      department: String(metadata?.department ?? ""),
      bio: String(metadata?.bio ?? ""),
      declaredSubjects: declaredSubjects.join(", "),
    });
  }, [user?.user_metadata]);

  useEffect(() => {
    const loadProfileData = async () => {
      const userId = user?.id;
      if (!userId) {
        setStatusMessage({
          type: "info",
          text: "Inicia sesión para ver la información de perfil.",
        });
        return;
      }

      const { data, error } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        setStatusMessage({
          type: "error",
          text: `No se pudo cargar el rol: ${error.message}`,
        });
        return;
      }

      setRolActual((data?.rol as Rol) ?? null);

      const { data: assignedData, error: assignedError } = await supabase
        .from("materias_docentes")
        .select("id, materia_id, comision, materias(id, nombre, codigo)")
        .eq("user_id", userId);

      if (assignedError) {
        setStatusMessage({
          type: "error",
          text: `No se pudieron cargar las materias asignadas: ${assignedError.message}`,
        });
        return;
      }

      const materiasList = ((assignedData ?? []) as MateriaDocente[]).flatMap(({ materias }) =>
        Array.isArray(materias) ? materias : materias ? [materias] : []
      );
      const uniqueMaterias = Array.from(
        new Map(materiasList.map((materia) => [materia.id, materia])).values()
      );
      setAssignedSubjects(uniqueMaterias);
    };

    void loadProfileData();
  }, [user?.id]);

  const shortcuts =
    rolActual === "docente"
      ? [
          { href: "/admin/mis-materias", label: "Mis materias" },
          { href: "/admin/notas", label: "Notas" },
          { href: "/admin/asistencias", label: "Asistencias" },
        ]
      : [
          { href: "/admin/estadisticas/dashboard", label: "Dashboard" },
          { href: "/admin/usuarios", label: "Gestión de usuarios" },
          { href: "/admin/materias", label: "Materias" },
        ];

  const declaredSubjectsList = profileForm.declaredSubjects
    .split(",")
    .map((subject) => subject.trim())
    .filter(Boolean);

  const handleChange =
    (field: keyof EditableProfile) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setProfileForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const nextMetadata = {
        ...user.user_metadata,
        display_name: profileForm.displayName.trim(),
        phone: profileForm.phone.trim(),
        department: profileForm.department.trim(),
        bio: profileForm.bio.trim(),
        declared_subjects: declaredSubjectsList,
      };

      const { error } = await supabase.auth.updateUser({
        data: nextMetadata,
      });

      if (error) throw error;

      setStatusMessage({
        type: "success",
        text: "Perfil actualizado correctamente.",
      });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Error desconocido";
      setStatusMessage({
        type: "error",
        text: `No se pudo actualizar el perfil: ${message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">
          Perfil
        </h1>
        <p className="mt-2 text-slate-500">
          Resumen de la cuenta autenticada y accesos de trabajo.
        </p>
      </header>

      {statusMessage && <StatusBanner message={statusMessage} />}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {profileAvatar ? (
              // Google avatars are remote and not configured in next/image.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileAvatar}
                alt={profileName}
                className="h-24 w-24 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#5D9AD4] text-3xl font-black text-white">
                {profileInitials || "U"}
              </div>
            )}

            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
                Usuario autenticado
              </div>
              <div className="mt-2 truncate text-3xl font-black text-slate-900">
                {profileName}
              </div>
              <div className="mt-1 truncate text-sm text-slate-600">
                {profileEmail}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Rol activo
              </div>
              <div className="mt-2 text-xl font-black capitalize text-slate-900">
                {rolActual ?? "Pendiente"}
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Identificador
              </div>
              <div className="mt-2 break-all text-sm font-semibold text-slate-700">
                {user?.id ?? "Sin sesión activa"}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Teléfono
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-700">
                {String(user?.user_metadata?.phone ?? "Pendiente")}
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Área o departamento
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-700">
                {String(user?.user_metadata?.department ?? "Pendiente")}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
            Accesos rápidos
          </div>
          <div className="mt-4 space-y-3">
            {shortcuts.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-3xl border border-slate-200 px-4 py-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
            Completar perfil
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Nombre visible
              </label>
              <input
                type="text"
                value={profileForm.displayName}
                onChange={handleChange("displayName")}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-[#5D9AD4]"
                placeholder="Cómo quieres aparecer en el sistema"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Teléfono
              </label>
              <input
                type="text"
                value={profileForm.phone}
                onChange={handleChange("phone")}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-[#5D9AD4]"
                placeholder="+54..."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Área o departamento
              </label>
              <input
                type="text"
                value={profileForm.department}
                onChange={handleChange("department")}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-[#5D9AD4]"
                placeholder="Ej. Ciencias Básicas, Programación, Sistemas"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Sobre tu perfil docente
              </label>
              <textarea
                value={profileForm.bio}
                onChange={handleChange("bio")}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-[#5D9AD4]"
                placeholder="Cuéntanos brevemente tu experiencia, orientación o funciones."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Materias que dictas
              </label>
              <textarea
                value={profileForm.declaredSubjects}
                onChange={handleChange("declaredSubjects")}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-[#5D9AD4]"
                placeholder="Separa las materias por coma. Ej. Programación I, Base de Datos, Matemática"
              />
              <p className="text-xs text-slate-500">
                Esta declaración complementa tu perfil. Las asignaciones oficiales siguen siendo administradas por el área administrativa.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => void handleSaveProfile()}
              disabled={isSaving}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800 disabled:opacity-70"
            >
              {isSaving ? "GUARDANDO..." : "GUARDAR PERFIL"}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
              Materias asignadas oficialmente
            </div>
            <div className="mt-4 space-y-3">
              {assignedSubjects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Todavía no tienes materias asignadas por administración.
                </div>
              ) : (
                assignedSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                      {subject.codigo ?? "Sin código"}
                    </div>
                    <div className="mt-2 text-base font-black text-slate-900">
                      {subject.nombre}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
              Materias declaradas en tu perfil
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {declaredSubjectsList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Aún no agregaste materias en tu perfil.
                </div>
              ) : (
                declaredSubjectsList.map((subject) => (
                  <span
                    key={subject}
                    className="inline-flex rounded-full bg-[#5D9AD4]/10 px-3 py-2 text-sm font-semibold text-[#3d73a7]"
                  >
                    {subject}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

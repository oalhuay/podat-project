"use client";

import Link from "next/link";

const cards = [
  {
    title: "Importar archivo",
    description: "Carga planillas Excel y previsualiza cambios antes de guardar.",
    href: "/admin/importar",
  },
  {
    title: "Dashboard estadistico",
    description: "Cruza la informacion academica con la vista principal del sistema.",
    href: "/admin/estadisticas/dashboard",
  },
  {
    title: "Materias",
    description: "Revisa catalogo, codigos y asignaciones asociadas a docentes.",
    href: "/admin/materias",
  },
];

export default function AlumnosPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">
          Alumnos
        </h1>
        <p className="mt-2 text-slate-500">
          Punto de entrada para las tareas operativas vinculadas al padron y su carga.
        </p>
      </header>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
          Estado del modulo
        </div>
        <p className="mt-4 max-w-3xl text-slate-700">
          El proyecto ya cuenta con la importacion masiva desde Excel. Esta pantalla
          queda preparada como acceso especifico para alumnos, evitando mezclar esa
          operacion con otros modulos administrativos.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <div className="text-lg font-black text-slate-900">{card.title}</div>
            <p className="mt-2 text-sm text-slate-500">{card.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}

-- Corrige RLS para que admin/docente puedan leer evaluaciones y notas
-- de las materias a las que ya tienen acceso.

drop policy if exists evaluaciones_select_admin_docente on public.evaluaciones;
create policy evaluaciones_select_admin_docente
on public.evaluaciones
for select
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    left join public.materias_docentes md
      on md.materia_id = evaluaciones.materia_id
     and md.user_id = auth.uid()
    where p.id = auth.uid()
      and (p.rol = 'admin' or (p.rol = 'docente' and md.id is not null))
  )
);

drop policy if exists notas_select_admin_docente on public.notas;
create policy notas_select_admin_docente
on public.notas
for select
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    join public.evaluaciones e on e.id = notas.evaluacion_id
    left join public.materias_docentes md
      on md.materia_id = e.materia_id
     and md.user_id = auth.uid()
    where p.id = auth.uid()
      and (p.rol = 'admin' or (p.rol = 'docente' and md.id is not null))
  )
);

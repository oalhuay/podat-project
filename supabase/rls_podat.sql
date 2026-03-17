-- RLS para materias, materias_docentes y estadisticas

alter table if exists public.materias enable row level security;
alter table if exists public.materias_docentes enable row level security;
alter table if exists public.estadisticas enable row level security;

-- Admin full access
create policy if not exists materias_admin_all
  on public.materias
  for all
  using (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin'))
  with check (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin'));

create policy if not exists materias_docentes_admin_all
  on public.materias_docentes
  for all
  using (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin'))
  with check (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin'));

create policy if not exists estadisticas_admin_all
  on public.estadisticas
  for all
  using (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin'))
  with check (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin'));

-- Docentes: leer materias asignadas
create policy if not exists materias_docente_select
  on public.materias
  for select
  using (
    exists (
      select 1
      from public.materias_docentes md
      where md.materia_id = materias.id
        and md.user_id = auth.uid()
    )
  );

-- Docentes: ver sus asignaciones
create policy if not exists materias_docentes_self_select
  on public.materias_docentes
  for select
  using (user_id = auth.uid());

-- Docentes: gestionar estadísticas solo de sus materias
create policy if not exists estadisticas_docente_select
  on public.estadisticas
  for select
  using (
    exists (
      select 1
      from public.materias_docentes md
      where md.materia_id = estadisticas.materia_id
        and md.user_id = auth.uid()
    )
  );

create policy if not exists estadisticas_docente_insert
  on public.estadisticas
  for insert
  with check (
    exists (
      select 1
      from public.materias_docentes md
      where md.materia_id = estadisticas.materia_id
        and md.user_id = auth.uid()
    )
  );

create policy if not exists estadisticas_docente_update
  on public.estadisticas
  for update
  using (
    exists (
      select 1
      from public.materias_docentes md
      where md.materia_id = estadisticas.materia_id
        and md.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.materias_docentes md
      where md.materia_id = estadisticas.materia_id
        and md.user_id = auth.uid()
    )
  );

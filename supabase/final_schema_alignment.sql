begin;

-- =========================================================
-- ALINEACION FINAL RECOMENDADA PARA PODAT
-- - alumnos guarda datos base del alumno
-- - alumno_materia_anio guarda la relacion academica por materia y anio
-- - evaluaciones/clases trabajan por materia_id + anio
-- =========================================================

-- 0) genero en alumnos
alter table public.alumnos
  add column if not exists genero text null;

-- 1) tabla pivote nueva alumno <-> materia <-> anio
create table if not exists public.alumno_materia_anio (
  id bigserial primary key,
  alumno_id bigint not null references public.alumnos(id) on delete cascade,
  materia_id bigint not null references public.materias(id) on delete cascade,
  anio integer not null check (anio >= 2000 and anio <= 2100),
  condicion text null check (condicion is null or condicion in ('Regular', 'Libre')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (alumno_id, materia_id, anio)
);

create index if not exists idx_alumno_materia_anio_materia_anio
  on public.alumno_materia_anio (materia_id, anio);

create index if not exists idx_alumno_materia_anio_alumno
  on public.alumno_materia_anio (alumno_id);

drop trigger if exists trg_alumno_materia_anio_updated_at on public.alumno_materia_anio;
create trigger trg_alumno_materia_anio_updated_at
before update on public.alumno_materia_anio
for each row
execute function public.set_updated_at();

-- 2) migrar datos del modelo viejo si todavia existe
insert into public.alumno_materia_anio (alumno_id, materia_id, anio)
select ac.alumno_id, c.materia_id, c.anio
from public.alumno_comision ac
join public.comisiones c on c.id = ac.comision_id
on conflict (alumno_id, materia_id, anio) do nothing;

-- 3) agregar columnas nuevas a evaluaciones y clases
alter table public.evaluaciones add column if not exists materia_id bigint;
alter table public.evaluaciones add column if not exists anio integer;
alter table public.clases add column if not exists materia_id bigint;
alter table public.clases add column if not exists anio integer;

update public.evaluaciones e
set materia_id = c.materia_id,
    anio = c.anio
from public.comisiones c
where e.comision_id = c.id
  and (e.materia_id is null or e.anio is null);

update public.clases cl
set materia_id = c.materia_id,
    anio = c.anio
from public.comisiones c
where cl.comision_id = c.id
  and (cl.materia_id is null or cl.anio is null);

alter table public.evaluaciones
  alter column materia_id set not null,
  alter column anio set not null;

alter table public.clases
  alter column materia_id set not null,
  alter column anio set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evaluaciones_materia_fk'
  ) then
    alter table public.evaluaciones
      add constraint evaluaciones_materia_fk
      foreign key (materia_id) references public.materias(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'clases_materia_fk'
  ) then
    alter table public.clases
      add constraint clases_materia_fk
      foreign key (materia_id) references public.materias(id) on delete cascade;
  end if;
end $$;

drop index if exists idx_evaluaciones_comision_nombre_tipo;
create unique index if not exists ux_evaluaciones_materia_anio_nombre_tipo
  on public.evaluaciones (materia_id, anio, nombre, tipo);

create unique index if not exists ux_clases_materia_anio_fecha
  on public.clases (materia_id, anio, fecha);

-- 4) trigger de notas alineado al modelo nuevo
drop trigger if exists trg_notas_validar_alumno_comision on public.notas;
drop trigger if exists trg_notas_validar_alumno_materia_anio on public.notas;
drop function if exists public.validar_alumno_en_comision_de_evaluacion();
drop function if exists public.validar_alumno_en_materia_anio_de_evaluacion();

create function public.validar_alumno_en_materia_anio_de_evaluacion()
returns trigger
language plpgsql
as $$
declare
  v_materia_id bigint;
  v_anio integer;
begin
  select e.materia_id, e.anio
    into v_materia_id, v_anio
  from public.evaluaciones e
  where e.id = new.evaluacion_id;

  if v_materia_id is null or v_anio is null then
    raise exception 'Evaluacion inexistente o sin materia/anio: %', new.evaluacion_id;
  end if;

  if not exists (
    select 1
    from public.alumno_materia_anio ama
    where ama.alumno_id = new.alumno_id
      and ama.materia_id = v_materia_id
      and ama.anio = v_anio
  ) then
    raise exception 'El alumno % no pertenece a materia % anio % de la evaluacion %',
      new.alumno_id, v_materia_id, v_anio, new.evaluacion_id;
  end if;

  return new;
end;
$$;

create trigger trg_notas_validar_alumno_materia_anio
before insert or update on public.notas
for each row
execute function public.validar_alumno_en_materia_anio_de_evaluacion();

-- 5) RLS del modelo nuevo
alter table public.alumno_materia_anio enable row level security;
alter table public.evaluaciones enable row level security;
alter table public.clases enable row level security;
alter table public.asistencias enable row level security;

drop policy if exists alumno_materia_anio_select_authenticated on public.alumno_materia_anio;
drop policy if exists alumno_materia_anio_insert_admin_docente on public.alumno_materia_anio;
drop policy if exists alumno_materia_anio_update_admin_docente on public.alumno_materia_anio;
drop policy if exists alumno_materia_anio_delete_admin_docente on public.alumno_materia_anio;

create policy alumno_materia_anio_select_authenticated
on public.alumno_materia_anio
for select
to authenticated
using (true);

create policy alumno_materia_anio_insert_admin_docente
on public.alumno_materia_anio
for insert
to authenticated
with check (
  exists (
    select 1
    from public.perfiles p
    left join public.materias_docentes md
      on md.materia_id = alumno_materia_anio.materia_id
     and md.user_id = auth.uid()
    where p.id = auth.uid()
      and (p.rol = 'admin' or (p.rol = 'docente' and md.id is not null))
  )
);

create policy alumno_materia_anio_update_admin_docente
on public.alumno_materia_anio
for update
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    left join public.materias_docentes md
      on md.materia_id = alumno_materia_anio.materia_id
     and md.user_id = auth.uid()
    where p.id = auth.uid()
      and (p.rol = 'admin' or (p.rol = 'docente' and md.id is not null))
  )
)
with check (
  exists (
    select 1
    from public.perfiles p
    left join public.materias_docentes md
      on md.materia_id = alumno_materia_anio.materia_id
     and md.user_id = auth.uid()
    where p.id = auth.uid()
      and (p.rol = 'admin' or (p.rol = 'docente' and md.id is not null))
  )
);

create policy alumno_materia_anio_delete_admin_docente
on public.alumno_materia_anio
for delete
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    left join public.materias_docentes md
      on md.materia_id = alumno_materia_anio.materia_id
     and md.user_id = auth.uid()
    where p.id = auth.uid()
      and (p.rol = 'admin' or (p.rol = 'docente' and md.id is not null))
  )
);

drop policy if exists evaluaciones_insert_admin_docente on public.evaluaciones;
drop policy if exists evaluaciones_update_admin_docente on public.evaluaciones;
drop policy if exists evaluaciones_delete_admin_docente on public.evaluaciones;
drop policy if exists clases_select_admin_docente on public.clases;
drop policy if exists clases_insert_admin_docente on public.clases;
drop policy if exists clases_update_admin_docente on public.clases;
drop policy if exists clases_delete_admin_docente on public.clases;
drop policy if exists asistencias_select_admin_docente on public.asistencias;
drop policy if exists asistencias_insert_admin_docente on public.asistencias;
drop policy if exists asistencias_update_admin_docente on public.asistencias;
drop policy if exists asistencias_delete_admin_docente on public.asistencias;
drop policy if exists notas_insert_admin_docente on public.notas;
drop policy if exists notas_update_admin_docente on public.notas;
drop policy if exists notas_delete_admin_docente on public.notas;

create policy evaluaciones_insert_admin_docente
on public.evaluaciones
for insert
to authenticated
with check (
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

create policy evaluaciones_update_admin_docente
on public.evaluaciones
for update
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
)
with check (
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

create policy evaluaciones_delete_admin_docente
on public.evaluaciones
for delete
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

create policy notas_insert_admin_docente
on public.notas
for insert
to authenticated
with check (
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

create policy notas_update_admin_docente
on public.notas
for update
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
)
with check (
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

create policy notas_delete_admin_docente
on public.notas
for delete
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

create policy clases_select_admin_docente
on public.clases
for select
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    left join public.materias_docentes md
      on md.materia_id = clases.materia_id
     and md.user_id = auth.uid()
    where p.id = auth.uid()
      and (p.rol = 'admin' or (p.rol = 'docente' and md.id is not null))
  )
);

create policy clases_insert_admin_docente
on public.clases
for insert
to authenticated
with check (
  exists (
    select 1
    from public.perfiles p
    left join public.materias_docentes md
      on md.materia_id = clases.materia_id
     and md.user_id = auth.uid()
    where p.id = auth.uid()
      and (p.rol = 'admin' or (p.rol = 'docente' and md.id is not null))
  )
);

create policy clases_update_admin_docente
on public.clases
for update
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    left join public.materias_docentes md
      on md.materia_id = clases.materia_id
     and md.user_id = auth.uid()
    where p.id = auth.uid()
      and (p.rol = 'admin' or (p.rol = 'docente' and md.id is not null))
  )
)
with check (
  exists (
    select 1
    from public.perfiles p
    left join public.materias_docentes md
      on md.materia_id = clases.materia_id
     and md.user_id = auth.uid()
    where p.id = auth.uid()
      and (p.rol = 'admin' or (p.rol = 'docente' and md.id is not null))
  )
);

create policy clases_delete_admin_docente
on public.clases
for delete
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    left join public.materias_docentes md
      on md.materia_id = clases.materia_id
     and md.user_id = auth.uid()
    where p.id = auth.uid()
      and (p.rol = 'admin' or (p.rol = 'docente' and md.id is not null))
  )
);

create policy asistencias_select_admin_docente
on public.asistencias
for select
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    join public.clases cl on cl.id = asistencias.clase_id
    left join public.materias_docentes md
      on md.materia_id = cl.materia_id
     and md.user_id = auth.uid()
    where p.id = auth.uid()
      and (p.rol = 'admin' or (p.rol = 'docente' and md.id is not null))
  )
);

create policy asistencias_insert_admin_docente
on public.asistencias
for insert
to authenticated
with check (
  exists (
    select 1
    from public.perfiles p
    join public.clases cl on cl.id = asistencias.clase_id
    left join public.materias_docentes md
      on md.materia_id = cl.materia_id
     and md.user_id = auth.uid()
    where p.id = auth.uid()
      and (p.rol = 'admin' or (p.rol = 'docente' and md.id is not null))
  )
);

create policy asistencias_update_admin_docente
on public.asistencias
for update
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    join public.clases cl on cl.id = asistencias.clase_id
    left join public.materias_docentes md
      on md.materia_id = cl.materia_id
     and md.user_id = auth.uid()
    where p.id = auth.uid()
      and (p.rol = 'admin' or (p.rol = 'docente' and md.id is not null))
  )
)
with check (
  exists (
    select 1
    from public.perfiles p
    join public.clases cl on cl.id = asistencias.clase_id
    left join public.materias_docentes md
      on md.materia_id = cl.materia_id
     and md.user_id = auth.uid()
    where p.id = auth.uid()
      and (p.rol = 'admin' or (p.rol = 'docente' and md.id is not null))
  )
);

create policy asistencias_delete_admin_docente
on public.asistencias
for delete
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    join public.clases cl on cl.id = asistencias.clase_id
    left join public.materias_docentes md
      on md.materia_id = cl.materia_id
     and md.user_id = auth.uid()
    where p.id = auth.uid()
      and (p.rol = 'admin' or (p.rol = 'docente' and md.id is not null))
  )
);

commit;

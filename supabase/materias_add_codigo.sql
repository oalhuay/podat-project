-- Agrega campo codigo a materias (opcional)
alter table if exists public.materias
  add column if not exists codigo text;

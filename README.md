# PODAT

Plataforma académica construida con Next.js y Supabase para gestionar usuarios, materias, alumnos, notas, asistencias e importación de estadísticas desde Excel.

## Stack

- Next.js 16 con App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth + Postgres + RLS
- ExcelJS para lectura de archivos `.xlsx`
- Chart.js + react-chartjs-2 para dashboards
- Vitest para tests unitarios

## Módulos principales

- Inicio y autenticación con Google por rol (`admin` o `docente`)
- Panel administrativo con navegación lateral y tema visual
- Gestión de usuarios y cambio de roles
- Gestión de materias y asignación a docentes
- Importación de padrón de alumnos desde Excel o carga manual
- Carga de notas con reglas para parcial y recuperatorio
- Carga de asistencias con cálculo de condición académica
- Importación y visualización de estadísticas académicas
- Dashboard gráfico por materia e indicador

## Estructura relevante

- `app/`: rutas y páginas de la aplicación
- `components/`: UI reutilizable
- `lib/`: reglas de negocio, helpers de datos e importadores
- `supabase/`: scripts SQL de apoyo para tablas, RLS y cambios de esquema
- `types/`: tipos compartidos

## Variables de entorno

Crea un archivo `.env.local` con:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

La app usa esas variables tanto en cliente como en callback de autenticación.

## Puesta en marcha

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
```

## Base de datos y SQL

Los archivos dentro de `supabase/` documentan parte de la evolución del esquema y políticas:

- `rls_podat.sql`
- `estadisticas.sql`
- `materias_docentes.sql`
- `materias_add_codigo.sql`
- `remove_comisiones_model.sql`

Conviene revisar y consolidar estos scripts antes de desplegar en un entorno nuevo.

## Estado actual del proyecto

La app ya incluye:

- auth centralizada en cliente
- control de acceso por rol para rutas `/admin`
- helpers compartidos para resolver materias accesibles según rol
- tests para importación de alumnos, parseo de Excel y reglas de notas

## Recomendaciones siguientes

- Consolidar migraciones SQL en una historia única y reproducible
- Seguir partiendo páginas grandes como `app/admin/alumnos/page.tsx`
- Agregar tests para flujos de páginas y acceso a datos
- Tipar con más precisión la respuesta real de Supabase

# Arquitectura de Software - PODAT

## 1. Objetivo

PODAT es una plataforma academica web para gestionar:

- autenticacion y perfiles por rol
- materias y asignaciones docentes
- padron de alumnos por materia y ano
- carga de notas
- carga de asistencias
- importacion de estadisticas academicas desde Excel
- dashboards y visualizacion de indicadores

La arquitectura actual esta basada en una aplicacion web monolitica de frontend y backend apoyada en Supabase como BaaS.

## 2. Estilo Arquitectonico

La solucion implementa una arquitectura web por capas, con estos bloques principales:

- Capa de presentacion: Next.js App Router, componentes React, hooks y vistas de panel.
- Capa de logica de negocio: reglas en `lib/`, hooks de workflows, parseadores e importadores.
- Capa de acceso a datos: cliente Supabase desde frontend y callback servidor.
- Capa de persistencia: PostgreSQL en Supabase con tablas, relaciones y RLS.

Patrones que se observan en el sistema:

- SPA/SSR hibrido con Next.js
- BFF liviano para auth callback y proxy
- logica de negocio encapsulada en hooks y modulos `lib/*`
- integracion BaaS con Supabase

## 3. Stack Tecnologico

- Frontend: Next.js 16, React 19, TypeScript
- UI: Tailwind CSS 4
- Auth y DB: Supabase Auth + PostgreSQL
- Importacion Excel: ExcelJS
- Graficos: Chart.js + react-chartjs-2
- Testing: Vitest

## 4. Diagrama de Contexto

```mermaid
flowchart LR
    U[Usuario\nAdmin o Docente]
    G[Google OAuth]
    P[PODAT\nAplicacion Next.js]
    S[Supabase\nAuth + Postgres + RLS]
    X[Archivos Excel\nAlumnos / Materias / Estadisticas]

    U --> P
    U --> G
    G --> P
    P <--> S
    U --> X
    X --> P
```

## 5. Diagrama de Contenedores

```mermaid
flowchart TB
    subgraph Cliente
        B[Navegador]
    end

    subgraph Aplicacion PODAT
        A1[Next.js App Router\nPaginas y layouts]
        A2[React Components\nUI del panel]
        A3[Hooks y Workflows\nuseAuth, useNotas,\nuseAsistencias,\nuseEstadisticasImport]
        A4[Lib de negocio\nrules, parseExcel,\nimportadores, catalogos]
        A5[Proxy/Auth Callback\ncontrol de acceso]
    end

    subgraph Supabase
        S1[Supabase Auth]
        S2[PostgreSQL]
        S3[RLS Policies]
    end

    B --> A1
    A1 --> A2
    A2 --> A3
    A3 --> A4
    A3 <--> S1
    A3 <--> S2
    A5 <--> S1
    A5 <--> S2
    S2 --> S3
```

## 6. Diagrama de Componentes Logicos

```mermaid
flowchart LR
    subgraph Presentacion
        Home[Landing / Login]
        AdminLayout[Admin Layout + Sidebar]
        Perfil[Perfil]
        Usuarios[Usuarios]
        Materias[Materias]
        Alumnos[Alumnos Workspace]
        Notas[Notas]
        Asistencias[Asistencias]
        Estadisticas[Estadisticas]
        Dashboard[Dashboard Estadistico]
    end

    subgraph Aplicacion
        AuthHook[useAuth]
        MateriasLib[getAccessibleMaterias]
        NotasRules[lib/notas/rules]
        AsistenciaRules[lib/asistencia/rules]
        AlumnosImport[importAlumnos + parseExcel]
        EstadisticasImport[useEstadisticasImport + workflow]
        EstadisticasCatalog[estadisticas/catalog]
    end

    subgraph Persistencia
        SupabaseClient[Supabase Client]
        DB[(PostgreSQL)]
    end

    Home --> AuthHook
    AdminLayout --> AuthHook
    Usuarios --> SupabaseClient
    Materias --> SupabaseClient
    Alumnos --> MateriasLib
    Alumnos --> AlumnosImport
    Alumnos --> NotasRules
    Alumnos --> AsistenciaRules
    Notas --> NotasRules
    Asistencias --> AsistenciaRules
    Estadisticas --> EstadisticasImport
    Estadisticas --> EstadisticasCatalog
    Dashboard --> EstadisticasCatalog

    AuthHook --> SupabaseClient
    MateriasLib --> SupabaseClient
    AlumnosImport --> SupabaseClient
    EstadisticasImport --> SupabaseClient
    SupabaseClient --> DB
```

## 7. Diagrama de Despliegue

```mermaid
flowchart LR
    C[Cliente Web\nBrowser]
    N[Servidor Next.js\nVercel o Node]
    SB[Supabase Cloud]
    DB[(PostgreSQL)]
    AU[Supabase Auth]
    O[Google OAuth]

    C <--> N
    N <--> SB
    SB --> DB
    SB --> AU
    O <--> AU
```

## 8. Diagrama de Secuencia - Autenticacion

```mermaid
sequenceDiagram
    participant U as Usuario
    participant UI as Landing PODAT
    participant G as Google OAuth
    participant CB as /auth/callback
    participant SA as Supabase Auth
    participant DB as PostgreSQL

    U->>UI: Elige rol e inicia sesion
    UI->>SA: signInWithOAuth(provider=google)
    SA->>G: Redireccion OAuth
    G-->>CB: code + retorno
    CB->>SA: exchangeCodeForSession(code)
    SA-->>CB: session
    CB->>DB: upsert perfil con rol
    CB-->>UI: redirect /
    UI->>SA: getUser / onAuthStateChange
    UI->>DB: consulta perfil
    UI-->>U: acceso al panel segun rol
```

## 9. Diagrama de Secuencia - Importacion de Alumnos

```mermaid
sequenceDiagram
    participant U as Usuario
    participant UI as Alumnos Workspace
    participant PX as parseExcel
    participant IMP as importAlumnos
    participant SB as Supabase
    participant DB as PostgreSQL

    U->>UI: Sube archivo .xlsx
    UI->>PX: parseAlumnosFromFile(file)
    PX-->>UI: filas parseadas
    UI->>IMP: prepararImportAlumnos(filas)
    IMP->>SB: consulta alumnos existentes
    SB->>DB: select alumnos
    DB-->>SB: datos existentes
    SB-->>IMP: respuesta
    IMP-->>UI: preview + resumen
    U->>UI: Confirmar importacion
    UI->>IMP: ejecutarImportPlan()
    IMP->>SB: insert/upsert alumnos
    UI->>SB: upsert alumno_materia_anio
    SB->>DB: persistencia final
    UI-->>U: resultado de importacion
```

## 10. Diagrama de Secuencia - Importacion de Estadisticas

```mermaid
sequenceDiagram
    participant U as Usuario
    participant UI as Pantalla Estadisticas
    participant PE as parseEstadisticasFromFile
    participant WF as useEstadisticasImport/workflow
    participant SB as Supabase
    participant DB as PostgreSQL

    U->>UI: Sube archivo .xlsx
    UI->>PE: parseEstadisticasFromFile(file)
    PE-->>UI: filas parseadas
    UI->>WF: build preview rows
    WF->>SB: consulta estadisticas actuales
    SB->>DB: select materia_id, anio, indicador, valor
    DB-->>SB: datos existentes
    SB-->>WF: respuesta
    WF-->>UI: preview + diff + summary
    U->>UI: Confirmar guardado
    UI->>WF: saveEstadisticaPreviewRows()
    WF->>SB: upsert estadisticas
    SB->>DB: persistencia
    UI-->>U: filas guardadas
```

## 11. Diagrama Entidad-Relacion

El siguiente modelo ER representa las entidades que se observan en el codigo y en los scripts SQL del proyecto.

```mermaid
erDiagram
    PERFILES ||--o{ MATERIAS_DOCENTES : asigna
    MATERIAS ||--o{ MATERIAS_DOCENTES : se_asigna

    ALUMNOS ||--o{ ALUMNO_MATERIA_ANIO : cursa
    MATERIAS ||--o{ ALUMNO_MATERIA_ANIO : contiene

    MATERIAS ||--o{ EVALUACIONES : define
    EVALUACIONES ||--o{ NOTAS : registra
    ALUMNOS ||--o{ NOTAS : recibe

    MATERIAS ||--o{ CLASES : dicta
    CLASES ||--o{ ASISTENCIAS : registra
    ALUMNOS ||--o{ ASISTENCIAS : participa

    MATERIAS ||--o{ ESTADISTICAS : produce

    PERFILES {
        uuid id PK
        string correo
        string rol
        datetime last_login_at
    }

    MATERIAS {
        int id PK
        string nombre
        string codigo
    }

    MATERIAS_DOCENTES {
        int id PK
        int materia_id FK
        uuid user_id FK
        string comision
    }

    ALUMNOS {
        int id PK
        string legajo
        string nombre
        string apellido
        string genero
    }

    ALUMNO_MATERIA_ANIO {
        int alumno_id FK
        int materia_id FK
        int anio
        string condicion
    }

    EVALUACIONES {
        int id PK
        int materia_id FK
        int anio
        string nombre
        string tipo
    }

    NOTAS {
        int evaluacion_id FK
        int alumno_id FK
        float nota
        bool ausente
    }

    CLASES {
        int id PK
        int materia_id FK
        int anio
        date fecha
        string tema
    }

    ASISTENCIAS {
        int clase_id FK
        int alumno_id FK
        string estado
    }

    ESTADISTICAS {
        int materia_id FK
        int anio
        string indicador
        float valor
    }
```

## 12. Modulos Funcionales

### 12.1 Autenticacion y perfiles

- login con Google
- seleccion de rol inicial
- callback servidor
- carga del perfil autenticado
- proteccion de rutas por rol

### 12.2 Materias

- alta manual
- importacion desde Excel
- asignacion a docentes
- consulta de materias accesibles

### 12.3 Alumnos

- importacion masiva
- carga manual
- vinculacion por materia y ano
- previsualizacion antes de guardar

### 12.4 Notas

- carga de lista del curso
- registro de parciales y recuperatorios
- validaciones de rango y ausente
- alertas academicas

### 12.5 Asistencias

- alta de clase
- marcacion por alumno
- recalculo de condicion academica

### 12.6 Estadisticas

- parser multi-formato de Excel
- previsualizacion
- deteccion de cambios
- guardado por upsert
- dashboard por indicadores

## 13. Reglas Arquitectonicas Observadas

- El rol del usuario condiciona la navegacion y el acceso a datos.
- Las materias accesibles se resuelven segun rol y asignaciones.
- La importacion siempre usa previsualizacion antes de persistir.
- Las notas y asistencias trabajan por `materia + ano`.
- Las estadisticas trabajan por `materia + ano + indicador`.
- Los indicadores calculados no se persisten como valor base; se derivan en el dashboard.

## 14. Riesgos y Limitaciones de la Arquitectura Actual

- Gran parte del acceso a datos se realiza desde cliente mediante Supabase.
- Hay logica de negocio distribuida entre paginas, hooks y modulos `lib`.
- Algunos modulos grandes concentran demasiada responsabilidad.
- La historia de migraciones SQL no esta consolidada en una sola narrativa reproducible.

## 15. Diagramas Recomendados para Entrega Academica

Si necesitas una entrega formal de diseno de sistemas, los diagramas mas defendibles con el estado real del proyecto son:

- Diagrama de contexto
- Diagrama de contenedores
- Diagrama de componentes
- Diagrama de despliegue
- Diagrama ER
- Diagrama de secuencia de autenticacion
- Diagrama de secuencia de importacion de alumnos
- Diagrama de secuencia de importacion de estadisticas

## 16. Ubicacion de la Implementacion

Referencias principales del sistema:

- `app/`
- `components/`
- `lib/`
- `supabase/`
- `types/`


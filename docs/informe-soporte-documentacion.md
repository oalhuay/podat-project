# Informe de Soporte para la Documentacion - PODAT

## 1. Datos Generales

**Nombre del sistema:** PODAT  
**Tipo de sistema:** Plataforma web academica  
**Proyecto:** `podat-app`  
**Tecnologias principales:** Next.js, React, TypeScript, Supabase, PostgreSQL, Tailwind CSS, ExcelJS, Chart.js  
**Finalidad del informe:** documentar los aspectos de soporte, mantenimiento y continuidad necesarios para acompanar la documentacion tecnica y funcional del sistema.

## 2. Objetivo del Informe

El presente informe tiene como objetivo servir de soporte documental para la aplicacion PODAT, describiendo los elementos necesarios para su operacion, mantenimiento, resolucion de incidentes y continuidad.

Este documento complementa la documentacion de arquitectura, requisitos funcionales y plan de pruebas, aportando una mirada operativa sobre como sostener el sistema una vez implementado.

## 3. Alcance del Soporte

El soporte de la aplicacion comprende:

- acceso y autenticacion de usuarios
- gestion de roles `admin` y `docente`
- gestion de materias
- asignacion de materias a docentes
- importacion de alumnos desde Excel
- carga manual de alumnos
- carga y consulta de notas
- carga y consulta de asistencias
- importacion de estadisticas academicas
- visualizacion de dashboards
- mantenimiento de la base de datos
- control de errores funcionales y tecnicos

No se incluye dentro del alcance:

- administracion interna de la infraestructura de Supabase
- soporte externo de Google OAuth
- soporte del sistema operativo del usuario final
- correccion de archivos Excel mal confeccionados fuera de las validaciones previstas

## 4. Descripcion General del Sistema

PODAT es una aplicacion web orientada a la gestion academica. Permite que usuarios con rol administrativo gestionen usuarios, materias, alumnos, notas, asistencias e indicadores estadisticos. Los docentes pueden acceder a sus materias asignadas y operar sobre los datos que les corresponden.

El sistema se apoya en Supabase para autenticacion y persistencia de datos. La aplicacion frontend esta desarrollada con Next.js y React, mientras que las reglas de negocio se encuentran distribuidas en modulos TypeScript dentro de la carpeta `lib/`.

## 5. Ambientes del Sistema

### 5.1 Ambiente de desarrollo

El ambiente de desarrollo se ejecuta localmente mediante:

```bash
npm install
npm run dev
```

Requiere un archivo `.env.local` con las variables:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 5.2 Ambiente de produccion

El sistema puede desplegarse en plataformas compatibles con Next.js, como Vercel o un servidor Node.js. El backend de datos y autenticacion depende de Supabase.

Para compilar la aplicacion:

```bash
npm run build
npm run start
```

## 6. Usuarios y Responsabilidades

### 6.1 Administrador

Responsabilidades:

- administrar usuarios y roles
- gestionar materias
- asignar materias a docentes
- importar padrones y estadisticas
- consultar dashboards generales
- revisar errores de carga o datos inconsistentes

### 6.2 Docente

Responsabilidades:

- consultar sus materias asignadas
- cargar notas
- cargar asistencias
- importar estadisticas de materias accesibles
- revisar informacion academica correspondiente a sus cursos

### 6.3 Soporte tecnico

Responsabilidades:

- verificar errores reportados
- revisar variables de entorno
- revisar conectividad con Supabase
- validar permisos y politicas RLS
- ejecutar pruebas basicas
- revisar logs y mensajes de error
- mantener documentacion actualizada

## 7. Componentes que Requieren Soporte

### 7.1 Autenticacion

Dependencias:

- Supabase Auth
- Google OAuth
- ruta `/auth/callback`
- hook `useAuth`
- middleware/proxy de proteccion de rutas

Posibles incidencias:

- usuario no puede iniciar sesion
- rol no se guarda correctamente
- usuario queda sin perfil
- redireccion incorrecta luego del login
- acceso denegado por rol incorrecto

### 7.2 Base de datos

Dependencias:

- Supabase PostgreSQL
- tablas de perfiles, materias, alumnos, notas, asistencias y estadisticas
- politicas RLS

Posibles incidencias:

- error al consultar datos
- datos no visibles por restricciones de rol
- conflicto en operaciones `upsert`
- columnas faltantes o cambios de esquema no aplicados

### 7.3 Importacion de archivos Excel

Dependencias:

- ExcelJS
- parseadores de alumnos, materias y estadisticas
- validadores de filas

Posibles incidencias:

- archivo con formato incorrecto
- columnas faltantes
- materias no reconocidas
- indicadores no reconocidos
- alumnos duplicados
- valores invalidos

### 7.4 Notas

Dependencias:

- reglas de evaluacion
- tabla de evaluaciones
- tabla de notas
- alumnos vinculados a materia y ano

Posibles incidencias:

- lista de alumnos vacia
- nota fuera de rango
- alumno no habilitado para recuperatorio
- error al guardar evaluacion

### 7.5 Asistencias

Dependencias:

- reglas de asistencia
- clases
- asistencias
- alumnos vinculados a materia y ano

Posibles incidencias:

- clase no creada
- asistencia duplicada
- calculo incorrecto de condicion
- fecha invalida

### 7.6 Dashboard de estadisticas

Dependencias:

- tabla `estadisticas`
- catalogo de indicadores
- Chart.js
- materias accesibles segun rol

Posibles incidencias:

- graficos sin datos
- indicadores calculados sin datos base
- errores en filtros por ano o materia
- datos no visibles para docente por permisos

## 8. Procedimiento Basico de Diagnostico

Ante una incidencia, se recomienda seguir estos pasos:

1. Identificar el usuario afectado y su rol.
2. Verificar si el usuario tiene sesion activa.
3. Confirmar que el perfil exista en la tabla `perfiles`.
4. Revisar si el rol asignado es correcto.
5. Validar que la materia o recurso este asignado al usuario si es docente.
6. Reproducir el error en ambiente de desarrollo.
7. Revisar mensajes visibles en pantalla.
8. Revisar consola del navegador si aplica.
9. Revisar respuesta de Supabase o errores de base de datos.
10. Ejecutar pruebas automatizadas si el error afecta reglas de negocio.

## 9. Comandos de Soporte

Instalar dependencias:

```bash
npm install
```

Ejecutar en desarrollo:

```bash
npm run dev
```

Validar lint:

```bash
npm run lint
```

Ejecutar pruebas:

```bash
npm run test
```

Compilar:

```bash
npm run build
```

Verificar estado de cambios:

```bash
git status
```

## 10. Estrategia de Pruebas de Soporte

Para tareas de soporte se recomienda ejecutar pruebas en tres niveles:

### 10.1 Pruebas funcionales manuales

- login con usuario admin
- login con usuario docente
- acceso a rutas protegidas
- alta de materia
- asignacion de materia a docente
- importacion de Excel correcto
- importacion de Excel con errores
- carga de nota valida e invalida
- carga de asistencia
- visualizacion de dashboard

### 10.2 Pruebas unitarias

Se deben ejecutar las pruebas existentes con:

```bash
npm run test
```

Estas pruebas cubren principalmente reglas e importadores.

### 10.3 Pruebas de regresion

Antes de entregar cambios se recomienda validar:

- autenticacion
- permisos por rol
- importacion de alumnos
- importacion de estadisticas
- carga de notas
- carga de asistencias
- dashboard

## 11. Gestion de Incidencias

Toda incidencia deberia registrarse con la siguiente informacion:

- ID de incidencia
- fecha
- usuario afectado
- rol del usuario
- modulo afectado
- descripcion del problema
- pasos para reproducir
- resultado esperado
- resultado obtenido
- severidad
- responsable
- estado
- solucion aplicada

Severidades sugeridas:

- Critica: impide el uso del sistema o afecta datos importantes.
- Alta: bloquea una funcionalidad principal.
- Media: afecta parcialmente una funcionalidad.
- Baja: error visual, texto o mejora menor.

## 12. Recomendaciones de Mantenimiento

- Mantener actualizada la documentacion funcional y tecnica.
- Consolidar los scripts SQL en migraciones reproducibles.
- Generar tipos de Supabase para reducir errores de tipado.
- Mantener archivos Excel de prueba para soporte.
- Registrar casos frecuentes de error y su solucion.
- Ejecutar `npm run lint`, `npm run test` y `npm run build` antes de entregar cambios.
- Revisar periodicamente politicas RLS.
- Mantener separados ambientes de desarrollo y produccion.

## 13. Respaldo y Recuperacion

Se recomienda:

- utilizar las herramientas de backup de Supabase
- exportar periodicamente datos criticos
- guardar versiones de scripts SQL
- conservar archivos Excel utilizados en importaciones importantes
- mantener versionado el codigo fuente con Git

Datos criticos:

- perfiles
- materias
- materias_docentes
- alumnos
- alumno_materia_anio
- evaluaciones
- notas
- clases
- asistencias
- estadisticas

## 14. Riesgos Operativos

- Dependencia de Supabase para autenticacion y base de datos.
- Dependencia de Google OAuth para login.
- Posibles errores por archivos Excel con estructura no esperada.
- Permisos incorrectos si las politicas RLS no estan bien aplicadas.
- Duplicacion o inconsistencia si se modifican tablas sin actualizar la aplicacion.

## 15. Conclusiones

El sistema PODAT cuenta con una base funcional completa para la gestion academica, pero requiere una estrategia de soporte clara para asegurar su continuidad. Los puntos mas sensibles son autenticacion, permisos por rol, importacion de archivos Excel y consistencia de datos en Supabase.

El mantenimiento preventivo, la ejecucion de pruebas y la actualizacion de documentacion son claves para reducir incidencias y facilitar futuras mejoras.


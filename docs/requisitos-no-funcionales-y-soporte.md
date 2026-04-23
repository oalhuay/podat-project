# Requisitos No Funcionales y Soporte - PODAT

## 1. Introduccion

El presente documento describe los requisitos no funcionales y de soporte de la aplicacion PODAT. Su finalidad es complementar la documentacion funcional, tecnica y de arquitectura del sistema, especificando criterios relacionados con desempeno, usabilidad, base de datos, diseno, normas, atributos de calidad y soporte operativo.

PODAT es una plataforma web academica desarrollada con Next.js, React, TypeScript y Supabase, orientada a la gestion de usuarios, materias, alumnos, notas, asistencias, importacion de archivos Excel y visualizacion de estadisticas academicas.

## 2. Requisitos de Desempeno o Rendimiento

Los requisitos de desempeno definen como debe comportarse el sistema ante operaciones habituales, carga de datos, consultas y procesamiento de archivos.

### RD-01. Tiempo de carga inicial

La aplicacion debe cargar la pantalla inicial en un tiempo aceptable para el usuario, preferentemente menor a 3 segundos en una conexion estable.

### RD-02. Respuesta de navegacion interna

La navegacion entre modulos del panel administrativo debe responder de forma fluida, evitando demoras perceptibles cuando los datos ya se encuentran disponibles.

### RD-03. Consulta de materias accesibles

La consulta de materias disponibles para un usuario debe ejecutarse en pocos segundos, ya que es una operacion requerida por varios modulos del sistema.

### RD-04. Importacion de alumnos

El sistema debe procesar archivos Excel de alumnos de tamano moderado sin bloquear permanentemente la interfaz. Durante el procesamiento debe mostrarse un estado de carga o mensaje informativo.

### RD-05. Importacion de estadisticas

El sistema debe procesar archivos Excel de estadisticas, generar una previsualizacion y detectar cambios contra la base de datos en un tiempo razonable.

### RD-06. Guardado masivo

Las operaciones masivas de guardado, como importacion de alumnos, estadisticas, notas o asistencias, deben ejecutarse mediante operaciones agrupadas siempre que sea posible.

### RD-07. Renderizado de dashboard

Los graficos estadisticos deben renderizarse sin congelar la interfaz y deben mostrar estados vacios o de carga cuando no existan datos.

### RD-08. Manejo de operaciones lentas

Toda operacion que pueda tardar mas de un segundo debe indicar visualmente que esta en proceso.

### RD-09. Evitar consultas innecesarias

El sistema debe evitar repetir consultas a la base de datos sin necesidad, especialmente en dashboards, carga de materias y previsualizaciones.

### RD-10. Compilacion de produccion

El sistema debe poder compilar correctamente con:

```bash
npm run build
```

## 3. Requisitos de Usabilidad

Los requisitos de usabilidad definen la facilidad con la que los usuarios pueden comprender, navegar y operar el sistema.

### RU-01. Interfaz clara por rol

La interfaz debe mostrar opciones de navegacion acordes al rol del usuario: `admin` o `docente`.

### RU-02. Mensajes visibles

El sistema debe mostrar mensajes claros de exito, error o informacion despues de operaciones relevantes.

### RU-03. Formularios guiados

Los formularios deben indicar los campos requeridos y orientar al usuario sobre el orden correcto de uso.

### RU-04. Previsualizacion antes de guardar

Las importaciones desde Excel deben mostrar una previsualizacion antes de persistir los datos.

### RU-05. Estados vacios

Cuando no existan datos disponibles, el sistema debe mostrar mensajes comprensibles en lugar de pantallas vacias.

### RU-06. Prevencion de errores

El sistema debe impedir operaciones invalidas, como guardar notas sin datos obligatorios o cargar asistencia sin seleccionar materia y fecha.

### RU-07. Consistencia visual

Los modulos deben mantener una estructura visual coherente: titulos, tarjetas, botones, formularios y tablas.

### RU-08. Accesibilidad basica

Los elementos interactivos deben ser reconocibles como botones, enlaces, inputs o selectores.

### RU-09. Cambio de tema

El usuario debe poder cambiar el tema visual de la aplicacion cuando esta funcionalidad se encuentre disponible.

### RU-10. Retroalimentacion en cargas

Durante operaciones de procesamiento o guardado, la interfaz debe mostrar textos como `Cargando`, `Guardando`, `Analizando` o equivalentes.

## 4. Requisitos de Base de Datos Logicas

Los requisitos de base de datos logicas describen las entidades, relaciones e integridad esperada del modelo de datos.

### RBD-01. Perfiles

El sistema debe mantener una tabla logica de perfiles asociada al usuario autenticado, incluyendo identificador, correo, rol y ultimo acceso cuando corresponda.

### RBD-02. Roles

Los roles validos del sistema son `admin` y `docente`.

### RBD-03. Materias

El sistema debe mantener un catalogo de materias con identificador, nombre y codigo opcional.

### RBD-04. Asignacion docente-materia

Debe existir una relacion entre docentes y materias asignadas, permitiendo restringir el acceso del docente a sus materias.

### RBD-05. Alumnos

El sistema debe mantener alumnos con datos basicos como legajo, nombre, apellido y genero cuando corresponda.

### RBD-06. Alumno por materia y ano

Debe existir una relacion logica que vincule alumnos con una materia y un ano determinado.

### RBD-07. Evaluaciones

Las evaluaciones deben estar asociadas a una materia, un ano, un nombre de evaluacion y un tipo.

### RBD-08. Notas

Las notas deben estar asociadas a una evaluacion y a un alumno, permitiendo registrar valor numerico o ausencia.

### RBD-09. Clases

Las clases deben estar asociadas a materia, ano y fecha.

### RBD-10. Asistencias

Las asistencias deben estar asociadas a una clase y a un alumno, registrando estado `presente`, `ausente` o `justificado`.

### RBD-11. Estadisticas

Las estadisticas deben almacenarse por materia, ano, indicador y valor.

### RBD-12. Unicidad logica

El sistema debe evitar duplicados en claves logicas como:

- alumno por legajo
- asignacion materia-docente repetida
- alumno-materia-ano
- evaluacion por materia-ano-nombre-tipo
- nota por evaluacion-alumno
- asistencia por clase-alumno
- estadistica por materia-ano-indicador

### RBD-13. Integridad referencial

Las relaciones entre entidades deben mantenerse consistentes para evitar notas, asistencias o estadisticas asociadas a registros inexistentes.

### RBD-14. Seguridad a nivel de datos

La base de datos debe apoyarse en politicas de seguridad para restringir operaciones segun rol y usuario.

## 5. Requisitos de Diseno

Los requisitos de diseno definen restricciones y lineamientos visuales, estructurales y tecnicos de la aplicacion.

### RDI-01. Aplicacion web responsiva

La aplicacion debe ser usable desde pantallas de escritorio y adaptarse razonablemente a pantallas menores.

### RDI-02. Diseno modular

La interfaz debe componerse mediante componentes reutilizables, evitando duplicacion innecesaria.

### RDI-03. Separacion por dominio

El codigo debe organizarse por areas funcionales como autenticacion, materias, alumnos, notas, asistencias, estadisticas e importacion.

### RDI-04. Uso de TypeScript

El proyecto debe mantener tipado estatico mediante TypeScript para reducir errores.

### RDI-05. Reglas de negocio separadas

Las reglas de notas, asistencia, importacion e indicadores deben mantenerse en modulos reutilizables.

### RDI-06. Diseno visual consistente

El sistema debe mantener una identidad visual coherente con colores, tarjetas, botones, tablas y navegacion uniforme.

### RDI-07. Proteccion de rutas

Las rutas administrativas deben protegerse mediante middleware o controles equivalentes.

### RDI-08. Mantenibilidad

Los modulos grandes deben tender a separarse en componentes, hooks y funciones reutilizables.

### RDI-09. Documentacion tecnica

El proyecto debe contar con documentacion de arquitectura, soporte, requisitos y pruebas.

## 6. Cumplimiento de Normas

Este apartado describe normas, buenas practicas y criterios de cumplimiento aplicables al sistema.

### CN-01. Buenas practicas de desarrollo web

El sistema debe respetar practicas generales de desarrollo web moderno, incluyendo separacion de responsabilidades, validacion de datos y control de errores.

### CN-02. Seguridad de autenticacion

La autenticacion debe delegarse en un proveedor confiable, en este caso Supabase Auth con Google OAuth.

### CN-03. Proteccion de datos

El acceso a datos debe restringirse segun rol y usuario, utilizando controles de aplicacion y politicas RLS de Supabase.

### CN-04. Validacion de entradas

El sistema debe validar datos ingresados manualmente y datos provenientes de archivos Excel.

### CN-05. Trazabilidad documental

Los documentos del sistema deben mantenerse versionados junto al proyecto.

### CN-06. Control de calidad

Antes de entregar cambios, se recomienda ejecutar:

```bash
npm run lint
npm run test
npm run build
```

### CN-07. Accesibilidad basica

La interfaz debe procurar etiquetas, botones reconocibles y estados visibles para el usuario.

### CN-08. Gestion de errores

Los errores deben presentarse al usuario mediante mensajes claros y registrarse cuando corresponda.

## 7. Atributos del Sistema Software

Los atributos de calidad describen caracteristicas generales que debe cumplir el sistema.

### AS-01. Mantenibilidad

El sistema debe permitir incorporar cambios sin afectar modulos no relacionados. Para ello se recomienda separar logica de negocio, UI y acceso a datos.

### AS-02. Seguridad

El sistema debe proteger rutas, datos y operaciones segun el rol del usuario autenticado.

### AS-03. Confiabilidad

El sistema debe mantener consistencia en operaciones criticas como importaciones, guardado de notas, asistencias y estadisticas.

### AS-04. Usabilidad

El sistema debe ser comprensible para usuarios administrativos y docentes, guiando los pasos necesarios en cada modulo.

### AS-05. Rendimiento

El sistema debe responder en tiempos aceptables para consultas, cargas e importaciones habituales.

### AS-06. Escalabilidad funcional

La arquitectura debe permitir agregar nuevos modulos academicos, indicadores o reportes sin reescribir el sistema completo.

### AS-07. Portabilidad

La aplicacion debe poder ejecutarse en entornos compatibles con Node.js y Next.js, manteniendo la dependencia externa de Supabase.

### AS-08. Testeabilidad

Las reglas de negocio e importadores deben poder probarse mediante pruebas unitarias.

### AS-09. Disponibilidad

La disponibilidad del sistema depende de la aplicacion desplegada y de los servicios externos utilizados, especialmente Supabase y Google OAuth.

### AS-10. Integridad

El sistema debe preservar relaciones correctas entre usuarios, materias, alumnos, evaluaciones, notas, clases, asistencias y estadisticas.

## 8. Informe de Soporte

### 8.1 Objetivo

El informe de soporte define lineamientos para operar, mantener y resolver incidencias de la aplicacion PODAT.

### 8.2 Alcance del soporte

El soporte cubre:

- autenticacion y acceso
- permisos por rol
- gestion de materias
- importacion de archivos Excel
- carga de alumnos
- carga de notas
- carga de asistencias
- dashboards
- errores de base de datos
- validaciones funcionales

### 8.3 Fuera de alcance

Quedan fuera del soporte directo:

- problemas internos de Google OAuth
- caidas externas de Supabase
- errores del sistema operativo del usuario
- archivos Excel confeccionados con formatos no soportados

### 8.4 Procedimiento de diagnostico

Ante una incidencia se recomienda:

1. Identificar usuario, rol y modulo afectado.
2. Verificar si existe sesion activa.
3. Confirmar que el perfil exista en la base de datos.
4. Validar que el rol sea correcto.
5. Revisar si el docente tiene materias asignadas.
6. Reproducir el error.
7. Revisar mensajes visibles en pantalla.
8. Revisar consola del navegador si corresponde.
9. Revisar respuestas de Supabase.
10. Ejecutar pruebas de regresion si corresponde.

### 8.5 Comandos utiles

Instalar dependencias:

```bash
npm install
```

Ejecutar en desarrollo:

```bash
npm run dev
```

Validar calidad:

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

### 8.6 Registro de incidencias

Se recomienda registrar cada incidencia con:

- ID
- fecha
- usuario afectado
- rol
- modulo
- descripcion
- pasos para reproducir
- resultado esperado
- resultado obtenido
- severidad
- responsable
- estado
- solucion aplicada

### 8.7 Severidad de incidencias

- Critica: impide el uso del sistema o afecta datos importantes.
- Alta: bloquea una funcionalidad principal.
- Media: afecta parcialmente una funcionalidad.
- Baja: error visual, texto o mejora menor.

### 8.8 Recomendaciones de soporte

- Mantener documentacion actualizada.
- Conservar archivos Excel de prueba.
- Ejecutar pruebas antes de entregar cambios.
- Revisar periodicamente politicas RLS.
- Mantener respaldos de la base de datos.
- Registrar errores frecuentes y soluciones aplicadas.
- Separar ambientes de desarrollo y produccion.

## 9. Conclusiones

Los requisitos no funcionales definidos permiten establecer criterios de calidad para PODAT mas alla de sus funcionalidades principales. El sistema debe sostener niveles adecuados de rendimiento, usabilidad, seguridad, mantenibilidad e integridad de datos.

El informe de soporte complementa estos requisitos, estableciendo criterios operativos para diagnosticar errores, mantener la aplicacion y asegurar continuidad ante incidencias.


# Requerimientos Funcionales del Sistema PODAT

## 1. Objetivo del documento

El presente documento describe los requerimientos funcionales del sistema PODAT desde el punto de vista del usuario que ingresa a la aplicación e interactúa con sus pantallas, menús y módulos. La descripción se centra en lo que cada usuario visualiza, las acciones que puede realizar y las restricciones que tiene según su rol dentro del sistema.

## 2. Objetivo general del sistema

PODAT es una plataforma académica web destinada a la gestión de información institucional vinculada con materias, alumnos, notas, asistencias e indicadores estadísticos. El sistema organiza la experiencia de uso según el perfil del usuario autenticado, permitiendo que cada rol acceda únicamente a las funciones que le corresponden.

## 3. Roles de usuario contemplados

El sistema reconoce los siguientes roles principales:

- Administrador.
- Docente.

Además, puede existir un usuario autenticado sin rol consolidado, pero operativamente el acceso funcional del sistema se organiza sobre los roles Administrador y Docente.

## 4. Acceso al sistema

### 4.1 Pantalla de inicio

Cuando el usuario ingresa a la aplicación, visualiza la pantalla de bienvenida del sistema PODAT. En dicha pantalla se presentan dos opciones de acceso:

- Acceso Docente.
- Acceso Administrador.

Ambas opciones utilizan autenticación mediante cuenta de Google.

### 4.2 Selección de perfil

Antes de autenticarse, el usuario debe seleccionar el perfil con el que desea ingresar. Esta elección condiciona el rol con el que el sistema intentará registrar o recuperar su perfil.

### 4.3 Resultado del acceso

Luego de la autenticación:

- si el usuario posee permisos válidos, el sistema lo redirige al panel principal;
- si ocurre un error de autenticación o de autorización, el sistema informa el problema en la pantalla inicial;
- si el usuario no tiene permitido acceder a una ruta, el sistema bloquea el acceso y lo redirige fuera del panel administrativo.

## 5. Comportamiento general después del ingreso

Una vez autenticado, el usuario accede a un panel interno con navegación lateral. El contenido del menú cambia según el rol del usuario.

Elementos comunes de la experiencia:

- identificación visual del usuario;
- acceso al perfil;
- acceso al panel principal;
- selector de tema visual;
- opción para volver al inicio;
- opción para cerrar sesión.

## 6. Menú y funcionalidades del Administrador

El usuario con rol Administrador visualiza en el menú lateral las siguientes opciones:

- Dashboard.
- Perfil.
- Gestión de usuarios.
- Importar.
- Alumnos.
- Materias.

### 6.1 Dashboard

El Administrador puede ingresar al panel principal del sistema. Desde allí visualiza gráficos e indicadores estadísticos organizados por materia y año. Puede explorar múltiples visualizaciones, cambiar la materia seleccionada y analizar la evolución de los datos académicos.

El Administrador puede:

- acceder al dashboard general;
- consultar estadísticas de todas las materias disponibles;
- cambiar el año global del panel;
- visualizar distintos tipos de gráficos.

El Administrador no tiene restricciones funcionales relevantes dentro de este módulo, más allá de la disponibilidad real de datos cargados.

### 6.2 Perfil

En la sección Perfil, el Administrador puede visualizar su información personal y de cuenta, incluyendo:

- nombre visible;
- correo electrónico;
- rol activo;
- identificador del usuario;
- datos complementarios del perfil.

Además, puede editar información de su perfil, como:

- nombre visible;
- teléfono;
- área o departamento;
- descripción personal;
- materias declaradas en su perfil.

El Administrador puede modificar su propia información de perfil, pero no utiliza esta pantalla para cambiar roles de otros usuarios.

### 6.3 Gestión de usuarios

Esta opción es exclusiva del Administrador. Desde este módulo puede administrar los perfiles registrados en el sistema.

El Administrador puede:

- visualizar el listado de usuarios registrados;
- buscar usuarios por correo electrónico;
- consultar la última conexión registrada;
- ver el rol actual de cada usuario;
- cambiar el rol de un usuario entre Docente, Administrador o Pendiente.

Restricciones funcionales:

- el sistema evita que el único Administrador existente se quite a sí mismo ese rol;
- un usuario que no sea Administrador no puede acceder a esta pantalla.

### 6.4 Importar

En esta opción el Administrador trabaja con la importación de estadísticas académicas desde archivos Excel `.xlsx`.

El Administrador puede:

- cargar un archivo Excel;
- usar datos del archivo para generar una previsualización;
- revisar filas válidas e inválidas;
- filtrar resultados por estado;
- detectar cambios contra la base actual;
- guardar estadísticas nuevas o actualizar existentes;
- crear materias faltantes detectadas durante la importación, si el archivo contiene materias que todavía no existen.

Restricciones funcionales:

- no se guardan cambios sin revisión previa;
- los indicadores calculados se identifican, pero no se persisten como valores base;
- si el archivo no cumple con el formato esperado, la importación no puede confirmarse.

### 6.5 Alumnos

La opción Alumnos es un módulo integral que centraliza tres bloques de trabajo:

- padrón de alumnos;
- carga de notas;
- carga de asistencias.

El Administrador puede seleccionar una materia y un año antes de trabajar. A partir de esa selección, el sistema habilita los submódulos.

#### 6.5.1 Gestión de padrón

El Administrador puede:

- importar alumnos desde Excel;
- cargar alumnos manualmente;
- revisar una previsualización antes de guardar;
- confirmar la importación;
- asociar alumnos a una materia y año determinados.

Restricciones funcionales:

- no puede confirmar la importación si faltan datos obligatorios;
- la importación requiere validación previa;
- la información debe cumplir con la estructura esperada por el sistema.

#### 6.5.2 Gestión de notas

El Administrador puede:

- seleccionar materia, año, evaluación y tipo de evaluación;
- cargar la lista del curso;
- asignar una nota por alumno;
- marcar ausentes;
- guardar las notas registradas.

El sistema contempla evaluaciones de tipo:

- Parcial.
- Recuperatorio.

Y nombres de evaluación:

- Parcial1.
- Parcial2.
- Integrador.

Restricciones funcionales:

- para guardar, cada alumno habilitado debe tener nota válida o estado de ausente;
- las notas deben estar entre 1 y 10;
- los recuperatorios solo se habilitan para alumnos que cumplan las condiciones previstas por las reglas del sistema.

#### 6.5.3 Gestión de asistencias

El Administrador puede:

- seleccionar materia, año y fecha;
- registrar opcionalmente el tema de la clase;
- cargar la lista de alumnos;
- marcar por alumno si estuvo presente, ausente o justificado;
- guardar la asistencia de la clase.

El sistema también recalcula la condición académica de asistencia del alumno.

Restricciones funcionales:

- no puede registrar asistencia sin materia, año y fecha;
- el cálculo de condición depende del historial de asistencias y de reglas de porcentaje mínimo;
- la clase debe quedar registrada para poder persistir las asistencias.

### 6.6 Materias

Esta opción es exclusiva del Administrador. Desde este módulo puede gestionar el catálogo de materias y las asignaciones docentes.

El Administrador puede:

- crear materias manualmente;
- importar materias desde Excel;
- actualizar el código de una materia existente;
- asignar una materia a un docente;
- eliminar asignaciones existentes;
- visualizar el listado de asignaciones.

Restricciones funcionales:

- el Docente no puede acceder a esta pantalla;
- las materias y asignaciones dependen de la existencia previa de usuarios y registros válidos.

## 7. Menú y funcionalidades del Docente

El usuario con rol Docente visualiza en el menú lateral las siguientes opciones:

- Dashboard.
- Perfil.
- Importar.
- Alumnos.
- Mis Materias.

### 7.1 Dashboard

El Docente puede acceder a un panel principal similar al del Administrador, pero limitado a las materias a las que tiene acceso según sus asignaciones.

El Docente puede:

- consultar estadísticas de sus materias;
- cambiar la materia seleccionada;
- visualizar gráficos e indicadores;
- analizar datos históricos por año.

El Docente no puede:

- consultar información de materias a las que no fue asignado;
- administrar el catálogo global de materias;
- gestionar usuarios desde este módulo.

### 7.2 Perfil

El Docente puede:

- ver sus datos de usuario;
- ver su rol activo;
- editar su perfil personal;
- declarar materias en su perfil;
- consultar las materias asignadas oficialmente por la administración.

También dispone de accesos rápidos a:

- Mis Materias;
- Notas;
- Asistencias.

El Docente puede modificar su propia información, pero no puede modificar roles ni datos institucionales de otros usuarios.

### 7.3 Importar

El Docente puede importar estadísticas académicas de sus materias mediante archivos Excel `.xlsx`.

El Docente puede:

- cargar un archivo;
- revisar la previsualización;
- filtrar filas por estado;
- analizar cambios detectados;
- confirmar el guardado de estadísticas válidas.

El Docente no puede:

- crear materias faltantes desde esta pantalla;
- importar datos para materias fuera de su alcance;
- saltar la etapa de previsualización.

### 7.4 Alumnos

El Docente accede a un espacio de trabajo integrado para operar sobre sus cursos asignados.

Puede utilizar:

- gestión de padrón;
- carga de notas;
- carga de asistencias.

Al igual que el Administrador, primero debe seleccionar:

- materia;
- año.

Luego elige el bloque operativo con el que desea trabajar.

#### 7.4.1 Gestión de padrón

El Docente puede:

- importar alumnos desde Excel;
- cargar alumnos manualmente;
- revisar previsualización;
- confirmar la importación para la materia y año seleccionados.

El Docente no puede:

- trabajar sobre materias que no le pertenecen;
- guardar información sin pasar por la revisión previa;
- importar con datos incompletos o inválidos.

#### 7.4.2 Gestión de notas

El Docente puede:

- seleccionar evaluación y tipo;
- cargar la lista de alumnos del curso;
- ingresar notas;
- marcar ausentes;
- guardar la evaluación.

El Docente no puede:

- registrar notas fuera del rango permitido;
- cargar recuperatorios para alumnos no habilitados por las reglas del sistema;
- operar sobre cursos no asociados a sus materias accesibles.

#### 7.4.3 Gestión de asistencias

El Docente puede:

- configurar una clase con fecha y tema;
- cargar la lista del curso;
- marcar presente, ausente o justificado;
- guardar la asistencia de la clase.

El Docente no puede:

- operar sobre cursos que no correspondan a sus asignaciones;
- omitir los datos mínimos requeridos para registrar una clase;
- guardar asistencias sin tener la lista cargada.

### 7.5 Mis Materias

Esta pantalla es propia del rol Docente. Allí puede consultar sus materias asignadas oficialmente.

El Docente puede:

- ver el listado de materias asignadas;
- identificar el código de la materia;
- visualizar las comisiones vinculadas cuando correspondan.

El Docente no puede:

- crear materias;
- modificar asignaciones;
- reasignarse materias;
- eliminar asignaciones.

## 8. Funcionalidades accesibles pero no visibles como menú principal

El sistema también contiene pantallas operativas relacionadas con:

- Notas.
- Asistencias.

Estas pantallas pueden ser alcanzadas desde accesos rápidos o por navegación interna, pero conceptualmente forman parte del trabajo sobre alumnos y cursos.

## 9. Restricciones generales por rol

### 9.1 Restricciones del Docente

El Docente no puede:

- ingresar a Gestión de usuarios;
- ingresar a Materias;
- cambiar roles de usuarios;
- asignar materias a otros usuarios;
- administrar el catálogo global de materias;
- consultar información fuera de las materias a las que tiene acceso.

### 9.2 Restricciones del Administrador

El Administrador tiene acceso amplio sobre la operación del sistema. Sin embargo:

- no puede guardar datos inválidos;
- no puede omitir las reglas de validación de importación;
- no puede quitar el rol de Administrador si es el único administrador registrado;
- depende de la existencia de datos consistentes para que ciertos módulos muestren información útil.

## 10. Requisitos funcionales principales del sistema

Desde la perspectiva del usuario, el sistema debe permitir:

- iniciar sesión con Google seleccionando un perfil de acceso;
- mostrar un menú acorde al rol autenticado;
- restringir opciones no autorizadas según el rol;
- visualizar y editar el perfil del usuario autenticado;
- consultar materias según alcance del rol;
- gestionar alumnos por materia y año;
- cargar notas por evaluación;
- cargar asistencias por clase;
- importar estadísticas desde archivos Excel;
- visualizar dashboards y gráficos académicos;
- mostrar mensajes de error, información y confirmación durante cada proceso;
- redirigir al usuario cuando intenta acceder a una función que no le corresponde.

## 11. Matriz resumen de permisos

### 11.1 Rol Administrador

- Puede acceder al Dashboard.
- Puede editar su Perfil.
- Puede gestionar usuarios y roles.
- Puede importar estadísticas.
- Puede gestionar alumnos, padrón, notas y asistencias.
- Puede crear materias.
- Puede importar materias.
- Puede asignar materias a docentes.
- Puede ver información global del sistema.

### 11.2 Rol Docente

- Puede acceder al Dashboard de sus materias.
- Puede editar su Perfil.
- Puede importar estadísticas de sus materias.
- Puede gestionar alumnos, padrón, notas y asistencias de sus materias.
- Puede consultar Mis Materias.
- No puede gestionar usuarios.
- No puede administrar el catálogo global de materias.
- No puede asignar materias.
- No puede acceder a funciones exclusivas del Administrador.

## 12. Conclusión

PODAT organiza su funcionamiento en torno a una experiencia diferenciada por rol. El Administrador posee capacidades de gestión global del sistema, mientras que el Docente trabaja sobre sus materias asignadas y los procesos académicos asociados a ellas. Esta separación funcional permite que cada usuario visualice únicamente las opciones pertinentes para su tarea, reduciendo errores operativos y fortaleciendo el control de acceso dentro de la aplicación.

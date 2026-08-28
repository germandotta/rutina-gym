# Entreno — Contexto para Claude Code

## Qué es
PWA de rutina de rehabilitación de rodillas + entrenamiento general para Germán.
Alojada en GitHub Pages: `germandotta.github.io`.
Archivo principal: `entreno-v02.html` (versión activa en uso; `entreno-v01.html` es
legado, ya no se usa).

## Estructura del repo (tal como debe quedar)
```
/entreno-v02.html          <- app principal
/config/manifest.json      <- manifest PWA, start_url apunta a ../entreno-v02.html
/config/service-worker.js  <- cache "entreno-v2", con skipWaiting/clients.claim
/img/                      <- imágenes de ejercicios (36 archivos, fondo blanco)
```

## Arquitectura de la app (dentro de entreno-v02.html)
- Todo en un solo archivo HTML: CSS embebido + JS embebido, sin build step.
- `dayData`: objeto con 4 días — `lunes`, `miercoles`, `viernes`, `fullbody`.
  Cada día tiene `subtitle` y `exercises` (array de objetos ejercicio).
- Cada ejercicio: `id`, `section`, `name`, `emoji`, `sets`, `reps`, `rest`,
  `hasLoad` (bool, si registra carga+reps), `trackReps` (bool, si solo registra
  reps sin carga — ej. fondos en banco, step-down), `loadLabel` (label del campo
  carga), `noImage` (bool, oculta el botón "Imagen" — se usa en calentamiento,
  movilidad y estiramiento general), `instructions` (array de strings).
- UI: lista vertical de "cards" por ejercicio, una card por fila colapsada
  (número, nombre, meta con último registro, checkbox de completado, chevron).
  Al tocar se expande inline (no modal) mostrando: specs (series/reps/descanso),
  botones "📋 Instrucciones" (expande lista inline) y "👁 Imagen" (abre lightbox),
  y el bloque de registro con historial.

## Estado / localStorage
- Historial de cada ejercicio en `localStorage` bajo la key `entreno_hist_${id}`,
  array de hasta 10 registros `{carga, reps, fecha, hora}`, más reciente primero.
- Al abrir la app: renderiza primero con localStorage (instantáneo), luego hace
  `fetch(SHEETS_URL)` (GET) en segundo plano y reconstruye localStorage con lo
  que traiga el Sheet, y vuelve a renderizar — PERO solo si el usuario sigue en
  el mismo día que tenía abierto al momento de completarse el fetch (ver bug
  de race condition ya corregido con `dayAtStart`/chequeo de `currentDay`).

## Backend: Google Apps Script + Sheet
- `SHEETS_URL` hardcodeado en el HTML (`const SHEETS_URL = '...'`).
- El Sheet actual es un log plano por evento, columnas:
  `Fecha | Hora | Día | Ejercicio | Carga | Reps | Completado`
- Cada fila es un evento: o bien un registro de carga/reps (columna Completado
  vacía), o bien una marca de "completado" (Carga y Reps en "—", Completado="sí").
- `doPost`: si `completado === 'sí'`, busca una fila previa con mismo
  día+ejercicio+fecha+completado="sí" y la sobreescribe (evita duplicar al
  volver a tocar "completado" — aunque en la UI el checkbox ya queda
  deshabilitado tras marcarse, así que esto es más bien defensivo). Si no,
  hace `appendRow`.
- `doGet`: devuelve `{ok: true, data: [...]}` con TODAS las filas, headers tal
  cual están en el Sheet (con mayúscula y tilde: `Fecha`, `Hora`, `Día`,
  `Ejercicio`, `Carga`, `Reps`, `Completado` — ¡importante, el JS lee esas keys
  exactas!).
- La app arma un `nameToId` (nombre de ejercicio -> id) recorriendo `dayData`,
  y usa eso para mapear las filas del Sheet a los ejercicios locales.

## Pendientes que Germán pidió (anotados, no implementados aún)
1. **Un solo expandible a la vez**: hoy `expandedExercises` es un `Set` (podés
   tener varias cards abiertas). Cambiar a que abrir una cierre la anterior
   (probablemente conviene que sea un solo valor, no Set, y listo).
2. **Rediseño del Sheet a formato pivot**: filas = ejercicios, columnas = días,
   celda = peso/reps. OJO: esto es un cambio grande — hay que decidir cómo se
   preserva el historial temporal (el formato actual guarda fecha de cada
   registro; un pivot simple pierde eso a menos que se agregue una lógica de
   "última vez por día" separada del historial completo, o se mantenga una
   hoja de log crudo + una hoja resumen pivot). Proponer el diseño ANTES de
   tocar el Sheet real — Germán lo pidió explícitamente porque no quiere
   perder datos.
3. **Bug de "registro fantasma"**: en algunos ejercicios, al abrir el modal de
   registro (`abrirModal`), aparece precargado un valor que no corresponde al
   ejercicio. Sospecha: cruce entre lo que quedó en `localStorage` de una
   sesión vieja (con un id de ejercicio que después cambió, o un nombre que
   matcheó mal contra `nameToId`) y lo que trae `cargarDesdeSheets()`. Revisar
   sobre todo ejercicios que tuvieron cambios de nombre/id en el código a lo
   largo de las iteraciones (ej. los reemplazos de "Rueda de abdomen" por
   "Crunch en polea", o ids con sufijos `_mie`/`_vie`/`fb_` para variantes del
   mismo ejercicio en distintos días — si dos ejercicios distintos comparten
   el mismo `name` pero tienen `id` distinto, y `nameToid` los pisa entre sí,
   ahí puede estar el bug).

## Cosas explícitamente descartadas / no reintroducir
- Timers y tabata: Germán los sacó dos veces (una por ejercicio, otra en
  planchas) porque usa otra app para controlar tiempos y "mantener pantalla
  encendida" no funciona bien en iOS Safari como PWA. No agregar timers salvo
  pedido explícito.
- Wake Lock API: probado y descartado, no resolvía el problema real.
- Banco de imágenes con API externa (ExerciseDB/oss.exercisedb.dev, Unsplash,
  wger, ymove.app, api-ninjas): todas evaluadas y descartadas por mala calidad
  visual o requerir pago. La solución final fue imágenes propias generadas con
  Nano Banana + algunas recortadas de Simply Fitness por el propio usuario
  (procesadas acá con fondo blanco compuesto), servidas localmente desde
  `img/`. No reintroducir fetch a APIs externas de imágenes sin que Germán lo
  pida.
- No usar `<input type="number">` para carga — Germán necesita decimales con
  coma (ej. "7,5") y el tipo number con esa configuración regional daba
  problemas; se usa `type="text"` con `inputmode="decimal"`.

## Convenciones de estilo que Germán espera
- Sin guiones largos (—) en el texto de Claude (SÍ se usan como separador
  visual dentro de la UI de la app, eso es distinto).
- Respuestas cortas y concretas, sin ejemplos redundantes.
- Prefiere prosa a listas salvo que el formato lo justifique.
- Corrige errores rápido y espera que el asistente actúe sobre la corrección
  sin re-explicar de más.

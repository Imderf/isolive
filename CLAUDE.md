# Ogilvy Live

Vista 3D en vivo de las áreas de Ogilvy Colombia en el edificio Naos (piso 4). Solo lectura: muestra lo que pasa en las plataformas de gestión (TaskBoard, Revisión de Catálogos); nunca escribe en ellas.

Plan completo (11 pasos): nota del vault `ogilvy/tech-docs/ogilvy-live.md`. Responsables: Imderf Ríos y Jaime Orozco.

## Estructura

- `web/` — React 19 + Vite + React Three Fiber. Escena y overlay.
- `server/` — Node 24 + Express, corre el `.ts` directo (sin compilar). Guarda la llave del TaskBoard y traduce cada plataforma al modelo común (`src/taskboard.ts`). Áreas en `server/areas/*.json` (proyecto, columnas de archivo, persona → perfil + puesto). En vivo (`src/vivo.ts`): sondea `/activity` cada 5 s; si hay actividad trae el estado fresco y empuja `evento` (enriquecido) y `estado` por SSE (`/api/areas/:id/eventos`); refresca el estado cada 60 s y `/api/areas/:id` sirve la caché. Login, roles y filtro de privacidad llegan en el ciclo 5.
- `web/src/areas/*.ts` — disposición 3D de cada área (estaciones, etapas, puestos, bandejas).
- Áreas del desplegable: `web/src/areas/index.ts` (la elegida queda en `?area=`). Servidor: un `server/areas/*.json` por área; un área sin personas no se sirve y el web la muestra con datos de prueba.
- **Mesa Demo** (`mesa-demo`): lee el proyecto "Mesa Demo" del management (cliente "Cliente Demo"; personas y piezas inventadas, sin marcas de clientes) y siempre está en horario. La actividad la genera el motor demo del management (`server/src/lib/demo.ts`, variable `DEMO_PROJECT_ID`): cada 20–50 s comenta, mueve, crea señales y se pasa piezas por asignación o mención, sin notificaciones. Las 14 personas son perfiles sin acceso (`@mesa-demo.invalid`, no pueden iniciar sesión) creados con `server/scripts/mesa-demo.mjs` del management; el perfil sale del cargo. `server/areas/mesa-demo.json` tiene sus ids de producción.
- `docs/areas/` — una ficha por área. `docs/referencias/` — WareTrack, Gather, Naos.

## Modelo común (`web/src/model.ts`)

Área, persona, pieza, estación, evento. Cada conector traduce su plataforma a este modelo; la escena solo conoce el modelo. Sumar un área no toca la escena.

## Reglas de la escena (no negociables)

- **Lo real manda, el ambiente decora.** Eventos reales (pieza movida, creada, comentada, aprobada, ajuste) mandan. Baño, café y estirarse son decoración: nunca aparecen en la ficha de una persona ni en el feed.
- **Presencia por horario laboral** (L–V, America/Bogota): en su puesto; fuera de horario, vacío. No usar la presencia del socket del TaskBoard.
- **La pieza vive en el puesto de quien la tiene ahora** (`web/src/sim/responsable.ts`): 1) la persona mencionada más recientemente en sus comentarios, si su perfil encaja con la estación; 2) el responsable asignado que encaje; 3) quien comentó más recientemente y encaje; 4) si la estación exige perfil (`perfiles` en la disposición: Publicación → Social media, Muro de datos → Data, Estudio creativo → Diseño/Copy) y nadie encaja, espera en la bandeja de la estación. La ficha dice quién la tiene y por qué. Estaciones tipo `lugar` (sala de cliente, archivo) guardan sus piezas ahí. Quien opera el tablero aparece en el muro Kanban.
- **Clientes:** ven solo sus áreas, sin nombres de personas (avatar por perfil). El filtro se aplica en el servidor, nunca solo en el navegador.
- Comentarios: el texto llega recortado (280 caracteres, sin enlaces) y es **solo para usuarios de Ogilvy**; el filtro del ciclo 5 lo quita para clientes en el servidor. Sin adjuntos. Sin agencia de cada persona.
- Marcas de zona compactas (número o ícono); el texto se abre al pasar el mouse o con la zona elegida.
- Intro (`web/src/intro/`): barrio real del Naos desde OpenStreetMap (`entorno-naos.json`, extraído una vez el 2026-10-09 con la misma fuente que map3d; Naos = vía 698926329, 7 pisos, piso 4 en rojo; +x oriente, +z sur) con colores de Bogotá (ladrillo, asfalto, árboles en las avenidas y los cerros orientales al fondo). La cámara baja a la entrada sobre la Av. Carrera 9 y sigue a una persona por el vestíbulo de vidrio (puertas que se abren, letrero NAOS) hasta el ascensor del lobby; las puertas se cierran y pasa a la cabina por dentro (`Cabina` en `Ascensor.tsx`: acero, botonera con el 4 encendido, pantalla del piso), que sube del 1 al 4 y al abrir se agranda y se desvanece sobre la oficina. El reloj de la intro arranca con el primer cuadro dibujado. Sale en cada carga, con "Saltar intro"; `?sinintro` la omite. Los datos cargan mientras tanto.
- Calles: "Av. Carrera 9" (principal) y "Calle 102" (alterna) pintadas en el asfalto con `TextoSuelo` (textura, no HTML, para que los carros las tapen) y pin "Naos · Av. Carrera 9 #101-67".
- Decoración (no son datos): dos personas del cliente en la sala (`Visitantes.tsx`, usan `Persona` con su ruta de salida; de vez en cuando recorren la oficina) y tráfico por hora de Bogotá (`Trafico.tsx`, pico 6–9 y 16:30–19:30): dos rutas que no se cruzan, misma velocidad y distancia fija por ruta; los carros entran y salen lejos, en la neblina.

## Prohibido

- Escribir en las plataformas fuente.
- Leer o mostrar `.env` o llaves de servicio.
- Datos reales en `web/src/mock.ts` (nombres y títulos son inventados).

## Diseño

Dirección elegida por Imderf (2026-10-09): **look WareTrack** con el **rojo Ogilvy `#EF3B3A` en el papel del azul**, tipografía **Geist** (no Ogilvy Sans/Serif: la descartó por poco innovadora).

- Escena: objetos redondeados tipo juguete (`RoundedBox`), luz suave, cámara en perspectiva (fov 30), pines de ubicación (gota) y etiquetas en píldora. Sillas, tabiques y remates en rojo; muebles blancos; neutros fríos (`#EDEFF4` de fondo).
- Interfaz: tarjetas blancas redondeadas (14px) con sombra suave, íconos `lucide-react` en cuadros con tinte, píldoras de estado (verde en vivo / a tiempo, ámbar por vencer, rojo vencida), "Recorrido de la pieza" como el Shipment Tracking, pestañas Actividad/Personas/Estaciones.
- Del Ogilvy Design System (Claude Design) se conserva: el wordmark como imagen (nunca retipearlo) y el rojo `#EF3B3A`.
- Tokens en `web/src/index.css`.

## Comandos

- Desarrollo: `server/.env` apunta al management de producción (`/api/live` con su llave) → `cd server && npm run dev` (4100) → `cd web && npm run dev` (5180, `/api` va a 4100). Para trabajar contra la copia local (`dev.db` en el worktree `~/Downloads/Ogilvy/management/repo-live`, puerto 4001) restaurar `../env-dev-local.bak` como `server/.env`. Configs `taskboard-live-api`, `ogilvy-live-server`, `ogilvy-live` en el `.claude/launch.json` del vault.
- Sin el servidor, el web cae a datos de prueba con simulador.
- `server/.env` (no se versiona): `PORT`, `TASKBOARD_URL`, `TASKBOARD_TOKEN`. Nunca mostrarlo.
- `cd server && npm run check` — chequeo del conector; `npx tsc --noEmit` — tipos.
- `cd web && npm run dev` — desarrollo (puerto 5180).
- `cd web && npm run build` — chequeo de tipos + build.
- `cd web && npm run check` — chequeo de rutas y eventos (Node, sin dependencias).
- `?hora=HH:MM` y `?dia=1..7` en la URL fuerzan la hora de Bogotá para probar el horario laboral.

## Estado

- Ciclo 1 (escena con datos inventados): hecho 2026-10-09; rediseñado al look WareTrack el mismo día. Pendiente de validación del look por Imderf.
- Ciclo 2 (personas y movimiento): hecho 2026-10-09.
  - `web/src/sim/rutas.ts`: red de pasillos + Dijkstra (cambia con el piso real en V2).
  - `web/src/sim/eventos.ts`: `aplicar(area, evento)` es lo único que cambia datos; el simulador de prueba y el conector real (ciclo 3) entregan eventos con la misma forma.
  - `web/src/sim/coreografia.ts`: evento → órdenes (llevar pieza, ir al Kanban, burbuja). Las órdenes mandan sobre la vida de oficina (`scene/Persona.tsx`).
  - Simulador activo solo con datos de prueba (`App.tsx`), un evento cada 12–22 s.
- Ciclo 3 (conector TaskBoard): hecho 2026-10-09 en local contra la copia de producción.
  - Management, rama `ogilvy-live` (worktree): `GET /api/live/projects/:id/state` y `/activity?since=`, con llave `LIVE_TOKEN` (Bearer, comparación en tiempo constante), solo proyectos de `LIVE_PROJECTS`, 60 consultas/min. Sin llave responden 404. No devuelven descripciones, adjuntos ni correos. Desplegado en producción el 2026-10-13 (con el campo de cargo y el motor de la Mesa Demo).
  - Piezas sin responsable de la mesa (13 de 45 en Social First) esperan en la bandeja de su estación.
  - Comentarios: ruta `/api/live/projects/:id/comments?since=` (7 días por defecto); el servidor los cruza con `comment.added` (misma tarjeta y autor, ±10 s).
  - Vista del tablero completo (clic en el muro Kanban) y vista por etapa (quién trabaja en ella, con aro y conteo en la escena).
- Ciclo 4 (eventos en vivo): hecho 2026-10-09. Probado con una copia de la base (`taskboard-live-api-prueba`) insertando actividad: el evento aparece en la escena en ~5 s. Un comentario que menciona a alguien de la mesa le pasa la pieza y esa persona va por ella.
- Bundle de producción: 1,2 MB (330 KB gzip), casi todo Three.js. Revisar en el paso 9 (rendimiento).

# Ogilvy Live

Vista 3D en vivo de las áreas de Ogilvy Colombia en el edificio Naos (piso 4). Solo lectura: muestra lo que pasa en las plataformas de gestión (TaskBoard, Revisión de Catálogos); nunca escribe en ellas.

Plan completo (11 pasos): nota del vault `ogilvy/tech-docs/ogilvy-live.md`. Responsables: Imderf Ríos y Jaime Orozco.

## Estructura

- `web/` — React 19 + Vite + React Three Fiber. Escena y overlay.
- `server/` — Node 24 + Express, corre el `.ts` directo (sin compilar). Guarda la llave del TaskBoard y traduce cada plataforma al modelo común (`src/taskboard.ts`). Áreas en `server/areas/*.json` (proyecto, columnas de archivo, persona → perfil + puesto). Login, roles, filtro de privacidad y SSE llegan en los ciclos 4–5.
- `web/src/areas/*.ts` — disposición 3D de cada área (estaciones, etapas, puestos, bandejas).
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
- Decoración (no son datos): dos personas del cliente en la sala (`Visitantes.tsx`) y tráfico por hora de Bogotá (`Trafico.tsx`, pico 6–9 y 16:30–19:30): dos rutas que no se cruzan, misma velocidad y distancia fija por ruta; los carros entran y salen lejos, en la neblina.

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

- Desarrollo con datos reales: API del management en el worktree `~/Downloads/Ogilvy/management/repo-live` (rama `ogilvy-live`, puerto 4001, copia de producción `dev.db`) → `cd server && npm run dev` (4100) → `cd web && npm run dev` (5180, `/api` va a 4100). Configs `taskboard-live-api`, `ogilvy-live-server`, `ogilvy-live` en el `.claude/launch.json` del vault.
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
  - Management, rama `ogilvy-live` (worktree): `GET /api/live/projects/:id/state` y `/activity?since=`, con llave `LIVE_TOKEN` (Bearer, comparación en tiempo constante), solo proyectos de `LIVE_PROJECTS`, 60 consultas/min. Sin llave responden 404. No devuelven descripciones, comentarios, adjuntos ni correos. **No está desplegado.**
  - Piezas sin responsable de la mesa (13 de 45 en Social First) esperan en la bandeja de su estación.
  - Comentarios: ruta `/api/live/projects/:id/comments?since=` (7 días por defecto); el servidor los cruza con `comment.added` (misma tarjeta y autor, ±10 s).
  - Vista del tablero completo (clic en el muro Kanban) y vista por etapa (quién trabaja en ella, con aro y conteo en la escena).
- Bundle de producción: 1,2 MB (330 KB gzip), casi todo Three.js. Revisar en el paso 9 (rendimiento).

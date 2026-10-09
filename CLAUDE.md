# Ogilvy Live

Vista 3D en vivo de las áreas de Ogilvy Colombia en el edificio Naos (piso 4). Solo lectura: muestra lo que pasa en las plataformas de gestión (TaskBoard, Revisión de Catálogos); nunca escribe en ellas.

Plan completo (11 pasos): nota del vault `ogilvy/tech-docs/ogilvy-live.md`. Responsables: Imderf Ríos y Jaime Orozco.

## Estructura

- `web/` — React 19 + Vite + React Three Fiber. Escena y overlay.
- `server/` — (ciclo 3+) Node 24 + Express + Prisma + SQLite: login, roles, conectores, filtro de privacidad, SSE.
- `docs/areas/` — una ficha por área. `docs/referencias/` — WareTrack, Gather, Naos.

## Modelo común (`web/src/model.ts`)

Área, persona, pieza, estación, evento. Cada conector traduce su plataforma a este modelo; la escena solo conoce el modelo. Sumar un área no toca la escena.

## Reglas de la escena (no negociables)

- **Lo real manda, el ambiente decora.** Eventos reales (pieza movida, creada, comentada, aprobada, ajuste) mandan. Baño, café y estirarse son decoración: nunca aparecen en la ficha de una persona ni en el feed.
- **Presencia por horario laboral** (L–V, America/Bogota): en su puesto; fuera de horario, vacío. No usar la presencia del socket del TaskBoard.
- **La pieza vive en el puesto de su primer asignado.** Estaciones tipo `lugar` (sala de cliente, archivo) guardan sus piezas ahí. Quien opera el tablero aparece en el muro Kanban.
- **Clientes:** ven solo sus áreas, sin nombres de personas (avatar por perfil). El filtro se aplica en el servidor, nunca solo en el navegador.
- Sin texto de comentarios ni adjuntos. Sin agencia de cada persona.

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
- Bundle de producción: 1,2 MB (330 KB gzip), casi todo Three.js. Revisar en el paso 9 (rendimiento).

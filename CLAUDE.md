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

## Diseño (Ogilvy Design System, Claude Design)

No negociables de la marca: solo rojo, negro, grises y blanco (ningún otro tono); esquinas rectas y hairlines; sin degradados, texturas, blur, emojis ni rebote; el wordmark es siempre la imagen del logo; serif para títulos, sans para el resto; numeración y kickers en rojo. Iconografía = formas geométricas de la marca (círculo, medio círculo, cuarto, cuadrado, anillo, achurado, cubo). Tokens en `web/src/index.css` (rojo `#EF3B3A`, negros y grises, hairlines, radio 2px). Fuentes Ogilvy Sans/Serif en `web/public/fonts/` (uso interno). Escena isométrica low-poly estilo WareTrack, en clave Ogilvy: fondo gris claro, piso blanco, acentos rojos.

## Comandos

- `cd web && npm run dev` — desarrollo (puerto 5180).
- `cd web && npm run build` — chequeo de tipos + build.

## Estado

- Ciclo 1 (escena con datos inventados): hecho 2026-10-09, pendiente de validación del look por Imderf.
- Bundle de producción: 1,2 MB (330 KB gzip), casi todo Three.js. Revisar en el paso 9 (rendimiento).

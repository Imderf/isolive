/// <reference types="node" />
// Chequeo de rutas y eventos: node src/sim/sim.check.ts
import assert from 'node:assert/strict'
import { area } from '../mock.ts'
import { construirMapa, ruta } from './rutas.ts'
import { aplicar, simularEvento } from './eventos.ts'
import { quienLaTiene } from './responsable.ts'

const m = construirMapa(area.puestos)
for (const n of m.nodos.keys()) if (n !== 'cafe') assert.ok(ruta(m, 'cafe', n).length > 0, `sin ruta del café a ${n}`)
// Desde un puesto del muro de datos al café: sale al pasillo norte, baja por x=5 y toma el pasillo sur.
const r = ruta(m, 'asiento:d1', 'cafe')
assert.deepEqual(r[0], [-12.5, -1.5])
assert.ok(r.some(([x, z]) => x === 5 && z === 5.6), 'debe pasar por el cruce sureste')
assert.deepEqual(r.at(-1), [7, 8.5])

// Visitantes del cliente: salen de la sala bordeando la mesa y llegan al muro Kanban.
const mv = construirMapa(area.puestos, area.visitas)
const rv = ruta(mv, 'asiento:v1', 'kanban')
assert.deepEqual(rv[0], [-7.8, 3.0])
assert.deepEqual(rv.at(-1), [0, 1.5])

// 500 eventos simulados: nada se pierde ni queda en una etapa que no existe.
let a = area, creadas = 0
const total = (x: typeof area) => x.piezas.length + Object.values(x.archivadas).reduce((s, v) => s + v, 0)
const inicial = total(a)
let seed = 7
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
for (let i = 0; i < 500; i++) {
  const ev = simularEvento(a, '10:00', rnd)
  if (!ev) continue
  if (ev.tipo === 'creada') creadas++
  a = aplicar(a, ev)
}
assert.equal(total(a), inicial + creadas)
assert.ok(a.piezas.every(p => a.etapas.includes(p.etapa) && !(p.etapa in a.archivadas)))
assert.ok(a.piezas.every(p => p.asignados.every(id => a.personas.some(x => x.id === id))))
assert.equal(a.eventos.length, 60)
// Quién la tiene: en Publicación solo puede ser alguien de Social media.
const disenador = area.personas.find(x => x.perfil === 'diseno')!.id
const social = area.personas.find(x => x.perfil === 'social')!.id
const pub = { ...area.piezas[0], etapa: 'Publicación', asignados: [disenador] }
assert.equal(quienLaTiene({ ...area, comentarios: [] }, pub).motivo, 'sin-perfil') // diseño no publica: va a la bandeja
const pedido = { id: 'k', pieza: pub.id, autor: disenador, texto: '@… ¿la publicas?', menciones: [social], fecha: '2026-10-09', hora: '10:00' }
assert.deepEqual(quienLaTiene({ ...area, comentarios: [pedido] }, pub), { persona: social, motivo: 'mencion', por: disenador, fecha: '2026-10-09' })
const idea = { ...area.piezas[0], etapa: 'Ideación', asignados: [disenador] }
assert.equal(quienLaTiene({ ...area, comentarios: [] }, idea).persona, disenador) // en Ideación cualquiera puede tenerla
console.log(`ok · ${m.nodos.size} nodos · ${creadas} creadas · ${a.piezas.length} activas`)

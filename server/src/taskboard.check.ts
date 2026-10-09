// Chequeo del conector: node src/taskboard.check.ts
import assert from 'node:assert/strict'
import { estadoDe, traducir, type ConfigArea } from './taskboard.ts'

assert.equal(estadoDe('', '2026-10-09'), 'normal')
assert.equal(estadoDe('2026-10-08', '2026-10-09'), 'vencida')
assert.equal(estadoDe('2026-10-11', '2026-10-09'), 'urgente')
assert.equal(estadoDe('2026-10-12', '2026-10-09'), 'normal')

const cfg: ConfigArea = {
  id: 'x', conector: { tipo: 'taskboard', proyecto: 'p' }, archivo: ['Finalizado'],
  personas: [{ id: 'u1', perfil: 'data', puesto: 'd1', nombre: 'Ana' }, { id: 'u2', perfil: 'copy', puesto: 'c3' }, { id: 'u9', perfil: 'copy', puesto: 'c1' }],
}
const d = traducir(cfg, {
  lists: [{ id: 'l1', name: 'Ideación' }, { id: 'l2', name: 'Finalizado' }],
  cards: [
    { id: 'c1', title: 'Uno', listId: 'l1', dueDate: '2026-10-08T15:00:00.000Z', completedAt: null, assignees: ['u2', 'externo'] },
    { id: 'c2', title: 'Dos', listId: 'l2', dueDate: null, completedAt: '2026-10-01T00:00:00.000Z', assignees: [] },
  ],
  members: [{ id: 'u1', name: 'ana@correo.com' }, { id: 'u2', name: 'Beto' }, { id: 'externo', name: 'Externo' }],
}, [
  { id: 'a1', type: 'card.moved', actorId: 'u1', cardId: 'c1', createdAt: '2026-10-09T15:30:00.000Z', data: { title: 'Uno', from: 'Señal', to: 'Ideación' } },
  { id: 'a2', type: 'comment.added', actorId: 'externo', cardId: 'c1', createdAt: '2026-10-09T15:31:00.000Z', data: { title: 'Uno' } },
  { id: 'a3', type: 'card.updated', actorId: 'u2', cardId: 'c1', createdAt: '2026-10-09T15:32:00.000Z', data: { title: 'Uno' } },
], new Date('2026-10-09T16:00:00.000Z'))

assert.deepEqual(d.personas.map(p => p.nombre), ['Ana', 'Beto']) // u9 no es miembro; el nombre de config manda sobre el correo
assert.deepEqual(d.archivadas, { Finalizado: 1 })
assert.equal(d.piezas.length, 1)
assert.deepEqual(d.piezas[0].asignados, ['u2']) // quien no está en la mesa no cuenta
assert.equal(d.piezas[0].estado, 'vencida')
assert.equal(d.piezas[0].vence, '2026-10-08')
assert.equal(d.eventos.length, 1) // solo actores de la mesa y tipos que se dibujan
assert.equal(d.eventos[0].hora, '10:30') // hora de Bogotá
assert.equal(d.eventos[0].hasta, 'Ideación')
console.log('ok · conector TaskBoard')

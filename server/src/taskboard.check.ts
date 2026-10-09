// Chequeo del conector: node src/taskboard.check.ts
import assert from 'node:assert/strict'
import { estadoDe, mencionesEnTexto, traducir, type ConfigArea } from './taskboard.ts'

assert.equal(estadoDe('', '2026-10-09'), 'normal')
assert.equal(estadoDe('2026-10-08', '2026-10-09'), 'vencida')
assert.equal(estadoDe('2026-10-11', '2026-10-09'), 'urgente')
assert.equal(estadoDe('2026-10-12', '2026-10-09'), 'normal')

const gente = [{ id: 'a', nombres: ['daniel orjuela'] }, { id: 'b', nombres: ['daniel fabian garcia vesga', 'daniel fabian'] }]
assert.deepEqual(mencionesEnTexto('@Daniel Fabián revisa porfa', gente), ['b'])
assert.deepEqual(mencionesEnTexto('@Daniel revisa', gente), []) // solo el nombre no alcanza: hay dos Daniel

const cfg: ConfigArea = {
  id: 'x', conector: { tipo: 'taskboard', proyecto: 'p' }, archivo: ['Finalizado'],
  personas: [
    { id: 'u1', perfil: 'data', puesto: 'd1', nombre: 'Ana Ruiz' },
    { id: 'u2', perfil: 'copy', puesto: 'c3' },
    { id: 'u3', perfil: 'social', puesto: 's1' },
    { id: 'u9', perfil: 'copy', puesto: 'c1' },
  ],
}
const d = traducir(cfg, {
  lists: [{ id: 'l1', name: 'Ideación' }, { id: 'l2', name: 'Finalizado' }],
  cards: [
    {
      id: 'c1', title: 'Uno', listId: 'l1', dueDate: '2026-10-08T15:00:00.000Z', completedAt: null, assignees: ['u2', 'externo'],
      comments: [
        { id: 'k1', authorId: 'u2', text: '@Beto Paz ya quedó, @Ana Ruiz súbela', mentions: [], createdAt: '2026-10-09T15:32:04.000Z' },
        { id: 'k2', authorId: 'externo', text: 'No es de la mesa', mentions: ['u1'], createdAt: '2026-10-09T15:31:01.000Z' },
      ],
    },
    { id: 'c2', title: 'Dos', listId: 'l2', dueDate: null, completedAt: '2026-10-01T00:00:00.000Z', assignees: [], comments: [] },
  ],
  members: [{ id: 'u1', name: 'ana@correo.com' }, { id: 'u2', name: 'Beto Paz' }, { id: 'u3', name: 'Caro Díaz' }, { id: 'externo', name: 'Externo' }],
}, [
  { id: 'a1', type: 'card.moved', actorId: 'u1', cardId: 'c1', createdAt: '2026-10-09T15:30:00.000Z', data: { title: 'Uno', from: 'Señal', to: 'Ideación' } },
  { id: 'a2', type: 'comment.added', actorId: 'externo', cardId: 'c1', createdAt: '2026-10-09T15:31:00.000Z', data: { title: 'Uno' } },
  { id: 'a3', type: 'card.updated', actorId: 'u2', cardId: 'c1', createdAt: '2026-10-09T15:32:00.000Z', data: { title: 'Uno' } },
  { id: 'a4', type: 'comment.added', actorId: 'u2', cardId: 'c1', createdAt: '2026-10-09T15:32:05.000Z', data: { title: 'Uno' } },
], new Date('2026-10-09T16:00:00.000Z'))

assert.deepEqual(d.personas.map(p => p.nombre), ['Ana Ruiz', 'Beto Paz', 'Caro Díaz']) // u9 no es miembro; el nombre de config manda sobre el correo
assert.deepEqual(d.archivadas, { Finalizado: 1 })
assert.equal(d.piezas.length, 1)
assert.deepEqual(d.piezas[0].asignados, ['u2']) // quien no está en la mesa no cuenta
assert.equal(d.piezas[0].estado, 'vencida')
assert.equal(d.eventos.length, 2) // solo actores de la mesa y tipos que se dibujan
assert.equal(d.eventos[1].hora, '10:30') // hora de Bogotá; más nuevo primero
assert.equal(d.eventos[0].texto, '@Beto Paz ya quedó, @Ana Ruiz súbela') // el comentario se cruza con su evento
assert.equal(d.comentarios.length, 1) // solo autores de la mesa
assert.deepEqual(d.comentarios[0].menciones.sort(), ['u1', 'u2']) // menciones escritas a mano
console.log('ok · conector TaskBoard')

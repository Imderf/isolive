import { estacionDe, type Area, type Evento, type Pieza } from '../model'
import { enHorario } from './horario'
import { burbuja, cambiar, encolar, visual } from './visual'

type V3 = [number, number, number]

// Altura de la superficie de cada lugar (mesa de la sala, estante, caneca, nevera).
const ALTURA: Record<string, number> = { cliente: 0.5, archivo: 0.56, descarte: 0.88, congelador: 2.0 }

// Dónde se ve una pieza: nodo de la red (para ir a buscarla) y punto 3D (para dibujarla mientras espera).
function lugarDe(a: Area, p: Pieza): { nodo: string; pos: V3; color: string } {
  const est = estacionDe(a, p.etapa)
  if (est.tipo === 'lugar') return { nodo: est.id, pos: [est.ancla[0], ALTURA[est.id] ?? 0.5, est.ancla[1]], color: est.color }
  const persona = a.personas.find(y => y.id === p.asignados[0])
  if (!persona) return { nodo: `bandeja:${est.id}`, pos: [est.ancla[0], 0.56, est.ancla[1]], color: est.color }
  const pu = a.puestos.find(x => x.id === persona.puesto)!
  return { nodo: `asiento:${pu.id}`, pos: [pu.pos[0] - 0.4, 0.85, pu.pos[1] + 0.12], color: est.color }
}

// Traduce un evento real a movimiento. Lo real manda: estas órdenes se atienden antes que la vida de oficina.
export function coreografiar(antes: Area, despues: Area, ev: Evento) {
  if (!enHorario()) return
  if (ev.tipo === 'comentario') return burbuja(ev.actor, 'Comentó')
  if (ev.tipo === 'creada') return burbuja(ev.actor, 'Nueva señal')
  if (ev.tipo !== 'movida' || !ev.hasta) return

  const p0 = antes.piezas.find(p => p.id === ev.pieza)
  if (!p0) return
  const p1 = despues.piezas.find(p => p.id === ev.pieza) // no existe si se archivó
  const est = estacionDe(despues, ev.hasta)
  const origen = lugarDe(antes, p0)
  const destino = p1 ? lugarDe(despues, p1) : { nodo: est.id, color: est.color }
  const cargador = (ev.asignados ?? p0.asignados).find(id => despues.personas.some(x => x.id === id)) ?? ev.actor

  if (origen.nodo === destino.nodo) burbuja(cargador, `→ ${ev.hasta}`)
  else {
    cambiar(() => {
      visual.fantasmas.set(p0.id, { p: origen.pos, color: origen.color })
      if (p1) visual.ocultas.add(p0.id)
    })
    encolar(cargador, [
      { ir: origen.nodo },
      { recoger: p0.id, color: destino.color },
      { ir: destino.nodo, jitter: destino.nodo === 'cliente' },
      { esperar: 1, pose: 'parado', mira: destino.nodo },
      { dejar: p0.id },
    ])
  }
  // Quien opera el tablero aparece en el muro Kanban.
  if (ev.actor !== cargador) encolar(ev.actor, [{ ir: 'kanban', jitter: true }, { esperar: 5, pose: 'tablero', mira: 'kanban' }])
}

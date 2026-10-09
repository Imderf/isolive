import { estacionDe, type Area, type Evento, type Perfil, type Pieza } from '../model.ts'

// Aplica un evento al estado del área. Es lo único que cambia los datos: el conector real (ciclo 3)
// y el simulador de prueba entregan eventos con esta misma forma.
export function aplicar(a: Area, ev: Evento): Area {
  let { piezas, archivadas } = a
  if (ev.tipo === 'movida' && ev.hasta) {
    if (ev.hasta in archivadas) {
      piezas = piezas.filter(p => p.id !== ev.pieza)
      archivadas = { ...archivadas, [ev.hasta]: archivadas[ev.hasta] + 1 }
    } else {
      piezas = piezas.map(p => (p.id === ev.pieza ? { ...p, etapa: ev.hasta!, asignados: ev.asignados ?? p.asignados } : p))
    }
  }
  if (ev.tipo === 'creada' && ev.nueva) piezas = [...piezas, ev.nueva]
  let { comentarios } = a
  if (ev.tipo === 'comentario' && ev.texto) {
    comentarios = [{ id: ev.id, pieza: ev.pieza, autor: ev.actor, texto: ev.texto, fecha: ev.fecha ?? '', hora: ev.hora }, ...comentarios].slice(0, 300)
  }
  return { ...a, piezas, archivadas, comentarios, eventos: [ev, ...a.eventos].slice(0, 60) }
}

// ── Simulador de prueba (solo con datos inventados) ───────────────────────────────────────────

const SIGUIENTE: Record<string, string> = {
  'Señal detectada': 'Identificación/Viabilidad',
  'Identificación/Viabilidad': 'Ideación',
  Monitoreo: 'Ideación',
  Ideación: 'En producción',
  'En producción': 'Validación Cliente',
  'Validación Cliente': 'Publicación',
  Publicación: 'Seguimiento (Performance)',
  'Seguimiento (Performance)': 'Finalizado',
}
// Quién suele trabajar cada estación: si el responsable no es de ese perfil, la pieza cambia de manos.
const PERFILES_ESTACION: Record<string, Perfil[]> = {
  datos: ['data'], estrategia: ['estrategia', 'copy'], creativo: ['diseno', 'copy'], publicacion: ['social'],
}
const OPERADOR = 'p3' // quien más mueve tarjetas en el tablero

let n = 0
// `libre` deja por fuera las piezas que van en tránsito en la escena.
export function simularEvento(a: Area, hora: string, rnd = Math.random, libre = (_id: string) => true): Evento | null {
  const elegir = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]
  const id = `sim${++n}`
  const r = rnd()

  if (r < 0.6) {
    const candidatas = a.piezas.filter(p => SIGUIENTE[p.etapa] && libre(p.id))
    if (!candidatas.length) return null
    const p = elegir(candidatas)
    let hasta = SIGUIENTE[p.etapa]
    if (p.etapa === 'Validación Cliente' && rnd() < 0.2) hasta = 'No Aprobado'
    if (p.etapa === 'Ideación' && rnd() < 0.1) hasta = 'Freezing'
    let asignados = p.asignados
    const est = estacionDe(a, hasta)
    const perfiles = PERFILES_ESTACION[est.id]
    const actual = a.personas.find(x => x.id === p.asignados[0])
    if (perfiles && actual && !perfiles.includes(actual.perfil)) {
      asignados = [elegir(a.personas.filter(x => perfiles.includes(x.perfil))).id]
    }
    const actor = rnd() < 0.5 ? OPERADOR : asignados[0]
    return { id, hora, tipo: 'movida', actor, pieza: p.id, titulo: p.titulo, desde: p.etapa, hasta, asignados }
  }

  if (r < 0.88) {
    const p = elegir(a.piezas)
    const texto = elegir(['Ya subí la versión 2 con los ajustes', '¿El cliente ya aprobó el copy?', 'Cambié el arte según el feedback', 'Esta tendencia está creciendo, hay que moverla rápido', 'Falta la pieza para stories', 'Listo para validación'])
    return { id, hora, tipo: 'comentario', actor: elegir(p.asignados), pieza: p.id, titulo: p.titulo, texto }
  }

  const autor = elegir(a.personas.filter(x => x.perfil === 'data'))
  const nueva: Pieza = {
    id: `n${n}`, titulo: `Señal · ${elegir(['búsquedas en alza', 'conversación viral', 'meme del día', 'pico de menciones'])} · ${elegir(['Dove', 'Sedal', "Pond's", 'Fruco', 'Rexona'])}`,
    etapa: 'Señal detectada', asignados: [autor.id], vence: '2026-10-24', estado: 'normal',
  }
  return { id, hora, tipo: 'creada', actor: autor.id, pieza: nueva.id, titulo: nueva.titulo, nueva }
}

import type { Comentario, DatosArea, Evento, Perfil, Persona, Pieza } from '../../web/src/model.ts'

// Conector del TaskBoard (management.colombiaogilvy.com): lee /api/live con la llave de servicio
// y traduce el tablero al modelo común. La disposición 3D (estaciones, puestos) la pone el web.

export interface ConfigArea {
  id: string
  conector: { tipo: 'taskboard'; proyecto: string }
  archivo: string[] // columnas que solo se cuentan
  personas: { id: string; perfil: Perfil; puesto: string; nombre?: string }[]
}
export interface Origen { url: string; token: string }

export interface ComentarioTB { id: string; authorId: string; text: string; mentions: string[]; createdAt: string }
export interface Estado {
  lists: { id: string; name: string }[]
  cards: {
    id: string; title: string; listId: string; dueDate: string | null; completedAt: string | null
    assignees: string[]; comments: ComentarioTB[] // últimos 5, más nuevo primero
  }[]
  members: { id: string; name: string }[]
}
export interface Actividad {
  id: string; type: string; actorId: string; cardId: string | null; createdAt: string
  data: { title?: string; from?: string; to?: string }
}

async function pedir<T>(o: Origen, ruta: string): Promise<T> {
  const r = await fetch(`${o.url}/api/live${ruta}`, { headers: { authorization: `Bearer ${o.token}` }, signal: AbortSignal.timeout(8000) })
  if (!r.ok) throw new Error(`TaskBoard respondió ${r.status} en ${ruta.split('?')[0]}`)
  return (await r.json()) as T
}

const fechaBogota = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(d) // YYYY-MM-DD
const horaBogota = (d: Date) =>
  new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)
const normal = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Vencida si la fecha límite ya pasó; urgente si vence hoy o en los próximos dos días.
export function estadoDe(vence: string, hoy: string): Pieza['estado'] {
  if (!vence) return 'normal'
  if (vence < hoy) return 'vencida'
  const dias = (Date.parse(vence) - Date.parse(hoy)) / 86_400_000
  return dias <= 2 ? 'urgente' : 'normal'
}

// "@Nombre Apellido" escrito a mano (sin la mención del autocompletado). Pide nombre y apellido para no confundir a los dos Daniel.
export function mencionesEnTexto(texto: string, personas: { id: string; nombres: string[] }[]): string[] {
  const t = normal(texto)
  return personas.filter(p => p.nombres.some(n => t.includes(`@${n}`))).map(p => p.id)
}

export const leerEstado = (cfg: ConfigArea, o: Origen) => pedir<Estado>(o, `/projects/${cfg.conector.proyecto}/state`)
// Actividad posterior a `desde` (ISO), en orden; el management devuelve hasta 200 por consulta.
export const leerActividad = (cfg: ConfigArea, o: Origen, desde: string) =>
  pedir<Actividad[]>(o, `/projects/${cfg.conector.proyecto}/activity?since=${encodeURIComponent(desde)}`)

// Completa un evento nuevo con lo que el web necesita para aplicarlo y animarlo sin esperar el estado.
export function enriquecer(e: Evento, d: DatosArea): Evento {
  const pieza = d.piezas.find(p => p.id === e.pieza)
  if (e.tipo === 'movida' && pieza) return { ...e, asignados: pieza.asignados }
  if (e.tipo === 'creada' && pieza) return { ...e, nueva: pieza }
  if (e.tipo === 'comentario') return { ...e, menciones: d.comentarios.find(c => c.pieza === e.pieza && c.texto === e.texto)?.menciones ?? [] }
  return e
}

export function traducir(cfg: ConfigArea, estado: Estado, actividad: Actividad[], ahora: Date): DatosArea {
  const nombres = new Map(estado.members.map(m => [m.id, m.name]))
  const personas: Persona[] = cfg.personas
    .filter(p => nombres.has(p.id))
    .map(p => ({ id: p.id, nombre: p.nombre ?? nombres.get(p.id)!, perfil: p.perfil, puesto: p.puesto }))
  const enMesa = new Set(personas.map(p => p.id))
  const paraMencion = personas.map(p => ({
    id: p.id,
    nombres: [...new Set([p.nombre, nombres.get(p.id)!].filter(n => !n.includes('@')).flatMap(n => {
      const t = normal(n).split(/\s+/)
      return [t.join(' '), t.slice(0, 2).join(' ')]
    }).filter(n => n.includes(' ')))],
  }))
  const columna = new Map(estado.lists.map(l => [l.id, l.name]))
  const hoy = fechaBogota(ahora)

  const archivadas: Record<string, number> = Object.fromEntries(cfg.archivo.map(n => [n, 0]))
  const piezas: Pieza[] = []
  const comentarios: (Comentario & { creado: number })[] = []
  for (const c of estado.cards) {
    const etapa = columna.get(c.listId)
    if (!etapa) continue
    if (etapa in archivadas) { archivadas[etapa]++; continue }
    const vence = c.dueDate ? fechaBogota(new Date(c.dueDate)) : ''
    piezas.push({
      id: c.id, titulo: c.title, etapa,
      asignados: c.assignees.filter(id => enMesa.has(id)), // quien no está en la mesa no tiene puesto
      vence, estado: c.completedAt ? 'normal' : estadoDe(vence, hoy),
    })
    for (const k of c.comments) {
      if (!enMesa.has(k.authorId)) continue
      const d = new Date(k.createdAt)
      const menciones = [...new Set([...k.mentions, ...mencionesEnTexto(k.text, paraMencion)])].filter(id => enMesa.has(id))
      comentarios.push({ id: k.id, pieza: c.id, autor: k.authorId, texto: k.text, menciones, fecha: fechaBogota(d), hora: horaBogota(d), creado: d.getTime() })
    }
  }
  comentarios.sort((a, b) => b.creado - a.creado)

  const eventos = actividad
    .filter(a => a.cardId && enMesa.has(a.actorId))
    .map(a => evento(a, comentarios))
    .filter((e): e is Evento => e !== null)
    .reverse()
    .slice(0, 60)
  return {
    etapas: estado.lists.map(l => l.name), personas, piezas, archivadas, eventos,
    comentarios: comentarios.map(({ creado: _c, ...c }) => c),
  }
}

// El comentario de un 'comment.added' es el de la misma tarjeta y autor creado en el mismo instante (±10 s).
export function evento(a: Actividad, comentarios: (Comentario & { creado: number })[] = []): Evento | null {
  const d = new Date(a.createdAt)
  const base = { id: a.id, fecha: fechaBogota(d), hora: horaBogota(d), actor: a.actorId, pieza: a.cardId!, titulo: a.data.title ?? '' }
  if (a.type === 'card.moved') return { ...base, tipo: 'movida', desde: a.data.from, hasta: a.data.to }
  if (a.type === 'card.created') return { ...base, tipo: 'creada' }
  if (a.type === 'comment.added') {
    const c = comentarios.find(x => x.pieza === a.cardId && x.autor === a.actorId && Math.abs(x.creado - d.getTime()) <= 10_000)
    return { ...base, tipo: 'comentario', texto: c?.texto }
  }
  return null
}

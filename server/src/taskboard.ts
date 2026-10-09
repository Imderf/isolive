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

interface Estado {
  lists: { id: string; name: string }[]
  cards: { id: string; title: string; listId: string; dueDate: string | null; completedAt: string | null; assignees: string[] }[]
  members: { id: string; name: string }[]
}
export interface ComentarioTB { id: string; cardId: string; authorId: string; text: string; createdAt: string }
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

// Vencida si la fecha límite ya pasó; urgente si vence hoy o en los próximos dos días.
export function estadoDe(vence: string, hoy: string): Pieza['estado'] {
  if (!vence) return 'normal'
  if (vence < hoy) return 'vencida'
  const dias = (Date.parse(vence) - Date.parse(hoy)) / 86_400_000
  return dias <= 2 ? 'urgente' : 'normal'
}

export async function leerArea(cfg: ConfigArea, o: Origen, ahora = new Date()): Promise<DatosArea> {
  const p = cfg.conector.proyecto
  const desde = new Date(ahora.getTime() - 3 * 86_400_000).toISOString() // feed inicial: últimos 3 días
  const [estado, actividad, comentarios] = await Promise.all([
    pedir<Estado>(o, `/projects/${p}/state`),
    pedir<Actividad[]>(o, `/projects/${p}/activity?since=${encodeURIComponent(desde)}`),
    pedir<ComentarioTB[]>(o, `/projects/${p}/comments`),
  ])
  return traducir(cfg, estado, actividad, comentarios, ahora)
}

export function traducir(cfg: ConfigArea, estado: Estado, actividad: Actividad[], comentariosTB: ComentarioTB[], ahora: Date): DatosArea {
  const nombres = new Map(estado.members.map(m => [m.id, m.name]))
  const personas: Persona[] = cfg.personas
    .filter(p => nombres.has(p.id))
    .map(p => ({ id: p.id, nombre: p.nombre ?? nombres.get(p.id)!, perfil: p.perfil, puesto: p.puesto }))
  const enMesa = new Set(personas.map(p => p.id))
  const columna = new Map(estado.lists.map(l => [l.id, l.name]))
  const hoy = fechaBogota(ahora)

  const archivadas: Record<string, number> = Object.fromEntries(cfg.archivo.map(n => [n, 0]))
  const piezas: Pieza[] = []
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
  }

  const deMesa = comentariosTB.filter(c => enMesa.has(c.authorId))
  const eventos = actividad
    .filter(a => a.cardId && enMesa.has(a.actorId))
    .map(a => evento(a, deMesa))
    .filter((e): e is Evento => e !== null)
    .reverse()
    .slice(0, 60)
  const comentarios: Comentario[] = deMesa.map(c => {
    const d = new Date(c.createdAt)
    return { id: c.id, pieza: c.cardId, autor: c.authorId, texto: c.text, fecha: fechaBogota(d), hora: horaBogota(d) }
  }).reverse()
  return { etapas: estado.lists.map(l => l.name), personas, piezas, archivadas, eventos, comentarios }
}

// El comentario de un 'comment.added' es el de la misma tarjeta y autor creado en el mismo instante (±10 s).
export function evento(a: Actividad, comentarios: ComentarioTB[] = []): Evento | null {
  const d = new Date(a.createdAt)
  const base = { id: a.id, fecha: fechaBogota(d), hora: horaBogota(d), actor: a.actorId, pieza: a.cardId!, titulo: a.data.title ?? '' }
  if (a.type === 'card.moved') return { ...base, tipo: 'movida', desde: a.data.from, hasta: a.data.to }
  if (a.type === 'card.created') return { ...base, tipo: 'creada' }
  if (a.type === 'comment.added') {
    const c = comentarios.find(x => x.cardId === a.cardId && x.authorId === a.actorId && Math.abs(Date.parse(x.createdAt) - d.getTime()) <= 10_000)
    return { ...base, tipo: 'comentario', texto: c?.text }
  }
  return null
}

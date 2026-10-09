import type { DatosArea, Evento, Perfil, Persona, Pieza } from '../../web/src/model.ts'

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
  const [estado, actividad] = await Promise.all([
    pedir<Estado>(o, `/projects/${p}/state`),
    pedir<Actividad[]>(o, `/projects/${p}/activity?since=${encodeURIComponent(desde)}`),
  ])
  return traducir(cfg, estado, actividad, ahora)
}

export function traducir(cfg: ConfigArea, estado: Estado, actividad: Actividad[], ahora: Date): DatosArea {
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

  const eventos = actividad
    .filter(a => a.cardId && enMesa.has(a.actorId))
    .map(evento)
    .filter((e): e is Evento => e !== null)
    .reverse()
    .slice(0, 60)
  return { etapas: estado.lists.map(l => l.name), personas, piezas, archivadas, eventos }
}

export function evento(a: Actividad): Evento | null {
  const d = new Date(a.createdAt)
  const base = { id: a.id, fecha: fechaBogota(d), hora: horaBogota(d), actor: a.actorId, pieza: a.cardId!, titulo: a.data.title ?? '' }
  if (a.type === 'card.moved') return { ...base, tipo: 'movida', desde: a.data.from, hasta: a.data.to }
  if (a.type === 'card.created') return { ...base, tipo: 'creada' }
  if (a.type === 'comment.added') return { ...base, tipo: 'comentario' }
  return null
}

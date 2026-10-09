import { createHash } from 'node:crypto'
import type { Response } from 'express'
import type { DatosArea } from '../../web/src/model.ts'
import { enriquecer, leerActividad, leerEstado, traducir, type Actividad, type ConfigArea, type Origen } from './taskboard.ts'

// Mantiene cada área al día: sondea la actividad del TaskBoard cada 5 s y, cuando hay algo nuevo, trae el
// estado fresco y lo empuja a los navegadores por SSE. Cada 60 s refresca el estado aunque no haya actividad
// (reasignaciones o fechas no generan actividad que Ogilvy Live dibuje).
const CADA = 5_000, REFRESCO = 60_000, VENTANA = 3 * 86_400_000

interface Sala {
  cfg: ConfigArea
  datos?: DatosArea
  actividad: Actividad[] // últimos 3 días, para el feed
  cursor: string // createdAt de la última actividad vista
  huella: string
  ultimo: number // último refresco del estado
  clientes: Set<Response>
  conectado: boolean
}

const mensaje = (tipo: string, data: unknown) => `event: ${tipo}\ndata: ${JSON.stringify(data)}\n\n`

export function crearVivo(areas: ConfigArea[], origen: Origen) {
  const salas = new Map<string, Sala>(areas.map(cfg => [cfg.id, {
    cfg, actividad: [], cursor: new Date(Date.now() - VENTANA).toISOString(), huella: '', ultimo: 0, clientes: new Set(), conectado: false,
  }]))
  const enviar = (s: Sala, tipo: string, data: unknown) => { const m = mensaje(tipo, data); for (const c of s.clientes) c.write(m) }

  async function refrescar(s: Sala, nuevas: Actividad[], anunciar: boolean) {
    const ahora = new Date()
    s.actividad = [...s.actividad, ...nuevas].filter(a => ahora.getTime() - Date.parse(a.createdAt) < VENTANA).slice(-400)
    const datos = traducir(s.cfg, await leerEstado(s.cfg, origen), s.actividad, ahora)
    s.datos = datos
    s.ultimo = Date.now()
    if (anunciar) {
      const ids = new Set(nuevas.map(a => a.id))
      for (const e of [...datos.eventos].reverse()) if (ids.has(e.id)) enviar(s, 'evento', enriquecer(e, datos))
    }
    const huella = createHash('sha1').update(JSON.stringify(datos)).digest('hex')
    if (huella !== s.huella) { s.huella = huella; enviar(s, 'estado', datos) }
  }

  // Primera carga: trae los 3 días completos (por páginas de 200) sin anunciarlos como eventos nuevos.
  async function iniciar(s: Sala) {
    let pagina: Actividad[]
    do {
      pagina = await leerActividad(s.cfg, origen, s.cursor)
      if (pagina.length) { s.actividad.push(...pagina); s.cursor = pagina[pagina.length - 1].createdAt }
    } while (pagina.length === 200)
    await refrescar(s, [], false)
  }

  async function ciclo(s: Sala) {
    try {
      if (!s.datos) await iniciar(s)
      else {
        const nuevas = await leerActividad(s.cfg, origen, s.cursor)
        if (nuevas.length) s.cursor = nuevas[nuevas.length - 1].createdAt
        if (nuevas.length || Date.now() - s.ultimo > REFRESCO) await refrescar(s, nuevas, true)
      }
      if (!s.conectado) { s.conectado = true; enviar(s, 'conexion', { ok: true }) }
    } catch (err) {
      console.error(`[vivo] ${s.cfg.id}:`, err instanceof Error ? err.message : err)
      if (s.conectado) { s.conectado = false; enviar(s, 'conexion', { ok: false }) }
    }
  }

  // Un ciclo a la vez: si el TaskBoard se demora, no se acumulan consultas.
  let corriendo = false
  const latido = async () => {
    if (corriendo) return
    corriendo = true
    for (const s of salas.values()) await ciclo(s)
    corriendo = false
  }
  void latido()
  setInterval(latido, CADA)
  setInterval(() => { for (const s of salas.values()) for (const c of s.clientes) c.write(': ping\n\n') }, 25_000) // Cloudflare corta a los 100 s sin datos

  return {
    existe: (id: string) => salas.has(id),
    // Espera la primera sincronización (la hace el latido; no se lanza otra en paralelo), máximo 15 s.
    async datos(id: string) {
      const s = salas.get(id)!
      for (let i = 0; !s.datos && i < 50; i++) await new Promise(r => setTimeout(r, 300))
      return s.datos
    },
    suscribir(id: string, res: Response) {
      const s = salas.get(id)!
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
      res.write('retry: 5000\n\n')
      if (s.datos) res.write(mensaje('estado', s.datos))
      res.write(mensaje('conexion', { ok: s.conectado }))
      s.clientes.add(res)
      res.on('close', () => s.clientes.delete(res))
    },
  }
}

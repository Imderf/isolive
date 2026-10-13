import { readFileSync, readdirSync } from 'node:fs'
import express, { type ErrorRequestHandler } from 'express'
import type { ConfigArea, Origen } from './taskboard.ts'
import { crearVivo } from './vivo.ts'

const PORT = Number(process.env.PORT ?? 4100)
const taskboard: Origen = { url: process.env.TASKBOARD_URL ?? '', token: process.env.TASKBOARD_TOKEN ?? '' }
if (!taskboard.url || !taskboard.token) {
  console.error('Faltan TASKBOARD_URL o TASKBOARD_TOKEN en .env')
  process.exit(1)
}

// Un archivo por área en server/areas. Un área sin personas todavía (la Mesa Demo antes de sus cuentas) no se sirve
// y el web la muestra con datos de prueba.
const AREAS = new URL('../areas/', import.meta.url)
const areas = readdirSync(AREAS).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(new URL(f, AREAS), 'utf8')) as ConfigArea)
const vivo = crearVivo(areas.filter(a => a.personas.length), taskboard)

const app = express()
app.disable('x-powered-by')

app.get('/api/salud', (_req, res) => { res.json({ ok: true }) })

// Estado actual del área (desde la caché; no consulta al TaskBoard en cada carga).
app.get('/api/areas/:id', async (req, res, next) => {
  if (!vivo.existe(req.params.id)) { res.status(404).json({ error: 'Área no encontrada' }); return }
  try {
    const datos = await vivo.datos(req.params.id)
    if (!datos) { res.status(502).json({ error: 'No se pudo leer la plataforma de origen' }); return }
    res.json(datos)
  } catch (err) { next(err) }
})

// Eventos en vivo (Server-Sent Events): 'estado', 'evento' y 'conexion'.
app.get('/api/areas/:id/eventos', (req, res) => {
  if (!vivo.existe(req.params.id)) { res.status(404).json({ error: 'Área no encontrada' }); return }
  vivo.suscribir(req.params.id, res)
})

const errores: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('[error]', err instanceof Error ? err.message : err)
  res.status(502).json({ error: 'No se pudo leer la plataforma de origen' })
}
app.use(errores)

app.listen(PORT, () => console.log(`Ogilvy Live (servidor) en http://localhost:${PORT}`))

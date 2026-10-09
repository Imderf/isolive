import { readFileSync } from 'node:fs'
import express, { type ErrorRequestHandler } from 'express'
import { leerArea, type ConfigArea, type Origen } from './taskboard.ts'

const PORT = Number(process.env.PORT ?? 4100)
const taskboard: Origen = { url: process.env.TASKBOARD_URL ?? '', token: process.env.TASKBOARD_TOKEN ?? '' }
if (!taskboard.url || !taskboard.token) {
  console.error('Faltan TASKBOARD_URL o TASKBOARD_TOKEN en .env')
  process.exit(1)
}

const leer = (archivo: string) => JSON.parse(readFileSync(new URL(`../areas/${archivo}`, import.meta.url), 'utf8')) as ConfigArea
const areas: ConfigArea[] = [leer('mesa-social-media.json')]

const app = express()
app.disable('x-powered-by')

app.get('/api/salud', (_req, res) => { res.json({ ok: true }) })

// ponytail: cada consulta va al TaskBoard; el ciclo 4 agrega caché, sondeo de eventos y SSE.
app.get('/api/areas/:id', async (req, res, next) => {
  const cfg = areas.find(a => a.id === req.params.id)
  if (!cfg) { res.status(404).json({ error: 'Área no encontrada' }); return }
  try { res.json(await leerArea(cfg, taskboard)) } catch (err) { next(err) }
})

const errores: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('[error]', err instanceof Error ? err.message : err)
  res.status(502).json({ error: 'No se pudo leer la plataforma de origen' })
}
app.use(errores)

app.listen(PORT, () => console.log(`Ogilvy Live (servidor) en http://localhost:${PORT}`))

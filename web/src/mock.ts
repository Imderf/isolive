// Datos inventados para el ciclo 1. Nombres y títulos no son reales; las cantidades por etapa sí
// siguen la distribución del tablero Social First (2026-10-09).
import type { Area, Evento, Persona, Pieza, Perfil } from './model.ts'
import { disposicion } from './areas/mesa-social-media.ts'

const etapas = [
  'Señal detectada', 'Identificación/Viabilidad', 'Monitoreo', 'Ideación', 'En producción',
  'Validación Cliente', 'Publicación', 'Seguimiento (Performance)', 'Finalizado', 'No Aprobado', 'Freezing',
]

const personas: Persona[] = (
  [
    ['Laura Méndez', 'coordinacion', 'k1'], ['Andrés Pardo', 'coordinacion', 'k2'],
    ['Felipe Rojas', 'estrategia', 'e1'], ['Natalia Cruz', 'estrategia', 'e2'],
    ['Camilo Torres', 'diseno', 'c1'], ['Valentina Ríos', 'diseno', 'c2'], ['Sara Gómez', 'copy', 'c3'],
    ['Juliana Mora', 'social', 's1'], ['Mateo Silva', 'social', 's2'], ['Daniela Vega', 'social', 's3'], ['Paula Ortiz', 'social', 's4'],
    ['Santiago León', 'data', 'd1'], ['Carolina Díaz', 'data', 'd2'], ['Tomás Herrera', 'data', 'd3'],
  ] as [string, Perfil, string][]
).map(([nombre, perfil, puesto], i) => ({ id: `p${i + 1}`, nombre, perfil, puesto }))

const ids = (...perfiles: Perfil[]) => personas.filter(p => perfiles.includes(p.perfil)).map(p => p.id)

// etapa → [cantidad activa, quiénes la suelen tener]
const activas: [string, number, string[]][] = [
  ['Señal detectada', 1, ids('data')],
  ['Identificación/Viabilidad', 1, ids('estrategia')],
  ['Monitoreo', 9, ids('data')],
  ['Ideación', 26, ids('estrategia', 'copy', 'diseno')],
  ['En producción', 1, ids('diseno')],
  ['Validación Cliente', 4, ids('coordinacion')],
  ['Publicación', 1, ids('social')],
  ['Seguimiento (Performance)', 2, ids('data')],
]

const formatos = ['Reel', 'Carrusel', 'Post', 'Story', 'TikTok', 'Live']
const marcas = ['Dove', 'Rexona', 'Sedal', "Pond's", 'Fruco', 'Maizena', 'Savital', 'Ego']
const temas = ['tendencia de la semana', 'Halloween', 'quincena', 'regreso a clases', 'Black Friday', 'Navidad', 'fútbol', 'recetas rápidas', 'rutina de noche', 'amor y amistad']

let n = 0
const piezas: Pieza[] = activas.flatMap(([etapa, cant, quienes]) =>
  Array.from({ length: cant }, (_, i) => {
    n++
    const estado = n % 13 === 0 ? 'vencida' : n % 9 === 0 ? 'urgente' : 'normal'
    const dia = estado === 'vencida' ? 6 : estado === 'urgente' ? 10 : 14 + (n % 12)
    return {
      id: `t${n}`,
      titulo: `${formatos[n % formatos.length]} · ${temas[(n * 7) % temas.length]} · ${marcas[(n * 3) % marcas.length]}`,
      etapa,
      asignados: n % 4 === 0 ? [quienes[i % quienes.length], quienes[(i + 1) % quienes.length]] : [quienes[i % quienes.length]],
      vence: `2026-10-${String(dia).padStart(2, '0')}`,
      estado,
    } satisfies Pieza
  }),
)

export const area: Area = {
  etapas,
  ...disposicion,
  personas,
  piezas,
  archivadas: { Finalizado: 32, 'No Aprobado': 48, Freezing: 13 },
  eventos: ([
    { id: 'v1', hora: '10:41', tipo: 'movida', actor: 'p3', pieza: 't40', desde: 'Ideación', hasta: 'Validación Cliente' },
    { id: 'v2', hora: '10:37', tipo: 'comentario', actor: 'p7', pieza: 't20' },
    { id: 'v3', hora: '10:22', tipo: 'movida', actor: 'p12', pieza: 't5', desde: 'Señal detectada', hasta: 'Monitoreo' },
    { id: 'v4', hora: '10:09', tipo: 'creada', actor: 'p13', pieza: 't1' },
    { id: 'v5', hora: '09:56', tipo: 'asignada', actor: 'p1', pieza: 't41' },
    { id: 'v6', hora: '09:48', tipo: 'movida', actor: 'p5', pieza: 't38', desde: 'Ideación', hasta: 'En producción' },
    { id: 'v7', hora: '09:31', tipo: 'comentario', actor: 'p9', pieza: 't44' },
    { id: 'v8', hora: '09:15', tipo: 'movida', actor: 'p8', pieza: 't43', desde: 'Validación Cliente', hasta: 'Publicación' },
  ] as Omit<Evento, 'titulo'>[]).map(e => ({ ...e, titulo: piezas.find(p => p.id === e.pieza)!.titulo })),
}

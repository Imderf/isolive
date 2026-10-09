// Datos inventados para el ciclo 1. Nombres y títulos no son reales; las cantidades por etapa sí
// siguen la distribución del tablero Social First (2026-10-09).
import type { Area, Persona, Pieza, Perfil } from './model'

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
  id: 'mesa-social-media',
  nombre: 'Mesa de Social Media',
  cliente: 'Unilever',
  etapas,
  estaciones: [
    { id: 'datos', nombre: 'Muro de datos', etapas: ['Señal detectada', 'Monitoreo', 'Seguimiento (Performance)'], tipo: 'trabajo', color: '#0A0A0A', zona: [-14, -9.4, -6, -2.6], ancla: [-10, -9] },
    { id: 'estrategia', nombre: 'Mesa de estrategia', etapas: ['Identificación/Viabilidad', 'Ideación'], tipo: 'trabajo', color: '#4D4D4D', zona: [-4, -9.4, 4, -2.6], ancla: [0, -9] },
    { id: 'creativo', nombre: 'Estudio creativo', etapas: ['En producción'], tipo: 'trabajo', color: '#8C8C8C', zona: [6, -9.4, 14, -2.6], ancla: [10, -9] },
    { id: 'cliente', nombre: 'Sala de cliente', etapas: ['Validación Cliente'], tipo: 'lugar', color: '#EF3B3A', zona: [-14, 1, -6, 7.6], ancla: [-10, 4.3] },
    { id: 'publicacion', nombre: 'Pantalla de publicación', etapas: ['Publicación'], tipo: 'trabajo', color: '#C7C7C7', zona: [6, 1, 14, 7.6], ancla: [10, 1.4] },
    { id: 'archivo', nombre: 'Archivo', etapas: ['Finalizado'], tipo: 'lugar', color: '#E4E4E4', zona: [-4.5, 6.2, -1.5, 9.4], ancla: [-3, 7.8] },
    { id: 'descarte', nombre: 'Descarte', etapas: ['No Aprobado'], tipo: 'lugar', color: '#4D4D4D', zona: [-1.5, 6.2, 1.5, 9.4], ancla: [0, 7.8] },
    { id: 'congelador', nombre: 'Congelador', etapas: ['Freezing'], tipo: 'lugar', color: '#C7C7C7', zona: [1.5, 6.2, 4.5, 9.4], ancla: [3, 7.8] },
  ],
  puestos: [
    { id: 'd1', pos: [-12.5, -5.2], rot: 0 }, { id: 'd2', pos: [-10, -5.2], rot: 0 }, { id: 'd3', pos: [-7.5, -5.2], rot: 0 },
    { id: 'e1', pos: [-1.2, -5.2], rot: 0 }, { id: 'e2', pos: [1.2, -5.2], rot: 0 },
    { id: 'c1', pos: [7.5, -5.2], rot: 0 }, { id: 'c2', pos: [10, -5.2], rot: 0 }, { id: 'c3', pos: [12.5, -5.2], rot: 0 },
    { id: 'k1', pos: [-1.2, 3], rot: 0 }, { id: 'k2', pos: [1.2, 3], rot: 0 },
    { id: 's1', pos: [7, 4], rot: 0 }, { id: 's2', pos: [9, 4], rot: 0 }, { id: 's3', pos: [11, 4], rot: 0 }, { id: 's4', pos: [13, 4], rot: 0 },
  ],
  personas,
  piezas,
  archivadas: { Finalizado: 32, 'No Aprobado': 48, Freezing: 13 },
  eventos: [
    { id: 'v1', hora: '10:41', tipo: 'movida', actor: 'p3', pieza: 't40', desde: 'Ideación', hasta: 'Validación Cliente' },
    { id: 'v2', hora: '10:37', tipo: 'comentario', actor: 'p7', pieza: 't20' },
    { id: 'v3', hora: '10:22', tipo: 'movida', actor: 'p12', pieza: 't5', desde: 'Señal detectada', hasta: 'Monitoreo' },
    { id: 'v4', hora: '10:09', tipo: 'creada', actor: 'p13', pieza: 't1' },
    { id: 'v5', hora: '09:56', tipo: 'asignada', actor: 'p1', pieza: 't41' },
    { id: 'v6', hora: '09:48', tipo: 'movida', actor: 'p5', pieza: 't38', desde: 'Ideación', hasta: 'En producción' },
    { id: 'v7', hora: '09:31', tipo: 'comentario', actor: 'p9', pieza: 't44' },
    { id: 'v8', hora: '09:15', tipo: 'movida', actor: 'p8', pieza: 't43', desde: 'Validación Cliente', hasta: 'Publicación' },
  ],
}

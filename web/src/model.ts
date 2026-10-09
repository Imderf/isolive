// Modelo común: cada conector traduce su plataforma a esto; la escena solo conoce esto.

export type Perfil = 'coordinacion' | 'estrategia' | 'diseno' | 'copy' | 'social' | 'data'
export type XZ = [number, number]

export interface Persona { id: string; nombre: string; perfil: Perfil; puesto: string }

// rot: giro en Y del escritorio; la persona se sienta en +z local mirando hacia -z.
export interface Puesto { id: string; pos: XZ; rot: number }

export interface Estacion {
  id: string
  nombre: string
  etapas: string[]
  tipo: 'trabajo' | 'lugar' // trabajo: la pieza va al puesto del asignado; lugar: se queda en la estación
  color: string
  zona: [number, number, number, number] // x1, z1, x2, z2
  ancla: XZ
}

export interface Pieza {
  id: string
  titulo: string
  etapa: string
  asignados: string[]
  vence: string // YYYY-MM-DD
  estado: 'normal' | 'urgente' | 'vencida'
}

export interface Evento {
  id: string
  fecha?: string // YYYY-MM-DD en Bogotá; sin fecha = hoy
  hora: string
  tipo: 'movida' | 'comentario' | 'creada' | 'asignada'
  actor: string // quien hizo el cambio en la plataforma
  pieza: string
  titulo: string // copia del título: la pieza puede archivarse y salir de la lista activa
  desde?: string
  hasta?: string
  asignados?: string[] // nuevos responsables, si el cambio los trae
  nueva?: Pieza // en 'creada'
}

export interface Area {
  id: string
  nombre: string
  cliente: string
  etapas: string[]
  estaciones: Estacion[]
  puestos: Puesto[]
  personas: Persona[]
  piezas: Pieza[]
  archivadas: Record<string, number> // etapa → cantidad (no se traen una a una)
  eventos: Evento[]
}

// Lo que entrega un conector (servidor); la disposición 3D la pone el web.
export type DatosArea = Pick<Area, 'etapas' | 'personas' | 'piezas' | 'archivadas' | 'eventos'>

export type Seleccion = { tipo: 'persona' | 'pieza' | 'estacion'; id: string }

// Estilo WareTrack con el rojo Ogilvy (#EF3B3A) en el papel del azul: familia de rojos + neutros fríos.
export const PERFILES: Record<Perfil, { nombre: string; color: string }> = {
  coordinacion: { nombre: 'Coordinación', color: '#1F2430' },
  estrategia: { nombre: 'Estrategia digital', color: '#8E1F2A' },
  diseno: { nombre: 'Diseño gráfico', color: '#EF3B3A' },
  copy: { nombre: 'Copy', color: '#F47C7B' },
  social: { nombre: 'Social media', color: '#F9A8A8' },
  data: { nombre: 'Data', color: '#475569' },
}

export const estacionDe = (a: Area, etapa: string) => a.estaciones.find(e => e.etapas.includes(etapa))!
// Puede no existir: piezas sin responsable de la mesa o personas que salieron del área.
export const personaDe = (a: Area, id: string | undefined): Persona | undefined => a.personas.find(p => p.id === id)

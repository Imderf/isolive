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
  hora: string
  tipo: 'movida' | 'comentario' | 'creada' | 'asignada'
  actor: string
  pieza: string
  desde?: string
  hasta?: string
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

export type Seleccion = { tipo: 'persona' | 'pieza' | 'estacion'; id: string }

// Marca Ogilvy: solo rojo, negro, grises y blanco. El rojo se reserva para alertas, cliente y selección.
// La forma (círculo, medio círculo, cuarto, cuadrado, anillo, achurado) identifica el perfil en la interfaz.
export const PERFILES: Record<Perfil, { nombre: string; color: string; forma: string }> = {
  coordinacion: { nombre: 'Coordinación', color: '#0A0A0A', forma: 'circulo' },
  estrategia: { nombre: 'Estrategia digital', color: '#4D4D4D', forma: 'medio' },
  diseno: { nombre: 'Diseño gráfico', color: '#8C8C8C', forma: 'cuarto' },
  copy: { nombre: 'Copy', color: '#C7C7C7', forma: 'cuadrado' },
  social: { nombre: 'Social media', color: '#FFFFFF', forma: 'anillo' },
  data: { nombre: 'Data', color: '#1A1A1A', forma: 'achurado' },
}

export const estacionDe = (a: Area, etapa: string) => a.estaciones.find(e => e.etapas.includes(etapa))!
export const personaDe = (a: Area, id: string) => a.personas.find(p => p.id === id)!

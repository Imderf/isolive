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
  perfiles?: Perfil[] // si se define, solo alguien de estos perfiles puede tener la pieza aquí
}

export interface Pieza {
  id: string
  titulo: string
  etapa: string
  asignados: string[]
  vence: string // YYYY-MM-DD
  estado: 'normal' | 'urgente' | 'vencida'
  tiene?: Tenencia // quién la tiene ahora (sim/responsable.ts); decide dónde se dibuja
}

export interface Tenencia {
  persona?: string
  motivo: 'mencion' | 'asignado' | 'comentario' | 'sin-perfil' | 'sin-responsable'
  por?: string // quien mencionó
  fecha?: string
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
  texto?: string // en 'comentario': el comentario, recortado y sin enlaces (solo usuarios de Ogilvy)
  menciones?: string[] // en 'comentario': personas de la mesa mencionadas
}

// Comentario de una tarea, recortado a 280 caracteres y sin enlaces. Nunca se envía a usuarios cliente.
export interface Comentario { id: string; pieza: string; autor: string; texto: string; menciones: string[]; fecha: string; hora: string }

// Silla de visitante (personas del cliente en la sala): asiento, hacia dónde mira y puntos hasta la puerta de la sala.
export interface Visita { id: string; pos: XZ; rot: number; via: XZ[] }

export interface Area {
  id: string
  nombre: string
  cliente: string
  fuente?: string // de dónde salen los datos (barra superior)
  siempreEnHorario?: boolean // demo: la mesa siempre está trabajando
  etapas: string[]
  estaciones: Estacion[]
  puestos: Puesto[]
  visitas?: Visita[]
  personas: Persona[]
  piezas: Pieza[]
  archivadas: Record<string, number> // etapa → cantidad (no se traen una a una)
  eventos: Evento[]
  comentarios: Comentario[] // recientes (7 días), más nuevo primero
}

// Lo que pone el web de cada área: identidad y disposición 3D del piso.
export type Disposicion = Pick<Area, 'id' | 'nombre' | 'cliente' | 'fuente' | 'siempreEnHorario' | 'estaciones' | 'puestos' | 'visitas'>

// Lo que entrega un conector (servidor); la disposición 3D la pone el web.
export type DatosArea = Pick<Area, 'etapas' | 'personas' | 'piezas' | 'archivadas' | 'eventos' | 'comentarios'>

export type Seleccion = { tipo: 'persona' | 'pieza' | 'estacion' | 'tablero'; id: string }

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

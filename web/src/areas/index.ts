import type { Disposicion } from '../model.ts'
import { disposicion as social } from './mesa-social-media.ts'

// Áreas del desplegable. La Mesa Demo es la misma oficina leyendo el proyecto "Mesa Demo" del TaskBoard (personas y
// piezas inventadas, sin marcas de clientes, con actividad a cualquier hora) y siempre está en horario.
export const demo: Disposicion = { ...social, id: 'mesa-demo', nombre: 'Mesa Demo', cliente: 'Cliente demo', fuente: 'TaskBoard · Mesa Demo', siempreEnHorario: true }

export const AREAS: Disposicion[] = [social, demo]
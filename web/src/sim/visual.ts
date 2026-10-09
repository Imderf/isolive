import { useSyncExternalStore } from 'react'

type V3 = [number, number, number]

// Estado visual de la coreografía (no es dato del tablero): piezas en tránsito, cajas en mano,
// planes pendientes por persona y burbujas. Cambia poco; los componentes se suscriben con useVisual().
export type Pose = 'parado' | 'estirar' | 'tablero' | 'oculto'
export type Paso =
  | { ir: string; jitter?: boolean }
  | { esperar: number; pose: Pose; mira?: string }
  | { recoger: string; color: string }
  | { dejar: string }

export const visual = {
  ocultas: new Set<string>(), // piezas que aún no llegan a su nuevo lugar
  fantasmas: new Map<string, { p: V3; color: string }>(), // piezas esperando ser recogidas en su lugar anterior
  enMano: new Map<string, string>(), // persona → color de la caja que lleva
  ordenes: new Map<string, Paso[][]>(), // persona → planes reales pendientes (mandan sobre el ambiente)
  burbujas: new Map<string, { texto: string; hasta: number }>(),
}

const subs = new Set<() => void>()
let version = 0
export function cambiar(f: () => void) { f(); version++; subs.forEach(s => s()) }
export const useVisual = () => useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb) } }, () => version)

export function encolar(persona: string, plan: Paso[]) {
  cambiar(() => visual.ordenes.set(persona, [...(visual.ordenes.get(persona) ?? []), plan]))
}

export function burbuja(persona: string, texto: string, segundos = 5) {
  cambiar(() => visual.burbujas.set(persona, { texto, hasta: performance.now() + segundos * 1000 }))
  setTimeout(() => cambiar(() => { if ((visual.burbujas.get(persona)?.hasta ?? 0) <= performance.now()) visual.burbujas.delete(persona) }), segundos * 1000 + 50)
}

import type { Puesto, XZ } from '../model.ts'

// Red de pasillos de la oficina genérica (V1). Pasillo norte z=-1.5 y sur z=5.6, unidos por x=-5 y x=5.
// Cada puesto se conecta a su pasillo con una salida; los destinos cuelgan del pasillo con un ramal.
// Cuando llegue el piso real del Naos (V2), solo cambia este archivo.
export interface Mapa { nodos: Map<string, XZ>; ady: Map<string, string[]>; mira: Record<string, XZ> }

export function construirMapa(puestos: Puesto[]): Mapa {
  const nodos = new Map<string, XZ>()
  const ady = new Map<string, string[]>()
  const N = (id: string, x: number, z: number) => { nodos.set(id, [x, z]); return id }
  const unir = (a: string, b: string) => {
    if (!ady.has(a)) ady.set(a, [])
    if (!ady.has(b)) ady.set(b, [])
    ady.get(a)!.push(b); ady.get(b)!.push(a)
  }

  const norte = [
    N('n-w', -13, -1.5), N('n-datos', -8.75, -1.5), N('n-a', -5, -1.5), N('n-estrategia', 0, -1.5),
    N('n-b', 5, -1.5), N('n-creativo', 8.75, -1.5), N('n-e', 14, -1.5),
  ]
  const sur = [
    N('s-a', -5, 5.6), N('s-archivo', -3, 5.6), N('s-kanban', 0, 5.6), N('s-congelador', 3, 5.6), N('s-b', 5, 5.6),
    N('s-cafe', 7, 5.6), N('s-pantalla', 10, 5.6), N('s-banos', 12.25, 5.6), N('s-e', 14, 5.6),
  ]
  for (const pu of puestos) {
    const [x, z] = pu.pos
    const salida = N(`salida:${pu.id}`, x, z < 0 ? -1.5 : 5.6)
    ;(z < 0 ? norte : sur).push(salida)
    unir(N(`asiento:${pu.id}`, x, z + 0.8), salida)
  }
  for (const linea of [norte, sur]) {
    linea.sort((a, b) => nodos.get(a)![0] - nodos.get(b)![0])
    linea.forEach((id, i) => { if (i) unir(linea[i - 1], id) })
  }
  unir('n-a', 's-a'); unir('n-b', 's-b')

  // Bandejas: piezas sin responsable de la mesa, en el fondo de cada estación de trabajo
  unir('n-datos', N('bandeja:datos', -8.75, -8.3))
  unir('n-estrategia', N('bandeja:estrategia', 0, -8.3))
  unir('n-creativo', N('bandeja:creativo', 8.75, -8.3))
  unir('s-e', N('bandeja:publicacion', 13.9, 2.4))
  unir('s-cafe', N('cafe', 7, 8.5))
  unir('s-banos', N('banos', 12.25, 8.7)) // adentro de la puerta
  unir('s-kanban', N('kanban', 0, 1.5))
  unir('s-pantalla', N('pantalla', 10, 2.4))
  unir('s-a', N('sala-puerta', -6.2, 5.6)); unir('sala-puerta', N('cliente', -7.6, 4.3))
  unir('s-archivo', N('archivo', -3, 7.6))
  unir('s-kanban', N('descarte', 0, 7.5))
  unir('s-congelador', N('congelador', 3, 7.6))

  // Hacia dónde mira la persona al llegar a cada destino
  const mira: Record<string, XZ> = {
    'bandeja:datos': [-8.75, -9.7], 'bandeja:estrategia': [0, -9.7], 'bandeja:creativo': [8.75, -9.7], 'bandeja:publicacion': [13.9, 1.6], cafe: [7, 9.4], kanban: [0, 0.6], pantalla: [10, 1.35], cliente: [-10, 4.3],
    archivo: [-3, 8.7], descarte: [0, 8.4], congelador: [3, 8.7],
  }
  return { nodos, ady, mira }
}

// Ruta más corta (Dijkstra; la red tiene ~50 nodos). Devuelve los puntos sin el de partida.
export function ruta(m: Mapa, de: string, a: string): XZ[] {
  const dist = new Map<string, number>([[de, 0]])
  const prev = new Map<string, string>()
  const pend = new Set([de])
  while (pend.size) {
    let u = ''
    for (const n of pend) if (!u || dist.get(n)! < dist.get(u)!) u = n
    pend.delete(u)
    if (u === a) break
    const [ux, uz] = m.nodos.get(u)!
    for (const v of m.ady.get(u) ?? []) {
      const [vx, vz] = m.nodos.get(v)!
      const d = dist.get(u)! + Math.hypot(vx - ux, vz - uz)
      if (d < (dist.get(v) ?? Infinity)) { dist.set(v, d); prev.set(v, u); pend.add(v) }
    }
  }
  if (a !== de && !prev.has(a)) return []
  const out: XZ[] = []
  for (let n = a; n !== de; n = prev.get(n)!) out.unshift(m.nodos.get(n)!)
  return out
}

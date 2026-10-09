import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { esFinde, horaDecimal } from '../sim/horario'
import { Box } from './parts'

// Tráfico de las calles según la hora de Bogotá: hora pico 6:00–9:00 y 16:30–19:30.
export function densidad(h: number, finde: boolean) {
  const base =
    (h >= 6 && h < 9) || (h >= 16.5 && h < 19.5) ? 1
      : h >= 9 && h < 16.5 ? 0.45
        : h >= 19.5 && h < 22 ? 0.3
          : h >= 5 && h < 6 ? 0.35
            : 0.1
  return finde ? base * 0.6 : base
}

type P = [number, number]

// Ruta como polilínea con la esquina redondeada. Se maneja por la derecha y las dos rutas no se cruzan:
//  · baja por la calle oriental (x=18.0) y gira a la derecha hacia el occidente (z=13.0);
//  · va hacia el oriente (z=14.2) y gira a la izquierda hacia el norte (x=19.2).
// Los extremos quedan lejos, dentro de la neblina: ahí entran y salen los carros, nunca a la vista.
function ruta(a: P, esquina: P, b: P, radio: number): { puntos: P[]; acum: number[] } {
  const dir = (de: P, a: P): P => { const l = Math.hypot(a[0] - de[0], a[1] - de[1]); return [(a[0] - de[0]) / l, (a[1] - de[1]) / l] }
  const d1 = dir(a, esquina), d2 = dir(esquina, b)
  const ini: P = [esquina[0] - d1[0] * radio, esquina[1] - d1[1] * radio]
  const fin: P = [esquina[0] + d2[0] * radio, esquina[1] + d2[1] * radio]
  const curva: P[] = Array.from({ length: 7 }, (_, k) => {
    const t = k / 6, u = 1 - t // Bézier cuadrática por la esquina
    return [u * u * ini[0] + 2 * u * t * esquina[0] + t * t * fin[0], u * u * ini[1] + 2 * u * t * esquina[1] + t * t * fin[1]]
  })
  const puntos = [a, ...curva, b]
  const acum = [0]
  for (let i = 1; i < puntos.length; i++) acum.push(acum[i - 1] + Math.hypot(puntos[i][0] - puntos[i - 1][0], puntos[i][1] - puntos[i - 1][1]))
  return { puntos, acum }
}

const RUTAS = [
  { ...ruta([18.0, -80], [18.0, 13.0], [-80, 13.0], 1.4), vel: 6 },
  { ...ruta([-80, 14.2], [19.2, 14.2], [19.2, -80], 2.2), vel: 5.4 },
]
const POR_RUTA = 11 // cupos por ruta, repartidos a distancia fija: nunca se alcanzan

function enRuta(r: (typeof RUTAS)[number], s: number): { x: number; z: number; rot: number } {
  const total = r.acum[r.acum.length - 1]
  s = Math.min(Math.max(s, 0), total - 0.01)
  let i = 1
  while (r.acum[i] < s) i++
  const [x0, z0] = r.puntos[i - 1], [x1, z1] = r.puntos[i]
  const t = (s - r.acum[i - 1]) / (r.acum[i] - r.acum[i - 1])
  return { x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, rot: Math.atan2(-(z1 - z0), x1 - x0) }
}

// Decide si un cupo trae carro en una vuelta dada (estable dentro de la vuelta).
const azar = (a: number, b: number) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x) }

const COLORES = ['#FFFFFF', '#F5C518', '#2A303C', '#CBD0DA', '#F5C518', '#EF3B3A', '#475569', '#FFFFFF', '#F5C518', '#8E1F2A']
const AUTOS = RUTAS.flatMap((_, r) => Array.from({ length: POR_RUTA }, (_, k) => ({
  r, k, bus: k === 4, color: COLORES[(k * 3 + r) % COLORES.length],
})))

export function Trafico() {
  const refs = useRef<(Group | null)[]>([])
  useFrame(({ clock }) => {
    const dens = densidad(horaDecimal(), esFinde())
    const t = clock.elapsedTime
    AUTOS.forEach((a, i) => {
      const g = refs.current[i]
      if (!g) return
      const r = RUTAS[a.r]
      const total = r.acum[r.acum.length - 1]
      const recorrido = t * r.vel + (a.k / POR_RUTA) * total
      const vuelta = Math.floor(recorrido / total)
      g.visible = azar(i, vuelta) < dens // solo cambia al empezar la vuelta, lejos en la neblina
      if (!g.visible) return
      const { x, z, rot } = enRuta(r, recorrido - vuelta * total)
      g.position.set(x, -0.29, z)
      g.rotation.y = rot
    })
  })
  return (
    <>
      {AUTOS.map((a, i) => (
        <group key={i} ref={el => { refs.current[i] = el }}>
          {a.bus ? <Bus /> : <Auto color={a.color} taxi={a.color === '#F5C518'} />}
        </group>
      ))}
    </>
  )
}

const VIDRIO = '#BFD3E6', LLANTA = '#1F2430'

function Ruedas({ largo }: { largo: number }) {
  return (
    <>
      {[-1, 1].flatMap(x => [-1, 1].map(z => (
        <mesh key={`${x}${z}`} position={[x * largo, 0.16, z * 0.38]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.12, 14]} />
          <meshStandardMaterial color={LLANTA} />
        </mesh>
      )))}
    </>
  )
}

function Auto({ color, taxi }: { color: string; taxi: boolean }) {
  return (
    <group>
      <Box p={[0, 0.36, 0]} s={[1.7, 0.4, 0.8]} c={color} r={0.12} />
      <Box p={[-0.12, 0.7, 0]} s={[0.95, 0.34, 0.72]} c={VIDRIO} r={0.1} />
      {taxi && <Box p={[-0.12, 0.92, 0]} s={[0.3, 0.1, 0.18]} c="#FFFFFF" r={0.03} />}
      <Ruedas largo={0.55} />
    </group>
  )
}

function Bus() {
  return (
    <group>
      <Box p={[0, 0.75, 0]} s={[4.2, 1.15, 0.95]} c="#EF3B3A" r={0.14} />
      <Box p={[0.1, 0.95, 0]} s={[3.8, 0.38, 0.97]} c={VIDRIO} r={0.05} />
      <Ruedas largo={1.6} />
    </group>
  )
}

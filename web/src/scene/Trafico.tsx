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

// Se maneja por la derecha. Calle sur (a lo largo de x) y calle oriental (a lo largo de z).
const CARRILES = [
  { eje: 'x', fijo: 14.2, dir: 1, desde: -18.5, hasta: 21.5 },
  { eje: 'x', fijo: 13.0, dir: -1, desde: -18.5, hasta: 21.5 },
  { eje: 'z', fijo: 19.2, dir: -1, desde: -13.5, hasta: 16.5 },
  { eje: 'z', fijo: 18.0, dir: 1, desde: -13.5, hasta: 16.5 },
] as const
const TOTAL = 24
const COLORES = ['#FFFFFF', '#F5C518', '#2A303C', '#CBD0DA', '#F5C518', '#EF3B3A', '#475569', '#FFFFFF', '#F5C518', '#8E1F2A']
const AUTOS = Array.from({ length: TOTAL }, (_, i) => ({
  carril: CARRILES[i % 4],
  desfase: (i * 0.618) % 1,
  vel: 4 + ((i * 7) % 5) * 0.6,
  bus: i % 11 === 5, // bus rojo, como el TransMilenio
  color: COLORES[i % COLORES.length],
}))

export function Trafico() {
  const refs = useRef<(Group | null)[]>([])
  useFrame(({ clock }) => {
    const visibles = Math.round(TOTAL * densidad(horaDecimal(), esFinde()))
    const t = clock.elapsedTime
    AUTOS.forEach((a, i) => {
      const g = refs.current[i]
      if (!g) return
      // El orden de los autos se baraja para que los que aparecen con poca densidad queden repartidos en los carriles.
      g.visible = ((i * 5) % TOTAL) < visibles
      if (!g.visible) return
      const { eje, fijo, dir, desde, hasta } = a.carril
      const largo = hasta - desde
      const d = (t * (a.bus ? a.vel * 0.7 : a.vel) + a.desfase * largo) % largo
      const s = dir > 0 ? desde + d : hasta - d
      const borde = Math.min(1, (s - desde) / 2, (hasta - s) / 2) // aparecen y se van sin saltar
      g.scale.setScalar(Math.max(0.001, borde))
      if (eje === 'x') g.position.set(s, -0.29, fijo)
      else g.position.set(fijo, -0.29, s)
      g.rotation.y = eje === 'x' ? (dir > 0 ? 0 : Math.PI) : dir > 0 ? -Math.PI / 2 : Math.PI / 2
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

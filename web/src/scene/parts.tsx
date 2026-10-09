import { createRef, useState } from 'react'
import { Html, useCursor } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { Pieza } from '../model'

type V3 = [number, number, number]

// Capa DOM fija para todas las etiquetas <Html>. Sin un destino estable, drei vuelve a montar cada
// etiqueta en el primer render ("synchronously unmount a root") y la primera se pierde.
export const capaEtiquetas = createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement>

export function Box({ p, s, c, o = 1, shadow = true }: { p: V3; s: V3; c: string; o?: number; shadow?: boolean }) {
  return (
    <mesh position={p} castShadow={shadow} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.85} transparent={o < 1} opacity={o} />
    </mesh>
  )
}

export function Plant({ p, s = 1 }: { p: V3; s?: number }) {
  return (
    <group position={p} scale={s}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.44, 12]} />
        <meshStandardMaterial color="#F4F4F4" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.78, 0]} castShadow>
        <icosahedronGeometry args={[0.38, 0]} />
        <meshStandardMaterial color="#3E8E5A" roughness={0.9} flatShading />
      </mesh>
    </group>
  )
}

export function Label({ p, children, onClick }: { p: V3; children: React.ReactNode; onClick?: () => void }) {
  return (
    <Html portal={capaEtiquetas} position={p} zIndexRange={[10, 0]} style={{ pointerEvents: onClick ? 'auto' : 'none' }}>
      <div className="lbl" onClick={onClick}>{children}</div>
    </Html>
  )
}

const RED = '#EF3B3A'

// Una pieza (tarea) como cubo pequeño. Vencida: bola roja encima. Urgente: anillo rojo.
export function PiezaMesh({ pieza, p, color, dim, selected, onSelect }: {
  pieza: Pieza; p: V3; color: string; dim: boolean; selected: boolean; onSelect: (id: string) => void
}) {
  const [hover, setHover] = useState(false)
  useCursor(hover)
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(pieza.id) }
  const lift = selected ? 0.18 : hover ? 0.06 : 0
  return (
    <group position={[p[0], p[1] + lift, p[2]]}>
      <mesh castShadow onClick={click} onPointerOver={e => { e.stopPropagation(); setHover(true) }} onPointerOut={() => setHover(false)}>
        <boxGeometry args={[0.15, 0.12, 0.15]} />
        <meshStandardMaterial color={selected ? RED : color} roughness={0.6} transparent={dim} opacity={dim ? 0.12 : 1} />
      </mesh>
      {pieza.estado === 'vencida' && !dim && (
        <mesh position={[0, 0.17, 0]} castShadow>
          <sphereGeometry args={[0.05, 16, 12]} />
          <meshStandardMaterial color={RED} roughness={0.4} />
        </mesh>
      )}
      {pieza.estado === 'urgente' && !dim && (
        <mesh position={[0, 0.17, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.05, 0.014, 8, 24]} />
          <meshStandardMaterial color={RED} roughness={0.4} />
        </mesh>
      )}
    </group>
  )
}

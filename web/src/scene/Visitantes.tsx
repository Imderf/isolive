import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, useCursor } from '@react-three/drei'
import type { Group } from 'three'
import { enHorario } from '../sim/horario'
import { capaEtiquetas } from './parts'
import { Cuerpo } from './Persona'

type V3 = [number, number, number]
const SENTADO = { cadera: 1.5, rodilla: -1.5, hombro: 0.9 }

// Dos personas del cliente en la sala de cliente. Son decoración (no vienen del tablero):
// solo en horario laboral y nunca en fichas ni feed.
export function Visitantes({ cliente }: { cliente: string }) {
  const ref = useRef<Group>(null)
  useFrame(() => { if (ref.current) ref.current.visible = enHorario() })
  return (
    <group ref={ref}>
      <Visitante p={[-11.2, 0, 3.2]} rot={Math.PI} camisa="#1F36C7" piel="#C9946B" pelo="#1A1A1A" cliente={cliente} fase={0} />
      <Visitante p={[-8.8, 0, 5.4]} rot={0} camisa="#5B6CDB" piel="#E9C4A6" pelo="#6B4A32" cliente={cliente} fase={2.1} />
    </group>
  )
}

function Visitante({ p, rot, camisa, piel, pelo, cliente, fase }: { p: V3; rot: number; camisa: string; piel: string; pelo: string; cliente: string; fase: number }) {
  const g = useRef<Group>(null)
  const [hover, setHover] = useState(false)
  useCursor(hover)
  // Leve movimiento de conversación: el torso se inclina hacia la mesa y vuelve.
  useFrame(({ clock }) => { if (g.current) g.current.rotation.x = Math.sin(clock.elapsedTime * 0.8 + fase) * 0.04 })
  return (
    <group position={p} rotation={[0, rot, 0]} onPointerOver={e => { e.stopPropagation(); setHover(true) }} onPointerOut={() => setHover(false)}>
      <group ref={g}><Cuerpo camisa={camisa} piel={piel} pelo={pelo} pose={SENTADO} /></group>
      {hover && (
        <Html portal={capaEtiquetas} position={[0, 1.9, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="pill pill-oscuro">Cliente<small>{cliente}</small></div>
        </Html>
      )}
    </group>
  )
}

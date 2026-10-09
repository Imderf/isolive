import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, useCursor } from '@react-three/drei'
import type { Group } from 'three'
import { PERFILES, estacionDe, type Area, type Persona, type Seleccion } from '../model'
import { Box, PiezaMesh, capaEtiquetas } from './parts'

const W = '#FFFFFF', G300 = '#C7C7C7', INK = '#0A0A0A', RED = '#EF3B3A'
const PIEL = ['#E9C4A6', '#C9946B', '#8D5A3B']
const PELO = ['#1A1A1A', '#4D4D4D', '#6B4A32']
const MAX_EN_ESCRITORIO = 8

export interface Props { area: Area; sel: Seleccion | null; onSelect: (s: Seleccion | null) => void; etapa: string | null }

export function Puestos(props: Props) {
  const { area } = props
  return (
    <>
      {area.puestos.map(pu => {
        const persona = area.personas.find(p => p.puesto === pu.id)
        // La pieza vive en el puesto de su primer asignado, salvo que su estación sea un lugar.
        const piezas = persona ? area.piezas.filter(p => p.asignados[0] === persona.id && estacionDe(area, p.etapa).tipo === 'trabajo') : []
        return (
          <group key={pu.id} position={[pu.pos[0], 0, pu.pos[1]]} rotation={[0, pu.rot, 0]}>
            <Escritorio />
            {persona && <Figura persona={persona} i={area.personas.indexOf(persona)} {...props} />}
            {piezas.slice(0, MAX_EN_ESCRITORIO).map((p, j) => (
              <PiezaMesh
                key={p.id}
                pieza={p}
                p={[-0.58 + (j % 4) * 0.19, 0.82 + Math.floor(j / 4) * 0.13, 0.12]}
                color={estacionDe(area, p.etapa).color}
                dim={props.etapa !== null && props.etapa !== p.etapa}
                selected={props.sel?.tipo === 'pieza' && props.sel.id === p.id}
                onSelect={id => props.onSelect({ tipo: 'pieza', id })}
              />
            ))}
            {piezas.length > MAX_EN_ESCRITORIO && (
              <Html portal={capaEtiquetas} position={[-0.68, 1.15, 0.12]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
                <div className="lbl lbl-mini">+{piezas.length - MAX_EN_ESCRITORIO}</div>
              </Html>
            )}
          </group>
        )
      })}
    </>
  )
}

function Escritorio() {
  return (
    <group>
      <Box p={[0, 0.74, 0]} s={[1.5, 0.05, 0.8]} c={W} />
      <Box p={[-0.72, 0.36, 0]} s={[0.04, 0.72, 0.76]} c={G300} />
      <Box p={[0.72, 0.36, 0]} s={[0.04, 0.72, 0.76]} c={G300} />
      <Box p={[0.25, 1.0, -0.25]} s={[0.62, 0.38, 0.03]} c={INK} />
      <Box p={[0.25, 0.8, -0.25]} s={[0.06, 0.14, 0.06]} c={INK} />
      <Box p={[0.25, 0.775, 0.1]} s={[0.42, 0.015, 0.14]} c={G300} shadow={false} />
      {/* silla */}
      <Box p={[0, 0.46, 0.78]} s={[0.5, 0.06, 0.48]} c={INK} />
      <Box p={[0, 0.78, 1.0]} s={[0.48, 0.56, 0.05]} c={INK} />
      <Box p={[0, 0.22, 0.78]} s={[0.05, 0.44, 0.05]} c={INK} />
    </group>
  )
}

// Persona sentada, construida con primitivas (low-poly). En el ciclo 2 se reemplaza por un modelo animado.
function Figura({ persona, i, sel, onSelect }: Props & { persona: Persona; i: number }) {
  const torso = useRef<Group>(null)
  const [hover, setHover] = useState(false)
  useCursor(hover)
  const selected = sel?.tipo === 'persona' && sel.id === persona.id
  const camisa = PERFILES[persona.perfil].color
  useFrame(({ clock }) => {
    if (torso.current) torso.current.position.y = Math.sin(clock.elapsedTime * 1.6 + i) * 0.012
  })
  return (
    <group
      position={[0, 0, 0.8]}
      onClick={e => { e.stopPropagation(); onSelect({ tipo: 'persona', id: persona.id }) }}
      onPointerOver={e => { e.stopPropagation(); setHover(true) }}
      onPointerOut={() => setHover(false)}
    >
      <Box p={[0, 0.56, -0.18]} s={[0.36, 0.14, 0.42]} c="#4D4D4D" />
      <Box p={[-0.09, 0.28, -0.38]} s={[0.13, 0.48, 0.13]} c="#4D4D4D" />
      <Box p={[0.09, 0.28, -0.38]} s={[0.13, 0.48, 0.13]} c="#4D4D4D" />
      <group ref={torso}>
        <mesh position={[0, 0.92, 0]} castShadow>
          <capsuleGeometry args={[0.19, 0.3, 4, 12]} />
          <meshStandardMaterial color={camisa} roughness={0.8} />
        </mesh>
        <Box p={[-0.2, 0.86, -0.22]} s={[0.1, 0.1, 0.42]} c={camisa} />
        <Box p={[0.2, 0.86, -0.22]} s={[0.1, 0.1, 0.42]} c={camisa} />
        <mesh position={[0, 1.36, 0]} castShadow>
          <sphereGeometry args={[0.16, 16, 12]} />
          <meshStandardMaterial color={PIEL[i % 3]} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.42, 0.03]} castShadow>
          <sphereGeometry args={[0.165, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={PELO[(i * 2) % 3]} roughness={0.9} />
        </mesh>
      </group>
      {selected && (
        <mesh position={[0, 0.03, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.62, 48]} />
          <meshBasicMaterial color={RED} />
        </mesh>
      )}
      {(hover || selected) && (
        <Html portal={capaEtiquetas} position={[0, 1.75, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="lbl lbl-persona">{persona.nombre}<small>{PERFILES[persona.perfil].nombre}</small></div>
        </Html>
      )}
    </group>
  )
}

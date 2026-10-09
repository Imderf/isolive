import { Html } from '@react-three/drei'
import { estacionDe, type Area, type Seleccion } from '../model'
import { useVisual, visual } from '../sim/visual'
import { Box, PiezaMesh, RED, capaEtiquetas } from './parts'

const W = '#FFFFFF', G2 = '#CBD0DA', SLATE = '#2A303C'
const MAX_EN_ESCRITORIO = 8

export interface Props { area: Area; sel: Seleccion | null; onSelect: (s: Seleccion | null) => void; etapa: string | null }

// Escritorios y las piezas sobre ellos. Las personas se dibujan aparte (Persona.tsx) porque se mueven.
export function Puestos(props: Props) {
  const { area } = props
  useVisual()
  return (
    <>
      {area.puestos.map(pu => {
        const persona = area.personas.find(p => p.puesto === pu.id)
        // La pieza vive en el puesto de su primer asignado, salvo que su estación sea un lugar.
        const piezas = persona ? area.piezas.filter(p => p.asignados[0] === persona.id && estacionDe(area, p.etapa).tipo === 'trabajo' && !visual.ocultas.has(p.id)) : []
        return (
          <group key={pu.id} position={[pu.pos[0], 0, pu.pos[1]]} rotation={[0, pu.rot, 0]}>
            <Escritorio />
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
                <div className="pill pill-claro">+{piezas.length - MAX_EN_ESCRITORIO}</div>
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
      <Box p={[-0.7, 0.36, 0]} s={[0.06, 0.72, 0.76]} c={G2} />
      <Box p={[0.7, 0.36, 0]} s={[0.06, 0.72, 0.76]} c={G2} />
      <Box p={[0.25, 1.0, -0.25]} s={[0.62, 0.38, 0.04]} c={SLATE} />
      <Box p={[0.25, 0.8, -0.25]} s={[0.06, 0.14, 0.06]} c={SLATE} />
      <Box p={[0.25, 0.775, 0.1]} s={[0.42, 0.015, 0.14]} c={G2} shadow={false} />
      {/* silla */}
      <Box p={[0, 0.46, 0.78]} s={[0.52, 0.08, 0.5]} c={RED} />
      <Box p={[0, 0.8, 1.0]} s={[0.5, 0.58, 0.08]} c={RED} />
      <Box p={[0, 0.22, 0.78]} s={[0.06, 0.44, 0.06]} c={G2} />
    </group>
  )
}

import { estacionDe } from '../model'
import { useVisual, visual } from '../sim/visual'
import { PiezaMesh, Pin, RED } from './parts'
import type { Props } from './Puestos'

const ALTURA = { cliente: 0.44, archivo: 0.5, descarte: 0.82, congelador: 1.95 } as Record<string, number>

// Estaciones tipo "lugar": las piezas se quedan en la estación (sala de cliente) o se cuentan (archivo).
export function Lugares({ area, sel, onSelect, etapa }: Props) {
  useVisual()
  const lugares = area.estaciones.filter(e => e.tipo === 'lugar')
  return (
    <>
      {lugares.map(e => {
        const [ax, az] = e.ancla
        const y = ALTURA[e.id] ?? 0.1
        const activas = area.piezas.filter(p => estacionDe(area, p.etapa).id === e.id && !visual.ocultas.has(p.id))
        const archivadas = e.etapas.reduce((n, et) => n + (area.archivadas[et] ?? 0), 0)
        const dim = (et: string) => etapa !== null && etapa !== et
        return (
          <group key={e.id}>
            {activas.map((p, j) => (
              <PiezaMesh
                key={p.id}
                pieza={p}
                p={[ax - 0.9 + (j % 6) * 0.36, y + 0.06, az - 0.2 + Math.floor(j / 6) * 0.4]}
                color={e.color}
                dim={dim(p.etapa)}
                selected={sel?.tipo === 'pieza' && sel.id === p.id}
                onSelect={id => onSelect({ tipo: 'pieza', id })}
              />
            ))}
            {e.id === 'cliente' && activas.length > 0 && (
              <>
                <Pin p={[ax, 1.2, az]} c={RED} s={1.4} />
              </>
            )}
            {archivadas > 0 && (
              <>
                {Array.from({ length: Math.min(archivadas, 12) }, (_, j) => (
                  <mesh key={j} position={[ax - 0.75 + (j % 6) * 0.3, y + 0.07 + Math.floor(j / 6) * 0.14, az + 0.95]} castShadow>
                    <boxGeometry args={[0.15, 0.12, 0.15]} />
                    <meshStandardMaterial color={e.color} roughness={0.6} transparent={dim(e.etapas[0])} opacity={dim(e.etapas[0]) ? 0.12 : 1} />
                  </mesh>
                ))}
              </>
            )}
          </group>
        )
      })}
    </>
  )
}

// Piezas que cambiaron de etapa y esperan en su lugar anterior a que alguien las recoja.
export function Fantasmas() {
  useVisual()
  return (
    <>
      {[...visual.fantasmas].map(([id, f]) => (
        <mesh key={id} position={f.p} castShadow>
          <boxGeometry args={[0.16, 0.13, 0.16]} />
          <meshStandardMaterial color={f.color} roughness={0.55} />
        </mesh>
      ))}
    </>
  )
}

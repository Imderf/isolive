import { Edges, Line } from '@react-three/drei'
import type { Area, Estacion } from '../model'
import { Box, Label, Plant } from './parts'

const W = '#FFFFFF', G050 = '#F4F4F4', G150 = '#E4E4E4', G300 = '#C7C7C7', G500 = '#8C8C8C', INK = '#0A0A0A', RED = '#EF3B3A'

// Piso de oficina genérico (V1). En V2 se reemplaza por el piso 4 real del Naos.
export function Office({ area, onEstacion }: { area: Area; onEstacion: (id: string) => void }) {
  return (
    <group>
      {/* Losa */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[30, 0.3, 20]} />
        <meshStandardMaterial color={W} roughness={1} />
        <Edges color={INK} />
      </mesh>

      {/* Fachada norte y oeste: muro bajo + ventanería (el Naos es de vidrio) */}
      <Box p={[0, 0.45, -9.9]} s={[30, 0.9, 0.2]} c={G050} />
      <Box p={[-14.9, 0.45, 0]} s={[0.2, 0.9, 20]} c={G050} />
      {Array.from({ length: 11 }, (_, i) => <Box key={`n${i}`} p={[-15 + i * 3, 1.75, -9.9]} s={[0.08, 1.7, 0.08]} c={INK} />)}
      {Array.from({ length: 8 }, (_, i) => <Box key={`w${i}`} p={[-14.9, 1.75, -10 + i * 2.85]} s={[0.08, 1.7, 0.08]} c={INK} />)}
      <Box p={[0, 2.6, -9.9]} s={[30, 0.08, 0.08]} c={INK} />
      <Box p={[-14.9, 2.6, 0]} s={[0.08, 0.08, 20]} c={INK} />

      {area.estaciones.map((e, i) => <Zona key={e.id} e={e} n={i + 1} onClick={() => onEstacion(e.id)} />)}

      {/* 01 Muro de datos: pantalla con barras */}
      <Box p={[-10, 1.55, -9.7]} s={[4.2, 1.8, 0.08]} c={INK} />
      {[0.5, 0.9, 0.7, 1.2, 1, 1.4, 0.8, 1.3].map((h, i) => (
        <Box key={i} p={[-11.6 + i * 0.45, 0.8 + h / 2, -9.64]} s={[0.24, h, 0.02]} c={i === 5 ? RED : W} shadow={false} />
      ))}

      {/* 02 Mesa de estrategia: tablero blanco */}
      <Box p={[0, 1.5, -9.72]} s={[4.4, 1.5, 0.06]} c={W} />
      <Box p={[0, 1.5, -9.76]} s={[4.6, 1.7, 0.04]} c={INK} />
      {[[-1.4, 1.8], [-0.9, 1.4], [0.2, 1.75], [0.8, 1.3], [1.5, 1.65]].map(([x, y], i) => (
        <Box key={i} p={[x, y, -9.68]} s={[0.36, 0.36, 0.02]} c={i === 2 ? RED : G300} shadow={false} />
      ))}

      {/* 03 Estudio creativo: moodboard */}
      {Array.from({ length: 12 }, (_, i) => (
        <Box key={i} p={[8.6 + (i % 6) * 0.56, 1.25 + Math.floor(i / 6) * 0.6, -9.72]} s={[0.48, 0.5, 0.04]} c={[G150, G500, INK, G300, RED, G150][i % 6]} shadow={false} />
      ))}

      {/* 04 Sala de cliente: tabiques bajos, mesa y sillas */}
      <Box p={[-10, 0.55, 1]} s={[8, 1.1, 0.12]} c={W} />
      <Box p={[-6, 0.55, 2.9]} s={[0.12, 1.1, 3.8]} c={W} />
      <Box p={[-6, 0.55, 7.15]} s={[0.12, 1.1, 0.9]} c={W} />
      <Box p={[-10, 0.37, 4.3]} s={[3.4, 0.06, 1.5]} c={W} />
      <Box p={[-10, 0.18, 4.3]} s={[0.4, 0.36, 0.4]} c={INK} />
      {[-11.2, -10, -8.8].flatMap(x => [[x, 3.25], [x, 5.35]]).map(([x, z], i) => <Box key={i} p={[x, 0.25, z]} s={[0.45, 0.5, 0.45]} c={G300} />)}

      {/* Muro Kanban (coordinación): una columna por etapa activa, una nota por tarea (máx. 10) */}
      <Kanban area={area} />

      {/* 05 Pantalla de publicación */}
      <Box p={[10, 1.45, 1.35]} s={[5, 2.2, 0.12]} c={INK} />
      {Array.from({ length: 15 }, (_, i) => (
        <Box key={i} p={[8.2 + (i % 5) * 0.9, 0.85 + Math.floor(i / 5) * 0.62, 1.43]} s={[0.78, 0.52, 0.02]} c={i === 7 ? RED : i % 3 ? G300 : W} shadow={false} />
      ))}
      <Box p={[8.4, 0.2, 1.35]} s={[0.12, 0.4, 0.5]} c={INK} />
      <Box p={[11.6, 0.2, 1.35]} s={[0.12, 0.4, 0.5]} c={INK} />

      {/* 06–08 Archivo, descarte y congelador */}
      <Box p={[-3, 0.9, 8.7]} s={[2.4, 1.8, 0.5]} c={W} />
      {[0.45, 1.05, 1.65].map(y => <Box key={y} p={[-3, y, 8.95]} s={[2.4, 0.04, 0.02]} c={INK} shadow={false} />)}
      <mesh position={[0, 0.4, 8.4]} castShadow>
        <cylinderGeometry args={[0.45, 0.38, 0.8, 24]} />
        <meshStandardMaterial color={G500} roughness={0.8} />
      </mesh>
      <Box p={[3, 0.95, 8.7]} s={[1.2, 1.9, 0.8]} c={W} />
      <Box p={[3, 1.3, 9.11]} s={[1.1, 0.02, 0.02]} c={INK} shadow={false} />

      {/* Vida de oficina: café, baños, sala de descanso, plantas */}
      <Box p={[7, 0.47, 9.35]} s={[3.6, 0.94, 0.7]} c={W} />
      <Box p={[6.2, 1.15, 9.35]} s={[0.45, 0.5, 0.4]} c={INK} />
      <Box p={[7.4, 1.0, 9.35]} s={[0.5, 0.2, 0.35]} c={G300} />
      <Label p={[7, 1.9, 9.35]}>Café</Label>
      <Box p={[12.25, 0.55, 8.3]} s={[3.5, 1.1, 0.12]} c={G150} />
      <Box p={[10.5, 0.55, 9.15]} s={[0.12, 1.1, 1.7]} c={G150} />
      <Box p={[12.9, 0.02, 8.3]} s={[0.9, 0.04, 0.14]} c={INK} shadow={false} />
      <Label p={[12.25, 1.6, 9.1]}>Baños</Label>
      <Box p={[-10, 0.22, 9.2]} s={[2.6, 0.44, 0.9]} c={G300} />
      <Box p={[-10, 0.6, 9.55]} s={[2.6, 0.5, 0.2]} c={G300} />
      <Box p={[-10, 0.15, 8.2]} s={[1, 0.3, 0.6]} c={W} />
      {([[-14.2, -2], [-14.2, 0.2], [4.8, -9.2], [14.4, -9.2], [14.4, 0.4], [-5.2, 9.3], [9.6, 9.4], [-14.3, 9.3]] as [number, number][]).map(([x, z], i) => (
        <Plant key={i} p={[x, 0, z]} s={0.9} />
      ))}
    </group>
  )
}

function Zona({ e, n, onClick }: { e: Estacion; n: number; onClick: () => void }) {
  const [x1, z1, x2, z2] = e.zona
  const pts: [number, number, number][] = [[x1, 0.02, z1], [x2, 0.02, z1], [x2, 0.02, z2], [x1, 0.02, z2], [x1, 0.02, z1]]
  return (
    <group>
      <mesh position={[(x1 + x2) / 2, 0.01, (z1 + z2) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[x2 - x1, z2 - z1]} />
        <meshStandardMaterial color={G050} roughness={1} />
      </mesh>
      <Line points={pts} color={e.color === RED ? RED : G300} lineWidth={1} />
      <Label p={[x1 + 0.1, 0.05, z1 + 0.1]} onClick={onClick}>
        <span className="lbl-n">{String(n).padStart(2, '0')}</span> {e.nombre}
      </Label>
    </group>
  )
}

function Kanban({ area }: { area: Area }) {
  const etapas = area.etapas.filter(et => !(et in area.archivadas))
  const x0 = -3.5, ancho = 7 / etapas.length
  return (
    <group position={[0, 0, 0.6]}>
      <Box p={[0, 1.25, 0]} s={[7.4, 1.9, 0.08]} c={W} />
      <Box p={[0, 1.25, -0.05]} s={[7.6, 2.05, 0.04]} c={INK} />
      <Box p={[-3.2, 0.15, 0]} s={[0.1, 0.3, 0.5]} c={INK} />
      <Box p={[3.2, 0.15, 0]} s={[0.1, 0.3, 0.5]} c={INK} />
      {etapas.map((et, i) => {
        const cant = area.piezas.filter(p => p.etapa === et).length
        const color = area.estaciones.find(e => e.etapas.includes(et))!.color
        const cx = x0 + ancho * (i + 0.5)
        return (
          <group key={et}>
            <Box p={[cx, 2.05, 0.05]} s={[ancho - 0.12, 0.08, 0.02]} c={INK} shadow={false} />
            {Array.from({ length: Math.min(cant, 10) }, (_, j) => (
              <Box key={j} p={[cx + ((j % 2) - 0.5) * 0.32, 1.85 - Math.floor(j / 2) * 0.32, 0.06]} s={[0.26, 0.26, 0.02]} c={color === W ? G300 : color} shadow={false} />
            ))}
          </group>
        )
      })}
      <Label p={[-3.6, 2.45, 0]}>Muro Kanban</Label>
    </group>
  )
}

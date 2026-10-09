import type { Area, Estacion } from '../model'
import { Arbol, Box, Label, RED } from './parts'

const W = '#FFFFFF', PAD = '#F7F3F3', G = '#E6E8EE', G2 = '#CBD0DA', SLATE = '#2A303C', ROSA = '#F9C9C9'

// Piso de oficina genérico (V1). En V2 se reemplaza por el piso 4 real del Naos.
export function Office({ area, onEstacion }: { area: Area; onEstacion: (id: string) => void }) {
  return (
    <group>
      {/* Exterior: andén, calles y árboles */}
      <mesh position={[1.5, -0.32, 1.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 30]} />
        <meshStandardMaterial color="#F6F7FA" roughness={1} />
      </mesh>
      <Box p={[1.5, -0.3, 13.6]} s={[40, 0.02, 3]} c="#DCE0E8" r={0} />
      <Box p={[18.6, -0.3, 0]} s={[3, 0.02, 30]} c="#DCE0E8" r={0} />
      {Array.from({ length: 12 }, (_, i) => <Box key={`r${i}`} p={[-16 + i * 3.2, -0.28, 13.6]} s={[1.4, 0.01, 0.12]} c={W} r={0} shadow={false} />)}
      {Array.from({ length: 9 }, (_, i) => <Box key={`c${i}`} p={[18.6, -0.28, -13 + i * 3.2]} s={[0.12, 0.01, 1.4]} c={W} r={0} shadow={false} />)}
      {[-12, -6, 0, 6, 12].map(x => <Arbol key={`ta${x}`} p={[x, -0.3, 11.6]} s={1.3} />)}
      {[-8, -2, 4, 10].map(z => <Arbol key={`tb${z}`} p={[16.6, -0.3, z]} s={1.3} />)}

      {/* Losa del piso */}
      <Box p={[0, -0.15, 0]} s={[30, 0.3, 20]} c={W} r={0.1} />

      {/* Fachada norte y oeste: muro bajo con remate rojo + ventanería */}
      <Box p={[0, 0.45, -9.9]} s={[30, 0.9, 0.2]} c={W} />
      <Box p={[-14.9, 0.45, 0]} s={[0.2, 0.9, 20]} c={W} />
      <Box p={[0, 0.93, -9.9]} s={[30, 0.06, 0.24]} c={RED} />
      <Box p={[-14.9, 0.93, 0]} s={[0.24, 0.06, 20]} c={RED} />
      {Array.from({ length: 11 }, (_, i) => <Box key={`n${i}`} p={[-15 + i * 3, 1.8, -9.9]} s={[0.07, 1.7, 0.07]} c={G2} r={0} />)}
      {Array.from({ length: 8 }, (_, i) => <Box key={`w${i}`} p={[-14.9, 1.8, -10 + i * 2.85]} s={[0.07, 1.7, 0.07]} c={G2} r={0} />)}
      <Box p={[0, 2.66, -9.9]} s={[30, 0.08, 0.1]} c={G2} r={0} />
      <Box p={[-14.9, 2.66, 0]} s={[0.1, 0.08, 20]} c={G2} r={0} />

      {area.estaciones.map((e, i) => <Zona key={e.id} e={e} n={i + 1} extra={extra(area, e)} onClick={() => onEstacion(e.id)} />)}

      {/* 01 Muro de datos: pantalla con barras */}
      <Box p={[-10, 1.6, -9.72]} s={[4.2, 1.8, 0.1]} c={SLATE} />
      {[0.5, 0.9, 0.7, 1.2, 1, 1.4, 0.8, 1.3].map((h, i) => (
        <Box key={i} p={[-11.6 + i * 0.45, 0.85 + h / 2, -9.65]} s={[0.24, h, 0.02]} c={i === 5 ? RED : ROSA} r={0} shadow={false} />
      ))}

      {/* 02 Mesa de estrategia: tablero */}
      <Box p={[0, 1.55, -9.74]} s={[4.6, 1.6, 0.08]} c={W} />
      {[[-1.4, 1.85], [-0.9, 1.4], [0.2, 1.8], [0.8, 1.35], [1.5, 1.7]].map(([x, y], i) => (
        <Box key={i} p={[x, y, -9.68]} s={[0.38, 0.38, 0.02]} c={i === 2 ? RED : i % 2 ? ROSA : '#FDE68A'} r={0} shadow={false} />
      ))}

      {/* 03 Estudio creativo: moodboard */}
      {Array.from({ length: 12 }, (_, i) => (
        <Box key={i} p={[8.6 + (i % 6) * 0.56, 1.3 + Math.floor(i / 6) * 0.6, -9.74]} s={[0.48, 0.5, 0.04]} c={[ROSA, RED, W, '#8E1F2A', G, ROSA][i % 6]} r={0.02} shadow={false} />
      ))}

      {/* 04 Sala de cliente: tabiques rojos, mesa y sillas */}
      <Box p={[-10, 0.55, 1]} s={[8, 1.1, 0.14]} c={RED} />
      <Box p={[-6, 0.55, 2.9]} s={[0.14, 1.1, 3.8]} c={RED} />
      <Box p={[-6, 0.55, 7.15]} s={[0.14, 1.1, 0.9]} c={RED} />
      <Box p={[-10, 0.4, 4.3]} s={[3.4, 0.08, 1.5]} c={W} />
      <Box p={[-10, 0.19, 4.3]} s={[0.4, 0.36, 0.4]} c={G2} />
      {[-11.2, -10, -8.8].flatMap(x => [[x, 3.2], [x, 5.4]]).map(([x, z], i) => <Box key={i} p={[x, 0.25, z]} s={[0.46, 0.5, 0.46]} c={SLATE} />)}

      {/* Muro Kanban (coordinación): una columna por etapa activa, una nota por tarea (máx. 10) */}
      <Kanban area={area} />

      {/* 05 Pantalla de publicación */}
      <Box p={[10, 1.5, 1.35]} s={[5, 2.2, 0.14]} c={SLATE} />
      {Array.from({ length: 15 }, (_, i) => (
        <Box key={i} p={[8.2 + (i % 5) * 0.9, 0.9 + Math.floor(i / 5) * 0.62, 1.44]} s={[0.78, 0.52, 0.02]} c={i === 7 ? RED : i % 4 === 1 ? '#86EFAC' : i % 3 ? ROSA : W} r={0} shadow={false} />
      ))}
      <Box p={[8.4, 0.2, 1.35]} s={[0.14, 0.4, 0.6]} c={G2} />
      <Box p={[11.6, 0.2, 1.35]} s={[0.14, 0.4, 0.6]} c={G2} />

      {/* 06–08 Archivo, descarte y congelador */}
      <Box p={[-3, 0.9, 8.7]} s={[2.4, 1.8, 0.5]} c={W} />
      {[0.45, 1.05, 1.65].map(y => <Box key={y} p={[-3, y, 8.95]} s={[2.4, 0.04, 0.02]} c={G2} r={0} shadow={false} />)}
      <mesh position={[0, 0.4, 8.4]} castShadow>
        <cylinderGeometry args={[0.45, 0.38, 0.8, 24]} />
        <meshStandardMaterial color={G2} roughness={0.7} />
      </mesh>
      <Box p={[3, 0.95, 8.7]} s={[1.2, 1.9, 0.8]} c={W} />
      <Box p={[3.45, 1.3, 9.12]} s={[0.06, 0.4, 0.04]} c="#93C5FD" r={0} />

      {/* Vida de oficina: café, baños, sala de descanso */}
      <Box p={[7, 0.47, 9.35]} s={[3.6, 0.94, 0.7]} c={W} />
      <Box p={[7, 0.47, 9.71]} s={[3.6, 0.9, 0.02]} c={RED} r={0} />
      <Box p={[6.2, 1.17, 9.35]} s={[0.45, 0.5, 0.4]} c={SLATE} />
      <Label p={[7, 1.9, 9.35]}>Café</Label>
      <Box p={[12.25, 0.55, 8.3]} s={[3.5, 1.1, 0.14]} c={G} />
      <Box p={[10.5, 0.55, 9.15]} s={[0.14, 1.1, 1.7]} c={G} />
      <Label p={[12.25, 1.6, 9.1]}>Baños</Label>
      <Box p={[-10, 0.22, 9.2]} s={[2.6, 0.44, 0.9]} c={RED} />
      <Box p={[-10, 0.62, 9.58]} s={[2.6, 0.5, 0.22]} c={RED} />
      <Box p={[-10, 0.15, 8.2]} s={[1, 0.3, 0.6]} c={W} />
      {([[-14.2, -2], [-14.2, 0.2], [4.8, -9.2], [14.4, -9.2], [14.4, 0.4], [-5.2, 9.3], [9.6, 9.4], [-14.3, 9.3]] as [number, number][]).map(([x, z], i) => (
        <Arbol key={i} p={[x, 0, z]} s={0.85} />
      ))}
    </group>
  )
}

// Conteo que acompaña la etiqueta de los lugares: piezas esperando al cliente o archivadas.
const extra = (a: Area, e: Estacion) => {
  if (e.tipo !== 'lugar') return ''
  const n = a.piezas.filter(p => e.etapas.includes(p.etapa)).length || e.etapas.reduce((s, et) => s + (a.archivadas[et] ?? 0), 0)
  return e.id === 'cliente' ? `${n} esperando` : String(n)
}

function Zona({ e, n, extra, onClick }: { e: Estacion; n: number; extra: string; onClick: () => void }) {
  const [x1, z1, x2, z2] = e.zona
  return (
    <group>
      <mesh position={[(x1 + x2) / 2, 0.01, (z1 + z2) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[x2 - x1, z2 - z1]} />
        <meshStandardMaterial color={PAD} roughness={1} />
      </mesh>
      <Label p={[x1 + 1.4, 0.1, z1 + 0.5]} onClick={onClick}>
        <b className="pill-n">{String(n).padStart(2, '0')}</b>{e.nombre}{extra && <em className="pill-extra">{extra}</em>}
      </Label>
    </group>
  )
}

function Kanban({ area }: { area: Area }) {
  const etapas = area.etapas.filter(et => !(et in area.archivadas))
  const x0 = -3.5, ancho = 7 / etapas.length
  return (
    <group position={[0, 0, 0.6]}>
      <Box p={[0, 1.3, 0]} s={[7.6, 2.05, 0.1]} c={W} />
      <Box p={[-3.2, 0.15, 0]} s={[0.12, 0.3, 0.5]} c={G2} />
      <Box p={[3.2, 0.15, 0]} s={[0.12, 0.3, 0.5]} c={G2} />
      {etapas.map((et, i) => {
        const cant = area.piezas.filter(p => p.etapa === et).length
        const color = area.estaciones.find(e => e.etapas.includes(et))!.color
        const cx = x0 + ancho * (i + 0.5)
        return (
          <group key={et}>
            <Box p={[cx, 2.12, 0.06]} s={[ancho - 0.12, 0.08, 0.02]} c={color} r={0} shadow={false} />
            {Array.from({ length: Math.min(cant, 10) }, (_, j) => (
              <Box key={j} p={[cx + ((j % 2) - 0.5) * 0.32, 1.9 - Math.floor(j / 2) * 0.32, 0.07]} s={[0.26, 0.26, 0.02]} c={color} r={0} shadow={false} />
            ))}
          </group>
        )
      })}
      <Label p={[0, 2.6, 0]}>Muro Kanban</Label>
    </group>
  )
}

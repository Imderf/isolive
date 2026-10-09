import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, useCursor } from '@react-three/drei'
import { MathUtils, type Group } from 'three'
import { MessageCircle } from 'lucide-react'
import { PERFILES, type Persona as TPersona, type Puesto, type Seleccion, type XZ } from '../model'
import { ruta, type Mapa } from '../sim/rutas'
import { enHorario } from '../sim/horario'
import { cambiar, useVisual, visual, type Paso, type Pose } from '../sim/visual'
import { Box, RED, capaEtiquetas } from './parts'

const SLATE = '#2A303C', ZAPATO = '#1F2430'
const PIEL = ['#E9C4A6', '#C9946B', '#8D5A3B']
const PELO = ['#1A1A1A', '#4D4D4D', '#6B4A32']
const VELOCIDAD = 1.5 // m/s

type Modo = 'sentado' | 'caminando' | Pose
interface Agente {
  x: number; z: number; rot: number; rotObjetivo: number
  nodo: string // último nodo de la red donde quedó
  cola: Paso[]
  camino: XZ[]
  espera: number // -1 = el paso de espera aún no arranca
  modo: Modo
  ambiente: boolean // el plan en curso es vida de oficina: se corta si llega una orden real
  proximo: number // segundos para el siguiente plan de ambiente
  fase: number
}

// Vida de oficina: decoración, nunca aparece en la ficha ni en el feed.
function planAmbiente(): Paso[] {
  const r = Math.random()
  if (r < 0.35) return [{ esperar: 5 + Math.random() * 4, pose: 'estirar' }]
  if (r < 0.75) return [{ ir: 'cafe', jitter: true }, { esperar: 10 + Math.random() * 12, pose: 'parado', mira: 'cafe' }]
  return [{ ir: 'banos' }, { esperar: 14 + Math.random() * 14, pose: 'oculto' }]
}

const girar = (de: number, a: number, k: number) => de + Math.atan2(Math.sin(a - de), Math.cos(a - de)) * k

export function Persona({ persona, puesto, i, mapa, sel, onSelect, enEtapa }: {
  persona: TPersona; puesto: Puesto; i: number; mapa: Mapa; sel: Seleccion | null; onSelect: (s: Seleccion | null) => void
  enEtapa: number // piezas suyas en la etapa elegida (0 si no hay etapa elegida)
}) {
  const asiento = `asiento:${puesto.id}`
  const [ax, az] = mapa.nodos.get(asiento)!
  const ag = useRef<Agente>({
    x: ax, z: az, rot: puesto.rot, rotObjetivo: puesto.rot, nodo: asiento, cola: [], camino: [], espera: -1,
    modo: 'sentado', ambiente: false, proximo: 6 + Math.random() * 60, fase: 0,
  })
  const root = useRef<Group>(null)
  const hip = [useRef<Group>(null), useRef<Group>(null)]
  const rod = [useRef<Group>(null), useRef<Group>(null)]
  const hom = [useRef<Group>(null), useRef<Group>(null)]
  useVisual()
  const [hover, setHover] = useState(false)
  useCursor(hover)
  const caja = visual.enMano.get(persona.id)
  const dice = visual.burbujas.get(persona.id)?.texto
  const selected = sel?.tipo === 'persona' && sel.id === persona.id
  const camisa = PERFILES[persona.perfil].color

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.1)
    const a = ag.current
    const g = root.current
    if (!g) return
    if (!enHorario()) {
      Object.assign(a, { x: ax, z: az, nodo: asiento, cola: [], camino: [], modo: 'sentado', espera: -1 })
      g.visible = false
      return
    }

    // 1. Tomar el siguiente plan: primero las órdenes reales, después la vida de oficina.
    if (!a.cola.length) {
      const orden = visual.ordenes.get(persona.id)?.[0]
      if (orden) {
        cambiar(() => visual.ordenes.get(persona.id)!.shift())
        a.cola = [...orden, { ir: asiento }]
        a.ambiente = false
      } else if ((a.proximo -= dt) <= 0) {
        a.cola = [...planAmbiente(), { ir: asiento }]
        a.ambiente = true
        a.proximo = 40 + Math.random() * 70
      }
    }

    // 2. Ejecutar el paso en curso.
    const paso = a.cola[0]
    if (!paso) {
      a.modo = 'sentado'
      a.rotObjetivo = puesto.rot
    } else if ('ir' in paso) {
      if (!a.camino.length) {
        a.camino = a.nodo === paso.ir ? [] : ruta(mapa, a.nodo, paso.ir)
        if (paso.jitter && a.camino.length) {
          const [lx, lz] = a.camino[a.camino.length - 1]
          a.camino[a.camino.length - 1] = [lx + (Math.random() - 0.5) * 1.1, lz + (Math.random() - 0.5) * 0.5]
        }
      }
      if (!a.camino.length) { a.nodo = paso.ir; a.cola.shift() }
      else {
        a.modo = 'caminando'
        const [tx, tz] = a.camino[0]
        const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz), paso_ = VELOCIDAD * dt
        if (d > 0.001) a.rotObjetivo = Math.atan2(-dx, -dz)
        if (d <= paso_) {
          a.x = tx; a.z = tz; a.camino.shift()
          if (!a.camino.length) { a.nodo = paso.ir; a.cola.shift() }
        } else { a.x += (dx / d) * paso_; a.z += (dz / d) * paso_ }
      }
    } else if ('esperar' in paso) {
      if (a.espera < 0) a.espera = paso.esperar
      a.modo = paso.pose
      const m = paso.mira && mapa.mira[paso.mira]
      if (m) a.rotObjetivo = Math.atan2(-(m[0] - a.x), -(m[1] - a.z))
      const urge = a.ambiente && (visual.ordenes.get(persona.id)?.length ?? 0) > 0
      if ((a.espera -= dt) <= 0 || urge) {
        a.espera = -1
        a.cola.shift()
        if (urge) a.cola = a.cola.filter(p => 'ir' in p && p.ir === asiento) // vuelve directo al puesto
      }
    } else if ('recoger' in paso) {
      cambiar(() => { visual.fantasmas.delete(paso.recoger); visual.enMano.set(persona.id, paso.color) })
      a.cola.shift()
    } else {
      cambiar(() => { visual.enMano.delete(persona.id); visual.ocultas.delete(paso.dejar) })
      a.cola.shift()
    }

    // 3. Pose: ángulos objetivo de caderas, rodillas y hombros, suavizados.
    const t = clock.elapsedTime + i * 1.7
    let hp = [0, 0], rd = [0, 0], hb = [0, 0], bob = 0
    if (a.modo === 'sentado') {
      hp = [1.5, 1.5]; rd = [-1.5, -1.5]
      hb = [1.15 + Math.sin(t * 11) * 0.05, 1.15 + Math.sin(t * 11 + 1.6) * 0.05]
    } else if (a.modo === 'caminando') {
      a.fase += dt * 9
      const s = Math.sin(a.fase)
      hp = [s * 0.55, -s * 0.55]
      rd = [-Math.max(0, -s) * 0.9, -Math.max(0, s) * 0.9]
      hb = caja ? [1.25, 1.25] : [-s * 0.45, s * 0.45]
      bob = Math.abs(Math.cos(a.fase)) * 0.035
    } else if (a.modo === 'estirar') {
      hb = [2.9, 2.9]
      bob = Math.sin(t * 2) * 0.02
    } else if (a.modo === 'tablero') {
      hb = [0.2, 2.2 + Math.sin(t * 3) * 0.15]
    } else {
      hb = caja ? [1.25, 1.25] : [Math.sin(t) * 0.05, -Math.sin(t) * 0.05]
    }
    for (const k of [0, 1]) {
      hip[k].current!.rotation.x = MathUtils.damp(hip[k].current!.rotation.x, hp[k], 12, dt)
      rod[k].current!.rotation.x = MathUtils.damp(rod[k].current!.rotation.x, rd[k], 12, dt)
      hom[k].current!.rotation.x = MathUtils.damp(hom[k].current!.rotation.x, hb[k], 10, dt)
    }
    a.rot = girar(a.rot, a.rotObjetivo, Math.min(1, dt * 10))
    g.visible = a.modo !== 'oculto'
    g.position.set(a.x, bob, a.z)
    g.rotation.y = a.rot
  })

  return (
    <group
      ref={root}
      position={[ax, 0, az]}
      onClick={e => { e.stopPropagation(); onSelect({ tipo: 'persona', id: persona.id }) }}
      onPointerOver={e => { e.stopPropagation(); setHover(true) }}
      onPointerOut={() => setHover(false)}
    >
      <Cuerpo camisa={camisa} piel={PIEL[i % 3]} pelo={PELO[(i * 2) % 3]} hip={hip} rod={rod} hom={hom} />
      {caja && <Box p={[0, 0.98, -0.42]} s={[0.26, 0.2, 0.26]} c={caja} />}
      {(selected || enEtapa > 0) && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.55, 48]} />
          <meshBasicMaterial color={selected ? RED : '#F59E0B'} />
        </mesh>
      )}
      {(hover || selected) ? (
        <Html portal={capaEtiquetas} position={[0, 1.9, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="pill pill-oscuro">{persona.nombre}<small>{PERFILES[persona.perfil].nombre}</small></div>
        </Html>
      ) : enEtapa > 0 ? (
        <Html portal={capaEtiquetas} position={[0, 1.9, 0]} center zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
          <div className="conteo">{enEtapa}</div>
        </Html>
      ) : dice && (
        <Html portal={capaEtiquetas} position={[0, 1.9, 0]} center zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
          <div className="pill pill-claro burbuja"><MessageCircle />{dice}</div>
        </Html>
      )}
    </group>
  )
}

type Pivote = React.RefObject<Group | null>
// Cuerpo low-poly. Las caderas, rodillas y hombros son pivotes: se animan por ref (Persona)
// o se dejan en una pose fija (visitantes sentados).
export function Cuerpo({ camisa, piel, pelo, hip, rod, hom, pose }: {
  camisa: string; piel: string; pelo: string
  hip?: Pivote[]; rod?: Pivote[]; hom?: Pivote[]
  pose?: { cadera: number; rodilla: number; hombro: number }
}) {
  return (
    <>
      <mesh position={[0, 0.92, 0]} castShadow>
        <capsuleGeometry args={[0.19, 0.3, 4, 12]} />
        <meshStandardMaterial color={camisa} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.36, 0]} castShadow>
        <sphereGeometry args={[0.16, 16, 12]} />
        <meshStandardMaterial color={piel} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.42, 0.03]} castShadow>
        <sphereGeometry args={[0.165, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={pelo} roughness={0.9} />
      </mesh>
      {[-1, 1].map((lado, k) => (
        <group key={`p${k}`} ref={hip?.[k]} position={[lado * 0.09, 0.55, 0]} rotation={[pose?.cadera ?? 0, 0, 0]}>
          <Box p={[0, -0.14, 0]} s={[0.13, 0.3, 0.14]} c={SLATE} />
          <group ref={rod?.[k]} position={[0, -0.28, 0]} rotation={[pose?.rodilla ?? 0, 0, 0]}>
            <Box p={[0, -0.13, 0]} s={[0.12, 0.27, 0.13]} c={SLATE} />
            <Box p={[0, -0.25, -0.04]} s={[0.12, 0.05, 0.2]} c={ZAPATO} />
          </group>
        </group>
      ))}
      {[-1, 1].map((lado, k) => (
        <group key={`b${k}`} ref={hom?.[k]} position={[lado * 0.25, 1.1, 0]} rotation={[pose?.hombro ?? 0, 0, 0]}>
          <Box p={[0, -0.19, 0]} s={[0.1, 0.4, 0.1]} c={camisa} />
          <mesh position={[0, -0.42, 0]}><sphereGeometry args={[0.055, 10, 8]} /><meshStandardMaterial color={piel} /></mesh>
        </group>
      ))}
    </>
  )
}

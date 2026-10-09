import { createRef, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { ExtrudeGeometry, MathUtils, Shape, Vector2, Vector3, type Group } from 'three'
import entorno from './entorno-naos.json'
import { Cuerpo } from '../scene/Persona'
import { Puertas } from './Ascensor'
import { TextoSuelo } from '../scene/parts'

// Intro: el barrio real del Naos (OpenStreetMap, extraído una vez como hace map3d), la cámara baja hasta la
// entrada sobre la Av. Carrera 9, una persona entra y se cierran las puertas del ascensor.
type P = [number, number]
const capa = createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement> // destino fijo para <Html>
const PISO = 3.3
const DURACION = 7.4 // s hasta que cierran las puertas
const { puerta, normal } = entorno.entrada as { puerta: P; normal: P }
const fuera = (d: number, y = 0) => new Vector3(puerta[0] + normal[0] * d, y, puerta[1] + normal[1] * d)
const lado = new Vector3(-normal[1], 0, normal[0]) // a lo largo de la fachada

// Recorrido de la cámara: [segundo, posición, hacia dónde mira]
const TOMAS: [number, Vector3, Vector3][] = [
  [0, new Vector3(-240, 210, 280), new Vector3(0, 0, 0)],
  [3.0, fuera(110, 80).add(lado.clone().multiplyScalar(-60)), new Vector3(0, 12, 0)],
  [5.2, fuera(30, 11).add(lado.clone().multiplyScalar(-10)), fuera(0, 4)],
  [DURACION, fuera(7, 2.4), fuera(-4, 2)],
]
const suave = (t: number) => t * t * (3 - 2 * t)

function Camara({ onLlegar }: { onLlegar: () => void }) {
  const camera = useThree(s => s.camera)
  const mira = useRef(new Vector3())
  const llego = useRef(false)
  useFrame(({ clock }) => {
    const t = Math.min(clock.elapsedTime, DURACION)
    let i = 0
    while (i < TOMAS.length - 2 && t > TOMAS[i + 1][0]) i++
    const [t0, p0, m0] = TOMAS[i], [t1, p1, m1] = TOMAS[i + 1]
    const u = suave(MathUtils.clamp((t - t0) / (t1 - t0), 0, 1))
    camera.position.lerpVectors(p0, p1, u)
    mira.current.lerpVectors(m0, m1, u)
    camera.lookAt(mira.current)
    if (clock.elapsedTime >= DURACION && !llego.current) { llego.current = true; onLlegar() }
  })
  return null
}

function Edificio({ puntos, alto, color, y = 0, escala = 1 }: { puntos: P[]; alto: number; color: string; y?: number; escala?: number }) {
  const geo = useMemo(() => {
    const s = new Shape(puntos.map(([x, z]) => new Vector2(x, -z)))
    return new ExtrudeGeometry(s, { depth: alto, bevelEnabled: false })
  }, [puntos, alto])
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} scale={[escala, escala, 1]} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  )
}

// El Naos: vidrio con losas blancas por piso y el piso 4 (Ogilvy) en rojo.
function Naos({ puntos, pisos }: { puntos: P[]; pisos: number }) {
  return (
    <group>
      {/* el vidrio va un poco adentro de las losas para que no parpadeen al coincidir */}
      <Edificio puntos={puntos} alto={pisos * PISO} color="#BFD3E6" escala={0.985} />
      {Array.from({ length: pisos }, (_, i) => (
        <Edificio key={i} puntos={puntos} alto={i === 3 ? 0.6 : 0.22} y={i * PISO + (i === 3 ? 0 : PISO - 0.11)} color={i === 3 ? '#EF3B3A' : '#FFFFFF'} />
      ))}
      <Entrada />
      <Html portal={capa} position={[0, pisos * PISO + 9, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="pill pill-oscuro intro-pill">Edificio Naos<small>Av. Carrera 9 #101-67 · Ogilvy, piso 4</small></div>
      </Html>
    </group>
  )
}

function Calles() {
  const tramos = useMemo(() => entorno.calles.flatMap((c, k) => c.puntos.slice(1).map((b, i) => {
    const a = c.puntos[i] as P
    const dx = b[0] - a[0], dz = b[1] - a[1]
    return { key: `${k}-${i}`, x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, largo: Math.hypot(dx, dz) + c.ancho * 0.5, ancho: c.ancho, rot: Math.atan2(-dz, dx), tren: c.tipo === 'tren' }
  })), [])
  return (
    <>
      {tramos.map(t => (
        <mesh key={t.key} position={[t.x, t.tren ? 0.05 : 0.02, t.z]} rotation={[0, t.rot, 0]} receiveShadow>
          <boxGeometry args={[t.largo, 0.04, t.ancho]} />
          <meshStandardMaterial color={t.tren ? '#B9C0CC' : '#DCE0E8'} roughness={1} />
        </mesh>
      ))}
      {/* Nombres de las vías principales, pintados sobre la calle */}
      {(['Avenida Carrera 9', 'Avenida Carrera 15', 'Calle 102'] as const).map(nombre => {
        const c = entorno.calles.filter(x => x.nombre === nombre).sort((a, b) => b.puntos.length - a.puntos.length)[0]
        if (!c) return null
        const i = Math.floor(c.puntos.length / 2) - 1
        const a = c.puntos[Math.max(i, 0)], b = c.puntos[Math.max(i, 0) + 1]
        const rot = Math.atan2(-(b[1] - a[1]), b[0] - a[0])
        return (
          <TextoSuelo key={nombre} texto={nombre.replace('Avenida', 'Av.')} x={(a[0] + b[0]) / 2} y={0.1} z={(a[1] + b[1]) / 2} rot={rot} alto={4} />
        )
      })}
    </>
  )
}

function Caminante() {
  const g = useRef<Group>(null)
  const hip = [useRef<Group>(null), useRef<Group>(null)]
  const hom = [useRef<Group>(null), useRef<Group>(null)]
  const desde = fuera(13), hasta = fuera(-3)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const u = MathUtils.clamp((t - 3.4) / 3.8, 0, 1)
    if (!g.current) return
    g.current.position.lerpVectors(desde, hasta, u)
    g.current.visible = u < 0.98
    g.current.rotation.y = Math.atan2(normal[0], normal[1]) // mira hacia el edificio
    const s = Math.sin(t * 9)
    for (const k of [0, 1]) {
      hip[k].current!.rotation.x = (k ? -s : s) * 0.55
      hom[k].current!.rotation.x = (k ? s : -s) * 0.45
    }
  })
  return (
    <group ref={g} scale={1.15}>
      <Cuerpo camisa="#EF3B3A" piel="#C9946B" pelo="#1A1A1A" hip={hip} hom={hom} />
    </group>
  )
}

export function IntroCiudad({ onLlegar, onSaltar }: { onLlegar: () => void; onSaltar: () => void }) {
  const [cerrando, setCerrando] = useState(false)
  const naos = entorno.edificios.find(b => b.id === entorno.naos)!
  return (
    <div className="intro">
      <div ref={capa} className="etiquetas" />
      <Canvas shadows="soft" dpr={[1, 2]} camera={{ fov: 32, near: 1, far: 1200, position: [-240, 210, 280] }}>
        <color attach="background" args={['#EDEFF4']} />
        <fog attach="fog" args={['#EDEFF4', 320, 900]} />
        <hemisphereLight args={['#FFFFFF', '#DDE1EA', 1.6]} />
        <directionalLight castShadow position={[120, 220, 90]} intensity={1.7} shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-220} shadow-camera-right={220} shadow-camera-top={220} shadow-camera-bottom={-220} shadow-bias={-0.0005} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[1400, 1400]} />
          <meshStandardMaterial color="#F6F7FA" roughness={1} />
        </mesh>
        <Calles />
        {entorno.edificios.filter(b => b.id !== entorno.naos).map(b => (
          <Edificio key={b.id} puntos={b.puntos as P[]} alto={b.pisos * PISO} color={b.estimado ? '#F1F2F6' : '#FFFFFF'} />
        ))}
        <Naos puntos={naos.puntos as P[]} pisos={naos.pisos} />
        <Caminante />
        <Camara onLlegar={onLlegar} />
        <Cierre onCerrar={() => setCerrando(true)} />
      </Canvas>
      <Puertas abiertas={!cerrando} piso={1} />
      <p className="intro-fuente">Edificios: © OpenStreetMap</p>
      <button className="saltar" onClick={onSaltar}>Saltar intro</button>
    </div>
  )
}

// Las puertas del ascensor empiezan a cerrarse un poco antes de terminar el recorrido.
function Cierre({ onCerrar }: { onCerrar: () => void }) {
  const hecho = useRef(false)
  useFrame(({ clock }) => { if (!hecho.current && clock.elapsedTime > DURACION - 0.75) { hecho.current = true; onCerrar() } })
  return null
}

// Puerta de vidrio oscuro con marquesina, sobre la fachada que mira a la Av. Carrera 9.
function Entrada() {
  const rot = Math.atan2(-lado.z, lado.x) + Math.PI // +z local mira hacia la calle
  const p = fuera(0.25)
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 1.6, 0]} castShadow><boxGeometry args={[4.4, 3.2, 0.4]} /><meshStandardMaterial color="#FFFFFF" /></mesh>
      <mesh position={[0, 1.45, 0.05]}><boxGeometry args={[3.8, 2.9, 0.4]} /><meshStandardMaterial color="#2A303C" roughness={0.3} /></mesh>
      <mesh position={[0, 1.45, 0.26]}><boxGeometry args={[0.06, 2.9, 0.02]} /><meshStandardMaterial color="#9AA3B2" /></mesh>
      <mesh position={[0, 3.45, 1.2]} castShadow><boxGeometry args={[6, 0.25, 2.6]} /><meshStandardMaterial color="#EF3B3A" /></mesh>
    </group>
  )
}

import { createRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { CanvasTexture, Color, ExtrudeGeometry, MathUtils, MeshStandardMaterial, Object3D, PlaneGeometry, RepeatWrapping, SRGBColorSpace, Shape, Vector2, Vector3, type Group, type InstancedMesh } from 'three'
import entorno from './entorno-naos.json'
import { Cuerpo } from '../scene/Persona'
import { Cabina } from './Ascensor'
import { Arbol, TextoSuelo } from '../scene/parts'

// Intro: el barrio real del Naos (OpenStreetMap, extraído una vez como hace map3d) con los cerros orientales al fondo.
// El Naos sigue al edificio real; los vecinos son volúmenes de OSM con ventanas y locales de textura.
// La cámara baja a la entrada sobre la Av. Carrera 9, sigue a una persona por el vestíbulo de vidrio hasta el ascensor,
// las puertas se cierran y la escena pasa al interior de la cabina. En los datos, +x es el oriente y +z el sur.
type P = [number, number]
const capa = createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement> // destino fijo para <Html>
const PISO = 3.3
const DURACION = 8.8 // s hasta entrar a la cabina
const CIELO = '#CFE0EE'
const { puerta, normal } = entorno.entrada as { puerta: P; normal: P }
const fuera = (d: number, y = 0) => new Vector3(puerta[0] + normal[0] * d, y, puerta[1] + normal[1] * d)
const lado = new Vector3(-normal[1], 0, normal[0]) // a lo largo de la fachada
const junto = (d: number, y: number, l: number) => fuera(d, y).add(lado.clone().multiplyScalar(l))

// Vestíbulo (distancias a la fachada): puertas de vidrio en 5,25, ascensor en 1,45, dentro de la cabina en 0,95.
const CABINA = 0.95
// Tiempos: [inicio, fin] de cada movimiento
const T = {
  puertaAbre: [4.9, 5.4], puertaCierra: [7.8, 8.3],
  ascensorAbre: [6.0, 6.6], ascensorCierra: [7.7, 8.3],
  pasos: [[3.3, 5.5, 12, 6.2], [5.5, 6.7, 6.2, 2.0], [6.7, 7.2, 2.0, CABINA]] as [number, number, number, number][],
  giro: [7.2, 7.6],
}

// Recorrido de la cámara: [segundo, posición, hacia dónde mira]
const TOMAS: [number, Vector3, Vector3][] = [
  [0, new Vector3(-380, 120, 380), new Vector3(220, 30, -40)], // el Naos adelante y los cerros al fondo
  [3.0, junto(110, 80, -60), new Vector3(0, 12, 0)],
  [5.0, junto(16, 3.4, -4), fuera(3, 1.9)],
  [6.9, junto(5.6, 1.75, 0.6), fuera(1.2, 1.5)],
  [DURACION, junto(4.1, 1.7, 0.3), fuera(1.0, 1.55)],
]
const suave = (t: number) => t * t * (3 - 2 * t)
const fase = (t: number, [a, b]: number[]) => suave(MathUtils.clamp((t - a) / (b - a), 0, 1))
const abierta = (t: number, abre: number[], cierra: number[]) => fase(t, abre) * (1 - fase(t, cierra))

function Camara({ onLlegar }: { onLlegar: () => void }) {
  const camera = useThree(s => s.camera)
  const mira = useRef(new Vector3())
  const llego = useRef(false)
  const cuadros = useRef(0)
  useFrame(({ clock }) => {
    if (++cuadros.current === 2) clock.start() // el reloj arranca cuando ya se dibujó la escena (el primer cuadro compila)
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

// Fachadas de Bogotá: ladrillo en casi la mitad, arena, crema, gris y vidrio.
const FACHADAS = ['#C4704E', '#B5603F', '#CF8A64', '#E5D4B6', '#F1E7D6', '#D7DCE4', '#AFC3D6']
const tono = (id: string | number) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return FACHADAS[h % FACHADAS.length] }

const useExtrusion = (puntos: P[], alto: number) =>
  useMemo(() => new ExtrudeGeometry(new Shape(puntos.map(([x, z]) => new Vector2(x, -z))), { depth: alto, bevelEnabled: false }), [puntos, alto])

function Volumen({ puntos, alto, color, y = 0, escala = 1, rugosidad = 0.8, metal = 0, emisivo = '#000000', intensidad = 0 }: {
  puntos: P[]; alto: number; color: string; y?: number; escala?: number; rugosidad?: number; metal?: number; emisivo?: string; intensidad?: number
}) {
  const geo = useExtrusion(puntos, alto)
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} scale={[escala, escala, 1]} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={rugosidad} metalness={metal} emissive={emisivo} emissiveIntensity={intensidad} />
    </mesh>
  )
}

// Fachadas de los vecinos: ventanas por piso (celda de 3 × 3,3 m) y, en el primer piso, locales con vitrina y puerta
// (celda de 9 m). El color de la pared va pintado en la textura para que el vidrio no se tiña; el ladrillo lleva hiladas.
// En la extrusión, v = 1 − altura: sin voltear y con este corrimiento, cada celda arranca en el piso.
const TECHO = new MeshStandardMaterial({ color: '#BCC1C8', roughness: 0.9 })
const fachadas = new Map<string, { locales: MeshStandardMaterial; ventanas: MeshStandardMaterial }>()
function fachada(color: string) {
  const hecha = fachadas.get(color)
  if (hecha) return hecha
  const ladrillo = FACHADAS.indexOf(color) < 3
  const vidrio = (x: CanvasRenderingContext2D, a: number, b: number, w: number, h: number) => {
    x.fillStyle = '#F4F2ED'; x.fillRect(a - 4, b - 4, w + 8, h + 8)
    const g = x.createLinearGradient(0, b, 0, b + h); g.addColorStop(0, '#9CB0C4'); g.addColorStop(1, '#4D5C6D')
    x.fillStyle = g; x.fillRect(a, b, w, h)
  }
  const textura = (ancho: number, metros: number, pintar: (x: CanvasRenderingContext2D) => void) => {
    const c = Object.assign(document.createElement('canvas'), { width: ancho, height: 140 })
    const x = c.getContext('2d')!
    x.fillStyle = color; x.fillRect(0, 0, ancho, 140)
    if (ladrillo) { x.fillStyle = 'rgba(0, 0, 0, .08)'; for (let y = 3; y < 140; y += 6) x.fillRect(0, y, ancho, 1) }
    pintar(x)
    const t = new CanvasTexture(c)
    t.wrapS = t.wrapT = RepeatWrapping; t.flipY = false; t.colorSpace = SRGBColorSpace; t.anisotropy = 8
    t.repeat.set(1 / metros, 1 / PISO); t.offset.y = 1 - 1 / PISO
    return new MeshStandardMaterial({ map: t, roughness: 0.85 })
  }
  const lista = {
    ventanas: textura(128, 3, x => {
      vidrio(x, 24, 30, 80, 72); x.fillStyle = '#F4F2ED'; x.fillRect(62, 30, 4, 72)
      x.fillStyle = 'rgba(0, 0, 0, .1)'; x.fillRect(0, 0, 128, 8)
    }),
    locales: textura(384, 9, x => {
      x.fillStyle = 'rgba(0, 0, 0, .14)'; x.fillRect(0, 0, 384, 16)
      vidrio(x, 18, 34, 136, 106); vidrio(x, 230, 34, 136, 106)
      x.fillStyle = '#3A3F4A'; x.fillRect(170, 44, 46, 96)
      x.fillStyle = '#C9CED6'; x.fillRect(208, 90, 3, 14)
    }),
  }
  fachadas.set(color, lista)
  return lista
}

function Vecino({ b }: { b: { id: number; pisos: number; puntos: number[][] } }) {
  const puntos = b.puntos as P[]
  const { locales, ventanas } = fachada(tono(b.id))
  const bajo = useExtrusion(puntos, PISO), arriba = useExtrusion(puntos, Math.max(b.pisos - 1, 0) * PISO)
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={bajo} material={[TECHO, locales]} castShadow receiveShadow />
      {b.pisos > 1 && <mesh geometry={arriba} material={[TECHO, ventanas]} position={[0, 0, PISO]} castShadow receiveShadow />}
    </group>
  )
}

// El Naos (NAOS Business Campus, Arquitectura en Estudio, 2017): vidrio oscuro detrás de una celosía de aletas de
// aluminio, losas de concreto visto en cada piso, esquinas curvas con árboles en terrazas de doble altura y cubierta
// verde. El piso 4 (Ogilvy) se ve iluminado y con una línea roja. El origen de los datos es el centro del Naos.
const CONCRETO = '#D3D5D6'
function Naos({ puntos, pisos }: { puntos: P[]; pisos: number }) {
  const alto = pisos * PISO
  return (
    <group>
      {/* el vidrio va un poco adentro de las losas para que no parpadeen al coincidir */}
      <Volumen puntos={puntos} alto={alto} color="#5D6B7B" escala={0.985} rugosidad={0.25} metal={0.15} />
      <Volumen puntos={puntos} alto={PISO - 0.45} y={3 * PISO + 0.45} color="#F2D3A2" escala={0.987} rugosidad={0.4} emisivo="#FFC46E" intensidad={0.45} />
      {Array.from({ length: pisos + 1 }, (_, i) => (
        <Volumen key={i} puntos={puntos} alto={i === 3 ? 0.22 : 0.45} y={i * PISO} color={i === 3 ? '#EF3B3A' : CONCRETO} />
      ))}
      <Volumen puntos={puntos} alto={0.12} y={alto + 0.45} color="#86A877" escala={0.94} />
      <mesh position={[0, alto + 2.15, 0]} rotation={[0, Math.atan2(-lado.z, lado.x), 0]} castShadow>
        <boxGeometry args={[16, 3.4, 9]} /><meshStandardMaterial color="#C7CACC" roughness={0.8} />
      </mesh>
      <Celosia puntos={puntos} y0={PISO} y1={alto} />
      <Terrazas puntos={puntos} pisos={pisos} />
      <Vestibulo />
      <Html portal={capa} position={[0, alto + 9, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="pill pill-oscuro intro-pill">Edificio Naos<small>Av. Carrera 9 #101-67 · Ogilvy, piso 4</small></div>
      </Html>
    </group>
  )
}

// Celosía: aletas verticales de aluminio frente al vidrio, más densas en las fachadas oriente y occidente (más sol).
function Celosia({ puntos, y0, y1 }: { puntos: P[]; y0: number; y1: number }) {
  const ref = useRef<InstancedMesh>(null)
  const aletas = useMemo(() => {
    const out: [number, number, number][] = []
    puntos.forEach(([ax, az], i) => {
      const [bx, bz] = puntos[(i + 1) % puntos.length]
      const largo = Math.hypot(bx - ax, bz - az)
      if (largo < 0.5) return
      let nx = (bz - az) / largo, nz = -(bx - ax) / largo
      if (nx * (ax + bx) + nz * (az + bz) < 0) { nx = -nx; nz = -nz } // hacia afuera (el origen está adentro)
      const paso = Math.abs(nx) > Math.abs(nz) ? 0.6 : 1.0
      for (let d = paso / 2; d < largo; d += paso) out.push([ax + ((bx - ax) * d) / largo + nx * 0.4, az + ((bz - az) * d) / largo + nz * 0.4, Math.atan2(nx, nz)])
    })
    return out
  }, [puntos])
  useLayoutEffect(() => {
    const o = new Object3D()
    aletas.forEach(([x, z, r], i) => { o.position.set(x, (y0 + y1) / 2, z); o.rotation.set(0, r, 0); o.updateMatrix(); ref.current!.setMatrixAt(i, o.matrix) })
    ref.current!.instanceMatrix.needsUpdate = true
  }, [aletas, y0, y1])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, aletas.length]} castShadow>
      <boxGeometry args={[0.07, y1 - y0, 0.3]} /><meshStandardMaterial color="#A9B0B8" roughness={0.45} metalness={0.5} />
    </instancedMesh>
  )
}

// Terrazas de doble altura en las esquinas curvas, con cauchos sabaneros.
function Terrazas({ puntos, pisos }: { puntos: P[]; pisos: number }) {
  const esquinas = [puntos.reduce((a, b) => (b[0] < a[0] ? b : a)), puntos.reduce((a, b) => (b[0] > a[0] ? b : a))]
  return (
    <>
      {esquinas.flatMap(([x, z], k) => [1, 3, 5].filter(i => i < pisos - 1).map(i => {
        const f = (Math.hypot(x, z) + 1.1) / Math.hypot(x, z)
        return (
          <group key={`${k}-${i}`} position={[x * f, i * PISO + 0.35, z * f]}>
            <mesh position={[0, -0.1, 0]} receiveShadow><boxGeometry args={[2.6, 0.2, 2.6]} /><meshStandardMaterial color={CONCRETO} /></mesh>
            <mesh position={[0, 0.3, 0]}><boxGeometry args={[1.2, 0.6, 1.2]} /><meshStandardMaterial color="#B9BDC1" /></mesh>
            <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.08, 0.1, 1.6, 6]} /><meshStandardMaterial color="#7A5C40" /></mesh>
            <mesh position={[0, 2.7, 0]} castShadow><icosahedronGeometry args={[1.3, 1]} /><meshStandardMaterial color="#4F7F4B" flatShading roughness={0.9} /></mesh>
          </group>
        )
      }))}
    </>
  )
}

const ASFALTO: Record<string, string> = { primary: '#8C94A0', secondary: '#8C94A0', tertiary: '#A3AAB5', residential: '#AEB4BE', tren: '#B3A595' }

function Calles() {
  const tramos = useMemo(() => entorno.calles.flatMap((c, k) => c.puntos.slice(1).map((b, i) => {
    const a = c.puntos[i] as P
    const dx = b[0] - a[0], dz = b[1] - a[1]
    return { key: `${k}-${i}`, x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, largo: Math.hypot(dx, dz) + c.ancho * 0.5, ancho: c.ancho, rot: Math.atan2(-dz, dx), tipo: c.tipo }
  })), [])
  return (
    <>
      {tramos.map(t => (
        <mesh key={t.key} position={[t.x, t.tipo === 'tren' ? 0.05 : 0.02, t.z]} rotation={[0, t.rot, 0]} receiveShadow>
          <boxGeometry args={[t.largo, 0.04, t.ancho]} />
          <meshStandardMaterial color={ASFALTO[t.tipo] ?? '#AEB4BE'} roughness={1} />
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

// Árboles a lado y lado de la Av. Carrera 9 (cada 30 m, como en la foto real), sin caer en un edificio ni frente a la entrada.
const dentro = ([x, z]: P, pol: P[]) => {
  let si = false
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, zi] = pol[i], [xj, zj] = pol[j]
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) si = !si
  }
  return si
}
function Arboles() {
  const copas = useRef<InstancedMesh>(null), troncos = useRef<InstancedMesh>(null)
  const puntos = useMemo(() => {
    const out: [number, number, number][] = []
    for (const c of entorno.calles) {
      if (c.nombre !== 'Avenida Carrera 9') continue
      for (let i = 1; i < c.puntos.length; i++) {
        const [ax, az] = c.puntos[i - 1], [bx, bz] = c.puntos[i]
        const largo = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / largo, nz = (bx - ax) / largo
        for (let s = 12; s < largo; s += 30) for (const l of [-1, 1]) {
          const p: P = [ax + ((bx - ax) * s) / largo + nx * l * (c.ancho / 2 + 2), az + ((bz - az) * s) / largo + nz * l * (c.ancho / 2 + 2)]
          if (Math.hypot(p[0] - puerta[0], p[1] - puerta[1]) < 16) continue
          if (entorno.edificios.some(b => dentro(p, b.puntos as P[]))) continue
          out.push([p[0], p[1], 0.8 + ((i * 7 + s) % 5) * 0.12])
        }
      }
    }
    return out
  }, [])
  useLayoutEffect(() => {
    const o = new Object3D(), verdes = ['#6FA56A', '#7DB477', '#5E9660', '#8BBF7E'].map(c => new Color(c))
    puntos.forEach(([x, z, s], i) => {
      o.position.set(x, 3.2 * s, z); o.scale.setScalar(s); o.updateMatrix(); copas.current!.setMatrixAt(i, o.matrix); copas.current!.setColorAt(i, verdes[i % verdes.length])
      o.position.set(x, 1.1 * s, z); o.updateMatrix(); troncos.current!.setMatrixAt(i, o.matrix)
    })
    copas.current!.instanceMatrix.needsUpdate = true; troncos.current!.instanceMatrix.needsUpdate = true
    if (copas.current!.instanceColor) copas.current!.instanceColor.needsUpdate = true
  }, [puntos])
  return (
    <>
      <instancedMesh ref={copas} args={[undefined, undefined, puntos.length]} castShadow>
        <icosahedronGeometry args={[2.2, 0]} /><meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={troncos} args={[undefined, undefined, puntos.length]}>
        <cylinderGeometry args={[0.18, 0.24, 2.2, 6]} /><meshStandardMaterial color="#8B6B4A" />
      </instancedMesh>
    </>
  )
}

// Cerros orientales: una cordillera verde de facetas al oriente (+x), que la neblina vuelve azulada.
function Cerros() {
  const geo = useMemo(() => {
    const g = new PlaneGeometry(1000, 3000, 40, 90).toNonIndexed()
    g.rotateX(-Math.PI / 2)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i)
      const subida = MathUtils.smoothstep(x, -500, 150)
      p.setY(i, subida * (190 + 65 * Math.sin(z / 170) + 40 * Math.sin(z / 61 + 1.3) + 18 * Math.sin(z / 23 + x / 40)))
    }
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <mesh geometry={geo} position={[1350, 0, -200]}>
      <meshStandardMaterial color="#6E9A68" roughness={1} flatShading />
    </mesh>
  )
}

function Caminante() {
  const g = useRef<Group>(null)
  const hip = [useRef<Group>(null), useRef<Group>(null)]
  const hom = [useRef<Group>(null), useRef<Group>(null)]
  const haciaEdificio = Math.atan2(normal[0], normal[1])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    if (!g.current) return
    const tramo = T.pasos.find(([a, b]) => t >= a && t < b)
    const [, , , ultimo] = T.pasos[T.pasos.length - 1]
    let d = t < T.pasos[0][0] ? T.pasos[0][2] : ultimo
    if (tramo) d = MathUtils.lerp(tramo[2], tramo[3], (t - tramo[0]) / (tramo[1] - tramo[0]))
    g.current.position.copy(fuera(d))
    g.current.rotation.y = haciaEdificio + Math.PI * fase(t, T.giro) // al entrar a la cabina se da vuelta
    const s = tramo ? Math.sin(t * 9) : 0
    for (const k of [0, 1]) {
      hip[k].current!.rotation.x = MathUtils.damp(hip[k].current!.rotation.x, (k ? -s : s) * 0.55, 14, dt)
      hom[k].current!.rotation.x = MathUtils.damp(hom[k].current!.rotation.x, (k ? s : -s) * 0.45, 14, dt)
    }
  })
  return (
    <group ref={g} scale={1.15}>
      <Cuerpo camisa="#EF3B3A" piel="#C9946B" pelo="#6B4A32" hip={hip} hom={hom} />
    </group>
  )
}

export function IntroCiudad({ onLlegar, onSaltar }: { onLlegar: () => void; onSaltar: () => void }) {
  const [cerrando, setCerrando] = useState(false)
  const naos = entorno.edificios.find(b => b.id === entorno.naos)!
  return (
    <div className="intro">
      <div ref={capa} className="etiquetas" />
      <Canvas shadows="soft" dpr={[1, 2]} camera={{ fov: 32, near: 1, far: 3200, position: [-380, 120, 380] }}>
        <color attach="background" args={[CIELO]} />
        <fog attach="fog" args={[CIELO, 500, 2600]} />
        <hemisphereLight args={['#EAF3FF', '#C9D6C3', 1.5]} />
        <directionalLight castShadow position={[180, 260, 120]} intensity={2} color="#FFF1DC" shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-220} shadow-camera-right={220} shadow-camera-top={220} shadow-camera-bottom={-220} shadow-bias={-0.0005} shadow-normalBias={0.05} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[3000, 3000]} />
          <meshStandardMaterial color="#E1E8D9" roughness={1} />
        </mesh>
        <Cerros />
        <Calles />
        <Arboles />
        {entorno.edificios.filter(b => b.id !== entorno.naos).map(b => <Vecino key={b.id} b={b} />)}
        <Naos puntos={naos.puntos as P[]} pisos={naos.pisos} />
        <Caminante />
        <Camara onLlegar={onLlegar} />
        <Cierre onCerrar={() => setCerrando(true)} />
      </Canvas>
      <Cabina piso={1} visible={cerrando} />
      <p className="intro-fuente">Edificios: © OpenStreetMap</p>
      <button className="saltar" onClick={onSaltar}>Saltar intro</button>
    </div>
  )
}

// La cabina (vista desde adentro) aparece cuando se cierran las puertas del ascensor del lobby.
function Cierre({ onCerrar }: { onCerrar: () => void }) {
  const hecho = useRef(false)
  useFrame(({ clock }) => { if (!hecho.current && clock.elapsedTime > DURACION - 0.4) { hecho.current = true; onCerrar() } })
  return null
}

// Letrero: texto pintado en una textura (como los nombres de calle), sin HTML.
function Letrero({ texto, ancho, alto, fondo, color, p }: { texto: string; ancho: number; alto: number; fondo: string; color: string; p: [number, number, number] }) {
  const lienzo = useMemo(() => Object.assign(document.createElement('canvas'), { width: 512, height: Math.round((512 * alto) / ancho) }), [ancho, alto])
  const textura = useMemo(() => { const t = new CanvasTexture(lienzo); t.colorSpace = SRGBColorSpace; t.anisotropy = 8; return t }, [lienzo])
  useEffect(() => {
    const dibujar = () => {
      const ctx = lienzo.getContext('2d')!
      ctx.fillStyle = fondo; ctx.fillRect(0, 0, lienzo.width, lienzo.height)
      ctx.font = `700 ${Math.round(lienzo.height * 0.62)}px "Geist Variable", sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color
      ctx.fillText(texto, lienzo.width / 2, lienzo.height * 0.54)
      textura.needsUpdate = true
    }
    dibujar()
    document.fonts?.ready.then(dibujar)
  }, [lienzo, textura, texto, fondo, color])
  useEffect(() => () => textura.dispose(), [textura])
  return (
    <mesh position={p}>
      <planeGeometry args={[ancho, alto]} />
      <meshBasicMaterial map={textura} toneMapped={false} />
    </mesh>
  )
}

// Vestíbulo de vidrio frente a la fachada de la Av. Carrera 9: puertas que se abren solas, lobby iluminado y el
// ascensor al fondo. Coordenadas locales: +z hacia la calle, la fachada en z = 0.
function Vestibulo() {
  const rot = Math.atan2(-lado.z, lado.x) + Math.PI
  const p = fuera(0.25)
  const m = useMemo(() => ({
    vidrio: new MeshStandardMaterial({ color: '#D3EAF7', transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.3, depthWrite: false }),
    marco: new MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.6 }),
    piedra: new MeshStandardMaterial({ color: '#E8DFD1', roughness: 0.7 }),
    muro: new MeshStandardMaterial({ color: '#F2EEE7', roughness: 0.8 }),
    acero: new MeshStandardMaterial({ color: '#C3C9D2', roughness: 0.32, metalness: 0.6 }),
    oscuro: new MeshStandardMaterial({ color: '#3A3F4A', roughness: 0.6 }),
    luz: new MeshStandardMaterial({ color: '#FFF6E6', emissive: '#FFE9C4', emissiveIntensity: 1.4 }),
    rojo: new MeshStandardMaterial({ color: '#EF3B3A', roughness: 0.6 }),
    marquesina: new MeshStandardMaterial({ color: '#4A515C', roughness: 0.7 }),
    madera: new MeshStandardMaterial({ color: '#B08A63', roughness: 0.8 }),
  }), [])
  const vidrioIzq = useRef<Group>(null), vidrioDer = useRef<Group>(null), hojaIzq = useRef<Group>(null), hojaDer = useRef<Group>(null)
  const [indicador, setIndicador] = useState('1')
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const v = abierta(t, T.puertaAbre, T.puertaCierra) * 1.15, a = abierta(t, T.ascensorAbre, T.ascensorCierra) * 0.88
    vidrioIzq.current!.position.x = -0.6 - v; vidrioDer.current!.position.x = 0.6 + v
    hojaIzq.current!.position.x = -0.45 - a; hojaDer.current!.position.x = 0.45 + a
    const txt = t > T.ascensorCierra[1] ? '▲ 1' : '1'
    if (txt !== indicador) setIndicador(txt)
  })
  const caja = (pos: [number, number, number], s: [number, number, number], mat: MeshStandardMaterial, sombra = false) => (
    <mesh position={pos} material={mat} castShadow={sombra} receiveShadow><boxGeometry args={s} /></mesh>
  )
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, rot, 0]}>
      {caja([0, 0.03, 7], [16, 0.06, 4], m.piedra)}
      {caja([0, 0.04, 3.05], [6.4, 0.08, 3.9], m.piedra)}
      {caja([0, 0.09, 4.3], [2.2, 0.02, 1.2], m.oscuro)}
      {caja([0, 3.45, 3.0], [6.6, 0.16, 4.0], m.marco, true)}
      {caja([0, 3.36, 3.1], [4.6, 0.02, 2.0], m.luz)}
      <pointLight position={[0, 2.6, 3.4]} color="#FFE7C2" intensity={9} distance={6} decay={2} />
      {/* muro del fondo con el vano del ascensor */}
      {caja([-2.05, 1.7, 1.2], [2.3, 3.4, 0.2], m.muro)}
      {caja([2.05, 1.7, 1.2], [2.3, 3.4, 0.2], m.muro)}
      {caja([0, 2.925, 1.2], [1.8, 0.95, 0.2], m.muro)}
      {caja([-0.94, 1.25, 1.31], [0.08, 2.5, 0.06], m.acero)}
      {caja([0.94, 1.25, 1.31], [0.08, 2.5, 0.06], m.acero)}
      {caja([0, 2.49, 1.31], [1.96, 0.08, 0.06], m.acero)}
      <Letrero texto={indicador} ancho={0.62} alto={0.2} fondo="#0C0E13" color="#EF3B3A" p={[0, 2.78, 1.311]} />
      {caja([1.18, 1.25, 1.315], [0.1, 0.2, 0.03], m.acero)}
      {caja([1.18, 1.27, 1.335], [0.04, 0.04, 0.02], m.rojo)}
      {/* cabina iluminada detrás de las puertas */}
      {caja([0, 0.03, 0.75], [1.8, 0.06, 1.05], m.oscuro)}
      {caja([0, 1.225, 0.25], [1.8, 2.45, 0.05], m.acero)}
      {caja([-0.88, 1.225, 0.75], [0.05, 2.45, 1.05], m.acero)}
      {caja([0.88, 1.225, 0.75], [0.05, 2.45, 1.05], m.acero)}
      {caja([0, 2.42, 0.75], [1.6, 0.04, 0.9], m.luz)}
      <pointLight position={[0, 2.1, 0.8]} color="#FFF0D6" intensity={4} distance={3} decay={2} />
      <group ref={hojaIzq} position={[-0.45, 0, 0]}>{caja([0, 1.225, 1.2], [0.9, 2.45, 0.05], m.acero)}</group>
      <group ref={hojaDer} position={[0.45, 0, 0]}>{caja([0, 1.225, 1.2], [0.9, 2.45, 0.05], m.acero)}</group>
      {/* frente de vidrio: paños fijos, puertas corredizas y dintel */}
      {caja([0, 3.2, 5.0], [6.6, 0.45, 0.2], m.marco, true)}
      {[-3.2, -1.2, 1.2, 3.2].map(x => <group key={x}>{caja([x, 1.5, 5.0], [0.1, 3.0, 0.12], m.marco, true)}</group>)}
      {[-2.2, 2.2].map(x => <group key={x}>{caja([x, 1.49, 5.0], [1.9, 2.97, 0.04], m.vidrio)}</group>)}
      <group ref={vidrioIzq} position={[-0.6, 0, 0]}>{caja([0, 1.48, 5.07], [1.15, 2.95, 0.04], m.vidrio)}{caja([0.48, 1.2, 5.12], [0.04, 0.9, 0.04], m.acero)}</group>
      <group ref={vidrioDer} position={[0.6, 0, 0]}>{caja([0, 1.48, 5.07], [1.15, 2.95, 0.04], m.vidrio)}{caja([-0.48, 1.2, 5.12], [0.04, 0.9, 0.04], m.acero)}</group>
      {[-3.2, 3.2].map(x => <group key={x}>{caja([x, 1.5, 3.1], [0.04, 3.0, 3.8], m.vidrio)}</group>)}
      {/* marquesina con el nombre del edificio; en el lobby, árbol y banca como en el real */}
      {caja([0, 3.62, 5.9], [7.2, 0.24, 2.2], m.marquesina, true)}
      <Letrero texto="NAOS" ancho={2.4} alto={0.2} fondo="#4A515C" color="#FFFFFF" p={[0, 3.62, 7.011]} />
      <Arbol p={[-2.3, 0.08, 3.4]} s={1.5} />
      {caja([2.0, 0.27, 3.6], [1.6, 0.42, 0.5], m.madera)}
      <Arbol p={[-4.3, 0.06, 6.2]} s={1.6} />
      <Arbol p={[4.3, 0.06, 6.2]} s={1.6} />
    </group>
  )
}

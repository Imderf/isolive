import { createRef, useEffect, useMemo, useState } from 'react'
import { Html, RoundedBox, useCursor } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { Pieza } from '../model'

type V3 = [number, number, number]

export const RED = '#EF3B3A', AMBER = '#F59E0B'

// Capa DOM fija para todas las etiquetas <Html>. Sin un destino estable, drei vuelve a montar cada
// etiqueta en el primer render ("synchronously unmount a root") y la primera se pierde.
export const capaEtiquetas = createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement>

// Caja con bordes redondeados (look "juguete" de WareTrack). Las muy delgadas van planas.
export function Box({ p, s, c, shadow = true, r }: { p: V3; s: V3; c: string; shadow?: boolean; r?: number }) {
  const radio = r ?? Math.min(0.06, Math.min(...s) / 3)
  const mat = <meshStandardMaterial color={c} roughness={0.75} />
  if (radio < 0.012) {
    return <mesh position={p} castShadow={shadow} receiveShadow><boxGeometry args={s} />{mat}</mesh>
  }
  return (
    <RoundedBox args={s} radius={radio} smoothness={2} position={p} castShadow={shadow} receiveShadow>
      {mat}
    </RoundedBox>
  )
}

export function Arbol({ p, s = 1 }: { p: V3; s?: number }) {
  return (
    <group position={p} scale={s}>
      <Box p={[0, 0.18, 0]} s={[0.42, 0.36, 0.42]} c="#FFFFFF" />
      <mesh position={[0, 0.55, 0]} castShadow><cylinderGeometry args={[0.035, 0.045, 0.5, 8]} /><meshStandardMaterial color="#8B6B4A" /></mesh>
      <mesh position={[0, 1.0, 0]} castShadow><sphereGeometry args={[0.36, 20, 16]} /><meshStandardMaterial color="#7CC08B" roughness={0.9} /></mesh>
    </group>
  )
}

// Pin de ubicación (gota) como los de WareTrack.
export function Pin({ p, c = RED, s = 1 }: { p: V3; c?: string; s?: number }) {
  return (
    <group position={p} scale={s}>
      <mesh position={[0, 0.28, 0]} castShadow><sphereGeometry args={[0.13, 20, 16]} /><meshStandardMaterial color={c} roughness={0.4} /></mesh>
      <mesh position={[0, 0.13, 0]} rotation={[Math.PI, 0, 0]} castShadow><coneGeometry args={[0.1, 0.22, 20]} /><meshStandardMaterial color={c} roughness={0.4} /></mesh>
      <mesh position={[0, 0.28, 0.11]}><sphereGeometry args={[0.045, 12, 8]} /><meshStandardMaterial color="#FFFFFF" /></mesh>
    </group>
  )
}

export function Label({ p, children, onClick, tono = 'claro' }: { p: V3; children: React.ReactNode; onClick?: () => void; tono?: 'claro' | 'rojo' | 'oscuro' }) {
  return (
    <Html portal={capaEtiquetas} position={p} center zIndexRange={[10, 0]} style={{ pointerEvents: onClick ? 'auto' : 'none' }}>
      <div className={`pill pill-${tono}`} onClick={onClick}>{children}</div>
    </Html>
  )
}

// Marca de zona: solo el número (o un ícono) y el texto aparece al pasar el mouse o si está elegida.
export function Marca({ p, badge, children, onClick, abierta }: { p: V3; badge: React.ReactNode; children: React.ReactNode; onClick?: () => void; abierta?: boolean }) {
  return (
    <Html portal={capaEtiquetas} position={p} zIndexRange={[10, 0]}>
      <div className={`marca${abierta ? ' abierta' : ''}`} onClick={onClick}>
        <b className="marca-n">{badge}</b><span className="marca-txt">{children}</span>
      </div>
    </Html>
  )
}

// Una pieza (tarea) como caja. Vencida: pin rojo encima. Urgente: pin ámbar.
export function PiezaMesh({ pieza, p, color, dim, selected, onSelect }: {
  pieza: Pieza; p: V3; color: string; dim: boolean; selected: boolean; onSelect: (id: string) => void
}) {
  const [hover, setHover] = useState(false)
  useCursor(hover)
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(pieza.id) }
  const lift = selected ? 0.16 : hover ? 0.05 : 0
  return (
    <group position={[p[0], p[1] + lift, p[2]]}>
      <RoundedBox
        args={[0.16, 0.13, 0.16]} radius={0.025} smoothness={2} castShadow
        onClick={click} onPointerOver={e => { e.stopPropagation(); setHover(true) }} onPointerOut={() => setHover(false)}
      >
        <meshStandardMaterial color={color} roughness={0.55} transparent={dim} opacity={dim ? 0.12 : 1} emissive={selected ? color : '#000000'} emissiveIntensity={selected ? 0.4 : 0} />
      </RoundedBox>
      {pieza.estado !== 'normal' && !dim && <Pin p={[0, 0.1, 0]} s={0.55} c={pieza.estado === 'vencida' ? RED : AMBER} />}
      {selected && (
        <Html portal={capaEtiquetas} position={[0, 0.55, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
          <div className="pill pill-rojo">{pieza.titulo.split(' · ')[0]} · {pieza.etapa}</div>
        </Html>
      )}
    </group>
  )
}

// Texto pintado sobre el piso (nombres de calle). Es una textura en un plano, no HTML:
// los carros pasan por encima y lo tapan. Se redibuja cuando carga la fuente Geist.
export function TextoSuelo({ texto, x, y = -0.27, z, rot, alto = 0.9 }: { texto: string; x: number; y?: number; z: number; rot: number; alto?: number }) {
  const lienzo = useMemo(() => Object.assign(document.createElement('canvas'), { width: 1024, height: 192 }), [])
  const textura = useMemo(() => { const t = new CanvasTexture(lienzo); t.colorSpace = SRGBColorSpace; t.anisotropy = 8; return t }, [lienzo])
  useEffect(() => {
    const dibujar = () => {
      const ctx = lienzo.getContext('2d')!
      ctx.clearRect(0, 0, 1024, 192)
      ctx.font = '600 120px "Geist Variable", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineJoin = 'round'
      ctx.lineWidth = 14
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.strokeText(texto, 512, 96)
      ctx.fillStyle = '#8A93A3'
      ctx.fillText(texto, 512, 96)
      textura.needsUpdate = true
    }
    dibujar()
    document.fonts?.ready.then(dibujar)
  }, [lienzo, textura, texto])
  useEffect(() => () => textura.dispose(), [textura])
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, rot]} renderOrder={1}>
      <planeGeometry args={[alto * (1024 / 192), alto]} />
      <meshBasicMaterial map={textura} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  )
}

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MapControls, PerspectiveCamera } from '@react-three/drei'
import { Vector3 } from 'three'
import type { MapControls as MapControlsImpl } from 'three-stdlib'
import { Office } from './Office'
import { Puestos, type Props } from './Puestos'
import { Fantasmas, Lugares } from './Lugares'
import { Persona } from './Persona'
import { Visitantes } from './Visitantes'
import { Trafico } from './Trafico'
import { construirMapa } from '../sim/rutas'
import type { XZ } from '../model'

// Encuadre inicial: el objetivo va corrido a la derecha para que el piso quede en el área libre de paneles.
const OBJETIVO = new Vector3(3.6, 0, -2.2)
const CAMARA = OBJETIVO.clone().add(new Vector3(37, 35, 37))

export type AccionCamara = 'acercar' | 'alejar' | 'inicio' | 'salir'
export const moverCamara = (a: AccionCamara) => window.dispatchEvent(new CustomEvent('camara', { detail: a }))
// Vuela hasta un punto del piso (resultado del buscador) y acerca un poco la vista.
export const enfocarCamara = (p: XZ) => window.dispatchEvent(new CustomEvent('camara', { detail: { enfocar: p } }))

// Al salir del ascensor la cámara arranca a la altura de los ojos en el borde sur del piso, mirando la oficina,
// y sube hasta la vista de siempre. Mientras tanto los controles quedan quietos.
const SALIDA = new Vector3(3, 1.7, 12.5), SALIDA_MIRA = new Vector3(1, 1.2, -2)
interface Vuelo { t0: number; dur: number; p0: Vector3; p1: Vector3; m0: Vector3; m1: Vector3 }

function ControlCamara({ entrada }: { entrada: boolean }) {
  const camera = useThree(s => s.camera)
  const controls = useThree(s => s.controls) as unknown as MapControlsImpl | null
  const pendiente = useRef(entrada)
  const vuelo = useRef<Vuelo | null>(null)
  useEffect(() => {
    if (!controls || !pendiente.current) return
    camera.position.copy(SALIDA); controls.target.copy(SALIDA_MIRA); controls.enabled = false; controls.update()
  }, [camera, controls])
  useFrame(() => {
    const v = vuelo.current
    if (!v || !controls) return
    const u = Math.min((performance.now() - v.t0) / 1000 / v.dur, 1)
    const e = u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2
    camera.position.lerpVectors(v.p0, v.p1, e)
    controls.target.lerpVectors(v.m0, v.m1, e)
    controls.update()
    if (u === 1) { vuelo.current = null; controls.enabled = true }
  })
  useEffect(() => {
    const volar = (dur: number, p1: Vector3, m1: Vector3) => {
      vuelo.current = { t0: performance.now(), dur, p0: camera.position.clone(), p1, m0: controls!.target.clone(), m1 }
      controls!.enabled = false
    }
    const on = (ev: Event) => {
      if (!controls) return
      const a = (ev as CustomEvent<AccionCamara | { enfocar: XZ }>).detail
      if (a === 'salir') { if (pendiente.current) { pendiente.current = false; volar(2.8, CAMARA.clone(), OBJETIVO.clone()) } return }
      if (typeof a === 'object') {
        const m1 = new Vector3(a.enfocar[0], 0, a.enfocar[1])
        return volar(1.1, m1.clone().add(CAMARA.clone().sub(OBJETIVO).multiplyScalar(0.5)), m1)
      }
      vuelo.current = null; controls.enabled = true
      if (a === 'inicio') { controls.target.copy(OBJETIVO); camera.position.copy(CAMARA) }
      else {
        const v = camera.position.clone().sub(controls.target).multiplyScalar(a === 'acercar' ? 0.75 : 1.33)
        camera.position.copy(controls.target).add(v)
      }
      controls.update()
    }
    window.addEventListener('camara', on)
    return () => window.removeEventListener('camara', on)
  }, [camera, controls])
  return null
}

// Arrastrar mueve, rueda acerca, clic derecho gira.
export function Scene(props: Props & { entrada?: boolean }) {
  const { area } = props
  const mapa = useMemo(() => construirMapa(area.puestos, area.visitas), [area.puestos, area.visitas])
  const enEtapa = (id: string) => (props.etapa ? area.piezas.filter(p => p.etapa === props.etapa && p.tiene?.persona === id).length : 0)
  return (
    <Canvas shadows="soft" dpr={[1, 2]} className="scene" onPointerMissed={() => props.onSelect(null)}>
      <color attach="background" args={['#EDEFF4']} />
      <fog attach="fog" args={['#EDEFF4', 70, 130]} />
      <PerspectiveCamera makeDefault position={CAMARA} fov={30} near={1} far={300} />
      <MapControls makeDefault target={OBJETIVO} enableDamping dampingFactor={0.1} maxPolarAngle={1.2} minDistance={8} maxDistance={110} />
      <ControlCamara entrada={!!props.entrada} />
      <hemisphereLight args={['#FFFFFF', '#DDE1EA', 1.7]} />
      <directionalLight
        castShadow
        position={[16, 30, 12]}
        intensity={1.6}
        shadow-mapSize={[2048, 2048]}
        shadow-radius={6}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-bias={-0.0004}
      />
      <Office area={area} sel={props.sel} onSelect={props.onSelect} />
      <Trafico />
      <Visitantes area={area} mapa={mapa} />
      <Puestos {...props} />
      <Lugares {...props} />
      <Fantasmas />
      {area.personas.map((p, i) => (
        <Persona key={p.id} persona={p} i={i} puesto={area.puestos.find(x => x.id === p.puesto)!} mapa={mapa} sel={props.sel} onSelect={props.onSelect} enEtapa={enEtapa(p.id)} />
      ))}
    </Canvas>
  )
}

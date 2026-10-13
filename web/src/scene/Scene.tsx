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

// Encuadre inicial: el objetivo va corrido a la derecha para que el piso quede en el área libre de paneles.
const OBJETIVO = new Vector3(3.6, 0, -2.2)
const CAMARA = OBJETIVO.clone().add(new Vector3(37, 35, 37))

export type AccionCamara = 'acercar' | 'alejar' | 'inicio' | 'salir'
export const moverCamara = (a: AccionCamara) => window.dispatchEvent(new CustomEvent('camara', { detail: a }))

// Al salir del ascensor la cámara arranca a la altura de los ojos en el borde sur del piso, mirando la oficina,
// y sube hasta la vista de siempre. Mientras tanto los controles quedan quietos.
const SALIDA = new Vector3(3, 1.7, 12.5), SALIDA_MIRA = new Vector3(1, 1.2, -2), VUELO = 2.8 // s

function ControlCamara({ entrada }: { entrada: boolean }) {
  const camera = useThree(s => s.camera)
  const controls = useThree(s => s.controls) as unknown as MapControlsImpl | null
  const pendiente = useRef(entrada)
  const vuelo = useRef<number | null>(null) // cuándo empezó la salida
  useEffect(() => {
    if (!controls || !pendiente.current) return
    camera.position.copy(SALIDA); controls.target.copy(SALIDA_MIRA); controls.enabled = false; controls.update()
  }, [camera, controls])
  useFrame(() => {
    if (vuelo.current === null || !controls) return
    const u = Math.min((performance.now() - vuelo.current) / 1000 / VUELO, 1)
    const e = u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2
    camera.position.lerpVectors(SALIDA, CAMARA, e)
    controls.target.lerpVectors(SALIDA_MIRA, OBJETIVO, e)
    controls.update()
    if (u === 1) { vuelo.current = null; controls.enabled = true }
  })
  useEffect(() => {
    const on = (ev: Event) => {
      if (!controls) return
      const a = (ev as CustomEvent<AccionCamara>).detail
      if (a === 'salir') { if (pendiente.current) { pendiente.current = false; vuelo.current = performance.now() } return }
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

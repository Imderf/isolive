import { useEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { MapControls, PerspectiveCamera } from '@react-three/drei'
import { Vector3 } from 'three'
import type { MapControls as MapControlsImpl } from 'three-stdlib'
import { Office } from './Office'
import { Puestos, type Props } from './Puestos'
import { Fantasmas, Lugares } from './Lugares'
import { Persona } from './Persona'
import { construirMapa } from '../sim/rutas'

// Encuadre inicial: el objetivo va corrido a la derecha para que el piso quede en el área libre de paneles.
const OBJETIVO = new Vector3(3.6, 0, -2.2)
const CAMARA = OBJETIVO.clone().add(new Vector3(37, 35, 37))

export type AccionCamara = 'acercar' | 'alejar' | 'inicio'
export const moverCamara = (a: AccionCamara) => window.dispatchEvent(new CustomEvent('camara', { detail: a }))

function ControlCamara() {
  const camera = useThree(s => s.camera)
  const controls = useThree(s => s.controls) as unknown as MapControlsImpl | null
  useEffect(() => {
    const on = (ev: Event) => {
      if (!controls) return
      const a = (ev as CustomEvent<AccionCamara>).detail
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
export function Scene(props: Props) {
  const { area } = props
  const mapa = useMemo(() => construirMapa(area.puestos), [area.puestos])
  return (
    <Canvas shadows="soft" dpr={[1, 2]} className="scene" onPointerMissed={() => props.onSelect(null)}>
      <color attach="background" args={['#EDEFF4']} />
      <fog attach="fog" args={['#EDEFF4', 70, 130]} />
      <PerspectiveCamera makeDefault position={CAMARA} fov={30} near={1} far={300} />
      <MapControls makeDefault target={OBJETIVO} enableDamping dampingFactor={0.1} maxPolarAngle={1.2} minDistance={8} maxDistance={110} />
      <ControlCamara />
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
      <Office area={props.area} onEstacion={id => props.onSelect({ tipo: 'estacion', id })} />
      <Puestos {...props} />
      <Lugares {...props} />
      <Fantasmas />
      {area.personas.map((p, i) => (
        <Persona key={p.id} persona={p} i={i} puesto={area.puestos.find(x => x.id === p.puesto)!} mapa={mapa} sel={props.sel} onSelect={props.onSelect} />
      ))}
    </Canvas>
  )
}

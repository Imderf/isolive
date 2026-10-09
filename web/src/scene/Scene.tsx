import { Canvas } from '@react-three/fiber'
import { MapControls, OrthographicCamera } from '@react-three/drei'
import { Office } from './Office'
import { Puestos, type Props } from './Puestos'
import { Lugares } from './Lugares'

// Vista isométrica: cámara ortográfica desde el sureste; arrastrar mueve, rueda acerca, clic derecho gira.
export function Scene(props: Props) {
  return (
    <Canvas shadows dpr={[1, 2]} className="scene" onPointerMissed={() => props.onSelect(null)}>
      <color attach="background" args={['#F4F4F4']} />
      {/* El objetivo se corre a la derecha de la pantalla para que el piso quede en el área libre de paneles */}
      <OrthographicCamera makeDefault position={[28.3, 24, 20.3]} zoom={30} near={-200} far={400} />
      <MapControls makeDefault target={[2.3, 0, -5.7]} enableDamping dampingFactor={0.12} maxPolarAngle={1.15} minZoom={16} maxZoom={140} zoomSpeed={2} />
      <hemisphereLight args={['#FFFFFF', '#C7C7C7', 1.4]} />
      <directionalLight
        castShadow
        position={[14, 26, 10]}
        intensity={1.9}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-bias={-0.0004}
      />
      <Office area={props.area} onEstacion={id => props.onSelect({ tipo: 'estacion', id })} />
      <Puestos {...props} />
      <Lugares {...props} />
    </Canvas>
  )
}

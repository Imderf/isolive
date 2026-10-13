import { useEffect, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { MeshStandardMaterial, SRGBColorSpace, TextureLoader, Vector3, type BufferGeometry, type Group, type Mesh, type Object3D } from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { Box } from './parts'

// Avatar de bloques "HipToBeSquare" de los archivos de referencia de Roblox (github.com/Roblox/creator-docs).
// Solo para la demo local: la licencia de estos modelos no es clara para usarlos fuera de Roblox.
// Cada pieza se extrae una vez, en pose de reposo, como malla rígida sin esqueleto y se cuelga de los pivotes de la
// figura (caderas, rodillas y hombros), que ya animan caminar, sentarse y cargar. Todas las personas comparten las mallas.
const URL_FBX = '/personajes/HipToBeSquare.fbx', URL_CARA = '/personajes/TXT_HipToBeSquare_ALB.png'
const CADERA = 0.55 // alto de la cadera en la escena: cuadra con las sillas
const PANTALON = '#2A303C', ZAPATO = '#1F2430'
const LADOS = ['Left', 'Right'] as const // tras girar el modelo para que mire a -z, Left queda en x < 0 (k = 0)

type V3 = [number, number, number]
type Pivote = React.RefObject<Group | null>
interface Kit {
  torso: BufferGeometry; cintura: BufferGeometry; cabeza: BufferGeometry
  muslo: BufferGeometry[]; pierna: BufferGeometry[]; pie: BufferGeometry[]; manga: BufferGeometry[]; antebrazo: BufferGeometry[]; mano: BufferGeometry[]
  cadera: V3[]; rodilla: V3[]; hombro: V3[] // la rodilla es relativa a la cadera
  pelo: { top: number; ancho: number; fondo: number }
}

const kits = new WeakMap<Object3D, Kit>()
function armar(fbx: Object3D): Kit {
  fbx.updateMatrixWorld(true)
  const mallas = new Map<string, Mesh>()
  fbx.traverse(n => { if ((n as Mesh).isMesh && n.name.endsWith('_Geo') && !mallas.has(n.name)) mallas.set(n.name, n as Mesh) })
  const huesos = new Map<string, Vector3>()
  fbx.traverse(n => { if ((n as { isBone?: boolean }).isBone && !huesos.has(n.name)) huesos.set(n.name, n.getWorldPosition(new Vector3())) })

  // En reposo cada vértice queda donde lo pone matrixWorld. Escala: la cadera a CADERA y los pies en el piso.
  const crudo = (n: string) => { const m = mallas.get(n)!; const g = m.geometry.clone().applyMatrix4(m.matrixWorld); g.deleteAttribute('skinIndex'); g.deleteAttribute('skinWeight'); return g }
  let piso = Infinity
  for (const n of mallas.keys()) { const g = crudo(n); g.computeBoundingBox(); piso = Math.min(piso, g.boundingBox!.min.y) }
  const k = CADERA / (huesos.get('LeftUpperLeg')!.y - piso)
  const punto = (p: Vector3): V3 => [-p.x * k, (p.y - piso) * k, -p.z * k] // girado π en y: mira a -z
  const pieza = (n: string, pivote: V3 = [0, 0, 0]) => crudo(n).translate(0, -piso, 0).scale(k, k, k).rotateY(Math.PI).translate(-pivote[0], -pivote[1], -pivote[2])

  const cadera = LADOS.map(l => punto(huesos.get(`${l}UpperLeg`)!))
  const rodillaAbs = LADOS.map(l => punto(huesos.get(`${l}LowerLeg`)!))
  const hombro = LADOS.map(l => { const g = pieza(`${l}UpperArm_Geo`); g.computeBoundingBox(); const b = g.boundingBox!; return [(b.min.x + b.max.x) / 2, b.max.y - 0.05, (b.min.z + b.max.z) / 2] as V3 })
  const cabeza = pieza('Head_Geo'); cabeza.computeBoundingBox()
  const bc = cabeza.boundingBox!
  return {
    torso: pieza('UpperTorso_Geo'), cintura: pieza('LowerTorso_Geo'), cabeza,
    muslo: LADOS.map((l, i) => pieza(`${l}UpperLeg_Geo`, cadera[i])),
    pierna: LADOS.map((l, i) => pieza(`${l}LowerLeg_Geo`, rodillaAbs[i])),
    pie: LADOS.map((l, i) => pieza(`${l}Foot_Geo`, rodillaAbs[i])),
    manga: LADOS.map((l, i) => pieza(`${l}UpperArm_Geo`, hombro[i])),
    antebrazo: LADOS.map((l, i) => pieza(`${l}LowerArm_Geo`, hombro[i])),
    mano: LADOS.map((l, i) => pieza(`${l}Hand_Geo`, hombro[i])),
    cadera, hombro, rodilla: rodillaAbs.map((r, i) => [r[0] - cadera[i][0], r[1] - cadera[i][1], r[2] - cadera[i][2]] as V3),
    pelo: { top: bc.max.y, ancho: bc.max.x - bc.min.x, fondo: bc.max.z - bc.min.z },
  }
}

useLoader.preload(FBXLoader, URL_FBX)

// Pelo esculpido sobre la cabeza: 0 copete, 1 corto, 2 largo.
function Pelo({ c, estilo, top, ancho: w, fondo: d }: { c: string; estilo: number; top: number; ancho: number; fondo: number }) {
  return (
    <>
      <Box p={[0, top - 0.035, 0.012]} s={[w + 0.03, 0.1, d + 0.03]} c={c} r={0.04} />
      <Box p={[0, top - 0.12, d / 2 - 0.02]} s={[w + 0.03, 0.18, 0.08]} c={c} r={0.03} />
      {estilo === 0 && (
        <>
          <group position={[0.02, top + 0.015, -d / 2 + 0.07]} rotation={[0.25, 0, -0.16]}><Box p={[0, 0, 0]} s={[w * 0.9, 0.09, 0.15]} c={c} r={0.04} /></group>
          <group position={[w * 0.18, top + 0.06, 0.02]} rotation={[0, 0, -0.5]}><Box p={[0, 0, 0]} s={[0.07, 0.09, 0.07]} c={c} r={0.025} /></group>
        </>
      )}
      {estilo === 2 && (
        <>
          <Box p={[0, top - 0.22, d / 2 - 0.01]} s={[w + 0.05, 0.36, 0.09]} c={c} r={0.03} />
          {[-1, 1].map(l => <Box key={l} p={[l * (w / 2 + 0.012), top - 0.14, 0.03]} s={[0.05, 0.24, d * 0.72]} c={c} r={0.02} />)}
        </>
      )}
    </>
  )
}

export function CuerpoRoblox({ camisa, piel, pelo, estilo = 0, hip, rod, hom, pose }: {
  camisa: string; piel: string; pelo: string; estilo?: number
  hip?: Pivote[]; rod?: Pivote[]; hom?: Pivote[]
  pose?: { cadera: number; rodilla: number; hombro: number }
}) {
  const fbx = useLoader(FBXLoader, URL_FBX)
  const cara = useLoader(TextureLoader, URL_CARA)
  const kit = useMemo(() => { let x = kits.get(fbx); if (!x) kits.set(fbx, (x = armar(fbx))); return x }, [fbx])
  const mat = useMemo(() => {
    cara.colorSpace = SRGBColorSpace
    const m = (color: string, extra = {}) => new MeshStandardMaterial({ color, roughness: 0.8, ...extra })
    return { camisa: m(camisa), piel: m(piel), cara: m(piel, { map: cara, roughness: 0.6 }), pantalon: m(PANTALON), zapato: m(ZAPATO) }
  }, [camisa, piel, cara])
  useEffect(() => () => Object.values(mat).forEach(x => x.dispose()), [mat])
  const malla = (g: BufferGeometry, material: MeshStandardMaterial) => <mesh geometry={g} material={material} castShadow />
  return (
    <>
      {malla(kit.torso, mat.camisa)}
      {malla(kit.cintura, mat.pantalon)}
      {malla(kit.cabeza, mat.cara)}
      <Pelo c={pelo} estilo={estilo} {...kit.pelo} />
      {[0, 1].map(k => (
        <group key={`p${k}`} ref={hip?.[k]} position={kit.cadera[k]} rotation={[pose?.cadera ?? 0, 0, 0]}>
          {malla(kit.muslo[k], mat.pantalon)}
          <group ref={rod?.[k]} position={kit.rodilla[k]} rotation={[pose?.rodilla ?? 0, 0, 0]}>
            {malla(kit.pierna[k], mat.pantalon)}
            {malla(kit.pie[k], mat.zapato)}
          </group>
        </group>
      ))}
      {[0, 1].map(k => (
        <group key={`b${k}`} ref={hom?.[k]} position={kit.hombro[k]} rotation={[pose?.hombro ?? 0, 0, 0]}>
          {malla(kit.manga[k], mat.camisa)}
          {malla(kit.antebrazo[k], mat.piel)}
          {malla(kit.mano[k], mat.piel)}
        </group>
      ))}
    </>
  )
}

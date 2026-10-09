import type { Area } from '../model'
import type { Mapa } from '../sim/rutas'
import type { Paso } from '../sim/visual'
import { Persona } from './Persona'

// Personas del cliente en la sala. Son decoración (no vienen del tablero): solo en horario laboral,
// nunca en fichas ni feed. De vez en cuando una se levanta a recorrer la oficina y vuelve a la sala.
function recorrido(): Paso[] {
  const r = Math.random()
  if (r < 0.5) return [{ ir: 'kanban', jitter: true }, { esperar: 7, pose: 'parado', mira: 'kanban' }, { ir: 'pantalla' }, { esperar: 6, pose: 'parado', mira: 'pantalla' }]
  if (r < 0.8) return [{ ir: 'pantalla' }, { esperar: 8, pose: 'parado', mira: 'pantalla' }]
  return [{ ir: 'cafe', jitter: true }, { esperar: 12, pose: 'parado', mira: 'cafe' }]
}
const CAMISAS = ['#1F36C7', '#5B6CDB']

export function Visitantes({ area, mapa }: { area: Area; mapa: Mapa }) {
  return (
    <>
      {(area.visitas ?? []).map((v, k) => (
        <Persona
          key={v.id}
          persona={{ id: v.id, nombre: 'Cliente', perfil: 'coordinacion', puesto: v.id }}
          puesto={{ id: v.id, pos: v.pos, rot: v.rot }}
          i={k + 3}
          mapa={mapa}
          sel={null}
          onSelect={() => {}}
          enEtapa={0}
          planes={recorrido}
          cada={[45, 110]}
          camisa={CAMISAS[k % CAMISAS.length]}
          etiqueta={['Cliente', area.cliente]}
          seleccionable={false}
        />
      ))}
    </>
  )
}

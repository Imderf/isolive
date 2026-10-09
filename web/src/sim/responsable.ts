import { estacionDe, type Area, type Pieza, type Tenencia } from '../model.ts'

// Quién tiene la pieza ahora. Los responsables del tablero no siempre dicen quién la está moviendo:
// muchas veces se le pide a alguien por comentario ("@Liliana Gómez, ¿la publicas?").
//   1. la persona mencionada más recientemente en sus comentarios, si su perfil encaja con la estación;
//   2. si no, el responsable asignado que encaje;
//   3. si no, quien comentó más recientemente y encaje;
//   4. si la estación exige un perfil y nadie encaja, nadie la tiene: espera en la bandeja de la estación.
export function quienLaTiene(a: Area, p: Pieza): Tenencia {
  const est = estacionDe(a, p.etapa)
  const persona = (id: string) => a.personas.find(x => x.id === id)
  const encaja = (id: string) => { const x = persona(id); return !!x && (!est.perfiles || est.perfiles.includes(x.perfil)) }
  const coms = a.comentarios.filter(c => c.pieza === p.id) // más nuevo primero

  for (const c of coms) {
    const id = c.menciones.find(encaja)
    if (id) return { persona: id, motivo: 'mencion', por: c.autor, fecha: c.fecha }
  }
  const asignado = p.asignados.find(encaja)
  if (asignado) return { persona: asignado, motivo: 'asignado' }
  const comento = coms.find(c => encaja(c.autor))
  if (comento) return { persona: comento.autor, motivo: 'comentario', fecha: comento.fecha }
  if (est.perfiles && p.asignados.some(id => persona(id))) return { motivo: 'sin-perfil' }
  const primero = p.asignados.find(id => persona(id))
  return primero ? { persona: primero, motivo: 'asignado' } : { motivo: 'sin-responsable' }
}

export const conTenencias = (a: Area): Area => ({ ...a, piezas: a.piezas.map(p => ({ ...p, tiene: quienLaTiene(a, p) })) })

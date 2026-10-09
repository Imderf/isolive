import { useEffect, useState } from 'react'
import { PERFILES, estacionDe, personaDe, type Area, type Evento, type Perfil, type Pieza } from '../model'
import type { Props } from '../scene/Puestos'

const hora = () => new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())

export function Overlay(props: Props & { onEtapa: (e: string | null) => void }) {
  const { area } = props
  const [reloj, setReloj] = useState(hora)
  useEffect(() => { const t = setInterval(() => setReloj(hora()), 20_000); return () => clearInterval(t) }, [])
  const vencidas = area.piezas.filter(p => p.estado === 'vencida').length
  return (
    <div className="ui">
      <header className="top">
        <div className="brand"><img src="/ogilvy-logo.png" alt="Ogilvy" /><span>Live</span></div>
        <div className="area">{area.nombre} <span>· {area.cliente}</span></div>
        <div className="vivo"><i /> En vivo · {reloj}</div>
        <div className="mock">Datos de prueba</div>
        <div className="user">Imderf Ríos <span>Ogilvy</span></div>
      </header>

      <section className="kpis">
        <Kpi n={area.piezas.length} t="Piezas activas" />
        <Kpi n={area.piezas.filter(p => p.etapa === 'Validación Cliente').length} t="En validación del cliente" />
        <Kpi n={vencidas} t="Vencidas" alerta={vencidas > 0} />
        <Kpi n={area.eventos.length} t="Eventos hoy" />
      </section>

      <Ficha {...props} />

      <section className="card etapas">
        <div className="kicker"><b>01</b> / Etapas del tablero</div>
        <ol>
          {area.etapas.map(et => {
            const n = area.archivadas[et] ?? area.piezas.filter(p => p.etapa === et).length
            const on = props.etapa === et
            return (
              <li key={et} className={(on ? 'on ' : '') + (et in area.archivadas ? 'arch' : '')} onClick={() => props.onEtapa(on ? null : et)}>
                <i style={{ background: estacionDe(area, et).color }} />
                <b>{n}</b>
                <span>{et}</span>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="card feed">
        <div className="kicker"><b>02</b> / Actividad</div>
        <ul>{area.eventos.map(ev => <EventoItem key={ev.id} ev={ev} {...props} />)}</ul>
        <p className="nota">Solo eventos reales del tablero. La vida de oficina no aparece aquí.</p>
      </section>
    </div>
  )
}

function Kpi({ n, t, alerta }: { n: number; t: string; alerta?: boolean }) {
  return <div className={'card kpi' + (alerta ? ' alerta' : '')}><b>{n}</b><span>{t}</span></div>
}

export function Forma({ perfil }: { perfil: Perfil }) {
  return <i className={`forma forma-${PERFILES[perfil].forma}`} style={{ background: PERFILES[perfil].forma === 'achurado' ? undefined : PERFILES[perfil].color }} />
}

const accion = (ev: Evento) =>
  ev.tipo === 'movida' ? `movió de ${ev.desde} a ${ev.hasta}` : ev.tipo === 'comentario' ? 'comentó' : ev.tipo === 'creada' ? 'creó' : 'asignó'

function EventoItem({ ev, area, onSelect }: Props & { ev: Evento }) {
  const pieza = area.piezas.find(p => p.id === ev.pieza)
  const actor = personaDe(area, ev.actor)
  return (
    <li onClick={() => onSelect({ tipo: 'pieza', id: ev.pieza })}>
      <time>{ev.hora}</time>
      <div><b>{actor.nombre}</b> {accion(ev)} <em>{pieza?.titulo}</em></div>
    </li>
  )
}

function Ficha({ area, sel, onSelect }: Props) {
  if (!sel) return <Resumen area={area} />
  const cerrar = <button className="cerrar" onClick={() => onSelect(null)}>Cerrar</button>

  if (sel.tipo === 'persona') {
    const p = personaDe(area, sel.id)
    const suyas = area.piezas.filter(x => x.asignados.includes(p.id))
    return (
      <aside className="card ficha">
        {cerrar}
        <div className="kicker">Persona</div>
        <h2>{p.nombre}</h2>
        <p className="perfil"><Forma perfil={p.perfil} /> {PERFILES[p.perfil].nombre}</p>
        <div className="kicker sub">Piezas asignadas · {suyas.length}</div>
        <ListaPiezas piezas={suyas} area={area} onSelect={id => onSelect({ tipo: 'pieza', id })} />
      </aside>
    )
  }

  if (sel.tipo === 'pieza') {
    const p = area.piezas.find(x => x.id === sel.id)!
    const est = estacionDe(area, p.etapa)
    const eventos = area.eventos.filter(e => e.pieza === p.id)
    return (
      <aside className="card ficha">
        {cerrar}
        <div className="kicker">Pieza</div>
        <h2>{p.titulo}</h2>
        <dl>
          <dt>Etapa</dt><dd>{p.etapa}</dd>
          <dt>Estación</dt><dd>{est.nombre}</dd>
          <dt>Responsables</dt><dd>{p.asignados.map(id => personaDe(area, id).nombre).join(', ')}</dd>
          <dt>Fecha límite</dt><dd>{p.vence} {p.estado !== 'normal' && <span className={'tag ' + p.estado}>{p.estado}</span>}</dd>
        </dl>
        {eventos.length > 0 && <>
          <div className="kicker sub">Actividad</div>
          <ul className="mini">{eventos.map(e => <li key={e.id}>{e.hora} · {personaDe(area, e.actor).nombre} {accion(e)}</li>)}</ul>
        </>}
      </aside>
    )
  }

  const est = area.estaciones.find(e => e.id === sel.id)!
  const piezas = area.piezas.filter(p => est.etapas.includes(p.etapa))
  const archivadas = est.etapas.reduce((n, et) => n + (area.archivadas[et] ?? 0), 0)
  return (
    <aside className="card ficha">
      {cerrar}
      <div className="kicker">Estación</div>
      <h2>{est.nombre}</h2>
      <p className="perfil">{est.etapas.join(' · ')}</p>
      {archivadas > 0
        ? <p className="grande"><b>{archivadas}</b> piezas</p>
        : <><div className="kicker sub">Piezas · {piezas.length}</div><ListaPiezas piezas={piezas} area={area} onSelect={id => onSelect({ tipo: 'pieza', id })} /></>}
    </aside>
  )
}

function ListaPiezas({ piezas, area, onSelect }: { piezas: Pieza[]; area: Area; onSelect: (id: string) => void }) {
  return (
    <ul className="piezas">
      {piezas.map(p => (
        <li key={p.id} onClick={() => onSelect(p.id)}>
          <i style={{ background: estacionDe(area, p.etapa).color }} />
          <span>{p.titulo}<small>{p.etapa}</small></span>
          {p.estado !== 'normal' && <span className={'tag ' + p.estado}>{p.estado}</span>}
        </li>
      ))}
    </ul>
  )
}

function Resumen({ area }: { area: Area }) {
  const perfiles = Object.keys(PERFILES) as Perfil[]
  return (
    <aside className="card ficha">
      <div className="kicker">Área</div>
      <h2>{area.nombre}</h2>
      <p className="perfil">{area.personas.length} personas · {area.estaciones.length} estaciones</p>
      <div className="kicker sub">Equipo</div>
      <ul className="equipo">
        {perfiles.map(pf => (
          <li key={pf}><Forma perfil={pf} /> {PERFILES[pf].nombre} <b>{area.personas.filter(p => p.perfil === pf).length}</b></li>
        ))}
      </ul>
      <div className="kicker sub">Cómo leer la escena</div>
      <ul className="leyenda">
        <li><i className="cubo" /> Cada cubo es una tarea, en el puesto de su responsable</li>
        <li><i className="bola" /> Vencida</li>
        <li><i className="anillo-r" /> Por vencer</li>
        <li>Haz clic en una persona, una tarea o una estación para ver su ficha</li>
      </ul>
    </aside>
  )
}

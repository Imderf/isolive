import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, Check, ChevronDown, Hourglass, LayoutGrid, MapPin, Minus, Package, Plus, RotateCcw, Search, Users, X } from 'lucide-react'
import { PERFILES, estacionDe, personaDe, type Area, type Evento, type Perfil, type Pieza } from '../model'
import { moverCamara } from '../scene/Scene'
import { enHorario, fechaHoy, horaTexto } from '../sim/horario'
import type { Modo } from '../App'
import type { Props } from '../scene/Puestos'

const iniciales = (n: string) => n.split(' ').slice(0, 2).map(x => x[0]).join('')
const ESTADO = { vencida: ['Vencida', 'rojo'], urgente: ['Por vencer', 'ambar'], normal: ['A tiempo', 'verde'] } as const

type OProps = Props & { onEtapa: (e: string | null) => void; modo: Modo }

const deHoy = (ev: Evento) => !ev.fecha || ev.fecha === fechaHoy()
// Hoy se ve la hora; días anteriores, la fecha (DD/MM).
const cuando = (ev: Evento) => (deHoy(ev) ? ev.hora : `${ev.fecha!.slice(8)}/${ev.fecha!.slice(5, 7)}`)

export function Overlay(props: OProps) {
  const { area } = props
  const vencidas = area.piezas.filter(p => p.estado === 'vencida').length
  return (
    <div className="ui">
      <Barra {...props} />
      <section className="kpis">
        <Kpi icon={<Package />} n={area.piezas.length} t="Piezas activas" sub={`en ${area.estaciones.filter(e => e.tipo === 'trabajo').length} estaciones`} />
        <Kpi icon={<Hourglass />} n={area.piezas.filter(p => p.etapa === 'Validación Cliente').length} t="Con el cliente" sub="esperando validación" tono="ambar" />
        <Kpi icon={<AlertTriangle />} n={vencidas} t="Vencidas" sub={`${area.piezas.filter(p => p.estado === 'urgente').length} por vencer`} tono="rojo" />
        <Kpi icon={<Activity />} n={area.eventos.filter(deHoy).length} t="Eventos hoy" sub="en el tablero" tono="verde" />
      </section>
      <div className="mapa-ctrl card">
        <button title="Acercar" onClick={() => moverCamara('acercar')}><Plus /></button>
        <button title="Alejar" onClick={() => moverCamara('alejar')}><Minus /></button>
        <button title="Vista inicial" onClick={() => moverCamara('inicio')}><RotateCcw /></button>
      </div>
      <Ficha {...props} />
      <Recorrido {...props} />
      <Listas {...props} />
    </div>
  )
}

function Barra({ area, onSelect, modo }: OProps) {
  const [reloj, setReloj] = useState(horaTexto)
  const [q, setQ] = useState('')
  useEffect(() => { const t = setInterval(() => setReloj(horaTexto()), 20_000); return () => clearInterval(t) }, [])
  const buscar = (txt: string) => {
    setQ(txt)
    const t = txt.trim().toLowerCase()
    if (t.length < 3) return
    const p = area.personas.find(x => x.nombre.toLowerCase().includes(t))
    if (p) return onSelect({ tipo: 'persona', id: p.id })
    const pz = area.piezas.find(x => x.titulo.toLowerCase().includes(t))
    if (pz) return onSelect({ tipo: 'pieza', id: pz.id })
    const e = area.estaciones.find(x => x.nombre.toLowerCase().includes(t))
    if (e) onSelect({ tipo: 'estacion', id: e.id })
  }
  return (
    <header className="top">
      <div className="brand"><img src="/ogilvy-logo.png" alt="Ogilvy" /><span>Live</span></div>
      <label className="buscar"><Search /><input value={q} onChange={e => buscar(e.target.value)} placeholder="Buscar personas, piezas o estaciones…" /></label>
      <div className="derecha">
        <button className="selector" title="Por ahora hay una sola área">
          <span className="sq">MS</span>
          <span><b>{area.nombre}</b><small>{area.cliente} · {area.personas.length} personas</small></span>
          <ChevronDown />
        </button>
        <span className="tag verde"><i className="punto" />En vivo · {reloj}</span>
        {!enHorario() && <span className="tag gris">Fuera de horario · puestos vacíos</span>}
        {modo === 'prueba' ? <span className="tag ambar">Datos de prueba · simulación</span> : <span className="tag gris">TaskBoard · Social First</span>}
        <div className="user"><span className="avatar">IR</span><span><b>Imderf Ríos</b><small>Coordinación general</small></span></div>
      </div>
    </header>
  )
}

function Kpi({ icon, n, t, sub, tono = 'rojo' }: { icon: React.ReactNode; n: number; t: string; sub: string; tono?: string }) {
  return (
    <div className="card kpi">
      <span className={`ico ${tono}`}>{icon}</span>
      <div><small>{t}</small><b>{n}</b><em>{sub}</em></div>
    </div>
  )
}

const accion = (ev: Evento) =>
  ev.tipo === 'movida' ? <>movió a <b>{ev.hasta}</b></> : ev.tipo === 'comentario' ? 'comentó' : ev.tipo === 'creada' ? 'creó' : 'asignó'

function Cabecera({ icon, kicker, titulo, onClose }: { icon: React.ReactNode; kicker: string; titulo: string; onClose?: () => void }) {
  return (
    <div className="cab">
      <span className="ico rojo">{icon}</span>
      <div><small>{kicker}</small><h2>{titulo}</h2></div>
      {onClose && <button className="cerrar" title="Cerrar" onClick={onClose}><X /></button>}
    </div>
  )
}

function Barrita({ v, max, tono = 'rojo' }: { v: number; max: number; tono?: string }) {
  return <span className="barrita"><i className={tono} style={{ width: `${Math.min(100, (v / Math.max(max, 1)) * 100)}%` }} /></span>
}

function Ficha(props: OProps) {
  const { area, sel, onSelect } = props
  const cerrar = () => onSelect(null)
  const carga = (id: string) => area.piezas.filter(x => x.asignados.includes(id)).length
  const maxCarga = Math.max(...area.personas.map(p => carga(p.id)))

  if (!sel) {
    const perfiles = Object.keys(PERFILES) as Perfil[]
    return (
      <aside className="card ficha">
        <Cabecera icon={<LayoutGrid />} kicker={`Área · ${area.cliente}`} titulo={area.nombre} />
        <div className="tags"><span className="tag verde"><i className="punto" />Operando</span><span className="tag gris">{area.personas.length} personas · {area.estaciones.length} estaciones</span></div>
        <h3>Equipo</h3>
        <ul className="filas">
          {perfiles.map(pf => {
            const n = area.personas.filter(p => p.perfil === pf).length
            const piezas = area.piezas.filter(x => personaDe(area, x.asignados[0])?.perfil === pf).length
            return (
              <li key={pf}><i className="dot" style={{ background: PERFILES[pf].color }} /><span className="grow">{PERFILES[pf].nombre} <small>{n}</small></span><Barrita v={piezas} max={area.piezas.length / 2} /><b>{piezas}</b></li>
            )
          })}
        </ul>
        <h3>Cómo leer la escena</h3>
        <ul className="leyenda">
          <li><i className="caja" />Cada caja es una tarea, en el puesto de su responsable</li>
          <li><i className="pin rojo" />Tarea vencida</li>
          <li><i className="pin ambar" />Tarea por vencer</li>
          <li><i className="mouse" />Clic en una persona, tarea o estación para ver su ficha</li>
        </ul>
      </aside>
    )
  }

  if (sel.tipo === 'persona') {
    const p = personaDe(area, sel.id)
    if (!p) return <Ficha {...props} sel={null} />
    const suyas = area.piezas.filter(x => x.asignados.includes(p.id))
    const venc = suyas.filter(x => x.estado === 'vencida').length
    return (
      <aside className="card ficha">
        <Cabecera icon={<Users />} kicker={`Persona · ${PERFILES[p.perfil].nombre}`} titulo={p.nombre} onClose={cerrar} />
        <div className="tags"><span className="tag verde"><i className="punto" />En su puesto</span></div>
        <div className="stats">
          <div><small>Piezas asignadas</small><b>{suyas.length}</b><Barrita v={suyas.length} max={maxCarga} /></div>
          <div><small>Vencidas</small><b className={venc ? 'txt-rojo' : ''}>{venc}</b><Barrita v={venc} max={Math.max(suyas.length, 1)} /></div>
        </div>
        <h3>Piezas</h3>
        <ListaPiezas piezas={suyas} area={area} onSelect={id => onSelect({ tipo: 'pieza', id })} />
      </aside>
    )
  }

  if (sel.tipo === 'pieza') {
    const p = area.piezas.find(x => x.id === sel.id)
    if (!p) return <Ficha {...props} sel={null} /> // ya se archivó
    const est = estacionDe(area, p.etapa)
    const eventos = area.eventos.filter(e => e.pieza === p.id)
    const [txt, tono] = ESTADO[p.estado]
    return (
      <aside className="card ficha">
        <Cabecera icon={<Package />} kicker={`Pieza · ${est.nombre}`} titulo={p.titulo} onClose={cerrar} />
        <div className="tags"><span className="tag" style={{ background: est.color, color: '#fff' }}>{p.etapa}</span><span className={`tag ${tono}`}>{txt}</span></div>
        <dl>
          <dt>Responsables</dt><dd>{p.asignados.map(id => personaDe(area, id)?.nombre).filter(Boolean).join(', ') || 'Sin responsable en la mesa'}</dd>
          <dt>Fecha límite</dt><dd>{p.vence || 'Sin fecha'}</dd>
          <dt>Estación</dt><dd>{est.nombre}</dd>
        </dl>
        {eventos.length > 0 && <>
          <h3>Actividad</h3>
          <ul className="filas">{eventos.map(e => <li key={e.id}><span className="hora">{cuando(e)}</span><span className="grow">{personaDe(area, e.actor)?.nombre ?? 'Alguien'} {accion(e)}</span></li>)}</ul>
        </>}
      </aside>
    )
  }

  const est = area.estaciones.find(e => e.id === sel.id)!
  const piezas = area.piezas.filter(p => est.etapas.includes(p.etapa))
  const archivadas = est.etapas.reduce((n, et) => n + (area.archivadas[et] ?? 0), 0)
  return (
    <aside className="card ficha">
      <Cabecera icon={<MapPin />} kicker="Estación" titulo={est.nombre} onClose={cerrar} />
      <div className="tags">{est.etapas.map(et => <span key={et} className="tag" style={{ background: est.color, color: '#fff' }}>{et}</span>)}</div>
      <div className="stats">
        <div><small>{archivadas ? 'Piezas archivadas' : 'Piezas activas'}</small><b>{archivadas || piezas.length}</b><Barrita v={archivadas || piezas.length} max={archivadas ? 93 : area.piezas.length} /></div>
        <div><small>Vencidas</small><b>{piezas.filter(p => p.estado === 'vencida').length}</b><Barrita v={piezas.filter(p => p.estado === 'vencida').length} max={Math.max(piezas.length, 1)} /></div>
      </div>
      {piezas.length > 0 && <><h3>Piezas</h3><ListaPiezas piezas={piezas} area={area} onSelect={id => onSelect({ tipo: 'pieza', id })} /></>}
    </aside>
  )
}

function ListaPiezas({ piezas, area, onSelect }: { piezas: Pieza[]; area: Area; onSelect: (id: string) => void }) {
  return (
    <ul className="filas">
      {piezas.map(p => (
        <li key={p.id} className="clic" onClick={() => onSelect(p.id)}>
          <i className="sq-mini" style={{ background: estacionDe(area, p.etapa).color }} />
          <span className="grow">{p.titulo}<small>{p.etapa}</small></span>
          {p.estado !== 'normal' && <span className={`tag ${ESTADO[p.estado][1]}`}>{ESTADO[p.estado][0]}</span>}
        </li>
      ))}
    </ul>
  )
}

// Como el "Shipment Tracking" de WareTrack: las etapas del tablero. Con una pieza elegida, muestra su recorrido.
function Recorrido({ area, sel, etapa, onEtapa }: OProps) {
  const pieza = sel?.tipo === 'pieza' ? area.piezas.find(p => p.id === sel.id) : undefined
  const activas = area.etapas.filter(et => !(et in area.archivadas))
  const idx = pieza ? activas.indexOf(pieza.etapa) : -1
  return (
    <section className="card recorrido">
      <div className="cab-linea">
        <span className="ico rojo"><Activity /></span>
        <b>{pieza ? 'Recorrido de la pieza' : 'Etapas del tablero'}</b>
        <small>{pieza ? pieza.titulo : 'Social First · clic para filtrar'}</small>
      </div>
      <ol>
        {activas.map((et, i) => {
          const n = area.piezas.filter(p => p.etapa === et).length
          const cls = pieza ? (i < idx ? 'hecho' : i === idx ? 'actual' : '') : (etapa === et ? 'actual' : n ? 'con' : '')
          return (
            <li key={et} className={cls} onClick={() => !pieza && onEtapa(etapa === et ? null : et)}>
              <span className="nodo">{pieza && i < idx ? <Check /> : pieza ? '' : n}</span>
              <span className="nombre">{et}</span>
            </li>
          )
        })}
      </ol>
      <div className="archivo">
        {Object.entries(area.archivadas).map(([et, n]) => (
          <button key={et} className={etapa === et ? 'on' : ''} onClick={() => onEtapa(etapa === et ? null : et)}>{et} <b>{n}</b></button>
        ))}
      </div>
    </section>
  )
}

// Como "Docks / Forklifts / Trucks" de WareTrack.
function Listas({ area, onSelect }: OProps) {
  const [tab, setTab] = useState<'actividad' | 'personas' | 'estaciones'>('actividad')
  const carga = (id: string) => area.piezas.filter(x => x.asignados.includes(id)).length
  const maxCarga = Math.max(...area.personas.map(p => carga(p.id)))
  return (
    <section className="card listas">
      <div className="tabs">
        {(['actividad', 'personas', 'estaciones'] as const).map(t => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)} <small>{t === 'actividad' ? area.eventos.length : t === 'personas' ? area.personas.length : area.estaciones.length}</small>
          </button>
        ))}
      </div>
      <ul className="filas scroll">
        {tab === 'actividad' && area.eventos.map(ev => {
          const actor = personaDe(area, ev.actor) ?? { nombre: 'Alguien', perfil: 'data' as const }
          return (
            <li key={ev.id} className="clic" onClick={() => onSelect({ tipo: 'pieza', id: ev.pieza })}>
              <span className="hora">{cuando(ev)}</span>
              <span className="avatar sm" style={{ background: PERFILES[actor.perfil].color }}>{iniciales(actor.nombre)}</span>
              <span className="grow"><b>{actor.nombre}</b> {accion(ev)}<small>{ev.titulo}</small></span>
            </li>
          )
        })}
        {tab === 'personas' && area.personas.map(p => (
          <li key={p.id} className="clic" onClick={() => onSelect({ tipo: 'persona', id: p.id })}>
            <span className="avatar sm" style={{ background: PERFILES[p.perfil].color }}>{iniciales(p.nombre)}</span>
            <span className="grow">{p.nombre}<small>{PERFILES[p.perfil].nombre}</small></span>
            <Barrita v={carga(p.id)} max={maxCarga} /><b>{carga(p.id)}</b>
          </li>
        ))}
        {tab === 'estaciones' && area.estaciones.map(e => {
          const n = area.piezas.filter(p => e.etapas.includes(p.etapa)).length || e.etapas.reduce((s, et) => s + (area.archivadas[et] ?? 0), 0)
          return (
            <li key={e.id} className="clic" onClick={() => onSelect({ tipo: 'estacion', id: e.id })}>
              <i className="sq-mini" style={{ background: e.color }} />
              <span className="grow">{e.nombre}<small>{e.tipo === 'lugar' ? 'Lugar' : 'Estación de trabajo'}</small></span>
              <b>{n}</b>
            </li>
          )
        })}
      </ul>
      {tab === 'actividad' && <p className="nota">Solo eventos reales del tablero. La vida de oficina no aparece aquí.</p>}
    </section>
  )
}

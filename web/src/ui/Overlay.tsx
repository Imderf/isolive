import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, Check, ChevronDown, Hourglass, LayoutGrid, Layers, MapPin, Maximize, Minimize, Minus, Package, Plus, RotateCcw, Search, SquareKanban, Users, X } from 'lucide-react'
import { PERFILES, estacionDe, personaDe, type Area, type Disposicion, type Evento, type Perfil, type Pieza } from '../model'
import { AREAS } from '../areas'
import { moverCamara } from '../scene/Scene'
import { enHorario, fechaHoy, horaTexto } from '../sim/horario'
import type { Modo } from '../App'
import type { Props } from '../scene/Puestos'

const iniciales = (n: string) => n.split(' ').slice(0, 2).map(x => x[0]).join('')
const sigla = (n: string) => n.split(' ').filter(w => /^[A-ZÁÉÍÓÚÑ]/.test(w)).map(w => w[0]).join('').slice(0, 2)
const ESTADO = { vencida: ['Vencida', 'rojo'], urgente: ['Por vencer', 'ambar'], normal: ['A tiempo', 'verde'] } as const

type OProps = Props & { onEtapa: (e: string | null) => void; modo: Modo; vivo: boolean; onArea: (d: Disposicion) => void }

const deHoy = (ev: Evento) => !ev.fecha || ev.fecha === fechaHoy()
// Hoy se ve la hora; días anteriores, la fecha (DD/MM).
const cuando = (ev: Evento) => (deHoy(ev) ? ev.hora : `${ev.fecha!.slice(8)}/${ev.fecha!.slice(5, 7)}`)

export function Overlay(props: OProps) {
  const { area } = props
  const [entrando, setEntrando] = useState(true) // entrada escalonada solo la primera vez
  useEffect(() => { const t = setTimeout(() => setEntrando(false), 1600); return () => clearTimeout(t) }, [])
  // Pantalla completa: esconde la barra, los indicadores y las etapas; quedan la oficina y los paneles de la derecha.
  // Si el navegador no deja entrar a pantalla completa, igual se esconden. Esc (al salir de pantalla completa) los devuelve.
  const [foco, setFoco] = useState(false)
  useEffect(() => {
    const cambio = () => setFoco(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', cambio)
    return () => document.removeEventListener('fullscreenchange', cambio)
  }, [])
  const alternarFoco = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else document.documentElement.requestFullscreen?.().catch(() => {})
    setFoco(f => !f)
  }
  const vencidas = area.piezas.filter(p => p.estado === 'vencida').length
  return (
    <div className={`ui${entrando ? ' entrando' : ''}${foco ? ' foco' : ''}`}>
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
        <button title={foco ? 'Salir de pantalla completa' : 'Pantalla completa'} onClick={alternarFoco}>{foco ? <Minimize /> : <Maximize />}</button>
      </div>
      <Ficha {...props} />
      <Recorrido {...props} />
      <Listas {...props} />
      {props.sel?.tipo === 'tablero' && <Tablero {...props} />}
    </div>
  )
}

function Barra({ area, onSelect, modo, vivo, onArea }: OProps) {
  const [reloj, setReloj] = useState(horaTexto)
  const [q, setQ] = useState('')
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    if (!menu) return
    const cerrar = () => setMenu(false)
    window.addEventListener('pointerdown', cerrar)
    return () => window.removeEventListener('pointerdown', cerrar)
  }, [menu])
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
        <div className="selector-caja" onPointerDown={e => e.stopPropagation()}>
          <button className="selector" aria-haspopup="listbox" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            <span className="sq">{sigla(area.nombre)}</span>
            <span><b>{area.nombre}</b><small>{area.cliente} · {area.personas.length} personas</small></span>
            <ChevronDown />
          </button>
          {menu && (
            <ul className="card menu-areas" role="listbox">
              {AREAS.map(d => (
                <li key={d.id} role="option" aria-selected={d.id === area.id}>
                  <button onClick={() => { setMenu(false); if (d.id !== area.id) onArea(d) }}>
                    <span className="sq">{sigla(d.nombre)}</span>
                    <span><b>{d.nombre}</b><small>{d.cliente} · {d.fuente}</small></span>
                    {d.id === area.id && <Check />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {vivo ? <span className="tag verde"><i className="punto" />En vivo · {reloj}</span> : <span className="tag ambar"><i className="punto" />Reconectando…</span>}
        {!enHorario() && <span className="tag gris">Fuera de horario · puestos vacíos</span>}
        {modo === 'prueba' ? <span className="tag ambar">Datos de prueba · simulación</span> : <span className="tag gris">{area.fuente}</span>}
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
  ev.tipo === 'movida' ? <>movió a <b>{ev.hasta}</b></> : ev.tipo === 'comentario' ? (ev.texto ? <>comentó <q>{ev.texto}</q></> : 'comentó') : ev.tipo === 'creada' ? 'creó' : 'asignó'

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
  const carga = (id: string) => area.piezas.filter(x => x.tiene?.persona === id).length
  const maxCarga = Math.max(...area.personas.map(p => carga(p.id)))

  if (!sel || sel.tipo === 'tablero') {
    if (props.etapa) return <FichaEtapa {...props} etapa={props.etapa} />
    const perfiles = Object.keys(PERFILES) as Perfil[]
    return (
      <aside className="card ficha">
        <Cabecera icon={<LayoutGrid />} kicker={`Área · ${area.cliente}`} titulo={area.nombre} />
        <div className="tags"><span className="tag verde"><i className="punto" />Operando</span><span className="tag gris">{area.personas.length} personas · {area.estaciones.length} estaciones</span></div>
        <h3>Equipo</h3>
        <ul className="filas">
          {perfiles.map(pf => {
            const n = area.personas.filter(p => p.perfil === pf).length
            const piezas = area.piezas.filter(x => personaDe(area, x.tiene?.persona)?.perfil === pf).length
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
          <li><i className="mouse" />Pasa el mouse por los números para ver cada zona; clic para su ficha</li>
          <li><i className="mouse" />Clic en el muro Kanban para ver el tablero completo</li>
        </ul>
      </aside>
    )
  }

  if (sel.tipo === 'persona') {
    const p = personaDe(area, sel.id)
    if (!p) return <Ficha {...props} sel={null} />
    const suyas = area.piezas.filter(x => x.tiene?.persona === p.id)
    const tambien = area.piezas.filter(x => x.asignados.includes(p.id) && x.tiene?.persona !== p.id)
    const venc = suyas.filter(x => x.estado === 'vencida').length
    return (
      <aside className="card ficha">
        <Cabecera icon={<Users />} kicker={`Persona · ${PERFILES[p.perfil].nombre}`} titulo={p.nombre} onClose={cerrar} />
        <div className="tags"><span className="tag verde"><i className="punto" />En su puesto</span></div>
        <div className="stats">
          <div><small>Las tiene ahora</small><b>{suyas.length}</b><Barrita v={suyas.length} max={maxCarga} /></div>
          <div><small>Vencidas</small><b className={venc ? 'txt-rojo' : ''}>{venc}</b><Barrita v={venc} max={Math.max(suyas.length, 1)} /></div>
        </div>
        <h3>Piezas</h3>
        <ListaPiezas piezas={suyas} area={area} onSelect={id => onSelect({ tipo: 'pieza', id })} />
        {tambien.length > 0 && <>
          <h3>También aparece como responsable · {tambien.length}</h3>
          <ListaPiezas piezas={tambien} area={area} onSelect={id => onSelect({ tipo: 'pieza', id })} />
        </>}
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
          <dt>La tiene ahora</dt><dd>{personaDe(area, p.tiene?.persona)?.nombre ?? 'Nadie de la mesa'}<small className="motivo">{motivo(area, p)}</small></dd>
          <dt>Responsables en el tablero</dt><dd>{p.asignados.map(id => personaDe(area, id)?.nombre).filter(Boolean).join(', ') || 'Sin responsable de la mesa'}</dd>
          <dt>Fecha límite</dt><dd>{p.vence || 'Sin fecha'}</dd>
          <dt>Estación</dt><dd>{est.nombre}</dd>
        </dl>
        <Comentarios area={area} pieza={p.id} />
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
        <small>{pieza ? pieza.titulo : 'Clic en una etapa para filtrar'}</small>
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
  const carga = (id: string) => area.piezas.filter(x => x.tiene?.persona === id).length
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

// Quién trabaja en una etapa: personas con piezas en ella (cualquier responsable) y piezas sin dueño.
function FichaEtapa(props: OProps & { etapa: string }) {
  const { area, etapa, onSelect, onEtapa } = props
  const piezas = area.piezas.filter(p => p.etapa === etapa)
  const archivadas = area.archivadas[etapa]
  const est = estacionDe(area, etapa)
  const quienes = area.personas
    .map(p => ({ p, n: piezas.filter(x => x.tiene?.persona === p.id).length }))
    .filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n)
  const sinDueno = piezas.filter(x => !x.tiene?.persona).length
  return (
    <aside className="card ficha">
      <Cabecera icon={<Layers />} kicker={`Etapa · ${est.nombre}`} titulo={etapa} onClose={() => onEtapa(null)} />
      <div className="stats">
        <div><small>{archivadas !== undefined ? 'Piezas archivadas' : 'Piezas en la etapa'}</small><b>{archivadas ?? piezas.length}</b></div>
        <div><small>Vencidas</small><b className={piezas.some(p => p.estado === 'vencida') ? 'txt-rojo' : ''}>{piezas.filter(p => p.estado === 'vencida').length}</b></div>
      </div>
      {archivadas === undefined && <>
        <h3>Quién está trabajando aquí · {quienes.length}</h3>
        <ul className="filas">
          {quienes.map(({ p, n }) => (
            <li key={p.id} className="clic" onClick={() => onSelect({ tipo: 'persona', id: p.id })}>
              <span className="avatar sm" style={{ background: PERFILES[p.perfil].color }}>{iniciales(p.nombre)}</span>
              <span className="grow">{p.nombre}<small>{PERFILES[p.perfil].nombre}</small></span>
              <b>{n}</b>
            </li>
          ))}
          {sinDueno > 0 && <li><span className="avatar sm" style={{ background: '#CBD0DA' }}>?</span><span className="grow">{est.perfiles ? `Nadie de ${est.perfiles.map(x => PERFILES[x].nombre).join(' o ')} la tiene` : 'Sin responsable de la mesa'}<small>esperan en la bandeja de {est.nombre.toLowerCase()}</small></span><b>{sinDueno}</b></li>}
        </ul>
        <h3>Piezas</h3>
        <ListaPiezas piezas={piezas} area={area} onSelect={id => onSelect({ tipo: 'pieza', id })} />
      </>}
    </aside>
  )
}

// Vista completa del tablero (clic en el muro Kanban): columnas con sus piezas, responsables y estado.
function Tablero({ area, onSelect, onEtapa }: OProps) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onSelect(null) }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onSelect])
  const verEtapa = (et: string) => { onSelect(null); onEtapa(et) }
  return (
    <div className="velo" onClick={() => onSelect(null)}>
      <section className="tablero" onClick={e => e.stopPropagation()}>
        <div className="cab">
          <span className="ico rojo"><SquareKanban /></span>
          <div><small>Muro Kanban · {area.cliente}</small><h2>Tablero completo · {area.piezas.length} piezas activas</h2></div>
          <button className="cerrar" title="Cerrar (Esc)" onClick={() => onSelect(null)}><X /></button>
        </div>
        <div className="columnas">
          {area.etapas.map(et => {
            const est = estacionDe(area, et)
            const piezas = area.piezas.filter(p => p.etapa === et)
            const arch = area.archivadas[et]
            return (
              <div key={et} className="columna">
                <button className="col-cab" title="Ver quién trabaja en esta etapa" onClick={() => verEtapa(et)}>
                  <i className="sq-mini" style={{ background: est.color }} /><b>{et}</b><span>{arch ?? piezas.length}</span>
                </button>
                <div className="col-lista">
                  {arch !== undefined
                    ? <p className="col-arch">{arch} piezas archivadas en {est.nombre.toLowerCase()}</p>
                    : piezas.map(p => (
                      <button key={p.id} className={`tarjeta ${p.estado}`} onClick={() => onSelect({ tipo: 'pieza', id: p.id })}>
                        <span className="t-titulo">{p.titulo}</span>
                        <span className="t-pie">
                          <span className="avatares">
                            {[...new Set([p.tiene?.persona, ...p.asignados])].map(id => personaDe(area, id)).filter(x => !!x).map(x => (
                              <i key={x.id} className={`avatar xs${x.id === p.tiene?.persona ? ' tiene' : ''}`} style={{ background: PERFILES[x.perfil].color }} title={x.id === p.tiene?.persona ? `${x.nombre} · la tiene ahora` : x.nombre}>{iniciales(x.nombre)}</i>
                            ))}
                          </span>
                          {p.estado !== 'normal' ? <span className={`tag ${ESTADO[p.estado][1]}`}>{ESTADO[p.estado][0]}</span> : p.vence && <small>{p.vence.slice(8)}/{p.vence.slice(5, 7)}</small>}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

// Comentarios recientes de la pieza (los 5 más nuevos). Solo los ven usuarios de Ogilvy.
function Comentarios({ area, pieza }: { area: Area; pieza: string }) {
  const lista = area.comentarios.filter(c => c.pieza === pieza).slice(0, 5)
  if (!lista.length) return null
  return (
    <>
      <h3>Comentarios recientes</h3>
      <ul className="comentarios">
        {lista.map(c => {
          const autor = personaDe(area, c.autor)
          return (
            <li key={c.id}>
              <span className="avatar sm" style={{ background: autor ? PERFILES[autor.perfil].color : '#CBD0DA' }}>{autor ? iniciales(autor.nombre) : '?'}</span>
              <div><b>{autor?.nombre ?? 'Alguien'}</b> <small>{cuando({ fecha: c.fecha, hora: c.hora } as Evento)}</small><p>{c.texto}</p></div>
            </li>
          )
        })}
      </ul>
    </>
  )
}

// Por qué la tiene esa persona (o por qué nadie), en palabras.
function motivo(area: Area, p: Pieza): string {
  const t = p.tiene
  const nombre = (id?: string) => personaDe(area, id)?.nombre ?? 'Alguien'
  const dia = (f?: string) => (f ? ` el ${f.slice(8)}/${f.slice(5, 7)}` : '')
  if (!t) return ''
  if (t.motivo === 'mencion') return `${nombre(t.por)} la mencionó en un comentario${dia(t.fecha)}`
  if (t.motivo === 'asignado') return 'Responsable asignado en el tablero'
  if (t.motivo === 'comentario') return `Comentó${dia(t.fecha)}; es de ${estacionDe(area, p.etapa).nombre.toLowerCase()}`
  if (t.motivo === 'sin-perfil') {
    const perf = estacionDe(area, p.etapa).perfiles?.map(x => PERFILES[x].nombre).join(' o ')
    return `Nadie de ${perf} aparece asignado ni mencionado; el tablero la asigna a ${p.asignados.map(id => `${nombre(id)} (${PERFILES[personaDe(area, id)!.perfil].nombre})`).join(' y ')}`
  }
  return 'Sin responsable de la mesa'
}

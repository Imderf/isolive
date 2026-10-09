import { useCallback, useEffect, useRef, useState } from 'react'
import { Scene } from './scene/Scene'
import { Overlay } from './ui/Overlay'
import { area as mock } from './mock'
import { disposicion } from './areas/mesa-social-media'
import type { Area, DatosArea, Seleccion } from './model'
import { capaEtiquetas } from './scene/parts'
import { aplicar, simularEvento } from './sim/eventos'
import { conTenencias } from './sim/responsable'
import { coreografiar } from './sim/coreografia'
import { horaTexto } from './sim/horario'
import { visual } from './sim/visual'
import { IntroCiudad } from './intro/IntroCiudad'
import { Ascensor } from './intro/Ascensor'

export type Modo = 'cargando' | 'real' | 'prueba'
type Intro = 'ciudad' | 'ascensor' | 'fin'

// La intro se ve en cada carga (con botón para saltarla); ?sinintro la omite en desarrollo.
const verIntro = () => !new URLSearchParams(location.search).has('sinintro')

// Une los datos del conector con la disposición del piso. Una columna nueva del tablero que aún
// no tiene estación se deja por fuera (y se avisa en consola) en vez de romper la escena.
function componer(d: DatosArea): Area {
  const conocidas = new Set(disposicion.estaciones.flatMap(e => e.etapas))
  const sueltas = d.piezas.filter(p => !conocidas.has(p.etapa))
  if (sueltas.length) console.warn('[Ogilvy Live] Columnas sin estación:', [...new Set(sueltas.map(p => p.etapa))])
  return conTenencias({ ...disposicion, ...d, etapas: d.etapas.filter(e => conocidas.has(e)), piezas: d.piezas.filter(p => conocidas.has(p.etapa)) })
}

export default function App() {
  const [sel, setSel] = useState<Seleccion | null>(null)
  const [etapa, setEtapa] = useState<string | null>(null)
  const [modo, setModo] = useState<Modo>('cargando')
  const [area, setArea] = useState(mock)
  const actual = useRef(mock)
  const [intro, setIntro] = useState<Intro>(() => (verIntro() ? 'ciudad' : 'fin'))
  const terminarIntro = useCallback(() => setIntro('fin'), [])
  const alAscensor = useCallback(() => setIntro('ascensor'), [])

  // Datos reales del tablero; si el servidor no responde, datos de prueba con simulador.
  useEffect(() => {
    fetch(`/api/areas/${disposicion.id}`)
      .then(r => (r.ok ? (r.json() as Promise<DatosArea>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(d => { actual.current = componer(d); setArea(actual.current); setModo('real') })
      .catch(err => { console.warn('[Ogilvy Live] Sin datos reales, uso datos de prueba:', err.message); setModo('prueba') })
  }, [])

  // Simulador de prueba: un evento cada 12–22 s, por la misma vía que el conector real.
  useEffect(() => {
    if (modo !== 'prueba') return
    let t = 0
    const tick = () => {
      const libre = (id: string) => !visual.ocultas.has(id) && !visual.fantasmas.has(id)
      const ev = simularEvento(actual.current, horaTexto(), Math.random, libre)
      if (ev) {
        const antes = actual.current
        actual.current = aplicar(antes, ev)
        setArea(actual.current)
        coreografiar(antes, actual.current, ev)
      }
      t = window.setTimeout(tick, 12_000 + Math.random() * 10_000)
    }
    t = window.setTimeout(tick, 5_000)
    return () => clearTimeout(t)
  }, [modo])

  // Orden: intro en la ciudad → ascensor (puertas cerradas; mientras tanto se arma la oficina) → oficina.
  if (intro === 'ciudad') return <IntroCiudad onLlegar={alAscensor} onSaltar={terminarIntro} />
  return (
    <>
      {modo === 'cargando'
        ? <div className="cargando"><img src="/ogilvy-logo.png" alt="Ogilvy" /><span>Conectando con el tablero…</span></div>
        : <>
          <div ref={capaEtiquetas} className="etiquetas" />
          <Scene area={area} sel={sel} onSelect={setSel} etapa={etapa} />
          <Overlay area={area} sel={sel} onSelect={setSel} etapa={etapa} onEtapa={setEtapa} modo={modo} />
        </>}
      {intro === 'ascensor' && <Ascensor listo={modo !== 'cargando'} onFin={terminarIntro} onSaltar={terminarIntro} />}
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Scene } from './scene/Scene'
import { Overlay } from './ui/Overlay'
import { area as mock } from './mock'
import { aplicar, simularEvento } from './sim/eventos'
import { coreografiar } from './sim/coreografia'
import { horaTexto } from './sim/horario'
import { visual } from './sim/visual'
import type { Seleccion } from './model'
import { capaEtiquetas } from './scene/parts'

export default function App() {
  const [sel, setSel] = useState<Seleccion | null>(null)
  const [etapa, setEtapa] = useState<string | null>(null)
  const [area, setArea] = useState(mock)
  const actual = useRef(mock)

  // Simulador de prueba: un evento cada 12–22 s, por la misma vía que usará el conector real (ciclo 3).
  useEffect(() => {
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
  }, [])
  return (
    <>
      <div ref={capaEtiquetas} className="etiquetas" />
      <Scene area={area} sel={sel} onSelect={setSel} etapa={etapa} />
      <Overlay area={area} sel={sel} onSelect={setSel} etapa={etapa} onEtapa={setEtapa} />
    </>
  )
}

import { useState } from 'react'
import { Scene } from './scene/Scene'
import { Overlay } from './ui/Overlay'
import { area } from './mock'
import type { Seleccion } from './model'
import { capaEtiquetas } from './scene/parts'

export default function App() {
  const [sel, setSel] = useState<Seleccion | null>(null)
  const [etapa, setEtapa] = useState<string | null>(null)
  return (
    <>
      <div ref={capaEtiquetas} className="etiquetas" />
      <Scene area={area} sel={sel} onSelect={setSel} etapa={etapa} />
      <Overlay area={area} sel={sel} onSelect={setSel} etapa={etapa} onEtapa={setEtapa} />
    </>
  )
}

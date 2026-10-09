import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

// Puertas del ascensor sobre toda la pantalla. Cerradas tapan el cambio de escena.
export function Puertas({ abiertas, piso, rotulo }: { abiertas: boolean; piso: number; rotulo?: string }) {
  return (
    <div className={`puertas${abiertas ? ' abiertas' : ''}`} aria-hidden>
      <div className="hoja izq" />
      <div className="hoja der" />
      <div className="indicador"><ArrowUp /><b>{piso}</b>{rotulo && <span>{rotulo}</span>}</div>
    </div>
  )
}

// Sube del piso 1 al 4 con las puertas cerradas; abre cuando los datos ya cargaron.
export function Ascensor({ listo, onFin, onSaltar }: { listo: boolean; onFin: () => void; onSaltar: () => void }) {
  const [piso, setPiso] = useState(1)
  const [abiertas, setAbiertas] = useState(false)
  useEffect(() => {
    if (piso < 4) { const t = setTimeout(() => setPiso(p => p + 1), 520); return () => clearTimeout(t) }
    if (!listo) return
    const t1 = setTimeout(() => setAbiertas(true), 450)
    const t2 = setTimeout(onFin, 450 + 950)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [piso, listo, onFin])
  return (
    <>
      <Puertas abiertas={abiertas} piso={piso} rotulo={piso === 4 ? (listo ? 'Ogilvy · Piso 4' : 'Conectando con el tablero…') : undefined} />
      {!abiertas && <button className="saltar" onClick={onSaltar}>Saltar intro</button>}
    </>
  )
}

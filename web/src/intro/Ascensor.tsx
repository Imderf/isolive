import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

const PISOS = [7, 6, 5, 4, 3, 2, 1]

// Interior de la cabina, mirando a las puertas: techo con luz, paredes de acero, botonera con el piso 4 encendido y
// pantalla con el piso. Cerrada tapa el cambio de escena; al llegar abre y la cabina se agranda y se desvanece,
// como si uno saliera a la oficina.
export function Cabina({ piso, rotulo, visible = true, viajando = false, abierta = false }: {
  piso: number; rotulo?: string; visible?: boolean; viajando?: boolean; abierta?: boolean
}) {
  const clases = ['cabina', visible && 'visible', viajando && 'viajando', abierta && 'abierta', piso === 4 && !viajando && 'llego'].filter(Boolean).join(' ')
  return (
    <div className={clases} aria-hidden>
      <div className="cab-escena">
        <div className="cab-techo"><i /></div>
        <div className="cab-pared izq"><span className="pasamanos" /></div>
        <div className="cab-pared der"><span className="pasamanos" /></div>
        <div className="cab-piso" />
        <div className="cab-frente">
          <div className="cab-muro" />
          <div className="cab-display">
            <ArrowUp className={viajando ? 'sube' : ''} /><b>{piso}</b>{rotulo && <span>{rotulo}</span>}
          </div>
          <div className="cab-vano">
            <div className="hoja izq" />
            <div className="hoja der" />
          </div>
          <div className="botonera">
            <small>NAOS</small>
            {PISOS.map(n => <i key={n} className={n === 4 ? 'on' : ''}>{n}</i>)}
          </div>
        </div>
      </div>
    </div>
  )
}

// Sube del piso 1 al 4 con las puertas cerradas; abre cuando los datos ya cargaron.
export function Ascensor({ listo, onFin, onSaltar }: { listo: boolean; onFin: () => void; onSaltar: () => void }) {
  const [piso, setPiso] = useState(1)
  const [abierta, setAbierta] = useState(false)
  useEffect(() => {
    if (piso < 4) { const t = setTimeout(() => setPiso(p => p + 1), 560); return () => clearTimeout(t) }
    if (!listo) return
    const t1 = setTimeout(() => setAbierta(true), 650)
    const t2 = setTimeout(onFin, 650 + 1300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [piso, listo, onFin])
  const rotulo = piso === 4 ? (listo ? 'Ogilvy · Piso 4' : 'Conectando con el tablero…') : undefined
  return (
    <>
      <Cabina piso={piso} rotulo={rotulo} viajando={piso < 4} abierta={abierta} />
      {!abierta && <button className="saltar" onClick={onSaltar}>Saltar intro</button>}
    </>
  )
}

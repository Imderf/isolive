import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { moverCamara } from '../scene/Scene'

const PISOS = [7, 6, 5, 4, 3, 2, 1]

// Interior de la cabina, mirando a las puertas: techo con luz, paredes de acero, botonera con el piso 4 encendido y
// pantalla con el piso. Cerrada tapa el cambio de escena. Al llegar brilla la rendija, se abren las puertas sobre la
// oficina vista desde la entrada (la cámara 3D sube a la vista de siempre) y la cabina avanza un poco y se desvanece.
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
    const t1 = setTimeout(() => { setAbierta(true); moverCamara('salir') }, 650)
    const t2 = setTimeout(onFin, 650 + 1450)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [piso, listo, onFin])
  const rotulo = piso === 4 ? (listo ? 'Ogilvy · Piso 4' : 'Conectando con el tablero…') : undefined
  return (
    <>
      <Cabina piso={piso} rotulo={rotulo} viajando={piso < 4} abierta={abierta} />
      {!abierta && <button className="saltar" onClick={() => { moverCamara('salir'); onSaltar() }}>Saltar intro</button>}
    </>
  )
}

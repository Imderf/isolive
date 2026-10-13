// Hora de Bogotá y horario laboral. Para pruebas: ?hora=HH:MM y ?dia=1..7 (1 = lunes).
const q = new URLSearchParams(location.search)
const DIAS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
const ENTRADA = 8, SALIDA = 18

function calcular() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(new Date()).map(x => [x.type, x.value]),
  )
  const [h, m] = q.get('hora')?.split(':').map(Number) ?? [Number(p.hour), Number(p.minute)]
  const dia = Number(q.get('dia')) || DIAS[p.weekday]
  const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
  return { h, m, fecha, finde: dia >= 6, laboral: dia <= 5 && h >= ENTRADA && h < SALIDA }
}

// Se recalcula cada 20 s: las personas lo consultan en cada cuadro.
let actual = calcular()
setInterval(() => { actual = calcular() }, 20_000)

// La Mesa Demo siempre está en horario (se fija al elegir el área).
let siempre = false
export const fijarSiempreEnHorario = (v: boolean) => { siempre = v }
export const enHorario = () => siempre || actual.laboral
export const fechaHoy = () => actual.fecha
export const horaDecimal = () => actual.h + actual.m / 60
export const esFinde = () => actual.finde
export const horaTexto = () => `${String(actual.h).padStart(2, '0')}:${String(actual.m).padStart(2, '0')}`

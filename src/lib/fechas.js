import { idioma } from './idioma.js'

// Todas las fechas se calculan en hora de Colombia, sin importar
// la zona del celular. Solo cambia el idioma en que se muestran.
export const ZONA = 'America/Bogota'
const OFFSET = '-05:00' // Colombia no tiene horario de verano

const NOMBRES = {
  es: {
    dias: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    diasLargos: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    meses: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    hoy: 'Hoy', manana: 'Mañana', ayer: 'Ayer',
  },
  en: {
    dias: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    diasLargos: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    meses: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    hoy: 'Today', manana: 'Tomorrow', ayer: 'Yesterday',
  },
}
const n = () => NOMBRES[idioma()]

// Fecha "YYYY-MM-DD" en Colombia para un instante dado
export function fechaCO(instante = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(instante))
}

export function sumarDias(fecha, cuantos) {
  const [y, m, d] = fecha.split('-').map(Number)
  const x = new Date(Date.UTC(y, m - 1, d + cuantos))
  return x.toISOString().slice(0, 10)
}

export function diaSemana(fecha) {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export const diaLargo = numero => n().diasLargos[numero]

export function partes(fecha) {
  const [, m, d] = fecha.split('-').map(Number)
  return { dia: d, mes: n().meses[m - 1], dow: n().dias[diaSemana(fecha)] }
}

export function etiquetaDia(fecha, hoy = fechaCO()) {
  if (fecha === hoy) return n().hoy
  if (fecha === sumarDias(hoy, 1)) return n().manana
  if (fecha === sumarDias(hoy, -1)) return n().ayer
  return partes(fecha).dow
}

// "Lunes 28 de sep" / "Monday, Sep 28"
export function fechaLarga(fecha) {
  const p = partes(fecha)
  const dia = diaLargo(diaSemana(fecha))
  return idioma() === 'en' ? `${dia}, ${p.mes} ${p.dia}` : `${dia} ${p.dia} de ${p.mes}`
}

// "9:30 am" / "9:30 AM"
export function hora(instante) {
  const texto = new Intl.DateTimeFormat(idioma() === 'en' ? 'en-US' : 'es-CO',
    { timeZone: ZONA, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(instante))
  return texto.replace(/ | /g, ' ')
    .replace(/\s?a\.\s?m\./i, ' am').replace(/\s?p\.\s?m\./i, ' pm')
}

// Límites del día en Colombia, para consultar la base de datos
export function inicioDia(fecha) { return `${fecha}T00:00:00${OFFSET}` }
export function finDia(fecha) { return `${sumarDias(fecha, 1)}T00:00:00${OFFSET}` }

export function semanaDe(fecha) {
  const lunes = sumarDias(fecha, -((diaSemana(fecha) + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
}

// Pesos colombianos: "$20.000" / "$20,000"
export const pesos = valor => '$' + Number(valor || 0).toLocaleString(idioma() === 'en' ? 'en-US' : 'es-CO')

export function limpiarTelefono(tel) {
  let d = String(tel || '').replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('57')) d = d.slice(2)
  return d
}

export function enlaceWhatsApp(telefono, texto) {
  return `https://wa.me/57${limpiarTelefono(telefono)}?text=${encodeURIComponent(texto)}`
}

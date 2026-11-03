import { useEffect, useMemo, useState } from 'react'
import { rpc } from '../../lib/supabase.js'
import { t, idioma } from '../../lib/idioma.js'
import { pesos } from '../../lib/fechas.js'

// Estadísticas del dueño: ingresos y citas por mes, por barbero y por servicio.
// Los datos vienen de la función estadisticas() (supabase/esquema.sql),
// que ya agrupa por mes en hora de Colombia.

const MESES = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}
const nombreMes = (mes, corto = false) => {
  const [y, m] = mes.split('-').map(Number)
  const n = MESES[idioma()][m - 1]
  return corto ? n.slice(0, 3) : `${n} ${y}`
}

// "$8,1 M" / "$8.1M": para las etiquetas cortas de la gráfica
function pesosCortos(valor) {
  const en = idioma() === 'en'
  if (valor >= 1e6) return `$${(valor / 1e6).toLocaleString(en ? 'en-US' : 'es-CO', { maximumFractionDigits: 1 })}${en ? 'M' : ' M'}`
  if (valor >= 1e3) return `$${Math.round(valor / 1e3)}${en ? 'K' : ' mil'}`
  return pesos(valor)
}

// Variación contra el mes anterior: "+12 %" / "−5 %"
function variacion(actual, anterior) {
  if (!anterior) return null
  const p = Math.round(((actual - anterior) / anterior) * 100)
  return { texto: `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p)} %`, sube: p > 0, baja: p < 0 }
}

export default function Estadisticas({ negocio }) {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [mes, setMes] = useState(null)

  useEffect(() => {
    rpc('estadisticas', { p_barberia: negocio.id, p_meses: 6 })
      .then(d => { setDatos(d); setMes(d.meses[d.meses.length - 1].mes) })
      .catch(e => setError(e.message))
  }, [negocio.id])

  const vista = useMemo(() => {
    if (!datos || !mes) return null
    const i = datos.meses.findIndex(m => m.mes === mes)
    const actual = datos.meses[i]
    const anterior = i > 0 ? datos.meses[i - 1] : null
    const barberos = datos.barberos.filter(b => b.mes === mes).sort((a, b) => b.ingresos - a.ingresos)
    const servicios = datos.servicios.filter(s => s.mes === mes && s.atendidas > 0).sort((a, b) => b.ingresos - a.ingresos)
    return { actual, anterior, barberos, servicios, esMesActual: i === datos.meses.length - 1 }
  }, [datos, mes])

  if (error) return <p className="error">{error}</p>
  if (!vista) return <p className="cargando">{t('Calculando…', 'Crunching numbers…')}</p>

  const { actual, anterior, barberos, servicios, esMesActual } = vista
  const ticket = actual.atendidas ? Math.round(actual.ingresos / actual.atendidas) : 0
  const ticketAnterior = anterior?.atendidas ? Math.round(anterior.ingresos / anterior.atendidas) : 0
  const llegaron = actual.atendidas + actual.no_asistio
  const faltas = llegaron ? Math.round((actual.no_asistio / llegaron) * 100) : 0
  const maxMes = Math.max(...datos.meses.map(m => m.ingresos), 1)
  const maxBarbero = Math.max(...barberos.map(b => b.ingresos), 1)
  const totalServicios = servicios.reduce((s, x) => s + x.ingresos, 0) || 1

  return (
    <section className="stats">
      <div className="fila" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ textTransform: 'capitalize' }}>{nombreMes(mes)}</h2>
        {esMesActual && <span className="small muted">{t('Mes en curso', 'Month to date')}</span>}
      </div>

      <div className="cifras cuatro">
        <Cifra valor={pesos(actual.ingresos)} etiqueta={t('ingresos', 'revenue')} cambio={variacion(actual.ingresos, anterior?.ingresos)} />
        <Cifra valor={actual.atendidas} etiqueta={t('atendidas', 'completed')} cambio={variacion(actual.atendidas, anterior?.atendidas)} />
        <Cifra valor={pesos(ticket)} etiqueta={t('por cita', 'per visit')} cambio={variacion(ticket, ticketAnterior)} />
        <Cifra valor={`${faltas} %`} etiqueta={t('no asistieron', 'no-shows')} />
      </div>
      <p className="small muted" style={{ margin: '6px 0 0' }}>
        {t(`${actual.clientes} clientes distintos`, `${actual.clientes} different clients`)}
        {' · '}{t(`${actual.canceladas} canceladas`, `${actual.canceladas} cancelled`)}
        {actual.pendientes > 0 && <> · {esMesActual
          ? t(`${actual.pendientes} pendientes`, `${actual.pendientes} upcoming or unmarked`)
          : t(`${actual.pendientes} sin marcar`, `${actual.pendientes} not marked`)}</>}
        {anterior && <> · {t('comparado con ', 'vs. ')}{nombreMes(anterior.mes)}</>}
      </p>

      <h3>{t('Ingresos de los últimos 6 meses', 'Revenue, last 6 months')}</h3>
      <p className="small muted" style={{ marginTop: -4 }}>{t('Toca un mes para ver su detalle.', 'Tap a month to see its details.')}</p>
      <div className="grafica" role="group" aria-label={t('Ingresos por mes', 'Revenue by month')}>
        {datos.meses.map(m => (
          <button key={m.mes} className="columna" aria-pressed={m.mes === mes} onClick={() => setMes(m.mes)}
            title={`${nombreMes(m.mes)}: ${pesos(m.ingresos)} · ${m.atendidas} ${t('atendidas', 'completed')}`}
            aria-label={`${nombreMes(m.mes)}: ${pesos(m.ingresos)}`}>
            <span className="valor">{pesosCortos(m.ingresos)}</span>
            <span className="barra-v" style={{ height: `${Math.max(2, (m.ingresos / maxMes) * 100)}%` }} />
            <span className="mes">{nombreMes(m.mes, true)}</span>
          </button>
        ))}
      </div>

      <h3>{t('Por barbero', 'By barber')}</h3>
      {barberos.length === 0 ? <p className="vacio">{t('Sin citas este mes.', 'No appointments this month.')}</p> : (
        <div className="tabla-barras">
          {barberos.map(b => (
            <div key={b.barbero_id} className="fila-barra">
              <div className="nombre">{b.nombre}
                <small>{b.atendidas} {t('atendidas', 'completed')}{b.no_asistio ? ` · ${b.no_asistio} ${t('no vinieron', 'no-shows')}` : ''}</small>
              </div>
              <div className="pista" aria-hidden="true"><span style={{ width: `${(b.ingresos / maxBarbero) * 100}%` }} /></div>
              <b className="monto">{pesos(b.ingresos)}</b>
            </div>
          ))}
        </div>
      )}

      <h3>{t('Por servicio', 'By service')}</h3>
      {servicios.length === 0 ? <p className="vacio">{t('Aún no hay servicios atendidos este mes.', 'No completed services this month yet.')}</p> : (
        <div className="tabla-barras">
          {servicios.map(s => (
            <div key={s.servicio_id} className="fila-barra">
              <div className="nombre">{s.nombre}<small>{s.atendidas} {s.atendidas === 1 ? t('vez', 'time') : t('veces', 'times')}</small></div>
              <div className="pista" aria-hidden="true"><span className="laton" style={{ width: `${(s.ingresos / totalServicios) * 100}%` }} /></div>
              <b className="monto">{pesos(s.ingresos)}<small>{Math.round((s.ingresos / totalServicios) * 100)} %</small></b>
            </div>
          ))}
        </div>
      )}

      <p className="small muted" style={{ marginTop: 18 }}>{t(
        'Ingresos = valor de las citas marcadas como atendidas, con el precio que tenían al reservar. Marca tus citas a diario para que las cifras sean exactas.',
        'Revenue = value of appointments marked as completed, at the price they had when booked. Mark your appointments daily to keep these numbers accurate.',
      )}</p>
    </section>
  )
}

function Cifra({ valor, etiqueta, cambio }) {
  return (
    <div className="cifra">
      <b>{valor}</b>
      <small>{etiqueta}</small>
      {cambio && <small className={cambio.sube ? 'sube' : cambio.baja ? 'baja' : ''}>{cambio.texto}</small>}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { rpc } from '../lib/supabase.js'
import { t } from '../lib/idioma.js'
import { fechaCO, sumarDias, partes, etiquetaDia, hora } from '../lib/fechas.js'

// Elige barbero, día y hora para un servicio. Lo usan la reserva,
// reprogramar y "agendar la próxima".
export default function SelectorHorario({
  slug, servicioId, barberos = [], barberoInicial = null, fechaInicial,
  ignorarCita = null, dias = 14, valor, onCambio, pasoInicial = 2,
}) {
  const hoy = fechaCO()
  const [barbero, setBarbero] = useState(barberoInicial) // null = cualquiera
  const [fecha, setFecha] = useState(fechaInicial || hoy)
  const [turnos, setTurnos] = useState(null)
  const [error, setError] = useState('')

  const inicioLista = fecha > sumarDias(hoy, dias - 1) ? fecha : hoy
  const listaDias = Array.from({ length: dias }, (_, i) => sumarDias(inicioLista, i))

  useEffect(() => {
    if (!servicioId) { setTurnos(null); return }
    let vigente = true
    setTurnos(undefined); setError('')
    rpc('turnos_disponibles', {
      p_slug: slug, p_servicio: servicioId, p_fecha: fecha,
      p_barbero: barbero, p_ignorar_cita: ignorarCita,
    }).then(filas => {
      if (!vigente) return
      // Con "cualquiera", un mismo horario puede estar libre con varios barberos:
      // se muestra una sola vez y se asigna al primero disponible.
      const vistos = new Map()
      for (const f of filas || []) if (!vistos.has(f.inicio)) vistos.set(f.inicio, f)
      setTurnos([...vistos.values()])
    }).catch(e => vigente && setError(e.message))
    return () => { vigente = false }
  }, [slug, servicioId, fecha, barbero, ignorarCita])

  function elegirBarbero(id) { setBarbero(id); onCambio?.(null) }
  function elegirFecha(f) { setFecha(f); onCambio?.(null) }

  const n = pasoInicial
  const conBarberos = barberos.length > 1
  return (
    <>
      {conBarberos && (
        <>
          <h2><span className="n">{n}</span>{t('¿Con quién?', 'With whom?')}</h2>
          <div className="fichas" role="group" aria-label={t('Barbero', 'Barber')}>
            {[{ id: null, nombre: t('El que esté libre', 'Anyone available') }, ...barberos].map(b => (
              <button key={b.id ?? 'cualquiera'} type="button" className="ficha" aria-pressed={barbero === b.id}
                onClick={() => elegirBarbero(b.id)}>{b.nombre}</button>
            ))}
          </div>
        </>
      )}

      <h2><span className="n">{conBarberos ? n + 1 : n}</span>{t('¿Qué día?', 'Which day?')}</h2>
      <div className="fichas" role="group" aria-label={t('Día', 'Day')}>
        {listaDias.map(f => {
          const p = partes(f)
          return (
            <button key={f} type="button" className="ficha" aria-pressed={fecha === f} onClick={() => elegirFecha(f)}>
              <small>{etiquetaDia(f, hoy)}</small><b>{p.dia}</b><small>{p.mes}</small>
            </button>
          )
        })}
      </div>

      <h2><span className="n">{conBarberos ? n + 2 : n + 1}</span>{t('¿A qué hora?', 'What time?')}</h2>
      {!servicioId ? <p className="vacio">{t('Elige primero un servicio para ver los horarios.', 'Choose a service first to see available times.')}</p>
        : error ? <p className="error">{error}</p>
        : turnos == null ? <p className="vacio">{t('Buscando horarios libres…', 'Looking for open times…')}</p>
        : turnos.length === 0 ? <p className="vacio">{t('No quedan turnos este día. Prueba con otro día.', 'No times left on this day. Try another day.')}</p>
        : (
          <div className="turnos">
            {turnos.map(tu => (
              <button key={tu.inicio} type="button" className="turno"
                aria-pressed={valor?.inicio === tu.inicio}
                onClick={() => onCambio?.({ inicio: tu.inicio, barbero_id: barbero, barbero_nombre: barbero ? tu.barbero_nombre : null })}>
                {hora(tu.inicio)}
              </button>
            ))}
          </div>
        )}
    </>
  )
}

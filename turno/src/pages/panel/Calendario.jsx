import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, rpc, traducirError } from '../../lib/supabase.js'
import { t } from '../../lib/idioma.js'
import {
  fechaCO, sumarDias, semanaDe, partes, etiquetaDia, fechaLarga, hora, pesos,
  inicioDia, finDia, enlaceWhatsApp, limpiarTelefono,
} from '../../lib/fechas.js'
import SelectorHorario from '../../components/SelectorHorario.jsx'
import Hoja from '../../components/Hoja.jsx'

const primerNombre = nombre => nombre.split(' ')[0]

export default function Calendario({ yo, negocio, barberos, servicios }) {
  const hoy = fechaCO()
  const [fecha, setFecha] = useState(hoy)
  const [filtro, setFiltro] = useState(yo.es_dueno ? 'todos' : yo.id)
  const [citas, setCitas] = useState(null)
  const [sinMarcar, setSinMarcar] = useState([])
  const [error, setError] = useState('')
  const [hoja, setHoja] = useState(null) // { tipo, cita }

  const semana = useMemo(() => semanaDe(fecha), [fecha])
  const activos = barberos.filter(b => b.activo)
  const barberosPublicos = activos.map(b => ({ id: b.id, nombre: b.nombre }))

  const cargar = useCallback(async () => {
    try {
      let q = supabase.from('calendario').select('*').eq('barberia_id', negocio.id)
        .gte('inicio', inicioDia(semana[0])).lt('inicio', finDia(semana[6])).order('inicio')
      let q2 = supabase.from('calendario').select('id, dia').eq('barberia_id', negocio.id)
        .eq('sin_marcar', true).gte('inicio', inicioDia(sumarDias(hoy, -60))).order('inicio')
      if (filtro !== 'todos') { q = q.eq('barbero_id', filtro); q2 = q2.eq('barbero_id', filtro) }
      const [{ data, error: e1 }, { data: pend, error: e2 }] = await Promise.all([q, q2])
      if (e1 || e2) throw e1 || e2
      setCitas(data); setSinMarcar(pend); setError('')
    } catch (e) { setError(traducirError(e)) }
  }, [negocio.id, semana, filtro, hoy])

  useEffect(() => { cargar() }, [cargar])

  // Tiempo real: cuando alguien reserva, cancela o cambia, se actualiza solo.
  useEffect(() => {
    const canal = supabase.channel(`citas-${negocio.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citas', filter: `barberia_id=eq.${negocio.id}` }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [negocio.id, cargar])

  const delDia = (citas || []).filter(c => c.dia === fecha)
  const visibles = delDia.filter(c => !(c.estado === 'cancelada' && c.cancelada_por === 'reprogramada'))
  const noCanceladas = visibles.filter(c => c.estado !== 'cancelada')
  const atendidas = visibles.filter(c => c.estado === 'atendida')
  const porDia = f => (citas || []).filter(c => c.dia === f && c.estado !== 'cancelada').length

  async function marcar(cita, estado) {
    try {
      await rpc('marcar_cita', { p_cita: cita.id, p_estado: estado })
      await cargar()
      if (estado === 'atendida') setHoja({ tipo: 'proxima', cita })
    } catch (e) { alert(e.message) }
  }

  async function cancelar(cita) {
    if (!confirm(t(
      `¿Cancelar la cita de ${cita.cliente} a las ${hora(cita.inicio)}? El horario queda libre.`,
      `Cancel ${cita.cliente}'s appointment at ${hora(cita.inicio)}? The slot will open up again.`,
    ))) return
    try { await rpc('cancelar_cita', { p_cita: cita.id }); cargar() } catch (e) { alert(e.message) }
  }

  const irA = f => setFecha(f)
  const nCitas = n => `${n} ${n === 1 ? t('cita', 'appt') : t('citas', 'appts')}`

  return (
    <section>
      {sinMarcar.length > 0 && (
        <div className="aviso fila" style={{ justifyContent: 'space-between' }}>
          <span>{sinMarcar.length === 1
            ? t('Tienes 1 cita pasada sin marcar. Indica si vino o no.', 'You have 1 past appointment not yet marked. Record whether the client came.')
            : t(`Tienes ${sinMarcar.length} citas pasadas sin marcar. Indica si vinieron o no.`, `You have ${sinMarcar.length} past appointments not yet marked. Record whether the clients came.`)}</span>
          <button className="boton mini" onClick={() => irA(sinMarcar[0].dia)}>{t('Revisar', 'Review')}</button>
        </div>
      )}

      <div className="fila" style={{ justifyContent: 'space-between', margin: '6px 0 10px' }}>
        <div className="fila">
          <button className="boton mini" onClick={() => irA(sumarDias(fecha, -7))} aria-label={t('Semana anterior', 'Previous week')}>‹</button>
          <button className="boton mini" onClick={() => irA(hoy)} disabled={fecha === hoy}>{t('Hoy', 'Today')}</button>
          <button className="boton mini" onClick={() => irA(sumarDias(fecha, 7))} aria-label={t('Semana siguiente', 'Next week')}>›</button>
        </div>
        <input type="date" value={fecha} onChange={e => e.target.value && irA(e.target.value)} style={{ width: 'auto', padding: '6px 10px' }} aria-label={t('Ir a una fecha', 'Go to date')} />
      </div>

      <div className="fichas" role="group" aria-label={t('Día', 'Day')}>
        {semana.map(f => {
          const p = partes(f), n = porDia(f)
          return (
            <button key={f} className="ficha" aria-pressed={f === fecha} onClick={() => irA(f)} style={{ flex: '1 0 62px' }}>
              <small>{etiquetaDia(f, hoy)}</small><b>{p.dia}</b><small>{citas ? nCitas(n) : '…'}</small>
            </button>
          )
        })}
      </div>

      {activos.length > 1 && (
        <div className="fichas" role="group" aria-label={t('Barbero', 'Barber')} style={{ marginTop: 10 }}>
          {[{ id: 'todos', nombre: t('Todos', 'Everyone') }, ...activos].map(b => (
            <button key={b.id} className="ficha" aria-pressed={filtro === b.id} onClick={() => setFiltro(b.id)}>
              {b.id === yo.id ? `${b.nombre} (${t('yo', 'me')})` : b.nombre}
            </button>
          ))}
        </div>
      )}

      <div className="fila" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>{fechaLarga(fecha)}</h2>
        <button className="boton mini lleno" onClick={() => setHoja({ tipo: 'nueva' })}>{t('+ Agregar cita', '+ Add appointment')}</button>
      </div>

      <div className="cifras">
        <div className="cifra"><b>{noCanceladas.length}</b><small>{t('citas', 'appointments')}</small></div>
        <div className="cifra"><b>{atendidas.length}</b><small>{t('atendidas', 'completed')}</small></div>
        <div className="cifra"><b>{pesos(atendidas.reduce((total, c) => total + c.precio, 0))}</b><small>{t('cobrado', 'earned')}</small></div>
      </div>

      {error && <p className="error">{error}</p>}
      {citas === null ? <p className="cargando">{t('Cargando…', 'Loading…')}</p>
        : visibles.length === 0 ? <p className="vacio">{t(
          'No hay citas este día. Cuando alguien reserve, aparecerá aquí al instante.',
          'No appointments on this day. New bookings will show up here instantly.',
        )}</p>
        : visibles.map(c => (
          <TarjetaCita key={c.id} cita={c} negocio={negocio} verBarbero={filtro === 'todos' && activos.length > 1}
            onMarcar={marcar} onCancelar={cancelar}
            onReprogramar={() => setHoja({ tipo: 'reprogramar', cita: c })}
            onProxima={() => setHoja({ tipo: 'proxima', cita: c })} />
        ))}

      {hoja?.tipo === 'reprogramar' && (
        <HojaReprogramar cita={hoja.cita} negocio={negocio} barberos={barberosPublicos}
          onCerrar={() => setHoja(null)} onHecho={() => { setHoja(null); cargar() }} />
      )}
      {hoja?.tipo === 'proxima' && (
        <HojaProxima cita={hoja.cita} negocio={negocio} barberos={barberosPublicos}
          onCerrar={() => setHoja(null)} onHecho={() => cargar()} />
      )}
      {hoja?.tipo === 'nueva' && (
        <HojaNueva negocio={negocio} servicios={servicios.filter(s => s.activo)} barberos={barberosPublicos}
          barberoInicial={filtro === 'todos' ? null : filtro} fechaInicial={fecha < hoy ? hoy : fecha}
          onCerrar={() => setHoja(null)} onHecho={() => cargar()} />
      )}
    </section>
  )
}

/* ---------------- Tarjeta ---------------- */

function TarjetaCita({ cita: c, negocio, verBarbero, onMarcar, onCancelar, onReprogramar, onProxima }) {
  const [h, ampm] = hora(c.inicio).split(' ')
  const yaEmpezo = new Date(c.inicio) <= new Date()
  const recordatorio = t(
    `Hola ${primerNombre(c.cliente)}, te recordamos tu cita en ${negocio.nombre} el ${fechaLarga(c.dia)} a las ${hora(c.inicio)} (${c.servicio} con ${c.barbero}). ¡Te esperamos!`,
    `Hi ${primerNombre(c.cliente)}, a reminder of your appointment at ${negocio.nombre} on ${fechaLarga(c.dia)} at ${hora(c.inicio)} (${c.servicio} with ${c.barbero}). See you soon!`,
  )

  return (
    <div className={`cita ${c.estado} ${c.sin_marcar ? 'sin-marcar' : ''}`}>
      <time>{h}<small>{ampm}</small></time>
      <div>
        <div className="quien">
          {c.cliente}
          {c.estado === 'atendida' && <span className="etiqueta ok">{t('Atendido', 'Completed')}</span>}
          {c.estado === 'no_asistio' && <span className="etiqueta x">{t('No asistió', 'No-show')}</span>}
          {c.estado === 'cancelada' && <span className="etiqueta x">{c.cancelada_por === 'cliente' ? t('Cancelada por el cliente', 'Cancelled by client') : t('Cancelada', 'Cancelled')}</span>}
          {c.sin_marcar && <span className="etiqueta alerta">{t('Sin marcar', 'Not marked')}</span>}
          {c.reprogramada_desde && c.estado === 'pendiente' && <span className="etiqueta ok">{t('Reprogramada', 'Rescheduled')}</span>}
        </div>
        <div className="que">{c.servicio} · {c.duracion_min} min{verBarbero ? ` · ${c.barbero}` : ''} · {pesos(c.precio)}</div>

        {c.estado === 'pendiente' && (
          <div className="acciones">
            {yaEmpezo ? (
              <>
                <button className="boton mini lleno" onClick={() => onMarcar(c, 'atendida')}>{t('Atendido', 'Completed')}</button>
                <button className="boton mini" onClick={() => onMarcar(c, 'no_asistio')}>{t('No vino', 'No-show')}</button>
              </>
            ) : (
              <>
                <a className="boton mini wa" href={enlaceWhatsApp(c.telefono, recordatorio)} target="_blank" rel="noopener">{t('Recordar', 'Remind')}</a>
                <button className="boton mini" onClick={onReprogramar}>{t('Cambiar hora', 'Reschedule')}</button>
                <button className="boton mini" onClick={() => onMarcar(c, 'atendida')}>{t('Atendido', 'Completed')}</button>
              </>
            )}
            <button className="boton mini peligro" onClick={() => onCancelar(c)}>{t('Cancelar', 'Cancel')}</button>
          </div>
        )}
        {c.estado === 'atendida' && (
          <div className="acciones">
            <button className="boton mini" onClick={onProxima}>{t('Agendar la próxima', 'Book next visit')}</button>
            <button className="enlace" onClick={() => onMarcar(c, 'pendiente')}>{t('Deshacer', 'Undo')}</button>
          </div>
        )}
        {c.estado === 'no_asistio' && (
          <div className="acciones">
            <a className="boton mini" href={enlaceWhatsApp(c.telefono, t(
              `Hola ${primerNombre(c.cliente)}, te esperábamos hoy en ${negocio.nombre}. ¿Quieres reagendar tu cita?`,
              `Hi ${primerNombre(c.cliente)}, we missed you today at ${negocio.nombre}. Would you like to reschedule?`,
            ))} target="_blank" rel="noopener">{t('Escribirle', 'Message')}</a>
            <button className="enlace" onClick={() => onMarcar(c, 'pendiente')}>{t('Deshacer', 'Undo')}</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------- Hojas ---------------- */

function HojaReprogramar({ cita, negocio, barberos, onCerrar, onHecho }) {
  const [turno, setTurno] = useState(null)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [hecho, setHecho] = useState(null)

  async function confirmar() {
    setEnviando(true); setError('')
    try {
      const r = await rpc('reprogramar_cita', { p_nuevo_inicio: turno.inicio, p_cita: cita.id, p_barbero: turno.barbero_id })
      setHecho(r.inicio)
    } catch (e) { setError(e.message) } finally { setEnviando(false) }
  }

  if (hecho) {
    const cuando = `${fechaLarga(fechaCO(hecho))}, ${hora(hecho)}`
    const msg = t(
      `Hola ${primerNombre(cita.cliente)}, tu cita en ${negocio.nombre} quedó para el ${fechaLarga(fechaCO(hecho))} a las ${hora(hecho)}. ¡Te esperamos!`,
      `Hi ${primerNombre(cita.cliente)}, your appointment at ${negocio.nombre} is now on ${fechaLarga(fechaCO(hecho))} at ${hora(hecho)}. See you then!`,
    )
    return (
      <Hoja titulo={t('Hora cambiada', 'Rescheduled')} onCerrar={onHecho}>
        <p>{t('La cita de ', 'The appointment for ')}<b>{cita.cliente}</b>{t(' quedó para el ', ' is now on ')}<b>{cuando}</b>.</p>
        <a className="boton wa bloque" href={enlaceWhatsApp(cita.telefono, msg)} target="_blank" rel="noopener">{t('Avisarle por WhatsApp', 'Let them know on WhatsApp')}</a>
        <button className="boton bloque" onClick={onHecho}>{t('Listo', 'Done')}</button>
      </Hoja>
    )
  }

  return (
    <Hoja titulo={t('Cambiar hora', 'Reschedule')} onCerrar={onCerrar}>
      <p className="muted small">{cita.cliente} · {cita.servicio}. {t('Ahora:', 'Currently:')} {fechaLarga(cita.dia)}, {hora(cita.inicio)}.</p>
      <SelectorHorario slug={negocio.slug} servicioId={cita.servicio_id ?? null} barberos={barberos}
        barberoInicial={cita.barbero_id} fechaInicial={cita.dia < fechaCO() ? fechaCO() : cita.dia}
        ignorarCita={cita.id} valor={turno} onCambio={setTurno} pasoInicial={1} />
      <div className="error" role="alert">{error}</div>
      <button className="cta" disabled={!turno || enviando} onClick={confirmar}>
        {enviando ? t('Guardando…', 'Saving…') : turno ? t(`Mover a las ${hora(turno.inicio)}`, `Move to ${hora(turno.inicio)}`) : t('Elige la nueva hora', 'Choose the new time')}
      </button>
    </Hoja>
  )
}

function HojaProxima({ cita, negocio, barberos, onCerrar, onHecho }) {
  const [sugerida, setSugerida] = useState(null)
  const [turno, setTurno] = useState(null)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [hecho, setHecho] = useState(null)

  useEffect(() => {
    rpc('sugerir_proxima', { p_cita: cita.id }).then(f => setSugerida(f || sumarDias(fechaCO(), 15)))
      .catch(() => setSugerida(sumarDias(fechaCO(), 15)))
  }, [cita.id])

  async function confirmar() {
    setEnviando(true); setError('')
    try {
      const r = await rpc('agendar_proxima', { p_cita_anterior: cita.id, p_inicio: turno.inicio, p_barbero: turno.barbero_id })
      setHecho(r.inicio); onHecho()
    } catch (e) { setError(e.message) } finally { setEnviando(false) }
  }

  if (hecho) {
    const msg = t(
      `Hola ${primerNombre(cita.cliente)}, te dejamos agendada tu próxima cita en ${negocio.nombre}: ${cita.servicio} el ${fechaLarga(fechaCO(hecho))} a las ${hora(hecho)}. Si no puedes, avísanos.`,
      `Hi ${primerNombre(cita.cliente)}, your next appointment at ${negocio.nombre} is booked: ${cita.servicio} on ${fechaLarga(fechaCO(hecho))} at ${hora(hecho)}. Let us know if you can't make it.`,
    )
    return (
      <Hoja titulo={t('Próxima cita agendada', 'Next visit booked')} onCerrar={onCerrar}>
        <p><b>{cita.cliente}</b>{t(' vuelve el ', ' comes back on ')}<b>{fechaLarga(fechaCO(hecho))}</b>{t(' a las ', ' at ')}<b>{hora(hecho)}</b>.</p>
        <a className="boton wa bloque" href={enlaceWhatsApp(cita.telefono, msg)} target="_blank" rel="noopener">{t('Enviarle la confirmación', 'Send confirmation')}</a>
        <button className="boton bloque" onClick={onCerrar}>{t('Listo', 'Done')}</button>
      </Hoja>
    )
  }

  return (
    <Hoja titulo={t('¿Agendar la próxima?', 'Book the next visit?')} onCerrar={onCerrar}>
      <p className="muted small">{cita.cliente} · {cita.servicio}. {t(
        'Te sugerimos la fecha según el servicio; puedes cambiarla.',
        'We suggest a date based on the service; you can change it.',
      )}</p>
      {!sugerida ? <p className="cargando">{t('Calculando fecha…', 'Finding a date…')}</p> : (
        <SelectorHorario slug={negocio.slug} servicioId={cita.servicio_id} barberos={barberos}
          barberoInicial={cita.barbero_id} fechaInicial={sugerida} dias={21}
          valor={turno} onCambio={setTurno} pasoInicial={1} />
      )}
      <div className="error" role="alert">{error}</div>
      <button className="cta" disabled={!turno || enviando} onClick={confirmar}>
        {enviando ? t('Agendando…', 'Booking…')
          : turno ? t(`Agendar ${fechaLarga(fechaCO(turno.inicio))}, ${hora(turno.inicio)}`, `Book ${fechaLarga(fechaCO(turno.inicio))}, ${hora(turno.inicio)}`)
          : t('Elige día y hora', 'Choose day and time')}
      </button>
      <button className="boton bloque" onClick={onCerrar}>{t('Ahora no', 'Not now')}</button>
    </Hoja>
  )
}

function HojaNueva({ negocio, servicios, barberos, barberoInicial, fechaInicial, onCerrar, onHecho }) {
  const [servicio, setServicio] = useState(null)
  const [turno, setTurno] = useState(null)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [acepta, setAcepta] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function guardar() {
    const tel = limpiarTelefono(telefono)
    if (nombre.trim().length < 2) return setError(t('Escribe el nombre del cliente.', 'Enter the client’s name.'))
    if (!/^3\d{9}$/.test(tel)) return setError(t('Escribe un celular de 10 dígitos que empiece por 3.', 'Enter a 10-digit mobile number starting with 3.'))
    if (!acepta) return setError(t('Confirma que el cliente autorizó el uso de sus datos.', 'Confirm that the client agreed to the data policy.'))
    setEnviando(true); setError('')
    try {
      await rpc('reservar_cita', {
        p_slug: negocio.slug, p_servicio: servicio, p_barbero: turno.barbero_id, p_inicio: turno.inicio,
        p_nombre: nombre.trim(), p_telefono: tel, p_acepta_datos: true,
      })
      onHecho(); onCerrar()
    } catch (e) { setError(e.message) } finally { setEnviando(false) }
  }

  return (
    <Hoja titulo={t('Agregar cita', 'Add appointment')} onCerrar={onCerrar}>
      <p className="muted small">{t('Para clientes que llaman o escriben por WhatsApp.', 'For clients who call or message on WhatsApp.')}</p>
      <h2><span className="n">1</span>{t('Servicio', 'Service')}</h2>
      <div className="opciones">
        {servicios.map(s => (
          <button key={s.id} type="button" className="opcion" aria-pressed={servicio === s.id} onClick={() => { setServicio(s.id); setTurno(null) }}>
            <span>{s.nombre}<small>{s.duracion_min} min</small></span><span className="precio">{pesos(s.precio)}</span>
          </button>
        ))}
      </div>
      <SelectorHorario slug={negocio.slug} servicioId={servicio} barberos={barberos}
        barberoInicial={barberoInicial} fechaInicial={fechaInicial} valor={turno} onCambio={setTurno} />
      <h2>{t('Cliente', 'Client')}</h2>
      <div className="dos">
        <div><label htmlFor="cn">{t('Nombre', 'Name')}</label><input id="cn" value={nombre} onChange={e => setNombre(e.target.value)} /></div>
        <div><label htmlFor="ct">{t('Celular', 'Mobile')}</label><input id="ct" inputMode="tel" value={telefono} onChange={e => setTelefono(e.target.value)} /></div>
      </div>
      <label className="check">
        <input type="checkbox" checked={acepta} onChange={e => setAcepta(e.target.checked)} />
        <span>{t('El cliente autorizó que guardemos su nombre y celular para gestionar sus citas.', 'The client agreed to let us store their name and phone number to manage appointments.')}</span>
      </label>
      <div className="error" role="alert">{error}</div>
      <button className="cta" disabled={!servicio || !turno || enviando} onClick={guardar}>{enviando ? t('Guardando…', 'Saving…') : t('Guardar cita', 'Save appointment')}</button>
    </Hoja>
  )
}

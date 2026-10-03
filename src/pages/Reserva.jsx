import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { rpc } from '../lib/supabase.js'
import { t } from '../lib/idioma.js'
import { fechaCO, fechaLarga, hora, pesos, limpiarTelefono, enlaceWhatsApp } from '../lib/fechas.js'
import { tokensGuardados, guardarToken, reemplazarToken, datosCliente, guardarDatosCliente } from '../lib/cliente.js'
import SelectorHorario from '../components/SelectorHorario.jsx'
import Hoja from '../components/Hoja.jsx'

export default function Reserva() {
  const { slug } = useParams()
  const [negocio, setNegocio] = useState(undefined)
  const [vista, setVista] = useState('reservar')

  useEffect(() => {
    rpc('info_barberia', { p_slug: slug }).then(setNegocio).catch(() => setNegocio(null))
  }, [slug])

  useEffect(() => { if (negocio?.nombre) document.title = `${t('Reservar', 'Book')} · ${negocio.nombre}` })

  if (negocio === undefined) return <div className="wrap"><p className="cargando">{t('Cargando…', 'Loading…')}</p></div>
  if (negocio === null) return (
    <div className="wrap">
      <h1 className="display" style={{ marginTop: 56 }}>{t('Este negocio no existe', 'Business not found')}</h1>
      <p className="muted">{t('Revisa el enlace que te compartieron. Puede que haya cambiado.', 'Check the link you were given. It may have changed.')}</p>
    </div>
  )

  return (
    <div className="wrap">
      <header className="letrero">
        <div className="poste" aria-hidden="true" />
        <div>
          <h1 className="display">{negocio.nombre}</h1>
          <p className="sub">{negocio.direccion || t('Reserva tu turno sin llamar ni hacer fila', 'Book your spot without calling or waiting in line')}</p>
        </div>
      </header>

      <div className="pestanas" role="tablist">
        <button role="tab" aria-selected={vista === 'reservar'} onClick={() => setVista('reservar')}>{t('Reservar turno', 'Book')}</button>
        <button role="tab" aria-selected={vista === 'mis'} onClick={() => setVista('mis')}>{t('Mis citas', 'My appointments')}</button>
      </div>

      {vista === 'reservar'
        ? <Reservar negocio={negocio} slug={slug} onVerMisCitas={() => setVista('mis')} />
        : <MisCitas negocio={negocio} slug={slug} onReservar={() => setVista('reservar')} />}

      <p className="pie">
        <Link to={`/${slug}/privacidad`}>{t('Tratamiento de datos', 'Data privacy')}</Link>
      </p>
    </div>
  )
}

/* ---------------- Reservar ---------------- */

function Reservar({ negocio, slug, onVerMisCitas }) {
  const guardado = datosCliente()
  const [servicio, setServicio] = useState(null)
  const [turno, setTurno] = useState(null)
  const [nombre, setNombre] = useState(guardado.nombre)
  const [telefono, setTelefono] = useState(guardado.telefono)
  const [acepta, setAcepta] = useState(Boolean(guardado.nombre))
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [hecha, setHecha] = useState(null)
  const [clave, setClave] = useState(0) // fuerza recargar horarios tras un choque

  const srv = negocio.servicios.find(s => s.id === servicio)

  async function reservar(e) {
    e.preventDefault()
    const tel = limpiarTelefono(telefono)
    if (nombre.trim().length < 2) return setError(t('Escribe tu nombre para que el barbero sepa a quién atiende.', 'Enter your name so the barber knows who is coming.'))
    if (!/^3\d{9}$/.test(tel)) return setError(t('Escribe un celular colombiano de 10 dígitos que empiece por 3.', 'Enter a 10-digit Colombian mobile number starting with 3.'))
    if (!acepta) return setError(t('Debes autorizar el tratamiento de tus datos para reservar.', 'You must accept the data policy to book.'))
    setError(''); setEnviando(true)
    try {
      const r = await rpc('reservar_cita', {
        p_slug: slug, p_servicio: servicio, p_barbero: turno.barbero_id, p_inicio: turno.inicio,
        p_nombre: nombre.trim(), p_telefono: tel, p_acepta_datos: true,
      })
      guardarToken(r.token)
      guardarDatosCliente(nombre.trim(), tel)
      const barbero = negocio.barberos.find(b => b.id === r.barbero_id)
      setHecha({ ...r, servicio: srv, barbero: barbero?.nombre, nombre: nombre.trim() })
      window.scrollTo(0, 0)
    } catch (err) {
      setError(err.message)
      if (err.codigo === 'HORARIO_OCUPADO') {
        setTurno(null); setClave(k => k + 1)
      }
    } finally { setEnviando(false) }
  }

  function otra() { setHecha(null); setServicio(null); setTurno(null) }

  if (hecha) {
    const fecha = fechaCO(hecha.inicio)
    const msg = t(
      `Hola, reservé un turno en ${negocio.nombre}: ${hecha.servicio.nombre} con ${hecha.barbero} el ${fechaLarga(fecha)} a las ${hora(hecha.inicio)}. A nombre de ${hecha.nombre}.`,
      `Hi, I booked an appointment at ${negocio.nombre}: ${hecha.servicio.nombre} with ${hecha.barbero} on ${fechaLarga(fecha)} at ${hora(hecha.inicio)}. Name: ${hecha.nombre}.`,
    )
    const plazo = negocio.minutos_para_cancelar >= 60
      ? `${negocio.minutos_para_cancelar / 60} h`
      : `${negocio.minutos_para_cancelar} min`
    return (
      <section>
        <h2>{t('Turno reservado', 'You are booked')}</h2>
        <div className="ticket">
          <small className="muted">{fechaLarga(fecha)}</small>
          <div className="cuando">{hora(hecha.inicio)}</div>
          <dl className="datos">
            <dt>{t('Servicio', 'Service')}</dt><dd>{hecha.servicio.nombre}</dd>
            <dt>{t('Barbero', 'Barber')}</dt><dd>{hecha.barbero}</dd>
            <dt>{t('A nombre de', 'Name')}</dt><dd>{hecha.nombre}</dd>
            <dt>{t('Valor', 'Price')}</dt><dd>{pesos(hecha.servicio.precio)}</dd>
          </dl>
        </div>
        {negocio.whatsapp && (
          <a className="boton wa bloque" href={enlaceWhatsApp(negocio.whatsapp, msg)} target="_blank" rel="noopener">
            {t('Avisar a la barbería por WhatsApp', 'Let the shop know on WhatsApp')}
          </a>
        )}
        <p className="small muted" style={{ marginTop: 14 }}>
          {negocio.minutos_para_cancelar === 0
            ? t('Puedes cancelar o cambiar la hora desde Mis citas en este mismo celular.', 'You can cancel or reschedule from My appointments on this same phone.')
            : t(`Puedes cancelar o cambiar la hora desde Mis citas en este mismo celular, hasta ${plazo} antes.`,
                `You can cancel or reschedule from My appointments on this same phone, up to ${plazo} before.`)}
        </p>
        <button className="boton bloque" onClick={onVerMisCitas}>{t('Ver mis citas', 'View my appointments')}</button>
        <button className="boton bloque" onClick={otra}>{t('Reservar otro turno', 'Book another appointment')}</button>
      </section>
    )
  }

  if (negocio.servicios.length === 0) return <p className="vacio">{t('Este negocio todavía no ha publicado sus servicios.', 'This business has not published its services yet.')}</p>

  return (
    <form onSubmit={reservar} noValidate>
      <h2><span className="n">1</span>{t('¿Qué te vas a hacer?', 'What would you like?')}</h2>
      <div className="opciones">
        {negocio.servicios.map(s => (
          <button key={s.id} type="button" className="opcion" aria-pressed={servicio === s.id}
            onClick={() => { setServicio(s.id); setTurno(null) }}>
            <span>{s.nombre}<small>{s.duracion_min} min</small></span>
            <span className="precio">{pesos(s.precio)}</span>
          </button>
        ))}
      </div>

      <SelectorHorario key={clave} slug={slug} servicioId={servicio} barberos={negocio.barberos}
        valor={turno} onCambio={setTurno} />

      <h2><span className="n">{negocio.barberos.length > 1 ? 5 : 4}</span>{t('Tus datos', 'Your details')}</h2>
      <label htmlFor="nombre">{t('Nombre', 'Name')}</label>
      <input id="nombre" autoComplete="name" value={nombre} onChange={e => setNombre(e.target.value)} placeholder={t('Ej: Carlos Pérez', 'e.g. Carlos Pérez')} />
      <label htmlFor="telefono">WhatsApp</label>
      <input id="telefono" inputMode="tel" autoComplete="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder={t('Ej: 300 123 4567', 'e.g. 300 123 4567')} />
      <label className="check">
        <input type="checkbox" checked={acepta} onChange={e => setAcepta(e.target.checked)} />
        <span>{t(`Autorizo a ${negocio.nombre} a usar mi nombre y celular para gestionar mis citas, según la `,
          `I allow ${negocio.nombre} to use my name and phone number to manage my appointments, as described in the `)}
          <Link to={`/${slug}/privacidad`} target="_blank">{t('política de tratamiento de datos', 'data privacy policy')}</Link>.</span>
      </label>
      <div className="error" role="alert">{error}</div>

      <button className="cta" disabled={!servicio || !turno || enviando}>
        {enviando ? t('Reservando…', 'Booking…') : t('Reservar turno', 'Book appointment')}
      </button>
    </form>
  )
}

/* ---------------- Mis citas (perfil del cliente) ---------------- */

function MisCitas({ negocio, slug, onReservar }) {
  const [citas, setCitas] = useState(undefined)
  const [error, setError] = useState('')
  const [reprogramando, setReprogramando] = useState(null)

  const cargar = useCallback(async () => {
    const tokens = tokensGuardados()
    if (tokens.length === 0) return setCitas([])
    try {
      const todas = await rpc('mis_citas', { p_tokens: tokens })
      setCitas(todas.filter(c => c.slug === slug))
    } catch (e) { setError(e.message); setCitas([]) }
  }, [slug])

  useEffect(() => { cargar() }, [cargar])

  async function cancelar(c) {
    const cuando = `${fechaLarga(fechaCO(c.inicio))}, ${hora(c.inicio)}`
    if (!confirm(t(`¿Cancelar tu cita de ${c.servicio} el ${cuando}?`, `Cancel your ${c.servicio} appointment on ${cuando}?`))) return
    try { await rpc('cancelar_cita', { p_token: c.token }); cargar() } catch (e) { alert(e.message) }
  }

  const ahora = Date.now()
  const proximas = (citas || []).filter(c => c.estado === 'pendiente' && new Date(c.inicio) > ahora).reverse()
  const historial = (citas || []).filter(c => !proximas.includes(c))
  const datos = datosCliente()

  if (citas === undefined) return <p className="cargando">{t('Cargando tus citas…', 'Loading your appointments…')}</p>

  return (
    <section>
      {datos.nombre && <p className="muted small">{t('Citas guardadas en este celular a nombre de ', 'Appointments saved on this phone under ')}<b>{datos.nombre}</b>.</p>}
      {error && <p className="error">{error}</p>}

      <h2>{t('Próximas', 'Upcoming')}</h2>
      {proximas.length === 0
        ? <div><p className="vacio">{t('No tienes citas pendientes aquí.', 'You have no upcoming appointments here.')}</p><button className="boton lleno" onClick={onReservar}>{t('Reservar un turno', 'Book an appointment')}</button></div>
        : proximas.map(c => {
          const [h, ampm] = hora(c.inicio).split(' ')
          return (
            <div className="cita" key={c.token}>
              <time>{h}<small>{ampm}</small></time>
              <div>
                <div className="quien">{fechaLarga(fechaCO(c.inicio))}</div>
                <div className="que">{c.servicio} · {c.barbero} · {pesos(c.precio)}</div>
                {c.puede_cambiar ? (
                  <div className="acciones">
                    <button className="boton mini" onClick={() => setReprogramando(c)}>{t('Cambiar hora', 'Reschedule')}</button>
                    <button className="boton mini peligro" onClick={() => cancelar(c)}>{t('Cancelar', 'Cancel')}</button>
                  </div>
                ) : (
                  <p className="small muted" style={{ margin: '6px 0 0' }}>
                    {t('Ya no se puede cambiar desde aquí.', 'It can no longer be changed here.')}{' '}
                    {negocio.whatsapp && <a href={enlaceWhatsApp(negocio.whatsapp, t(
                      `Hola, tengo una cita hoy a las ${hora(c.inicio)} y necesito hacer un cambio.`,
                      `Hi, I have an appointment today at ${hora(c.inicio)} and need to make a change.`,
                    ))} target="_blank" rel="noopener">{t('Escribir al negocio', 'Message the business')}</a>}
                  </p>
                )}
              </div>
            </div>
          )
        })}

      {historial.length > 0 && (
        <>
          <h2>{t('Historial', 'History')}</h2>
          {historial.map(c => {
            const [h, ampm] = hora(c.inicio).split(' ')
            return (
              <div className={`cita ${c.estado}`} key={c.token}>
                <time>{h}<small>{ampm}</small></time>
                <div>
                  <div className="quien">{fechaLarga(fechaCO(c.inicio))}<Estado estado={c.estado} /></div>
                  <div className="que">{c.servicio} · {c.barbero}</div>
                </div>
              </div>
            )
          })}
        </>
      )}

      {reprogramando && (
        <Reprogramar cita={reprogramando} negocio={negocio} slug={slug}
          onCerrar={() => setReprogramando(null)}
          onHecho={() => { setReprogramando(null); cargar() }} />
      )}
    </section>
  )
}

function Estado({ estado }) {
  if (estado === 'atendida') return <span className="etiqueta ok">{t('Atendida', 'Completed')}</span>
  if (estado === 'cancelada') return <span className="etiqueta x">{t('Cancelada', 'Cancelled')}</span>
  if (estado === 'no_asistio') return <span className="etiqueta x">{t('No asistió', 'No-show')}</span>
  return null
}

function Reprogramar({ cita, negocio, slug, onCerrar, onHecho }) {
  const [turno, setTurno] = useState(null)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const barberoActual = negocio.barberos.find(b => b.nombre === cita.barbero)?.id ?? null

  async function confirmar() {
    setEnviando(true); setError('')
    try {
      const r = await rpc('reprogramar_cita', {
        p_nuevo_inicio: turno.inicio, p_token: cita.token, p_barbero: turno.barbero_id,
      })
      reemplazarToken(cita.token, r.token)
      onHecho()
    } catch (e) { setError(e.message) } finally { setEnviando(false) }
  }

  return (
    <Hoja titulo={t('Cambiar hora', 'Reschedule')} onCerrar={onCerrar}>
      <p className="muted small">{cita.servicio}. {t('Tu cita actual sigue en pie hasta que confirmes la nueva hora.', 'Your current appointment stays in place until you confirm the new time.')}</p>
      <SelectorHorario slug={slug} servicioId={cita.servicio_id} barberos={negocio.barberos}
        barberoInicial={barberoActual} fechaInicial={fechaCO(cita.inicio)} ignorarCita={cita.cita_id}
        valor={turno} onCambio={setTurno} pasoInicial={1} />
      <div className="error" role="alert">{error}</div>
      <button className="cta" disabled={!turno || enviando} onClick={confirmar}>
        {enviando ? t('Guardando…', 'Saving…')
          : turno ? t(`Mover a las ${hora(turno.inicio)} del ${fechaLarga(fechaCO(turno.inicio))}`, `Move to ${hora(turno.inicio)}, ${fechaLarga(fechaCO(turno.inicio))}`)
          : t('Elige la nueva hora', 'Choose the new time')}
      </button>
    </Hoja>
  )
}

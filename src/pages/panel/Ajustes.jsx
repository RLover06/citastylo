import { useCallback, useEffect, useState } from 'react'
import { supabase, traducirError } from '../../lib/supabase.js'
import { t } from '../../lib/idioma.js'
import { diaLargo, fechaCO, fechaLarga, pesos } from '../../lib/fechas.js'

async function ejecutar(promesa) {
  const { data, error } = await promesa
  if (error) throw new Error(traducirError(error))
  return data
}

export default function Ajustes({ yo, negocio, barberos, servicios, onCambio }) {
  const [barberoId, setBarberoId] = useState(yo.id)
  const barbero = barberos.find(b => b.id === barberoId) || yo

  return (
    <section>
      {yo.es_dueno && barberos.length > 1 && (
        <div className="fichas" role="group" aria-label={t('Barbero', 'Barber')} style={{ marginBottom: 6 }}>
          {barberos.map(b => (
            <button key={b.id} className="ficha" aria-pressed={b.id === barberoId} onClick={() => setBarberoId(b.id)}>
              {b.id === yo.id ? `${b.nombre} (${t('yo', 'me')})` : b.nombre}
            </button>
          ))}
        </div>
      )}
      <Horario barbero={barbero} key={`h-${barbero.id}`} />
      <DiasLibres barbero={barbero} key={`d-${barbero.id}`} />

      {yo.es_dueno && (
        <>
          <Negocio negocio={negocio} onCambio={onCambio} />
          <Servicios negocio={negocio} servicios={servicios} onCambio={onCambio} />
          <Barberos negocio={negocio} barberos={barberos} servicios={servicios} yo={yo} onCambio={onCambio} />
        </>
      )}
    </section>
  )
}

/* ---------------- Horario semanal ---------------- */

const ORDEN = [1, 2, 3, 4, 5, 6, 0]

function Horario({ barbero }) {
  const [dias, setDias] = useState(null)
  const [estado, setEstado] = useState('')

  useEffect(() => {
    ejecutar(supabase.from('horarios').select('*').eq('barbero_id', barbero.id).order('hora_inicio')).then(filas => {
      const mapa = {}
      for (const d of ORDEN) {
        const bloques = filas.filter(f => f.dia_semana === d)
        mapa[d] = bloques.length
          ? { abierto: true, bloques: bloques.map(b => ({ inicio: b.hora_inicio.slice(0, 5), fin: b.hora_fin.slice(0, 5) })) }
          : { abierto: false, bloques: [{ inicio: '09:00', fin: '19:00' }] }
      }
      setDias(mapa)
    }).catch(e => setEstado(e.message))
  }, [barbero.id])

  const cambiar = (d, cambio) => { setDias(x => ({ ...x, [d]: { ...x[d], ...cambio } })); setEstado('') }
  const cambiarBloque = (d, i, campo, valor) => cambiar(d, { bloques: dias[d].bloques.map((b, j) => j === i ? { ...b, [campo]: valor } : b) })

  async function guardar() {
    for (const d of ORDEN) {
      if (!dias[d].abierto) continue
      for (const b of dias[d].bloques) if (b.fin <= b.inicio) {
        return setEstado(t(`${diaLargo(d)}: la hora de cierre debe ser después de la de apertura.`, `${diaLargo(d)}: closing time must be after opening time.`))
      }
    }
    setEstado(t('Guardando…', 'Saving…'))
    try {
      await ejecutar(supabase.from('horarios').delete().eq('barbero_id', barbero.id))
      const filas = ORDEN.flatMap(d => dias[d].abierto
        ? dias[d].bloques.map(b => ({ barbero_id: barbero.id, dia_semana: d, hora_inicio: b.inicio, hora_fin: b.fin })) : [])
      if (filas.length) await ejecutar(supabase.from('horarios').insert(filas))
      setEstado(t('Horario guardado.', 'Hours saved.'))
    } catch (e) { setEstado(e.message) }
  }

  return (
    <div className="caja">
      <h3 style={{ marginTop: 0 }}>{t(`Horario de ${barbero.nombre}`, `${barbero.nombre}’s hours`)}</h3>
      <p className="small muted" style={{ marginTop: 0 }}>{t(
        'Los clientes solo ven turnos dentro de este horario. Agrega un segundo bloque para marcar el almuerzo.',
        'Clients only see time slots within these hours. Add a second block to set a lunch break.',
      )}</p>
      {!dias ? <p className="cargando">{t('Cargando…', 'Loading…')}</p> : (
        <table className="tabla">
          <tbody>
            {ORDEN.map(d => (
              <tr key={d}>
                <td style={{ width: 120 }}>
                  <label className="check" style={{ margin: 0 }}>
                    <input type="checkbox" checked={dias[d].abierto} onChange={e => cambiar(d, { abierto: e.target.checked })} />
                    <span>{diaLargo(d)}</span>
                  </label>
                </td>
                <td>
                  {dias[d].abierto ? dias[d].bloques.map((b, i) => (
                    <div className="fila" key={i} style={{ marginBottom: 4 }}>
                      <input type="time" value={b.inicio} onChange={e => cambiarBloque(d, i, 'inicio', e.target.value)} style={{ width: 'auto' }} aria-label={t('Abre', 'Opens')} />
                      <span className="muted">{t('a', 'to')}</span>
                      <input type="time" value={b.fin} onChange={e => cambiarBloque(d, i, 'fin', e.target.value)} style={{ width: 'auto' }} aria-label={t('Cierra', 'Closes')} />
                      {i > 0
                        ? <button className="enlace" onClick={() => cambiar(d, { bloques: dias[d].bloques.filter((_, j) => j !== i) })}>{t('quitar', 'remove')}</button>
                        : dias[d].bloques.length === 1 && <button className="enlace" onClick={() => cambiar(d, { bloques: [{ inicio: b.inicio, fin: '12:00' }, { inicio: '14:00', fin: b.fin }] })}>{t('+ almuerzo', '+ lunch break')}</button>}
                    </div>
                  )) : <span className="muted small">{t('Cerrado', 'Closed')}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="fila" style={{ marginTop: 12 }}>
        <button className="boton lleno" onClick={guardar} disabled={!dias}>{t('Guardar horario', 'Save hours')}</button>
        <span className="small muted">{estado}</span>
      </div>
    </div>
  )
}

/* ---------------- Días libres ---------------- */

function DiasLibres({ barbero }) {
  const [lista, setLista] = useState(null)
  const [desde, setDesde] = useState(fechaCO())
  const [hasta, setHasta] = useState(fechaCO())
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')

  const cargar = useCallback(() => ejecutar(supabase.from('bloqueos').select('*').eq('barbero_id', barbero.id)
    .gte('fin', new Date().toISOString()).order('inicio')).then(setLista).catch(e => setError(e.message)), [barbero.id])
  useEffect(() => { cargar() }, [cargar])

  async function agregar() {
    if (hasta < desde) return setError(t('La fecha final debe ser igual o posterior a la inicial.', 'The end date must be on or after the start date.'))
    setError('')
    try {
      await ejecutar(supabase.from('bloqueos').insert({
        barbero_id: barbero.id, inicio: `${desde}T00:00:00-05:00`, fin: `${hasta}T23:59:59-05:00`, motivo: motivo.trim() || null,
      }))
      setMotivo(''); cargar()
    } catch (e) { setError(e.message) }
  }

  async function quitar(id) {
    try { await ejecutar(supabase.from('bloqueos').delete().eq('id', id)); cargar() } catch (e) { setError(e.message) }
  }

  return (
    <div className="caja">
      <h3 style={{ marginTop: 0 }}>{t(`Días libres de ${barbero.nombre}`, `${barbero.nombre}’s days off`)}</h3>
      <p className="small muted" style={{ marginTop: 0 }}>{t(
        `Vacaciones, festivos o días de descanso. Esos días nadie puede reservar con ${barbero.nombre}. Las citas ya agendadas no se borran.`,
        `Vacations, holidays or rest days. Nobody can book with ${barbero.nombre} on those days. Existing appointments are kept.`,
      )}</p>
      <div className="dos">
        <div><label htmlFor="bd">{t('Desde', 'From')}</label><input id="bd" type="date" value={desde} onChange={e => setDesde(e.target.value)} /></div>
        <div><label htmlFor="bh">{t('Hasta', 'To')}</label><input id="bh" type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></div>
      </div>
      <label htmlFor="bm">{t('Motivo (opcional)', 'Reason (optional)')}</label>
      <input id="bm" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder={t('Ej: Festivo', 'e.g. Holiday')} />
      <button className="boton" style={{ marginTop: 10 }} onClick={agregar}>{t('Agregar día libre', 'Add day off')}</button>
      <div className="error">{error}</div>
      {lista?.map(b => {
        const d1 = fechaCO(b.inicio), d2 = fechaCO(b.fin)
        return (
          <div key={b.id} className="fila" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--line)', padding: '8px 0' }}>
            <span>{d1 === d2 ? fechaLarga(d1) : `${fechaLarga(d1)} ${t('al', 'to')} ${fechaLarga(d2)}`}{b.motivo ? ` · ${b.motivo}` : ''}</span>
            <button className="enlace" onClick={() => quitar(b.id)}>{t('quitar', 'remove')}</button>
          </div>
        )
      })}
    </div>
  )
}

/* ---------------- Negocio ---------------- */

function Negocio({ negocio, onCambio }) {
  const [f, setF] = useState({
    nombre: negocio.nombre, whatsapp: negocio.whatsapp || '', direccion: negocio.direccion || '',
    minutos_para_cancelar: negocio.minutos_para_cancelar, max_citas_por_cliente: negocio.max_citas_por_cliente,
    intervalo_minutos: negocio.intervalo_minutos,
  })
  const [estado, setEstado] = useState('')
  const campo = k => e => { setF({ ...f, [k]: e.target.value }); setEstado('') }

  async function guardar() {
    const tel = f.whatsapp.replace(/\D/g, '')
    if (f.nombre.trim().length < 2) return setEstado(t('Escribe el nombre del negocio.', 'Enter the business name.'))
    if (tel && !/^3\d{9}$/.test(tel)) return setEstado(t('El WhatsApp debe ser un celular de 10 dígitos que empiece por 3.', 'WhatsApp must be a 10-digit Colombian mobile number starting with 3.'))
    setEstado(t('Guardando…', 'Saving…'))
    try {
      await ejecutar(supabase.from('barberias').update({
        nombre: f.nombre.trim(), whatsapp: tel || null, direccion: f.direccion.trim() || null,
        minutos_para_cancelar: Number(f.minutos_para_cancelar), max_citas_por_cliente: Number(f.max_citas_por_cliente),
        intervalo_minutos: Number(f.intervalo_minutos),
      }).eq('id', negocio.id))
      setEstado(t('Guardado.', 'Saved.')); onCambio()
    } catch (e) { setEstado(e.message) }
  }

  const plazos = [
    [0, t('Cualquier momento', 'Any time')],
    [30, t('30 min antes', '30 min before')],
    [60, t('1 hora antes', '1 hour before')],
    [120, t('2 horas antes', '2 hours before')],
    [240, t('4 horas antes', '4 hours before')],
    [1440, t('1 día antes', '1 day before')],
  ]

  return (
    <div className="caja">
      <h3 style={{ marginTop: 0 }}>{t('Negocio', 'Business')}</h3>
      <div className="dos">
        <div><label htmlFor="nn">{t('Nombre', 'Name')}</label><input id="nn" value={f.nombre} onChange={campo('nombre')} /></div>
        <div><label htmlFor="nw">WhatsApp</label><input id="nw" inputMode="tel" value={f.whatsapp} onChange={campo('whatsapp')} /></div>
      </div>
      <label htmlFor="nd">{t('Dirección', 'Address')}</label>
      <input id="nd" value={f.direccion} onChange={campo('direccion')} placeholder={t('Ej: Calle 30 #5-20, Montería', 'e.g. Calle 30 #5-20, Montería')} />
      <div className="dos">
        <div>
          <label htmlFor="nc">{t('Cancelar o cambiar hasta', 'Cancel or reschedule up to')}</label>
          <select id="nc" value={f.minutos_para_cancelar} onChange={campo('minutos_para_cancelar')}>
            {plazos.map(([v, texto]) => <option key={v} value={v}>{texto}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ni">{t('Turnos cada', 'Time slots every')}</label>
          <select id="ni" value={f.intervalo_minutos} onChange={campo('intervalo_minutos')}>
            {[15, 20, 30, 60].map(v => <option key={v} value={v}>{v} {t('minutos', 'minutes')}</option>)}
          </select>
        </div>
      </div>
      <label htmlFor="nm">{t('Máximo de citas pendientes por cliente', 'Max upcoming appointments per client')}</label>
      <select id="nm" value={f.max_citas_por_cliente} onChange={campo('max_citas_por_cliente')}>
        {[1, 2, 3, 5].map(v => <option key={v} value={v}>{v}</option>)}
      </select>
      <div className="fila" style={{ marginTop: 12 }}>
        <button className="boton lleno" onClick={guardar}>{t('Guardar', 'Save')}</button>
        <span className="small muted">{estado}</span>
      </div>
    </div>
  )
}

/* ---------------- Servicios ---------------- */

function Servicios({ negocio, servicios, onCambio }) {
  const [filas, setFilas] = useState(servicios.map(s => ({ ...s })))
  const [estado, setEstado] = useState('')
  useEffect(() => setFilas(servicios.map(s => ({ ...s }))), [servicios])

  const cambiar = (i, k, v) => { setFilas(filas.map((f, j) => j === i ? { ...f, [k]: v } : f)); setEstado('') }
  const nuevo = () => setFilas([...filas, { id: null, nombre: '', duracion_min: 30, precio: 0, dias_para_volver: 15, activo: true }])

  async function guardar() {
    for (const f of filas) {
      if (f.nombre.trim().length < 2) return setEstado(t('Cada servicio necesita un nombre.', 'Every service needs a name.'))
      if (!(Number(f.duracion_min) >= 5)) return setEstado(t(`${f.nombre}: la duración mínima es 5 minutos.`, `${f.nombre}: minimum duration is 5 minutes.`))
    }
    setEstado(t('Guardando…', 'Saving…'))
    try {
      for (const f of filas) {
        const datos = {
          barberia_id: negocio.id, nombre: f.nombre.trim(), duracion_min: Number(f.duracion_min),
          precio: Math.max(0, Math.round(Number(f.precio) || 0)), dias_para_volver: Number(f.dias_para_volver) || 15, activo: f.activo,
        }
        if (f.id) await ejecutar(supabase.from('servicios').update(datos).eq('id', f.id))
        else await ejecutar(supabase.from('servicios').insert(datos))
      }
      setEstado(t('Servicios guardados.', 'Services saved.')); onCambio()
    } catch (e) { setEstado(e.message) }
  }

  return (
    <div className="caja">
      <h3 style={{ marginTop: 0 }}>{t('Servicios', 'Services')}</h3>
      <p className="small muted" style={{ marginTop: 0 }}>{t(
        '"Vuelve en" es la fecha que se sugiere al agendar la próxima cita. Un servicio desactivado deja de aparecer para reservar, pero su historial se conserva.',
        '"Return in" sets the suggested date when booking the next visit. A deactivated service is hidden from booking, but its history is kept.',
      )}</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="tabla">
          <thead><tr>
            <th>{t('Nombre', 'Name')}</th><th>{t('Minutos', 'Minutes')}</th><th>{t('Precio', 'Price')}</th>
            <th>{t('Vuelve en (días)', 'Return in (days)')}</th><th>{t('Activo', 'Active')}</th>
          </tr></thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={f.id || `n${i}`}>
                <td><input value={f.nombre} onChange={e => cambiar(i, 'nombre', e.target.value)} style={{ minWidth: 140 }} /></td>
                <td><input type="number" min="5" step="5" value={f.duracion_min} onChange={e => cambiar(i, 'duracion_min', e.target.value)} style={{ width: 80 }} /></td>
                <td><input type="number" min="0" step="1000" value={f.precio} onChange={e => cambiar(i, 'precio', e.target.value)} style={{ width: 110 }} title={pesos(f.precio)} /></td>
                <td><input type="number" min="1" max="180" value={f.dias_para_volver} onChange={e => cambiar(i, 'dias_para_volver', e.target.value)} style={{ width: 80 }} /></td>
                <td><input type="checkbox" checked={f.activo} onChange={e => cambiar(i, 'activo', e.target.checked)} aria-label={t('Activo', 'Active')} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="fila" style={{ marginTop: 12 }}>
        <button className="boton" onClick={nuevo}>{t('+ Servicio', '+ Service')}</button>
        <button className="boton lleno" onClick={guardar}>{t('Guardar servicios', 'Save services')}</button>
        <span className="small muted">{estado}</span>
      </div>
    </div>
  )
}

/* ---------------- Barberos ---------------- */

function Barberos({ negocio, barberos, servicios, yo, onCambio }) {
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [error, setError] = useState('')
  const [asignados, setAsignados] = useState({})

  useEffect(() => {
    ejecutar(supabase.from('barbero_servicios').select('*').in('barbero_id', barberos.map(b => b.id))).then(filas => {
      const m = {}
      for (const f of filas) (m[f.barbero_id] ||= []).push(f.servicio_id)
      setAsignados(m)
    }).catch(() => {})
  }, [barberos])

  async function agregar() {
    const email = correo.trim().toLowerCase()
    if (nombre.trim().length < 2) return setError(t('Escribe el nombre del barbero.', 'Enter the barber’s name.'))
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError(t('Escribe un correo válido.', 'Enter a valid email address.'))
    setError('')
    try {
      await ejecutar(supabase.from('barberos').insert({ barberia_id: negocio.id, nombre: nombre.trim(), email }))
      setNombre(''); setCorreo(''); onCambio()
    } catch (e) { setError(e.message) }
  }

  async function activar(b, activo) {
    if (!activo && !confirm(t(
      `¿Desactivar a ${b.nombre}? No podrá recibir reservas nuevas. Sus citas e historial se conservan.`,
      `Deactivate ${b.nombre}? They won't receive new bookings. Their appointments and history are kept.`,
    ))) return
    try { await ejecutar(supabase.from('barberos').update({ activo }).eq('id', b.id)); onCambio() } catch (e) { alert(e.message) }
  }

  // Sin servicios marcados = hace todos
  async function alternarServicio(b, sid) {
    const actuales = asignados[b.id] || []
    let nuevos
    if (actuales.length === 0) nuevos = servicios.map(s => s.id).filter(id => id !== sid)
    else nuevos = actuales.includes(sid) ? actuales.filter(x => x !== sid) : [...actuales, sid]
    if (nuevos.length === servicios.length) nuevos = []
    try {
      await ejecutar(supabase.from('barbero_servicios').delete().eq('barbero_id', b.id))
      if (nuevos.length) await ejecutar(supabase.from('barbero_servicios').insert(nuevos.map(servicio_id => ({ barbero_id: b.id, servicio_id }))))
      setAsignados({ ...asignados, [b.id]: nuevos })
    } catch (e) { alert(e.message) }
  }

  const url = window.location.origin + '/panel'

  return (
    <div className="caja">
      <h3 style={{ marginTop: 0 }}>{t('Barberos', 'Barbers')}</h3>
      {barberos.map(b => {
        const lista = asignados[b.id] || []
        const invitacion = t(
          `Hola ${b.nombre}, ya puedes ver tu agenda de ${negocio.nombre}. Entra en ${url} con tu correo ${b.email}.`,
          `Hi ${b.nombre}, your ${negocio.nombre} schedule is ready. Sign in at ${url} with your email ${b.email}.`,
        )
        return (
          <div key={b.id} style={{ borderTop: '1px solid var(--line)', padding: '10px 0', opacity: b.activo ? 1 : .55 }}>
            <div className="fila" style={{ justifyContent: 'space-between' }}>
              <div>
                <b>{b.nombre}</b>{b.es_dueno && <span className="etiqueta ok">{t('Dueño', 'Owner')}</span>}
                {!b.user_id && <span className="etiqueta alerta">{t('Aún no ha entrado', 'Not signed in yet')}</span>}
                {!b.activo && <span className="etiqueta x">{t('Inactivo', 'Inactive')}</span>}
                <div className="small muted">{b.email}</div>
              </div>
              {b.id !== yo.id && <button className="enlace" onClick={() => activar(b, !b.activo)}>{b.activo ? t('Desactivar', 'Deactivate') : t('Activar', 'Activate')}</button>}
            </div>
            {servicios.length > 1 && (
              <div className="fila" style={{ marginTop: 6 }}>
                <span className="small muted">{t('Hace:', 'Offers:')}</span>
                {servicios.filter(s => s.activo).map(s => {
                  const hace = lista.length === 0 || lista.includes(s.id)
                  return <button key={s.id} className="boton mini" aria-pressed={hace} style={hace ? { borderColor: 'var(--green)', color: 'var(--green)' } : { opacity: .5 }}
                    onClick={() => alternarServicio(b, s.id)}>{s.nombre}</button>
                })}
              </div>
            )}
            {!b.user_id && b.activo && (
              <a className="boton mini" style={{ marginTop: 6 }} target="_blank" rel="noopener"
                href={`https://wa.me/?text=${encodeURIComponent(invitacion)}`}>
                {t('Enviarle la invitación', 'Send invitation')}
              </a>
            )}
          </div>
        )
      })}
      <h3>{t('Agregar barbero', 'Add barber')}</h3>
      <div className="dos">
        <div><label htmlFor="an">{t('Nombre', 'Name')}</label><input id="an" value={nombre} onChange={e => setNombre(e.target.value)} /></div>
        <div><label htmlFor="ac">{t('Correo (con el que entrará)', 'Email (used to sign in)')}</label><input id="ac" type="email" value={correo} onChange={e => setCorreo(e.target.value)} /></div>
      </div>
      <button className="boton" style={{ marginTop: 10 }} onClick={agregar}>{t('Agregar', 'Add')}</button>
      <div className="error">{error}</div>
    </div>
  )
}

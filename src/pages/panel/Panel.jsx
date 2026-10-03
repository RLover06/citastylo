import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, rpc, traducirError } from '../../lib/supabase.js'
import { t } from '../../lib/idioma.js'
import Calendario from './Calendario.jsx'
import Ajustes from './Ajustes.jsx'

export default function Panel() {
  const [sesion, setSesion] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (sesion === undefined) return <div className="wrap"><p className="cargando">{t('Cargando…', 'Loading…')}</p></div>
  if (!sesion) return <Entrar />
  return <Espacio sesion={sesion} />
}

/* ---------------- Entrar ---------------- */

function Entrar() {
  const [correo, setCorreo] = useState('')
  const [estado, setEstado] = useState('')
  const [error, setError] = useState('')
  const volver = `${window.location.origin}/panel`

  async function google() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: volver } })
    if (error) setError(traducirError(error))
  }

  async function enlace(e) {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo.trim())) return setError(t('Escribe un correo válido.', 'Enter a valid email address.'))
    setError(''); setEstado('enviando')
    const { error } = await supabase.auth.signInWithOtp({ email: correo.trim(), options: { emailRedirectTo: volver } })
    if (error) { setError(traducirError(error)); setEstado('') } else setEstado('enviado')
  }

  return (
    <div className="wrap">
      <header className="letrero">
        <div className="poste" aria-hidden="true" />
        <div>
          <h1 className="display">{t('Panel', 'Dashboard')}</h1>
          <p className="sub">{t('Para dueños y barberos', 'For shop owners and barbers')}</p>
        </div>
      </header>

      <button className="boton bloque" onClick={google}>{t('Entrar con Google', 'Sign in with Google')}</button>

      <p className="muted small" style={{ textAlign: 'center', margin: '18px 0 0' }}>{t('o te enviamos un enlace al correo', 'or get a sign-in link by email')}</p>
      {estado === 'enviado' ? (
        <div className="aviso">{t('Revisa tu correo ', 'Check your inbox at ')}<b>{correo}</b>{t(
          ' y abre el enlace para entrar. Puede tardar un minuto; mira también en spam.',
          ' and open the link to sign in. It may take a minute; check your spam folder too.',
        )}</div>
      ) : (
        <form onSubmit={enlace} noValidate>
          <label htmlFor="correo">{t('Correo', 'Email')}</label>
          <input id="correo" type="email" autoComplete="email" value={correo} onChange={e => setCorreo(e.target.value)} placeholder={t('tucorreo@gmail.com', 'you@example.com')} />
          <button className="boton lleno bloque" disabled={estado === 'enviando'}>
            {estado === 'enviando' ? t('Enviando…', 'Sending…') : t('Enviarme el enlace', 'Email me a link')}
          </button>
        </form>
      )}
      <div className="error" role="alert">{error}</div>

      <div className="caja small muted">
        <b>{t('¿Eres barbero?', 'Are you a barber?')}</b> {t(
          'Entra con el mismo correo que el dueño registró para ti y tu agenda aparece sola.',
          'Sign in with the email the shop owner registered for you and your schedule will appear automatically.',
        )}
      </div>
      <p className="pie"><Link to="/">{t('Inicio', 'Home')}</Link></p>
    </div>
  )
}

/* ---------------- Espacio de trabajo ---------------- */

function Espacio({ sesion }) {
  const [datos, setDatos] = useState(undefined)
  const [vista, setVista] = useState('calendario')
  const [error, setError] = useState('')
  const [copiado, setCopiado] = useState(false)

  const cargar = useCallback(async () => {
    try {
      await rpc('vincular_barbero')
      const { data: yo, error: e1 } = await supabase.from('barberos')
        .select('*, barberias(*)').eq('user_id', sesion.user.id).eq('activo', true).order('creado_en').limit(1)
      if (e1) throw e1
      if (!yo?.length) return setDatos(null)
      const negocio = yo[0].barberias
      const [{ data: barberos, error: e2 }, { data: servicios, error: e3 }] = await Promise.all([
        supabase.from('barberos').select('*').eq('barberia_id', negocio.id).order('creado_en'),
        supabase.from('servicios').select('*').eq('barberia_id', negocio.id).order('precio'),
      ])
      if (e2 || e3) throw e2 || e3
      setDatos({ yo: yo[0], negocio, barberos, servicios })
    } catch (e) { setError(e.message && !e.code ? e.message : traducirError(e)) }
  }, [sesion.user.id])

  useEffect(() => { cargar() }, [cargar])

  const salir = () => supabase.auth.signOut()

  if (error) return (
    <div className="wrap">
      <p className="error" style={{ marginTop: 56 }}>{error}</p>
      <button className="boton" onClick={() => { setError(''); cargar() }}>{t('Reintentar', 'Try again')}</button>
    </div>
  )
  if (datos === undefined) return <div className="wrap"><p className="cargando">{t('Cargando tu agenda…', 'Loading your schedule…')}</p></div>
  if (datos === null) return <CrearNegocio correo={sesion.user.email} onCreado={cargar} onSalir={salir} />

  const { yo, negocio } = datos
  const enlace = `${window.location.origin}/${negocio.slug}`

  function copiar() {
    navigator.clipboard?.writeText(enlace).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000) })
  }

  return (
    <div className="wrap ancho">
      <div className="barra">
        <div>
          <div className="display">{negocio.nombre}</div>
          <div className="small muted">{yo.nombre}{yo.es_dueno ? ` · ${t('dueño', 'owner')}` : ''}</div>
        </div>
        <button className="enlace" onClick={salir}>{t('Salir', 'Sign out')}</button>
      </div>

      <div className="caja fila" style={{ justifyContent: 'space-between' }}>
        <div className="small"><span className="muted">{t('Enlace para tus clientes:', 'Booking link for your clients:')}</span><br /><b>{enlace.replace(/^https?:\/\//, '')}</b></div>
        <div className="fila">
          <button className="boton mini" onClick={copiar}>{copiado ? t('¡Copiado!', 'Copied!') : t('Copiar', 'Copy')}</button>
          <a className="boton mini" href={enlace} target="_blank" rel="noopener">{t('Abrir', 'Open')}</a>
        </div>
      </div>

      <div className="pestanas" role="tablist">
        <button role="tab" aria-selected={vista === 'calendario'} onClick={() => setVista('calendario')}>{t('Calendario', 'Calendar')}</button>
        <button role="tab" aria-selected={vista === 'ajustes'} onClick={() => setVista('ajustes')}>
          {yo.es_dueno ? t('Ajustes', 'Settings') : t('Mi horario', 'My hours')}
        </button>
      </div>

      {vista === 'calendario'
        ? <Calendario {...datos} />
        : <Ajustes {...datos} onCambio={cargar} />}
    </div>
  )
}

/* ---------------- Registro del negocio ---------------- */

function CrearNegocio({ correo, onCreado, onSalir }) {
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [tocado, setTocado] = useState(false)
  const [miNombre, setMiNombre] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const aSlug = texto => texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)

  async function crear(e) {
    e.preventDefault()
    const tel = whatsapp.replace(/\D/g, '')
    if (nombre.trim().length < 2) return setError(t('Escribe el nombre del negocio.', 'Enter the business name.'))
    if (!/^[a-z0-9-]{3,40}$/.test(slug)) return setError(t('El enlace debe tener entre 3 y 40 letras, números o guiones.', 'The link must be 3 to 40 letters, numbers or hyphens.'))
    if (miNombre.trim().length < 2) return setError(t('Escribe tu nombre.', 'Enter your name.'))
    if (tel && !/^3\d{9}$/.test(tel)) return setError(t('El WhatsApp debe ser un celular de 10 dígitos que empiece por 3.', 'WhatsApp must be a 10-digit Colombian mobile number starting with 3.'))
    setError(''); setEnviando(true)
    try {
      await rpc('crear_barberia', { p_nombre: nombre.trim(), p_slug: slug, p_nombre_dueno: miNombre.trim(), p_whatsapp: tel || null })
      onCreado()
    } catch (err) { setError(err.message) } finally { setEnviando(false) }
  }

  return (
    <div className="wrap">
      <header className="letrero">
        <div className="poste" aria-hidden="true" />
        <div>
          <h1 className="display">{t('Registra tu negocio', 'Set up your business')}</h1>
          <p className="sub">{t('Entraste como ', 'Signed in as ')}{correo}</p>
        </div>
      </header>

      <div className="aviso small">
        {t('Si eres barbero y no dueño, no llenes esto: pídele al dueño que te agregue con el correo ',
          'If you are a barber and not the owner, skip this: ask the owner to add you with the email ')}
        <b>{correo}</b>{t(' y vuelve a entrar.', ', then sign in again.')}
      </div>

      <form onSubmit={crear} noValidate>
        <label htmlFor="n">{t('Nombre del negocio', 'Business name')}</label>
        <input id="n" value={nombre} placeholder={t('Ej: Barbería El Sinú', 'e.g. El Sinú Barbershop')}
          onChange={e => { setNombre(e.target.value); if (!tocado) setSlug(aSlug(e.target.value)) }} />
        <label htmlFor="s">{t('Enlace de reservas', 'Booking link')}</label>
        <input id="s" value={slug} onChange={e => { setTocado(true); setSlug(aSlug(e.target.value)) }} placeholder="el-sinu" />
        <p className="small muted" style={{ margin: '4px 0 0' }}>{window.location.host}/<b>{slug || t('tu-negocio', 'your-business')}</b></p>
        <label htmlFor="m">{t('Tu nombre', 'Your name')}</label>
        <input id="m" value={miNombre} onChange={e => setMiNombre(e.target.value)} placeholder={t('Como te verán los clientes', 'As clients will see it')} />
        <label htmlFor="w">{t('WhatsApp del negocio (opcional)', 'Business WhatsApp (optional)')}</label>
        <input id="w" inputMode="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="300 123 4567" />
        <div className="error" role="alert">{error}</div>
        <button className="cta" disabled={enviando}>{enviando ? t('Creando…', 'Creating…') : t('Crear mi negocio', 'Create my business')}</button>
      </form>
      <p className="small muted">{t(
        'Quedará con 3 servicios de ejemplo y horario de lunes a sábado de 9 a.m. a 7 p.m. Lo cambias en Ajustes.',
        'It starts with 3 sample services and Monday–Saturday hours from 9 AM to 7 PM. You can change them in Settings.',
      )}</p>
      <button className="enlace" onClick={onSalir}>{t('Salir', 'Sign out')}</button>
    </div>
  )
}

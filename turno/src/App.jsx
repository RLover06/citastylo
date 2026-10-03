import { Routes, Route, Link } from 'react-router-dom'
import { configurado } from './lib/supabase.js'
import { t, useIdioma, cambiarIdioma } from './lib/idioma.js'
import Inicio from './pages/Inicio.jsx'
import Reserva from './pages/Reserva.jsx'
import Privacidad from './pages/Privacidad.jsx'
import Panel from './pages/panel/Panel.jsx'

export default function App() {
  // Al cambiar el idioma, este componente se vuelve a dibujar y con él toda la app.
  const idioma = useIdioma()

  return (
    <>
      <SelectorIdioma actual={idioma} />
      {!configurado ? <FaltaConfiguracion /> : (
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/panel/*" element={<Panel />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="/:slug/privacidad" element={<Privacidad />} />
          <Route path="/:slug" element={<Reserva />} />
          <Route path="*" element={<NoExiste />} />
        </Routes>
      )}
    </>
  )
}

function SelectorIdioma({ actual }) {
  return (
    <div className="selector-idioma" role="group" aria-label={t('Idioma', 'Language')}>
      {[['es', 'ES', 'Español'], ['en', 'EN', 'English']].map(([codigo, corto, largo]) => (
        <button key={codigo} lang={codigo} aria-pressed={actual === codigo} title={largo} aria-label={largo}
          onClick={() => cambiarIdioma(codigo)}>{corto}</button>
      ))}
    </div>
  )
}

function FaltaConfiguracion() {
  return (
    <div className="wrap">
      <h1 className="display" style={{ marginTop: 40 }}>{t('Falta conectar la base de datos', 'Database not connected')}</h1>
      <p>{t(
        'Copia el archivo .env.example como .env, pon la URL y la clave pública de tu proyecto Supabase y vuelve a iniciar con npm run dev.',
        'Copy .env.example to .env, add your Supabase project URL and public key, then restart with npm run dev.',
      )}</p>
    </div>
  )
}

function NoExiste() {
  return (
    <div className="wrap">
      <h1 className="display" style={{ marginTop: 40 }}>{t('Esta página no existe', 'Page not found')}</h1>
      <p className="muted">{t('Revisa el enlace que te compartió el negocio.', 'Check the link the business shared with you.')}</p>
      <Link className="boton" to="/">{t('Ir al inicio', 'Go to home')}</Link>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { t } from '../lib/idioma.js'

export default function Inicio() {
  return (
    <div className="wrap">
      <header className="letrero">
        <div className="poste" aria-hidden="true" />
        <div>
          <h1 className="display">Turno</h1>
          <p className="sub">{t('Citas para barberías y salones de belleza', 'Appointments for barbershops and beauty salons')}</p>
        </div>
      </header>

      <div className="caja">
        <h3 style={{ marginTop: 0 }}>{t('¿Vas a reservar?', 'Booking an appointment?')}</h3>
        <p className="muted" style={{ margin: 0 }}>{t(
          'Abre el enlace que te compartió tu barbería por WhatsApp o Instagram.',
          'Open the link your barbershop shared with you on WhatsApp or Instagram.',
        )}</p>
      </div>

      <div className="caja">
        <h3 style={{ marginTop: 0 }}>{t('¿Tienes una barbería o trabajas en una?', 'Own or work at a barbershop?')}</h3>
        <p className="muted">{t(
          'Tus clientes reservan solos desde el celular y tú ves tu agenda del día sin cuadernos ni mensajes perdidos.',
          'Clients book on their own from their phone, and you see your day at a glance: no paper notebooks, no lost messages.',
        )}</p>
        <Link className="boton lleno" to="/panel">{t('Entrar al panel', 'Go to dashboard')}</Link>
      </div>

      <p className="pie"><Link to="/privacidad">{t('Política de tratamiento de datos', 'Data privacy policy')}</Link></p>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { rpc } from '../lib/supabase.js'
import { t } from '../lib/idioma.js'

const CONTACTO = import.meta.env.VITE_CONTACTO_EMAIL || ''

export default function Privacidad() {
  const { slug } = useParams()
  const [negocio, setNegocio] = useState(null)

  useEffect(() => {
    if (slug) rpc('info_barberia', { p_slug: slug }).then(setNegocio).catch(() => {})
  }, [slug])

  const responsable = negocio?.nombre || t('el negocio donde reservas', 'the business where you book')
  const datosNegocio = `${negocio?.direccion ? `, ${negocio.direccion}` : ''}${negocio?.whatsapp ? `, WhatsApp ${negocio.whatsapp}` : ''}`

  return (
    <div className="wrap">
      <p style={{ marginTop: 56 }}><Link to={slug ? `/${slug}` : '/'}>← {t('Volver', 'Back')}</Link></p>
      <h1 className="display">{t('Política de tratamiento de datos personales', 'Personal data privacy policy')}</h1>
      <p className="muted small">{t(
        'Ley 1581 de 2012 y Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015).',
        'Under Colombian Law 1581 of 2012 and Decree 1377 of 2013 (compiled in Decree 1074 of 2015).',
      )}</p>

      <h3>{t('Quién trata tus datos', 'Who handles your data')}</h3>
      <p><b>{t('Responsable:', 'Controller:')}</b> {responsable}{datosNegocio}. {t(
        'Es quien decide cómo se usan los datos de sus clientes.',
        'It decides how its clients’ data is used.',
      )}</p>
      <p><b>{t('Encargado:', 'Processor:')}</b> {t(
        'Turno, la plataforma que presta el servicio de reservas al negocio',
        'Turno, the platform that provides the booking service to the business',
      )}{CONTACTO ? ` (${t('contacto', 'contact')}: ${CONTACTO})` : ''}. {t(
        'Guarda y procesa los datos solo por cuenta del negocio.',
        'It stores and processes data only on the business’s behalf.',
      )}</p>

      <h3>{t('Qué datos se recogen', 'What data is collected')}</h3>
      <p>{t(
        'Tu nombre, tu número de celular y el historial de tus citas (servicio, fecha, hora, barbero y si asististe). No se piden datos sensibles, documentos de identidad ni datos de pago.',
        'Your name, your mobile number and your appointment history (service, date, time, barber and whether you attended). No sensitive data, ID documents or payment details are requested.',
      )}</p>

      <h3>{t('Para qué se usan', 'How it is used')}</h3>
      <ul>
        <li>{t('Agendar, confirmar, cambiar y cancelar tus citas.', 'To book, confirm, reschedule and cancel your appointments.')}</li>
        <li>{t('Enviarte recordatorios o avisos sobre tus citas por WhatsApp.', 'To send you reminders or notices about your appointments on WhatsApp.')}</li>
        <li>{t('Llevar el historial de atención del negocio y sus estadísticas internas.', 'To keep the business’s service history and internal statistics.')}</li>
      </ul>
      <p>{t('Tus datos no se venden ni se comparten con terceros para publicidad.', 'Your data is never sold or shared with third parties for advertising.')}</p>

      <h3>{t('Tus derechos', 'Your rights')}</h3>
      <p>{t(
        'Como titular puedes: conocer, actualizar y rectificar tus datos; pedir prueba de la autorización que diste; saber cómo se han usado; revocar la autorización o pedir que se borren cuando no exista un deber legal de conservarlos; acceder gratis a tus datos; y presentar quejas ante la Superintendencia de Industria y Comercio.',
        'As the data subject you may: access, update and correct your data; request proof of the consent you gave; learn how it has been used; withdraw consent or request deletion when there is no legal duty to keep it; access your data free of charge; and file complaints with Colombia’s Superintendence of Industry and Commerce (SIC).',
      )}</p>

      <h3>{t('Cómo ejercerlos', 'How to exercise them')}</h3>
      <p>{t('Escribe al negocio por WhatsApp', 'Message the business on WhatsApp')}{CONTACTO ? t(` o al correo ${CONTACTO}`, ` or email ${CONTACTO}`) : ''}{t(
        ' indicando tu nombre, tu celular y lo que solicitas. Las consultas se responden en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles, según la ley.',
        ' with your name, your phone number and your request. By law, inquiries are answered within 10 business days and complaints within 15 business days.',
      )}</p>

      <h3>{t('Seguridad y conservación', 'Security and retention')}</h3>
      <p>{t(
        'Los datos se guardan en servidores con acceso restringido y cifrado en tránsito. Cada negocio solo ve a sus propios clientes. Se conservan mientras tengas relación con el negocio o hasta que pidas su eliminación.',
        'Data is stored on access-restricted servers and encrypted in transit. Each business only sees its own clients. It is kept while you have a relationship with the business or until you ask for it to be deleted.',
      )}</p>

      <h3>{t('Autorización', 'Consent')}</h3>
      <p>{t(
        'Al marcar la casilla de autorización antes de reservar, aceptas este tratamiento. Queda registrada la fecha en que lo hiciste.',
        'By ticking the consent box before booking, you accept this processing. The date you did so is recorded.',
      )}</p>

      <p className="muted small">{t('Vigente desde el 27 de septiembre de 2026.', 'Effective September 27, 2026.')}</p>
    </div>
  )
}

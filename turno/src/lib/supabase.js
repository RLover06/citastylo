import { createClient } from '@supabase/supabase-js'
import { t } from './idioma.js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configurado = Boolean(url && key && !url.includes('TU-PROYECTO'))

export const supabase = configurado
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

// Llama una función de la base de datos y lanza un error con mensaje en el idioma de la interfaz.
export async function rpc(nombre, params = {}) {
  const { data, error } = await supabase.rpc(nombre, params)
  if (error) {
    const err = new Error(traducirError(error))
    err.codigo = Object.keys(MENSAJES).find(c => error.message?.includes(c)) || null
    throw err
  }
  return data
}

// Códigos de error que lanza la base de datos (supabase/esquema.sql)
const MENSAJES = {
  HORARIO_OCUPADO: () => t('Ese horario se acaba de ocupar. Elige otro.', 'That time slot was just taken. Please pick another one.'),
  TELEFONO_INVALIDO: () => t('Escribe un celular colombiano de 10 dígitos que empiece por 3.', 'Enter a 10-digit Colombian mobile number starting with 3.'),
  NOMBRE_INVALIDO: () => t('Escribe tu nombre.', 'Enter your name.'),
  FALTA_AUTORIZACION_DATOS: () => t('Debes autorizar el tratamiento de tus datos para reservar.', 'You must accept the data policy to book.'),
  NEGOCIO_NO_EXISTE: () => t('Este negocio no existe o cambió de enlace.', 'This business does not exist or its link has changed.'),
  LIMITE_CITAS: () => t('Ya tienes el máximo de citas pendientes en este negocio. Cancela o espera a que pase una.', 'You already have the maximum number of upcoming appointments here. Cancel one or wait until one has passed.'),
  CITA_NO_DISPONIBLE: () => t('Esta cita ya no se puede modificar.', 'This appointment can no longer be changed.'),
  FUERA_DE_PLAZO: () => t('Ya pasó el plazo para cambiar esta cita. Comunícate con el negocio por WhatsApp.', 'It is too late to change this appointment online. Please contact the business on WhatsApp.'),
  SIN_PERMISO: () => t('No tienes permiso para hacer esto.', 'You do not have permission to do this.'),
  SERVICIO_INVALIDO: () => t('Ese servicio ya no está disponible.', 'That service is no longer available.'),
  NECESITA_SESION: () => t('Tu sesión terminó. Vuelve a entrar.', 'Your session has ended. Please sign in again.'),
  ESTADO_INVALIDO: () => t('Estado no válido.', 'Invalid status.'),
}

export function traducirError(error) {
  const texto = error?.message || String(error)
  for (const [codigo, mensaje] of Object.entries(MENSAJES)) {
    if (texto.includes(codigo)) return mensaje()
  }
  if (texto.includes('barberias_slug_key') || (texto.includes('duplicate key') && texto.includes('slug')))
    return t('Ese enlace ya lo tiene otro negocio. Prueba con otro.', 'Another business already uses that link. Try a different one.')
  if (texto.includes('duplicate key')) return t('Ese dato ya existe.', 'That entry already exists.')
  if (texto.includes('Failed to fetch')) return t('Sin conexión. Revisa tu internet e intenta de nuevo.', 'No connection. Check your internet and try again.')
  if (/rate limit|security purposes/i.test(texto)) return t('Espera un minuto antes de pedir otro enlace.', 'Please wait a minute before requesting another link.')
  return t('Algo salió mal. Intenta de nuevo.', 'Something went wrong. Please try again.')
}

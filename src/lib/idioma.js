import { useEffect, useState } from 'react'

// Idioma de la interfaz: español o inglés.
// 1. Si la persona ya eligió uno con el botón ES | EN, se respeta.
// 2. Si no, se usa el idioma del navegador: español si empieza por "es",
//    inglés en cualquier otro caso.
const CLAVE = 'turno.idioma'

function detectar() {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado === 'es' || guardado === 'en') return guardado
  } catch { /* modo privado */ }
  const preferido = (navigator.languages && navigator.languages[0]) || navigator.language || 'en'
  return preferido.toLowerCase().startsWith('es') ? 'es' : 'en'
}

let actual = detectar()
document.documentElement.lang = actual

const oyentes = new Set()

export const idioma = () => actual

// Texto bilingüe: t('Reservar turno', 'Book an appointment')
export const t = (es, en) => (actual === 'en' ? en : es)

export function cambiarIdioma(nuevo) {
  if (nuevo === actual || (nuevo !== 'es' && nuevo !== 'en')) return
  actual = nuevo
  try { localStorage.setItem(CLAVE, nuevo) } catch { /* modo privado */ }
  document.documentElement.lang = nuevo
  oyentes.forEach(avisar => avisar(nuevo))
}

// Se usa en la raíz de la app: al cambiar el idioma, toda la interfaz se vuelve a dibujar.
export function useIdioma() {
  const [valor, setValor] = useState(actual)
  useEffect(() => {
    oyentes.add(setValor)
    return () => oyentes.delete(setValor)
  }, [])
  return valor
}

import { useEffect } from 'react'
import { t } from '../lib/idioma.js'

export default function Hoja({ titulo, onCerrar, children }) {
  useEffect(() => {
    const tecla = e => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', tecla)
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = previo }
  }, [onCerrar])

  return (
    <div className="velo" onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="hoja-cab">
          <h2>{titulo}</h2>
          <button className="cerrar" onClick={onCerrar} aria-label={t('Cerrar', 'Close')}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

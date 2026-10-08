import { useCallback, useEffect, useState } from 'react'
import { obtenerRankingPublico } from '../lib/api'
import { mensajeDeError, mismoNombre } from '../lib/utilidades'

const MEDALLAS = { 1: '🥇', 2: '🥈', 3: '🥉' }

/**
 * Ranking en vivo para quienes ya jugaron: muestra quién va ganando
 * y resalta la fila de la persona que está viendo.
 */
export default function RankingEnVivo({ miNombre, total = 20, onMiPuesto }) {
  const [ranking, setRanking] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setRanking(await obtenerRankingPublico())
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const miPuesto = ranking.find((p) => mismoNombre(p.nombre, miNombre))

  // Le avisa a la pantalla final el puesto/puntaje que dice el servidor
  useEffect(() => {
    if (miPuesto) onMiPuesto?.(miPuesto)
  }, [miPuesto, onMiPuesto])

  return (
    <section className="ranking-vivo">
      <div className="ranking-vivo-encabezado">
        <h2>🏆 ¿Quién va ganando?</h2>
        <button
          type="button"
          className="boton boton-secundario boton-mini"
          onClick={cargar}
          disabled={cargando}
          aria-label="Actualizar ranking"
        >
          {cargando ? '…' : '↻'}
        </button>
      </div>

      {miPuesto && (
        <p className="ranking-vivo-puesto">
          Vas en el puesto <strong>#{miPuesto.posicion}</strong> de {ranking.length}
        </p>
      )}

      {error && (
        <p className="mensaje-error" role="alert">
          {error}
        </p>
      )}

      {!error && !cargando && ranking.length === 0 && (
        <p className="nota">Todavía no hay resultados.</p>
      )}

      <ol className="lista-ranking lista-ranking-vivo">
        {ranking.map((p, i) => (
          <li
            key={p.posicion}
            className={`fila-ranking ${mismoNombre(p.nombre, miNombre) ? 'yo' : ''}`}
            style={{ animationDelay: `${Math.min(i, 15) * 50}ms` }}
          >
            <span className={`fila-posicion ${MEDALLAS[p.posicion] ? 'con-medalla' : ''}`}>
              {MEDALLAS[p.posicion] ?? p.posicion}
            </span>
            <span className="fila-nombre">
              {p.nombre}
              {mismoNombre(p.nombre, miNombre) && <em> (tú)</em>}
            </span>
            <span className="fila-puntaje">
              {p.puntaje}
              <small>/{total}</small>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

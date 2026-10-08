import { useCallback, useEffect, useMemo, useState } from 'react'
import Cargando from './Cargando'
import { obtenerRespuestas } from '../lib/api'
import { mensajeDeError } from '../lib/utilidades'

/** Formatea la fecha en que respondió, ej. "8 oct, 3:45 p. m." */
const formatearFecha = (iso) =>
  new Date(iso).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

/**
 * Vista de admin con las respuestas de todos.
 * - "Por persona": qué respondió cada quien, con ✓/✗.
 * - "Por pregunta": cuántos acertaron y qué opciones eligió la gente.
 */
export default function RespuestasAdmin({ clave }) {
  const [participantes, setParticipantes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [vista, setVista] = useState('persona') // 'persona' | 'pregunta'
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setParticipantes(await obtenerRespuestas(clave))
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setCargando(false)
    }
  }, [clave])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Agrupa las respuestas por pregunta para la vista "Por pregunta"
  const porPregunta = useMemo(() => {
    const mapa = new Map()
    for (const persona of participantes) {
      for (const d of persona.detalle) {
        if (!mapa.has(d.orden)) {
          mapa.set(d.orden, { ...d, aciertos: 0, conteo: {} })
        }
        const item = mapa.get(d.orden)
        if (d.acerto) item.aciertos += 1
        const elegida = d.respuesta ?? '(sin responder)'
        item.conteo[elegida] = (item.conteo[elegida] ?? 0) + 1
      }
    }
    return [...mapa.values()].sort((a, b) => a.orden - b.orden)
  }, [participantes])

  const filtrados = participantes.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
  )

  if (cargando && participantes.length === 0) return <Cargando texto="Abriendo los sobres… ✉️" />

  return (
    <section className="respuestas-admin aparecer">
      <div className="respuestas-pestanas" role="tablist">
        <button
          role="tab"
          aria-selected={vista === 'persona'}
          className={`pestana ${vista === 'persona' ? 'activa' : ''}`}
          onClick={() => setVista('persona')}
        >
          👤 Por persona
        </button>
        <button
          role="tab"
          aria-selected={vista === 'pregunta'}
          className={`pestana ${vista === 'pregunta' ? 'activa' : ''}`}
          onClick={() => setVista('pregunta')}
        >
          ❓ Por pregunta
        </button>
        <button className="boton boton-secundario boton-mini" onClick={cargar} disabled={cargando}>
          {cargando ? '…' : '↻'}
        </button>
      </div>

      {error && (
        <p className="mensaje-error" role="alert">
          {error}
        </p>
      )}

      {!error && participantes.length === 0 && (
        <p className="tarjeta centrado">Todavía nadie ha jugado 🦗</p>
      )}

      {/* ---------- Por persona ---------- */}
      {vista === 'persona' && participantes.length > 0 && (
        <>
          <input
            className="campo campo-busqueda"
            type="search"
            placeholder="Buscar por nombre…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          <div className="lista-personas">
            {filtrados.map((p) => (
              <details key={p.posicion} className="persona">
                <summary>
                  <span className="fila-posicion">{p.posicion}</span>
                  <span className="persona-nombre">{p.nombre}</span>
                  <span className="persona-fecha">{formatearFecha(p.created_at)}</span>
                  <span className="fila-puntaje">
                    {p.puntaje}
                    <small>/{p.detalle.length}</small>
                  </span>
                </summary>

                <ol className="detalle-respuestas">
                  {p.detalle.map((d) => (
                    <li key={d.orden} className={d.acerto ? 'bien' : 'mal'}>
                      <span className="detalle-icono" aria-label={d.acerto ? 'Correcta' : 'Incorrecta'}>
                        {d.acerto ? '✓' : '✗'}
                      </span>
                      <div>
                        <p className="detalle-pregunta">
                          {d.orden}. {d.pregunta}
                        </p>
                        <p className="detalle-respuesta">{d.respuesta ?? '(sin responder)'}</p>
                        {!d.acerto && <p className="detalle-correcta">Correcta: {d.correcta}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </details>
            ))}
            {filtrados.length === 0 && <p className="nota">Nadie se llama así 🤔</p>}
          </div>
        </>
      )}

      {/* ---------- Por pregunta ---------- */}
      {vista === 'pregunta' && participantes.length > 0 && (
        <div className="lista-preguntas">
          {porPregunta.map((q) => {
            const porcentaje = Math.round((q.aciertos / participantes.length) * 100)
            const opciones = Object.entries(q.conteo).sort((a, b) => b[1] - a[1])
            return (
              <article key={q.orden} className="tarjeta pregunta-stats">
                <h3>
                  {q.orden}. {q.pregunta}
                </h3>
                <p className="stats-resumen">
                  <strong>{q.aciertos}</strong> de {participantes.length} acertaron ({porcentaje}%)
                </p>
                <ul className="stats-opciones">
                  {opciones.map(([opcion, cantidad]) => (
                    <li key={opcion} className={opcion === q.correcta ? 'es-correcta' : ''}>
                      <div className="stats-texto">
                        <span>
                          {opcion === q.correcta && '✓ '}
                          {opcion}
                        </span>
                        <span>{cantidad}</span>
                      </div>
                      <div className="stats-barra">
                        <div style={{ width: `${(cantidad / participantes.length) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

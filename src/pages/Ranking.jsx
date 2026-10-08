import { useCallback, useEffect, useRef, useState } from 'react'
import Fondo from '../components/Fondo'
import Confeti from '../components/Confeti'
import Cargando from '../components/Cargando'
import RespuestasAdmin from '../components/RespuestasAdmin'
import { contarPreguntas, obtenerRanking } from '../lib/api'
import { guardarClaveRanking, leerClaveRanking } from '../lib/almacenamiento'
import { mensajeDeError } from '../lib/utilidades'

/*
  Fases de la revelación (pensadas para proyectar en el TV):
  0 = todo oculto · 1 = puestos 4 en adelante · 2 = bronce · 3 = plata · 4 = oro 🎉
*/
const PAUSAS_MS = [0, 2600, 2600, 3400] // pausa antes de cada fase (suspenso 🥁)

const MEDALLAS = {
  1: { clase: 'oro', emoji: '🥇', nombre: 'Oro' },
  2: { clase: 'plata', emoji: '🥈', nombre: 'Plata' },
  3: { clase: 'bronce', emoji: '🥉', nombre: 'Bronce' },
}

// En qué fase se destapa cada puesto del podio
const FASE_DEL_PUESTO = { 3: 2, 2: 3, 1: 4 }

export default function Ranking() {
  const [clave, setClave] = useState(leerClaveRanking)
  const [autenticada, setAutenticada] = useState(false)
  const [ranking, setRanking] = useState([])
  const [total, setTotal] = useState(20)
  const [cargando, setCargando] = useState(() => Boolean(leerClaveRanking()))
  const [error, setError] = useState('')
  const [fase, setFase] = useState(0)
  const [vista, setVista] = useState('ranking') // 'ranking' | 'respuestas'
  const temporizadores = useRef([])

  const limpiarTemporizadores = () => {
    temporizadores.current.forEach(clearTimeout)
    temporizadores.current = []
  }
  useEffect(() => limpiarTemporizadores, [])

  /** Pide el ranking al servidor con la clave dada. */
  const consultar = useCallback(async (claveAUsar) => {
    setCargando(true)
    setError('')
    try {
      const [datos, cantidad] = await Promise.all([
        obtenerRanking(claveAUsar),
        contarPreguntas().catch(() => 20),
      ])
      // posicion llega como bigint (texto o número): lo normalizamos
      setRanking(datos.map((p) => ({ ...p, posicion: Number(p.posicion) })))
      setTotal(cantidad)
      setAutenticada(true)
      guardarClaveRanking(claveAUsar)
    } catch (err) {
      setError(mensajeDeError(err))
      if (String(err?.message).includes('CLAVE')) {
        setAutenticada(false)
        guardarClaveRanking('')
      }
    } finally {
      setCargando(false)
    }
  }, [])

  // Si la clave ya estaba guardada en esta pestaña, entra directo
  useEffect(() => {
    const guardada = leerClaveRanking()
    if (guardada) consultar(guardada)
  }, [consultar])

  function entrar(evento) {
    evento.preventDefault()
    if (!clave.trim()) return setError('Escribe la contraseña 🔑')
    consultar(clave.trim())
  }

  /** Revela el ranking poco a poco: del 4.º puesto hacia el 1.º */
  function revelar() {
    limpiarTemporizadores()
    setFase(0)
    let acumulado = 0
    PAUSAS_MS.forEach((pausa, i) => {
      acumulado += pausa
      temporizadores.current.push(setTimeout(() => setFase(i + 1), acumulado + 50))
    })
  }

  function mostrarTodo() {
    limpiarTemporizadores()
    setFase(4)
  }

  function salir() {
    limpiarTemporizadores()
    guardarClaveRanking('')
    setClave('')
    setAutenticada(false)
    setRanking([])
    setFase(0)
    setVista('ranking')
  }

  /* ---------------- Pantalla de contraseña ---------------- */

  if (!autenticada) {
    if (cargando && leerClaveRanking()) {
      return (
        <main className="pantalla">
          <Fondo />
          <Cargando texto="Contando respuestas… 🧮" />
        </main>
      )
    }

    return (
      <main className="pantalla">
        <Fondo />
        <section className="inicio aparecer">
          <p className="emoji-grande" aria-hidden="true">
            🔐
          </p>
          <h1 className="titulo titulo-chico">Ranking secreto</h1>
          <form className="formulario tarjeta" onSubmit={entrar}>
            <label htmlFor="clave" className="etiqueta-campo etiqueta-oscura">
              Contraseña
            </label>
            <input
              id="clave"
              className="campo"
              type="password"
              autoComplete="current-password"
              value={clave}
              onChange={(e) => {
                setClave(e.target.value)
                if (error) setError('')
              }}
            />
            {error && (
              <p className="mensaje-error" role="alert">
                {error}
              </p>
            )}
            <button className="boton boton-principal" type="submit" disabled={cargando}>
              {cargando ? 'Verificando…' : 'Ver ranking 🏆'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  /* ---------------- Ranking ---------------- */

  const podio = ranking.slice(0, 3)
  const resto = ranking.slice(3)
  // Orden visual del podio: plata – oro – bronce
  const ordenPodio = [podio[1], podio[0], podio[2]].filter(Boolean)

  return (
    <main className="pantalla pantalla-ranking">
      <Fondo cantidad={18} />
      {vista === 'ranking' && fase >= 4 && <Confeti cantidad={120} />}

      <header className="ranking-encabezado">
        <h1 className="ranking-titulo">
          ¿Quién me conoce más? <span aria-hidden="true">🏆</span>
        </h1>
        <p className="ranking-sub">
          {ranking.length} {ranking.length === 1 ? 'persona jugó' : 'personas jugaron'} · {total}{' '}
          preguntas por mis 20 años
        </p>
      </header>

      {vista === 'respuestas' ? (
        <RespuestasAdmin clave={leerClaveRanking()} />
      ) : ranking.length === 0 ? (
        <section className="tarjeta centrado aparecer">
          <p className="emoji-grande">🦗</p>
          <p>Todavía nadie ha jugado. ¡Comparte el link!</p>
        </section>
      ) : (
        <>
          {fase === 0 && (
            <div className="revelar-zona aparecer">
              <button className="boton boton-principal boton-revelar" onClick={revelar}>
                🥁 Revelar ranking
              </button>
            </div>
          )}

          {/* Podio: plata – oro – bronce */}
          <section className="podio">
            {ordenPodio.map((p) => {
              const medalla = MEDALLAS[p.posicion]
              const visible = fase >= FASE_DEL_PUESTO[p.posicion]
              return (
                <div
                  key={p.posicion}
                  className={`podio-puesto ${medalla.clase} ${visible ? 'visible' : ''}`}
                >
                  <div className="podio-persona">
                    <span className="podio-medalla" aria-label={medalla.nombre}>
                      {visible ? medalla.emoji : '❓'}
                    </span>
                    <span className="podio-nombre">{visible ? p.nombre : '· · ·'}</span>
                    <span className="podio-puntaje">{visible ? `${p.puntaje}/${total}` : '?'}</span>
                  </div>
                  <div className="podio-bloque">
                    <span>{p.posicion}</span>
                  </div>
                </div>
              )
            })}
          </section>

          {/* Puestos 4 en adelante */}
          {resto.length > 0 && fase >= 1 && (
            <ol className="lista-ranking">
              {resto.map((p, i) => (
                <li
                  key={p.posicion}
                  className="fila-ranking"
                  style={{ animationDelay: `${Math.min(i, 15) * 60}ms` }}
                >
                  <span className="fila-posicion">{p.posicion}</span>
                  <span className="fila-nombre">{p.nombre}</span>
                  <span className="fila-puntaje">
                    {p.puntaje}
                    <small>/{total}</small>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      {error && (
        <p className="mensaje-error" role="alert">
          {error}
        </p>
      )}

      <footer className="ranking-controles">
        <button
          className="boton boton-secundario"
          onClick={() => setVista(vista === 'ranking' ? 'respuestas' : 'ranking')}
        >
          {vista === 'ranking' ? '📋 Ver respuestas' : '🏆 Ver ranking'}
        </button>
        {vista === 'ranking' && ranking.length > 0 && fase < 4 && (
          <button className="boton boton-secundario" onClick={mostrarTodo}>
            Mostrar todo
          </button>
        )}
        {vista === 'ranking' && fase >= 4 && (
          <button className="boton boton-secundario" onClick={revelar}>
            Repetir revelación
          </button>
        )}
        <button
          className="boton boton-secundario"
          onClick={() => consultar(leerClaveRanking())}
          disabled={cargando}
        >
          {cargando ? 'Actualizando…' : '↻ Actualizar'}
        </button>
        <button className="boton boton-secundario" onClick={salir}>
          Salir
        </button>
      </footer>
    </main>
  )
}

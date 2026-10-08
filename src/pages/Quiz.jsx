import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Fondo from '../components/Fondo'
import Cargando from '../components/Cargando'
import { cargarPreguntas, enviarRespuestas } from '../lib/api'
import {
  borrarProgreso,
  guardarProgreso,
  leerJugado,
  leerProgreso,
  marcarJugado,
} from '../lib/almacenamiento'
import { esErrorDeConexion, limpiarNombre, mensajeDeError, mezclar, vibrar } from '../lib/utilidades'

const LETRAS = ['A', 'B', 'C', 'D']
const ESPERA_AVANCE_MS = 380 // pausa para que se vea la opción elegida antes de pasar

export default function Quiz() {
  const navigate = useNavigate()

  const [nombre, setNombre] = useState(() => leerProgreso()?.nombre ?? '')
  const [preguntas, setPreguntas] = useState([])
  const [indice, setIndice] = useState(0)
  const [respuestas, setRespuestas] = useState({})

  // 'cargando' | 'error' | 'listo' | 'enviando'
  const [estado, setEstado] = useState('cargando')
  const [errorCarga, setErrorCarga] = useState('')
  const [errorEnvio, setErrorEnvio] = useState('')
  const [nombreRepetido, setNombreRepetido] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')

  // Evita dobles toques mientras se hace la transición a la siguiente pregunta
  const avanzando = useRef(false)
  const temporizador = useRef(null)

  // Si no hay nombre o ya jugó, no tiene nada que hacer aquí
  useEffect(() => {
    if (leerJugado()) navigate('/gracias', { replace: true })
    else if (!leerProgreso()?.nombre) navigate('/', { replace: true })
  }, [navigate])

  // Limpia el temporizador si se sale de la pantalla
  useEffect(() => () => clearTimeout(temporizador.current), [])

  /** Carga las preguntas y mezcla las opciones (manteniendo el orden si recargó la página). */
  const cargar = useCallback(async () => {
    setEstado('cargando')
    setErrorCarga('')
    try {
      const datos = await cargarPreguntas()
      if (datos.length === 0) throw new Error('SIN_PREGUNTAS')

      const progreso = leerProgreso() ?? {}
      const ordenes = { ...(progreso.ordenes ?? {}) }

      const lista = datos.map((p) => {
        const guardado = ordenes[p.id]
        const sigueValido =
          Array.isArray(guardado) &&
          guardado.length === p.opciones.length &&
          guardado.every((op) => p.opciones.includes(op))
        const opciones = sigueValido ? guardado : mezclar(p.opciones)
        ordenes[p.id] = opciones
        return { ...p, opciones }
      })

      const indiceGuardado = Math.min(progreso.indice ?? 0, lista.length - 1)
      guardarProgreso({ ...progreso, ordenes, indice: indiceGuardado })

      setPreguntas(lista)
      setIndice(indiceGuardado)
      setRespuestas(progreso.respuestas ?? {})
      setEstado('listo')
    } catch (err) {
      setErrorCarga(
        err?.message === 'SIN_PREGUNTAS'
          ? 'Todavía no hay preguntas cargadas 🤔. Avísale a la cumpleañera.'
          : mensajeDeError(err)
      )
      setEstado('error')
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Guarda el avance en el celular cada vez que cambia
  useEffect(() => {
    if (preguntas.length === 0) return
    guardarProgreso({ ...(leerProgreso() ?? {}), indice, respuestas })
  }, [indice, respuestas, preguntas.length])

  const total = preguntas.length
  const pregunta = preguntas[indice]
  const esUltima = indice === total - 1
  const respondidas = preguntas.filter((p) => respuestas[p.id]).length
  const todoRespondido = total > 0 && respondidas === total

  /** La persona toca una opción. */
  function elegir(opcion) {
    if (avanzando.current || estado === 'enviando') return
    vibrar()
    setRespuestas((prev) => ({ ...prev, [pregunta.id]: opcion }))
    setErrorEnvio('')

    if (!esUltima) {
      avanzando.current = true
      temporizador.current = setTimeout(() => {
        setIndice((i) => Math.min(i + 1, total - 1))
        avanzando.current = false
      }, ESPERA_AVANCE_MS)
    }
  }

  function irA(nuevoIndice) {
    if (avanzando.current) return
    setIndice(Math.max(0, Math.min(nuevoIndice, total - 1)))
  }

  /** Envía todo al servidor (el puntaje se calcula allá, no aquí). */
  async function enviar(nombreAUsar = nombre) {
    if (!todoRespondido) {
      // Por si acaso: lleva a la primera pregunta sin responder
      const faltante = preguntas.findIndex((p) => !respuestas[p.id])
      if (faltante >= 0) setIndice(faltante)
      return
    }

    setEstado('enviando')
    setErrorEnvio('')
    try {
      const puntaje = await enviarRespuestas(nombreAUsar, respuestas)
      marcarJugado(nombreAUsar, puntaje, total)
      borrarProgreso()
      navigate('/gracias', { replace: true })
    } catch (err) {
      const repetido = !esErrorDeConexion(err) && (err?.code === '23505' || String(err?.message).includes('NOMBRE_REPETIDO'))
      setNombreRepetido(repetido)
      setErrorEnvio(
        repetido
          ? `Ups, alguien ya usó el nombre "${nombreAUsar}" mientras jugabas. Escribe otro y envía de nuevo (tus respuestas están a salvo).`
          : mensajeDeError(err)
      )
      setEstado('listo')
    }
  }

  /** Reintento con otro nombre cuando el primero quedó repetido. */
  function enviarConOtroNombre(evento) {
    evento.preventDefault()
    const limpio = limpiarNombre(nuevoNombre)
    if (limpio.length < 2 || limpio.length > 40) {
      setErrorEnvio('El nombre debe tener entre 2 y 40 caracteres.')
      return
    }
    setNombre(limpio)
    guardarProgreso({ ...(leerProgreso() ?? {}), nombre: limpio })
    enviar(limpio)
  }

  /* ---------------- Estados de carga / error ---------------- */

  if (estado === 'cargando') {
    return (
      <main className="pantalla">
        <Fondo />
        <Cargando texto="Inflando globos… 🎈" />
      </main>
    )
  }

  if (estado === 'error') {
    return (
      <main className="pantalla">
        <Fondo />
        <section className="tarjeta aparecer centrado">
          <p className="emoji-grande">😵‍💫</p>
          <p className="mensaje-error">{errorCarga}</p>
          <button className="boton boton-principal" onClick={cargar}>
            Reintentar
          </button>
        </section>
      </main>
    )
  }

  /* ---------------- Pregunta actual ---------------- */

  const elegida = respuestas[pregunta.id]
  const porcentaje = ((indice + 1) / total) * 100

  return (
    <main className="pantalla pantalla-quiz">
      <Fondo cantidad={8} />

      <header className="progreso">
        <div className="progreso-texto">
          <span className="progreso-anio">Año {indice + 1} 🎈</span>
          <span className="progreso-numero" aria-label={`Pregunta ${indice + 1} de ${total}`}>
            {indice + 1}/{total}
          </span>
        </div>
        <div
          className="barra"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={indice + 1}
        >
          <div className="barra-relleno" style={{ width: `${porcentaje}%` }} />
        </div>
      </header>

      {/* key cambia en cada pregunta => se repite la animación de entrada */}
      <section className="pregunta" key={pregunta.id}>
        {pregunta.imagen_url && (
          <img
            className="pregunta-imagen"
            src={pregunta.imagen_url}
            alt=""
            loading="eager"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        )}

        <h2 className="pregunta-texto">{pregunta.texto}</h2>

        <div className="opciones" role="group" aria-label="Opciones de respuesta">
          {pregunta.opciones.map((opcion, i) => (
            <button
              key={opcion}
              type="button"
              className={`opcion opcion-${i} ${elegida === opcion ? 'elegida' : ''}`}
              style={{ animationDelay: `${80 + i * 70}ms` }}
              aria-pressed={elegida === opcion}
              onClick={() => elegir(opcion)}
              disabled={estado === 'enviando'}
            >
              <span className="opcion-letra">{LETRAS[i]}</span>
              <span className="opcion-texto">{opcion}</span>
            </button>
          ))}
        </div>
      </section>

      <footer className="navegacion">
        <button
          type="button"
          className="boton boton-secundario"
          onClick={() => irA(indice - 1)}
          disabled={indice === 0 || estado === 'enviando'}
        >
          ← Atrás
        </button>

        {!esUltima && elegida && (
          <button type="button" className="boton boton-secundario" onClick={() => irA(indice + 1)}>
            Siguiente →
          </button>
        )}
      </footer>

      {esUltima && (
        <div className="zona-envio">
          {errorEnvio && (
            <p className="mensaje-error" role="alert">
              {errorEnvio}
            </p>
          )}

          {nombreRepetido ? (
            <form className="formulario" onSubmit={enviarConOtroNombre}>
              <input
                className="campo"
                type="text"
                maxLength={40}
                placeholder="Otro nombre o apodo"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                autoFocus
              />
              <button className="boton boton-principal" type="submit" disabled={estado === 'enviando'}>
                {estado === 'enviando' ? 'Enviando…' : 'Enviar con este nombre 🎁'}
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="boton boton-principal boton-enviar"
              onClick={() => enviar()}
              disabled={!todoRespondido || estado === 'enviando'}
            >
              {estado === 'enviando'
                ? 'Enviando…'
                : todoRespondido
                  ? 'Enviar mis respuestas 🎁'
                  : `Te faltan ${total - respondidas} por responder`}
            </button>
          )}
        </div>
      )}
    </main>
  )
}

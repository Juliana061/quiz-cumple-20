import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Fondo from '../components/Fondo'
import { nombreDisponible } from '../lib/api'
import { guardarProgreso, leerJugado, leerProgreso } from '../lib/almacenamiento'
import { limpiarNombre, mensajeDeError, mismoNombre } from '../lib/utilidades'

export default function Inicio() {
  const navigate = useNavigate()
  const progresoPrevio = leerProgreso()

  const [nombre, setNombre] = useState(progresoPrevio?.nombre ?? '')
  const [verificando, setVerificando] = useState(false)
  const [error, setError] = useState('')

  // Si esta persona ya jugó en este celular, la mandamos directo al final
  useEffect(() => {
    if (leerJugado()) navigate('/gracias', { replace: true })
  }, [navigate])

  async function empezar(evento) {
    evento.preventDefault()
    const limpio = limpiarNombre(nombre)

    if (limpio.length < 2) return setError('Escribe tu nombre (mínimo 2 letras) ✍️')
    if (limpio.length > 40) return setError('Ese nombre es muy largo, máximo 40 caracteres.')

    setVerificando(true)
    setError('')
    try {
      // Revisamos en el servidor ANTES de empezar, para no responder 20 preguntas en vano
      const libre = await nombreDisponible(limpio)
      if (!libre) {
        setError(`Alguien ya jugó como "${limpio}". Agrégale tu apellido o un apodo 😉`)
        setVerificando(false)
        return
      }

      // Si es la misma persona que dejó el quiz a medias, conservamos su avance
      const continuar = progresoPrevio && mismoNombre(progresoPrevio.nombre, limpio)
      guardarProgreso(
        continuar
          ? { ...progresoPrevio, nombre: limpio }
          : { nombre: limpio, indice: 0, respuestas: {}, ordenes: {} }
      )
      navigate('/quiz')
    } catch (err) {
      setError(mensajeDeError(err))
      setVerificando(false)
    }
  }

  const respondidas = Object.keys(progresoPrevio?.respuestas ?? {}).length

  return (
    <main className="pantalla">
      <Fondo />

      <section className="inicio aparecer">
        <div className="numero-20" aria-hidden="true">
          <span className="globo-numero rosa">2</span>
          <span className="globo-numero amarillo">0</span>
        </div>

        <p className="etiqueta">🎉 Edición cumpleaños 🎉</p>
        <h1 className="titulo">¿Quién me conoce más?</h1>

        <div className="tarjeta bienvenida">
          <p>
            ¡Hola! Cumplo <strong>20 años</strong> y quiero saber quién me conoce de verdad. Son{' '}
            <strong>20 preguntas</strong>, una por cada año que cumplo 🎂
          </p>
          <p className="suave">
            Solo puedes jugar una vez. Al final verás cuántas acertaste y quién va ganando 🏆
          </p>
        </div>

        <form className="formulario" onSubmit={empezar} noValidate>
          <label htmlFor="nombre" className="etiqueta-campo">
            ¿Cómo te llamas?
          </label>
          <input
            id="nombre"
            className="campo"
            type="text"
            inputMode="text"
            autoComplete="given-name"
            maxLength={40}
            placeholder="Tu nombre y apellido"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value)
              if (error) setError('')
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'error-nombre' : undefined}
          />

          {error && (
            <p id="error-nombre" className="mensaje-error" role="alert">
              {error}
            </p>
          )}

          {respondidas > 0 && !error && (
            <p className="nota">
              Tienes un quiz a medias ({respondidas}/20). Escribe el mismo nombre para continuar.
            </p>
          )}

          <button className="boton boton-principal" type="submit" disabled={verificando}>
            {verificando ? 'Revisando…' : 'Empezar 🚀'}
          </button>
        </form>
      </section>
    </main>
  )
}

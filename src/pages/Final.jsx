import { useState } from 'react'
import Fondo from '../components/Fondo'
import Confeti from '../components/Confeti'
import RankingEnVivo from '../components/RankingEnVivo'
import { leerJugado } from '../lib/almacenamiento'

/** Mensaje divertido según qué tan bien le fue (en porcentaje de aciertos). */
function mensajeSegunPuntaje(puntaje, total) {
  const porcentaje = total > 0 ? puntaje / total : 0
  if (porcentaje === 1) return '¡PERFECTO! Me conoces mejor que yo misma 🤯'
  if (porcentaje >= 0.8) return '¡Wow! Eres de mi círculo íntimo 💖'
  if (porcentaje >= 0.55) return '¡Nada mal! Me conoces bastante 😎'
  if (porcentaje >= 0.3) return 'Mmm… nos falta pasar más tiempo juntos 😅'
  return '¿Seguro que me conoces? 🙈'
}

export default function Final() {
  const jugado = leerJugado()
  const nombre = jugado?.nombre?.split(' ')[0]
  const total = jugado?.total || 20
  // Puntaje guardado en el celular; si no está (jugó con una versión anterior),
  // se toma del ranking que devuelve el servidor
  const [puntajeServidor, setPuntajeServidor] = useState(null)
  const puntaje = typeof jugado?.puntaje === 'number' ? jugado.puntaje : puntajeServidor
  const tienePuntaje = typeof puntaje === 'number'

  return (
    <main className="pantalla">
      <Fondo />
      <Confeti />

      <section className="final aparecer">
        <div className="torta" aria-hidden="true">
          🎂
        </div>
        <h1 className="titulo">¡Gracias por jugar{nombre ? `, ${nombre}` : ''}!</h1>

        {tienePuntaje && (
          <div className="tarjeta centrado puntaje-final">
            <p className="puntaje-etiqueta">Acertaste</p>
            <p className="puntaje-numero">
              {puntaje}
              <span>/{total}</span>
            </p>
            <p className="puntaje-mensaje">{mensajeSegunPuntaje(puntaje, total)}</p>
          </div>
        )}

        <RankingEnVivo
          miNombre={jugado?.nombre}
          total={total}
          onMiPuesto={(p) => setPuntajeServidor(p.puntaje)}
        />

        <div className="tarjeta centrado">
          <p className="final-mensaje">
            El ganador se corona en mi cumple <span aria-hidden="true">🎂</span>
          </p>
          <p className="suave">
            El ranking puede cambiar hasta el último día. ¡No le pases las respuestas a nadie! 🤫
          </p>
        </div>
        <p className="firma">Nos vemos en la fiesta 🥳</p>
      </section>
    </main>
  )
}

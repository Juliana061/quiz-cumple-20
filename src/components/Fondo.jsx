import { useMemo } from 'react'

// Fondo festivo: globos y chispitas flotando suavemente detrás del contenido.
const COLORES = ['#ff3d8b', '#ffd23f', '#2ee6c9', '#ff8a3d', '#a66bff']

export default function Fondo({ cantidad = 14 }) {
  // Se calcula una sola vez para que los globos no "salten" en cada render
  const globos = useMemo(
    () =>
      Array.from({ length: cantidad }, (_, i) => ({
        id: i,
        izquierda: Math.random() * 100,
        tamano: 26 + Math.random() * 46,
        duracion: 14 + Math.random() * 14,
        retraso: -Math.random() * 28,
        color: COLORES[i % COLORES.length],
        chispa: i % 3 === 0,
      })),
    [cantidad]
  )

  return (
    <div className="fondo" aria-hidden="true">
      {globos.map((g) =>
        g.chispa ? (
          <span
            key={g.id}
            className="chispa"
            style={{
              left: `${g.izquierda}%`,
              animationDuration: `${g.duracion}s`,
              animationDelay: `${g.retraso}s`,
              color: g.color,
              fontSize: g.tamano * 0.6,
            }}
          >
            ✦
          </span>
        ) : (
          <span
            key={g.id}
            className="globo"
            style={{
              left: `${g.izquierda}%`,
              width: g.tamano,
              height: g.tamano * 1.2,
              animationDuration: `${g.duracion}s`,
              animationDelay: `${g.retraso}s`,
              '--color-globo': g.color,
            }}
          />
        )
      )}
    </div>
  )
}

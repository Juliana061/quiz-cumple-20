import { useMemo } from 'react'

// Lluvia de confeti hecha solo con CSS (sin librerías).
const COLORES = ['#ff3d8b', '#ffd23f', '#2ee6c9', '#ff8a3d', '#a66bff', '#ffffff']

export default function Confeti({ cantidad = 70 }) {
  const piezas = useMemo(
    () =>
      Array.from({ length: cantidad }, (_, i) => ({
        id: i,
        izquierda: Math.random() * 100,
        retraso: Math.random() * 2.5,
        duracion: 2.8 + Math.random() * 2.5,
        color: COLORES[i % COLORES.length],
        giro: Math.random() * 360,
        ancho: 6 + Math.random() * 8,
        redondo: i % 4 === 0,
      })),
    [cantidad]
  )

  return (
    <div className="confeti" aria-hidden="true">
      {piezas.map((p) => (
        <span
          key={p.id}
          style={{
            left: `${p.izquierda}%`,
            width: p.ancho,
            height: p.redondo ? p.ancho : p.ancho * 1.8,
            background: p.color,
            borderRadius: p.redondo ? '50%' : 2,
            animationDelay: `${p.retraso}s`,
            animationDuration: `${p.duracion}s`,
            transform: `rotate(${p.giro}deg)`,
          }}
        />
      ))}
    </div>
  )
}

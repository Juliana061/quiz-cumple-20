// Indicador de carga con una velita que titila 🕯️
export default function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="cargando" role="status">
      <div className="velita" aria-hidden="true">
        <span className="llama" />
      </div>
      <p>{texto}</p>
    </div>
  )
}

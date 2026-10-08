import { Navigate, Route, Routes } from 'react-router-dom'
import { configuracionCompleta } from './lib/supabase'
import Inicio from './pages/Inicio'
import Quiz from './pages/Quiz'
import Final from './pages/Final'
import Ranking from './pages/Ranking'
import Fondo from './components/Fondo'

export default function App() {
  // Si faltan las variables de entorno, mostramos cómo arreglarlo
  if (!configuracionCompleta) {
    return (
      <main className="pantalla">
        <Fondo />
        <section className="tarjeta aparecer">
          <h1 className="titulo-chico">⚙️ Falta configurar Supabase</h1>
          <p>
            Crea un archivo <code>.env</code> (copiando <code>.env.example</code>) con{' '}
            <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>, y reinicia el
            servidor. En Vercel, agrégalas en <em>Settings → Environment Variables</em>.
          </p>
        </section>
      </main>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/quiz" element={<Quiz />} />
      <Route path="/gracias" element={<Final />} />
      <Route path="/admin-juli" element={<Ranking />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

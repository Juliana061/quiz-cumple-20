import { createClient } from '@supabase/supabase-js'

// Variables de entorno (definidas en .env localmente o en Vercel)
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Si faltan, la app muestra una pantalla de ayuda en vez de romperse
export const configuracionCompleta = Boolean(url && anonKey)

export const supabase = configuracionCompleta
  ? createClient(url, anonKey, { auth: { persistSession: false } })
  : null

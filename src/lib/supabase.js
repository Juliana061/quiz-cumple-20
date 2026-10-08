import { createClient } from '@supabase/supabase-js'

// Datos públicos del proyecto de Supabase. La URL y la llave "publishable"
// están hechas para ir dentro de la app (cualquier navegador las ve), así que
// dejarlas aquí no es un riesgo: la seguridad la ponen RLS y las funciones SQL.
// Se usan solo si no llegan las variables de entorno (.env o Vercel).
const URL_RESPALDO = 'https://kpursnvwsnjjntggsopr.supabase.co'
const LLAVE_RESPALDO = 'sb_publishable_gJHZx8U0f6iZIhjDi-fx_Q_OxpUQIjD'

const url = import.meta.env.VITE_SUPABASE_URL || URL_RESPALDO
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || LLAVE_RESPALDO

// Si faltan, la app muestra una pantalla de ayuda en vez de romperse
export const configuracionCompleta = Boolean(url && anonKey)

export const supabase = configuracionCompleta
  ? createClient(url, anonKey, { auth: { persistSession: false } })
  : null

import { supabase } from './supabase'

// Todas las llamadas a Supabase pasan por aquí.
// Cada función lanza el error tal cual para que la pantalla lo traduzca.

/** Trae las preguntas ordenadas (la tabla es de lectura pública). */
export async function cargarPreguntas() {
  const { data, error } = await supabase
    .from('preguntas')
    .select('id, orden, texto, opciones, imagen_url')
    .order('orden', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Cuenta cuántas preguntas hay (para mostrar "x/20" en el ranking). */
export async function contarPreguntas() {
  const { count, error } = await supabase
    .from('preguntas')
    .select('id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 20
}

/** Pregunta al servidor si el nombre está libre. */
export async function nombreDisponible(nombre) {
  const { data, error } = await supabase.rpc('nombre_disponible', { nombre })
  if (error) throw error
  return data === true
}

/** Envía las respuestas; el puntaje se calcula en el servidor y se devuelve. */
export async function enviarRespuestas(nombre, respuestas) {
  const { data, error } = await supabase.rpc('enviar_respuestas', { nombre, respuestas })
  if (error) throw error
  return typeof data === 'number' ? data : null
}

/** Ranking visible para quienes ya jugaron (posición, nombre y puntaje). */
export async function obtenerRankingPublico() {
  const { data, error } = await supabase.rpc('ranking_publico')
  if (error) throw error
  return (data ?? []).map((p) => ({ ...p, posicion: Number(p.posicion) }))
}

/** Pide el ranking con la contraseña. */
export async function obtenerRanking(clave) {
  const { data, error } = await supabase.rpc('obtener_ranking', { clave })
  if (error) throw error
  return data ?? []
}

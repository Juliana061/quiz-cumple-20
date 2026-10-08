// Manejo de localStorage. Todo va en try/catch porque en modo incógnito
// o con el almacenamiento bloqueado, localStorage puede lanzar errores.

const CLAVE_JUGADO = 'cumple20:jugado'
const CLAVE_PROGRESO = 'cumple20:progreso'

function leer(clave) {
  try {
    const valor = localStorage.getItem(clave)
    return valor ? JSON.parse(valor) : null
  } catch {
    return null
  }
}

function escribir(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    /* sin almacenamiento: la app sigue funcionando igual */
  }
}

function borrar(clave) {
  try {
    localStorage.removeItem(clave)
  } catch {
    /* nada que hacer */
  }
}

/* ---------- ¿Ya jugó? ---------- */

/** Devuelve { nombre, fecha, puntaje, total } si esta persona ya envió sus respuestas. */
export const leerJugado = () => leer(CLAVE_JUGADO)

export const marcarJugado = (nombre, puntaje = null, total = null) =>
  escribir(CLAVE_JUGADO, { nombre, puntaje, total, fecha: new Date().toISOString() })

/* ---------- Progreso a medias ----------
   Se guarda para que, si se cierra la pestaña o se recarga la página,
   la persona no pierda lo que ya respondió.
   Forma: { nombre, indice, respuestas: {id: opcion}, ordenes: {id: [opciones]} } */

export const leerProgreso = () => leer(CLAVE_PROGRESO)
export const guardarProgreso = (progreso) => escribir(CLAVE_PROGRESO, progreso)
export const borrarProgreso = () => borrar(CLAVE_PROGRESO)

/* ---------- Clave del ranking (solo mientras dure la pestaña) ---------- */

export function leerClaveRanking() {
  try {
    return sessionStorage.getItem('cumple20:clave') || ''
  } catch {
    return ''
  }
}

export function guardarClaveRanking(clave) {
  try {
    if (clave) sessionStorage.setItem('cumple20:clave', clave)
    else sessionStorage.removeItem('cumple20:clave')
  } catch {
    /* nada que hacer */
  }
}

/** Mezcla un arreglo al azar (algoritmo Fisher–Yates) sin modificar el original. */
export function mezclar(arreglo) {
  const copia = [...arreglo]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

/** Limpia el nombre: sin espacios al inicio/final ni dobles espacios. */
export const limpiarNombre = (nombre) => nombre.trim().replace(/\s+/g, ' ')

/** Para comparar nombres sin importar mayúsculas. */
export const mismoNombre = (a = '', b = '') =>
  limpiarNombre(a).toLowerCase() === limpiarNombre(b).toLowerCase()

/** Detecta si un error viene de no tener internet. */
export function esErrorDeConexion(error) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const mensaje = String(error?.message ?? error ?? '').toLowerCase()
  return ['failed to fetch', 'networkerror', 'network request failed', 'load failed'].some((t) => mensaje.includes(t))
}

/** Convierte cualquier error en un mensaje claro para la persona. */
export function mensajeDeError(error) {
  if (esErrorDeConexion(error)) {
    return 'Parece que no tienes conexión 📡. Revisa tu internet e inténtalo de nuevo.'
  }
  const mensaje = String(error?.message ?? '')
  if (error?.code === '23505' || mensaje.includes('NOMBRE_REPETIDO')) {
    return 'Ese nombre ya lo usó alguien más. Agrégale tu apellido o un apodo 😉'
  }
  if (mensaje.includes('NOMBRE_INVALIDO')) {
    return 'El nombre debe tener entre 2 y 40 caracteres.'
  }
  if (mensaje.includes('CLAVE_INCORRECTA')) {
    return 'Contraseña incorrecta 🙅‍♀️'
  }
  if (mensaje.includes('CLAVE_SIN_CONFIGURAR')) {
    return 'Todavía no has configurado la contraseña del ranking en Supabase (mira el README).'
  }
  return 'Algo salió mal 😵. Inténtalo de nuevo en un momento.'
}

/** Pequeña vibración en celulares compatibles (no hace nada en los demás). */
export function vibrar(ms = 15) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* no soportado */
  }
}

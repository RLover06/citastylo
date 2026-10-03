// El "perfil" del cliente vive en su celular: sus datos para no volver
// a escribirlos y los códigos privados de sus citas. Sin contraseña.
const CLAVE_CITAS = 'turno.citas'
const CLAVE_DATOS = 'turno.cliente'

function leer(clave, porDefecto) {
  try { return JSON.parse(localStorage.getItem(clave)) ?? porDefecto } catch { return porDefecto }
}
function guardar(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)) } catch { /* modo privado */ }
}

export function tokensGuardados() {
  return leer(CLAVE_CITAS, [])
}

export function guardarToken(token) {
  const lista = tokensGuardados().filter(t => t !== token)
  lista.unshift(token)
  guardar(CLAVE_CITAS, lista.slice(0, 40))
}

export function reemplazarToken(viejo, nuevo) {
  guardar(CLAVE_CITAS, [nuevo, ...tokensGuardados().filter(t => t !== viejo && t !== nuevo)])
}

export function datosCliente() {
  return leer(CLAVE_DATOS, { nombre: '', telefono: '' })
}

export function guardarDatosCliente(nombre, telefono) {
  guardar(CLAVE_DATOS, { nombre, telefono })
}

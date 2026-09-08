const PEDIDO_KEY = 'dcg_borrador_pedido';
const COBRO_KEY = 'dcg_borrador_cobro';

function leer(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function guardar(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* cuota llena o modo privado */
  }
}

export function leerBorradorPedido() {
  return leer(PEDIDO_KEY);
}

export function guardarBorradorPedido(draft) {
  const vacio = !draft?.cliente && !(draft?.productosAgregados || []).length && !draft?.observaciones;
  if (vacio) {
    localStorage.removeItem(PEDIDO_KEY);
    return;
  }
  guardar(PEDIDO_KEY, draft);
}

export function borrarBorradorPedido() {
  localStorage.removeItem(PEDIDO_KEY);
}

export function leerBorradorCobro() {
  return leer(COBRO_KEY);
}

export function guardarBorradorCobro(draft) {
  const vacio = !draft?.cliente && !draft?.monto && !draft?.observaciones;
  if (vacio) {
    localStorage.removeItem(COBRO_KEY);
    return;
  }
  guardar(COBRO_KEY, draft);
}

export function borrarBorradorCobro() {
  localStorage.removeItem(COBRO_KEY);
}

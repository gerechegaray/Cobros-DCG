const PRODUCTOS_KEY = 'dcg_productos_catalogo';

export function leerProductosLocales() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRODUCTOS_KEY) || 'null');
    return Array.isArray(parsed?.data) ? parsed.data : [];
  } catch {
    return [];
  }
}

export function guardarProductosLocales(productos) {
  if (!Array.isArray(productos) || productos.length === 0) return;
  try {
    localStorage.setItem(PRODUCTOS_KEY, JSON.stringify({
      data: productos,
      timestamp: Date.now()
    }));
  } catch {
    /* ignore */
  }
}

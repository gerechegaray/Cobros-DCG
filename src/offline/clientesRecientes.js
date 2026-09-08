const KEY = 'dcg_clientes_recientes';

export function leerIdsClientesRecientes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function recordarCliente(cliente) {
  const id = cliente?.id != null ? String(cliente.id) : '';
  if (!id) return;
  const ids = [id, ...leerIdsClientesRecientes().filter((item) => item !== id)].slice(0, 8);
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

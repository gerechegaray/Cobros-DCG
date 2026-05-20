export function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s.%$,-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getClienteNombre(cliente) {
  return cliente?.name || cliente?.nombre || cliente?.['Razon Social'] || cliente?.['Razón Social'] || cliente?.id || '';
}

export function getProductoNombre(producto) {
  return producto?.nombre || producto?.name || producto?.description || 'Sin nombre';
}

export function getProductoCodigo(producto) {
  return producto?.codigo || producto?.reference || producto?.id || '';
}

export function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString('es-AR')}`;
}

export function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('es-AR');
}

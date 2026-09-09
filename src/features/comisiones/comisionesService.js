import { apiRequest } from '../../services/api';

export const getComisiones = (vendedor, periodo) =>
  apiRequest(`/api/comisiones/${encodeURIComponent(vendedor)}/${encodeURIComponent(periodo)}`);

export const getComisionesVendedor = (vendedor) =>
  apiRequest(`/api/comisiones/${encodeURIComponent(vendedor)}`);

export const calcularComisiones = (periodo) =>
  apiRequest(`/api/comisiones/calcular/${encodeURIComponent(periodo)}`, { method: 'POST' });

export const getReglasComisiones = () => apiRequest('/api/comisiones/reglas');

export const syncFacturas = () =>
  apiRequest('/api/comisiones/sync-facturas', { method: 'POST' });

export const syncFacturasCompleta = (offset = 0, limit = 20) =>
  apiRequest(`/api/comisiones/sync-facturas?completa=true&offset=${offset}&limit=${limit}`, {
    method: 'POST'
  });

export const seedReglas = () =>
  apiRequest('/api/comisiones/reglas/seed', { method: 'POST' });

export const calcularComisionFlete = (periodo) =>
  apiRequest(`/api/comisiones/flete/calcular/${encodeURIComponent(periodo)}`, { method: 'POST' });

export const syncPeriodoComisiones = (periodo, { fase = 'cobros', offset = 0, limit = 6, forzar = false } = {}) =>
  apiRequest(
    `/api/comisiones/sync-periodo/${encodeURIComponent(periodo)}?fase=${encodeURIComponent(fase)}&offset=${offset}&limit=${limit}${forzar ? '&forzar=1' : ''}`,
    { method: 'POST' }
  );

export async function sincronizarMesComisiones(periodo, onProgress, { forzar = false } = {}) {
  let fase = 'cobros';
  let offset = 0;
  let guard = 0;

  while (fase !== 'done' && guard < 80) {
    if (onProgress) onProgress({ fase, offset, paso: guard + 1 });
    const lote = await syncPeriodoComisiones(periodo, { fase, offset, limit: 6, forzar: forzar && guard === 0 });
    if (lote.skipped || lote.nextFase === 'done') {
      break;
    }
    if (lote.hasMore) {
      offset = lote.nextOffset || 0;
      fase = lote.fase || fase;
    } else {
      fase = lote.nextFase || 'done';
      offset = 0;
    }
    guard += 1;
  }
}

export async function sincronizarYCalcularPeriodo(periodo, onProgress, opciones = {}) {
  await sincronizarMesComisiones(periodo, onProgress, opciones);
  await Promise.all([
    calcularComisiones(periodo),
    calcularComisionFlete(periodo)
  ]);
}

export function topProductosDesdeDetalle(detalle, limit = 10) {
  const agrupado = {};
  (detalle || []).forEach((item) => {
    const nombre = String(item.producto || 'Sin nombre').trim() || 'Sin nombre';
    if (!agrupado[nombre]) {
      agrupado[nombre] = {
        id: nombre,
        nombre,
        codigo: '-',
        cantidadTotal: 0,
        montoTotal: 0
      };
    }
    agrupado[nombre].cantidadTotal += 1;
    agrupado[nombre].montoTotal += parseFloat(item.subtotal) || 0;
  });
  const lista = Object.values(agrupado).sort((a, b) => b.montoTotal - a.montoTotal);
  const total = lista.reduce((sum, row) => sum + row.montoTotal, 0);
  return {
    top: lista.slice(0, limit),
    total
  };
}

export const getComisionFlete = (vendedor, periodo) =>
  apiRequest(`/api/comisiones/flete/${encodeURIComponent(vendedor)}/${encodeURIComponent(periodo)}`);

export const cerrarPeriodo = (periodo) =>
  apiRequest(`/api/comisiones/cerrar/${encodeURIComponent(periodo)}`, { method: 'POST' });

export const agregarAjuste = (vendedor, periodo, tipo, monto, motivo) =>
  apiRequest('/api/comisiones/ajuste', {
    method: 'POST',
    body: JSON.stringify({ vendedor, periodo, tipo, monto, motivo })
  });

export const pagarComision = (vendedor, periodo, notaPago = '') =>
  apiRequest(`/api/comisiones/pagar/${encodeURIComponent(vendedor)}/${encodeURIComponent(periodo)}`, {
    method: 'POST',
    body: JSON.stringify({ notaPago })
  });

export function fleteAplicable(vendedor, flete) {
  if (vendedor !== 'Santi') return 0;
  return Number(flete?.comisionFlete) || 0;
}

export function totalALiquidar(vendedor, comisiones, flete) {
  return (Number(comisiones?.totalFinal) || Number(comisiones?.totalComision) || 0)
    + fleteAplicable(vendedor, flete);
}

export function leyendaLiquidacion(vendedor) {
  if (vendedor === 'Guille') {
    return '= Comisión por cobranza + básico $1.400.000 (sin flete)';
  }
  if (vendedor === 'Santi') {
    return '= Comisión por cobranza + flete (1,2% + bono por kg + $400.000)';
  }
  return '= Comisión por venta (sin flete)';
}

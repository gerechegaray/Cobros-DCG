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

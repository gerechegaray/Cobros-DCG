// src/services/api.js
// Servicio centralizado para peticiones al backend
// 🆕 FORZAR DEPLOY - Actualizado para usar nuevo backend

import { ALEGRA_CONFIG, getDefaultConfig } from '../config/alegra.js';
import { authHeaders } from '../utils/authHeaders';

// 🆕 En desarrollo local, usar localhost. En producción, usar la URL configurada
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:3001' : 'https://sist-gestion-dcg.onrender.com');

// Función helper para hacer peticiones al backend
export const apiRequest = async (endpoint, options = {}) => {
  const version = Date.now();
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${API_BASE_URL}${endpoint}${separator}v=${version}`;
  const headers = await authHeaders({
    'Content-Type': 'application/json',
    ...options.headers,
  });

  const { headers: _ignored, ...rest } = options;
  const response = await fetch(url, {
    ...rest,
    headers
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Funciones específicas para cada endpoint
export const api = {
  // 🆕 Servicios de Alegra
  getAlegraInvoices: (dias = ALEGRA_CONFIG.INVOICES.DEFAULT_DAYS, limit = ALEGRA_CONFIG.INVOICES.MAX_PER_REQUEST, maxInvoices = ALEGRA_CONFIG.INVOICES.DEFAULT_TOTAL) => {
    // 🆕 Intentar cargar configuración guardada localmente
    let savedConfig = null;
    try {
      const saved = localStorage.getItem('alegra_config');
      if (saved) {
        savedConfig = JSON.parse(saved);
      }
    } catch {
      savedConfig = null;
    }
    
    const config = getDefaultConfig();
    const finalDias = dias || savedConfig?.dias || config.dias;
    const finalLimit = limit || savedConfig?.limit || config.limit;
    const finalMaxInvoices = maxInvoices || savedConfig?.maxInvoices || config.maxInvoices;
    
    return apiRequest(`/api/alegra/invoices?dias=${finalDias}&limit=${finalLimit}&maxInvoices=${finalMaxInvoices}`);
  }, // 🆕 Límite configurable con paginación múltiple
  getAlegraContacts: () => apiRequest('/api/alegra/contacts'),
  getAlegraItems: () => apiRequest('/api/alegra/items'),
  createAlegraQuote: (data) => apiRequest('/api/alegra/quotes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getAlegraQuoteStatus: (id) => apiRequest(`/api/alegra/quote-status/${id}`),
  getAlegraEstimatesUnbilled: (maxEstimates = 150) =>
    apiRequest(`/api/alegra/estimates?maxEstimates=${maxEstimates}`),
  getAlegraEstadoCuenta: (clienteId) => apiRequest(`/api/alegra/estado-cuenta/${clienteId}`),
  
  // 🆕 Estado de cuenta desde caché
  getEstadoCuentaCache: (clienteId) => apiRequest(`/api/estado-cuenta-cache/${clienteId}`),
  refreshEstadoCuentaCache: (clienteId, forzar = false) => apiRequest(`/api/estado-cuenta-cache/refresh/${clienteId}`, {
    method: 'POST',
    body: JSON.stringify({ forzar }),
  }),

  // Clientes
  getClientesFirebase: () => apiRequest('/api/clientes-firebase'),
  syncClientesAlegra: () => apiRequest('/api/sync-clientes-alegra', { method: 'POST' }),
  updateClienteUbicacion: (clienteId, ubicacion) => apiRequest(`/api/clientes-firebase/${clienteId}/ubicacion`, {
    method: 'PUT',
    body: JSON.stringify({ ubicacion }),
  }),

  // Productos
  getProductosFirebase: () => apiRequest('/api/productos-firebase'),
  syncProductosAlegra: () => apiRequest('/api/sync-productos-alegra', { method: 'POST' }),

  // Presupuestos
  getPresupuestos: (_email, _role, params = {}) => {
    const queryParams = new URLSearchParams(params);
    return apiRequest(`/api/presupuestos?${queryParams.toString()}`);
  },
  createPresupuesto: (data) => apiRequest('/api/presupuestos', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updatePresupuesto: (id, data) => apiRequest(`/api/presupuestos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deletePresupuesto: (id) => apiRequest(`/api/presupuestos/${id}`, { method: 'DELETE' }),
  syncEstadosPresupuestos: () => apiRequest('/api/sync-estados-presupuestos', { method: 'POST' }),

  // 🆕 Cobros
  getCobros: (params = {}) => {
    const queryParams = new URLSearchParams(params);
    return apiRequest(`/api/cobros?${queryParams.toString()}`);
  },
  createCobro: (data) => apiRequest('/api/cobros', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateCobro: (id, data) => apiRequest(`/api/cobros/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteCobro: (id) => apiRequest(`/api/cobros/${id}`, { method: 'DELETE' }),
  // 🆕 Actualización masiva de vendedorId
  updateVendedorBulk: () => apiRequest('/api/cobros/update-vendedor-bulk', {
    method: 'POST'
  }),

  // Visitas
  getVisitas: () => apiRequest('/api/visitas'),
  createVisita: (data) => apiRequest('/api/visitas', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateVisita: (id, data) => apiRequest(`/api/visitas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteVisita: (id) => apiRequest(`/api/visitas/${id}`, { method: 'DELETE' }),
  getVisitasProgramadas: () => apiRequest('/api/visitas-programadas'),
  createVisitaProgramada: (data) => apiRequest('/api/visitas-programadas', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateVisitaProgramada: (id, data) => apiRequest(`/api/visitas-programadas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteVisitaProgramada: (id) => apiRequest(`/api/visitas-programadas/${id}`, { method: 'DELETE' }),
  generarVisitas: () => apiRequest('/api/visitas/generar', { method: 'POST' }),
  getVisitasCache: (vendedorId) => {
    const endpoint = vendedorId ? `/api/visitas-cache?vendedorId=${vendedorId}` : '/api/visitas-cache';
    return apiRequest(endpoint);
  },

  // Hojas de ruta
  getHojasDeRuta: () => apiRequest('/api/hojas-de-ruta'),
  exportHojasDeRutaMarkdown: async (params = {}) => {
    const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') acc[key] = value;
      return acc;
    }, {});
    const queryParams = new URLSearchParams(cleanParams).toString();
    const version = Date.now();
    const separator = queryParams ? '&' : '';
    const url = `${API_BASE_URL}/api/hojas-de-ruta/export-md?${queryParams}${separator}v=${version}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await authHeaders({ Accept: 'text/markdown' })
    });

    if (!response.ok) {
      throw new Error(`Error exportando markdown (${response.status})`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition') || '';
    const match = contentDisposition.match(/filename="([^"]+)"/i);
    const filename = match?.[1] || `hojas-de-ruta-${version}.md`;

    return { blob, filename };
  },

  // Cache
  getCacheStatus: () => apiRequest('/api/cache/status'),
  invalidateCache: (tipo) => apiRequest('/api/cache/invalidate', {
    method: 'POST',
    body: JSON.stringify({ tipo }),
  }),
  refreshCache: (tipo) => apiRequest('/api/cache/refresh', {
    method: 'POST',
    body: JSON.stringify({ tipo }),
  }),

  // 🆕 Limpieza de datos
  getCleanupStats: () => apiRequest('/api/cleanup/stats'),
  getCleanupPreview: (params) => {
    const queryParams = new URLSearchParams(params);
    return apiRequest(`/api/cleanup/preview?${queryParams.toString()}`);
  },
  exportCleanupData: (params) => {
    const queryParams = new URLSearchParams(params);
    return apiRequest(`/api/cleanup/export?${queryParams.toString()}`);
  },
  executeCleanup: (params) => apiRequest('/api/cleanup/execute', {
    method: 'POST',
    body: JSON.stringify(params),
  }),
  previewKeepLatest: (days = 60) =>
    apiRequest(`/api/cleanup/keep-latest?days=${days}`),
  executeKeepLatest: (days = 60) => apiRequest('/api/cleanup/keep-latest', {
    method: 'POST',
    body: JSON.stringify({ days }),
  }),

  // 🆕 Sincronizar presupuestos desde Alegra
  sincronizarPresupuestosDesdeAlegra: () => apiRequest('/api/presupuestos/sincronizar-alegra', {
    method: 'POST'
  }),
}; 
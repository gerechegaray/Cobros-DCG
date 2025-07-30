// src/services/api.js
// Servicio centralizado para peticiones al backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Función helper para hacer peticiones al backend
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, finalOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error en petición a ${url}:`, error);
    throw error;
  }
};

// Funciones específicas para cada endpoint
export const api = {
  // Alegra
  getAlegraInvoices: () => apiRequest('/api/alegra/invoices'),
  getAlegraContacts: () => apiRequest('/api/alegra/contacts'),
  getAlegraItems: () => apiRequest('/api/alegra/items'),
  createAlegraQuote: (data) => apiRequest('/api/alegra/quotes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getAlegraQuoteStatus: (id) => apiRequest(`/api/alegra/quote-status/${id}`),
  getAlegraEstadoCuenta: (clienteId) => apiRequest(`/api/alegra/estado-cuenta/${clienteId}`),

  // Clientes
  getClientesFirebase: () => apiRequest('/api/clientes-firebase'),
  syncClientesAlegra: () => apiRequest('/api/sync-clientes-alegra', { method: 'POST' }),

  // Productos
  getProductosFirebase: () => apiRequest('/api/productos-firebase'),
  syncProductosAlegra: () => apiRequest('/api/sync-productos-alegra', { method: 'POST' }),

  // Presupuestos
  getPresupuestos: (email, role) => apiRequest(`/api/presupuestos?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`),
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
  getVisitasCache: (vendedorId) => apiRequest(`/api/visitas-cache?vendedorId=${vendedorId}`),

  // Hojas de ruta
  getHojasDeRuta: () => apiRequest('/api/hojas-de-ruta'),

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
}; 
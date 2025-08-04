// src/config/backend.js
// Configuración centralizada del backend

export const BACKEND_CONFIG = {
  // URL del backend en Render
  API_BASE_URL: import.meta.env.VITE_API_URL || 'https://sist-gestion-dcg.onrender.com',
  
  // Endpoints principales
  ENDPOINTS: {
    // Alegra
    ALEGRA_INVOICES: '/api/alegra/invoices',
    ALEGRA_CONTACTS: '/api/alegra/contacts',
    ALEGRA_ITEMS: '/api/alegra/items',
    ALEGRA_QUOTES: '/api/alegra/quotes',
    ALEGRA_QUOTE_STATUS: '/api/alegra/quote-status',
    ALEGRA_ESTADO_CUENTA: '/api/alegra/estado-cuenta',
    
    // Firebase
    CLIENTES_FIREBASE: '/api/clientes-firebase',
    PRODUCTOS_FIREBASE: '/api/productos-firebase',
    
    // Presupuestos
    PRESUPUESTOS: '/api/presupuestos',
    
    // Visitas
    VISITAS: '/api/visitas',
    VISITAS_CACHE: '/api/visitas-cache',
    VISITAS_PROGRAMADAS: '/api/visitas-programadas',
    
    // Cobros
    COBROS: '/api/cobros',
    
    // Cache
    CACHE_STATUS: '/api/cache/status',
    CACHE_INVALIDATE: '/api/cache/invalidate',
    CACHE_REFRESH: '/api/cache/refresh',
    
    // Limpieza
    CLEANUP_STATS: '/api/cleanup/stats',
    CLEANUP_PREVIEW: '/api/cleanup/preview',
    CLEANUP_EXPORT: '/api/cleanup/export',
    CLEANUP_EXECUTE: '/api/cleanup/execute',
  }
};

// Función para obtener la URL completa de un endpoint
export const getApiUrl = (endpoint) => {
  return `${BACKEND_CONFIG.API_BASE_URL}${endpoint}`;
};

// Función para verificar el estado del backend
export const checkBackendStatus = async () => {
  try {
    const response = await fetch(`${BACKEND_CONFIG.API_BASE_URL}/api/alegra/contacts`);
    return {
      status: 'online',
      url: BACKEND_CONFIG.API_BASE_URL,
      response: response.ok
    };
  } catch (error) {
    return {
      status: 'offline',
      url: BACKEND_CONFIG.API_BASE_URL,
      error: error.message
    };
  }
}; 
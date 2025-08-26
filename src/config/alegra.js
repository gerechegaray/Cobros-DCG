// Configuración para la integración con Alegra

export const ALEGRA_CONFIG = {
  // Límites de facturas
  INVOICES: {
    // Límite por petición (Alegra solo permite máximo 30)
    MAX_PER_REQUEST: 30,
    // Límite total configurable (se obtiene con paginación múltiple)
    DEFAULT_TOTAL: 60,
    // Límite máximo total (para evitar demasiadas peticiones)
    MAX_TOTAL: 150,
    // Rango de días por defecto
    DEFAULT_DAYS: 5,
    // Rangos permitidos
    ALLOWED_DAYS: [1, 3, 5]
  },
  
  // Configuración de paginación
  PAGINATION: {
    // Pausa entre peticiones (ms) para ser respetuosos con la API
    DELAY_BETWEEN_REQUESTS: 100,
    // Máximo número de peticiones consecutivas
    MAX_CONSECUTIVE_REQUESTS: 10
  },
  
  // Estados de facturas
  INVOICE_STATUS: {
    OPEN: 'open',
    PAID: 'paid',
    VOID: 'void'
  }
};

// Función helper para validar límites
export const validateInvoiceLimits = (limit, maxInvoices) => {
  const limitInt = parseInt(limit);
  const maxInvoicesInt = parseInt(maxInvoices);
  
  if (isNaN(limitInt) || limitInt < 1 || limitInt > ALEGRA_CONFIG.INVOICES.MAX_PER_REQUEST) {
    return {
      valid: false,
      error: `El límite por petición debe ser entre 1 y ${ALEGRA_CONFIG.INVOICES.MAX_PER_REQUEST}`
    };
  }
  
  if (isNaN(maxInvoicesInt) || maxInvoicesInt < 1) {
    return {
      valid: false,
      error: 'El máximo total debe ser un número mayor a 0'
    };
  }
  
  if (maxInvoicesInt > ALEGRA_CONFIG.INVOICES.MAX_TOTAL) {
    return {
      valid: false,
      error: `El máximo total no puede exceder ${ALEGRA_CONFIG.INVOICES.MAX_TOTAL} facturas`
    };
  }
  
  return { valid: true };
};

// Función helper para calcular número de peticiones necesarias
export const calculateRequestCount = (maxInvoices, limitPerRequest) => {
  return Math.ceil(maxInvoices / limitPerRequest);
};

// Función helper para obtener configuración por defecto
export const getDefaultConfig = () => {
  return {
    dias: ALEGRA_CONFIG.INVOICES.DEFAULT_DAYS,
    limit: ALEGRA_CONFIG.INVOICES.MAX_PER_REQUEST,
    maxInvoices: ALEGRA_CONFIG.INVOICES.DEFAULT_TOTAL
  };
};

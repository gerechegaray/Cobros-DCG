// Templates/Plantillas de gastos comunes

export const templatesGastos = [
  // Combustible
  {
    id: 'combustible_kangoo_blanca',
    nombre: 'Combustible Kangoo Blanca',
    categoria: 'combustible',
    subcategoria: 'kangoo_blanca',
    monto: 15000,
    frecuencia: 'semanal',
    tipoPago: 'efectivo',
    recordatorio: 1,
    icono: 'pi-car',
    color: '#ef4444'
  },
  {
    id: 'combustible_kangoo_gris',
    nombre: 'Combustible Kangoo Gris',
    categoria: 'combustible',
    subcategoria: 'kangoo_gris',
    monto: 15000,
    frecuencia: 'semanal',
    tipoPago: 'efectivo',
    recordatorio: 1,
    icono: 'pi-car',
    color: '#ef4444'
  },
  {
    id: 'combustible_fastback',
    nombre: 'Combustible Fastback',
    categoria: 'combustible',
    subcategoria: 'fastback',
    monto: 12000,
    frecuencia: 'semanal',
    tipoPago: 'efectivo',
    recordatorio: 1,
    icono: 'pi-car',
    color: '#ef4444'
  },

  // Servicios
  {
    id: 'servicio_luz',
    nombre: 'Servicio de Luz',
    categoria: 'servicios',
    monto: 25000,
    frecuencia: 'mensual',
    tipoPago: 'transferencia',
    subcategoriaTipoPago: 'dcg_sant',
    recordatorio: 7,
    icono: 'pi-bolt',
    color: '#16a34a'
  },
  {
    id: 'servicio_gas',
    nombre: 'Servicio de Gas',
    categoria: 'servicios',
    monto: 18000,
    frecuencia: 'mensual',
    tipoPago: 'transferencia',
    subcategoriaTipoPago: 'dcg_sant',
    recordatorio: 7,
    icono: 'pi-bolt',
    color: '#16a34a'
  },
  {
    id: 'servicio_agua',
    nombre: 'Servicio de Agua',
    categoria: 'servicios',
    monto: 12000,
    frecuencia: 'mensual',
    tipoPago: 'transferencia',
    subcategoriaTipoPago: 'dcg_sant',
    recordatorio: 7,
    icono: 'pi-bolt',
    color: '#16a34a'
  },

  // Sueldos
  {
    id: 'sueldo_german',
    nombre: 'Sueldo German',
    categoria: 'sueldo',
    subcategoria: 'german',
    monto: 150000,
    frecuencia: 'mensual',
    tipoPago: 'transferencia',
    subcategoriaTipoPago: 'dcg_sant',
    recordatorio: 3,
    icono: 'pi-user',
    color: '#3b82f6'
  },
  {
    id: 'sueldo_mariano',
    nombre: 'Sueldo Mariano',
    categoria: 'sueldo',
    subcategoria: 'mariano',
    monto: 120000,
    frecuencia: 'mensual',
    tipoPago: 'transferencia',
    subcategoriaTipoPago: 'dcg_sant',
    recordatorio: 3,
    icono: 'pi-user',
    color: '#3b82f6'
  },

  // Vendedores
  {
    id: 'vendedor_santi',
    nombre: 'Vendedor Santi',
    categoria: 'vendedores',
    subcategoria: 'santi',
    monto: 80000,
    frecuencia: 'mensual',
    tipoPago: 'transferencia',
    subcategoriaTipoPago: 'dcg_sant',
    recordatorio: 3,
    icono: 'pi-users',
    color: '#8b5cf6'
  },
  {
    id: 'vendedor_guille',
    nombre: 'Vendedor Guille',
    categoria: 'vendedores',
    subcategoria: 'guille',
    monto: 80000,
    frecuencia: 'mensual',
    tipoPago: 'transferencia',
    subcategoriaTipoPago: 'dcg_sant',
    recordatorio: 3,
    icono: 'pi-users',
    color: '#8b5cf6'
  },

  // Tarjetas de Crédito
  {
    id: 'tarjeta_santander_visa',
    nombre: 'Tarjeta Santander Visa',
    categoria: 'tarjeta_credito',
    subcategoria: 'santander_visa',
    monto: 0, // Se edita cuando cierra
    frecuencia: 'mensual',
    tipoPago: 'transferencia',
    subcategoriaTipoPago: 'dcg_sant',
    recordatorio: 7,
    icono: 'pi-credit-card',
    color: '#7c3aed'
  },
  {
    id: 'tarjeta_santander_amex',
    nombre: 'Tarjeta Santander Amex',
    categoria: 'tarjeta_credito',
    subcategoria: 'santander_amex',
    monto: 0, // Se edita cuando cierra
    frecuencia: 'mensual',
    tipoPago: 'transferencia',
    subcategoriaTipoPago: 'dcg_sant',
    recordatorio: 7,
    icono: 'pi-credit-card',
    color: '#7c3aed'
  },

  // Préstamos
  {
    id: 'prestamo_bbva',
    nombre: 'Préstamo BBVA',
    categoria: 'prestamos',
    subcategoria: 'bbva',
    monto: 50000,
    frecuencia: 'mensual',
    cuotas: 48,
    tipoPago: 'transferencia',
    subcategoriaTipoPago: 'dcg_sant',
    recordatorio: 7,
    icono: 'pi-credit-card',
    color: '#dc2626'
  },
  {
    id: 'prestamo_kangoo',
    nombre: 'Préstamo Kangoo',
    categoria: 'prestamos',
    subcategoria: 'kangoo_prestamo',
    monto: 45000,
    frecuencia: 'mensual',
    cuotas: 36,
    tipoPago: 'transferencia',
    subcategoriaTipoPago: 'dcg_sant',
    recordatorio: 7,
    icono: 'pi-credit-card',
    color: '#dc2626'
  },

  // Mantenimiento
  {
    id: 'mantenimiento_service',
    nombre: 'Service Vehículo',
    categoria: 'mantenimiento_vehiculo',
    subcategoria: 'service',
    monto: 35000,
    frecuencia: 'mensual',
    tipoPago: 'efectivo',
    recordatorio: 7,
    icono: 'pi-wrench',
    color: '#f59e0b'
  },

  // Proveedores
  {
    id: 'proveedor_insuga',
    nombre: 'Proveedor Insuga',
    categoria: 'proveedores',
    subcategoria: 'insuga',
    monto: 0, // Se edita según la compra
    frecuencia: 'mensual',
    tipoPago: 'transferencia',
    subcategoriaTipoPago: 'dcg_sant',
    recordatorio: 7,
    icono: 'pi-truck',
    color: '#ea580c'
  },
  {
    id: 'proveedor_baires',
    nombre: 'Proveedor Baires',
    categoria: 'proveedores',
    subcategoria: 'baires',
    monto: 0, // Se edita según la compra
    frecuencia: 'mensual',
    tipoPago: 'transferencia',
    subcategoriaTipoPago: 'dcg_sant',
    recordatorio: 7,
    icono: 'pi-truck',
    color: '#ea580c'
  }
];

// Función para obtener templates por categoría
export const getTemplatesByCategoria = (categoria) => {
  return templatesGastos.filter(template => template.categoria === categoria);
};

// Función para obtener template por ID
export const getTemplateById = (id) => {
  return templatesGastos.find(template => template.id === id);
};

// Función para buscar templates
export const buscarTemplates = (texto) => {
  const textoLower = texto.toLowerCase();
  return templatesGastos.filter(template => 
    template.nombre.toLowerCase().includes(textoLower) ||
    template.categoria.toLowerCase().includes(textoLower)
  );
};

// Función para crear gasto desde template
export const crearGastoDesdeTemplate = (template, fechaVencimiento) => {
  return {
    categoria: template.categoria,
    subcategoria: template.subcategoria,
    montoTotal: template.monto,
    fechaVencimiento: fechaVencimiento,
    nota: `Creado desde template: ${template.nombre}`,
    tipoPago: template.tipoPago,
    subcategoriaTipoPago: template.subcategoriaTipoPago,
    frecuencia: template.frecuencia,
    cuotas: template.cuotas || 1,
    recordatorio: template.recordatorio,
    proyeccion: template.frecuencia !== 'unico',
    tipo: template.frecuencia !== 'unico' ? 'recurrente' : 'gasto'
  };
};

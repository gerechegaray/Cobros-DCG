// Constantes para el sistema de gastos

export const categoriasGastos = [
  { id: 'combustible', nombre: 'Combustible', color: '#ef4444', icono: 'pi-car' },
  { id: 'mantenimiento_vehiculo', nombre: 'Mantenimiento/Reparación Vehículo', color: '#f59e0b', icono: 'pi-wrench' },
  { id: 'libreria_insumos', nombre: 'Librería/Insumos Oficina', color: '#10b981', icono: 'pi-book' },
  { id: 'sueldo', nombre: 'Sueldo', color: '#3b82f6', icono: 'pi-user' },
  { id: 'vendedores', nombre: 'Vendedores', color: '#8b5cf6', icono: 'pi-users' },
  { id: 'descargadores', nombre: 'Descargadores', color: '#6b7280', icono: 'pi-box' },
  { id: 'prestamos', nombre: 'Préstamos', color: '#dc2626', icono: 'pi-credit-card' },
  { id: 'proveedores', nombre: 'Proveedores', color: '#ea580c', icono: 'pi-truck' },
  { id: 'gastos_bancarios', nombre: 'Gastos Bancarios', color: '#059669', icono: 'pi-building' },
  { id: 'echeqs', nombre: 'Echeqs', color: '#0284c7', icono: 'pi-file-edit' },
  { id: 'tarjeta_credito', nombre: 'Tarjeta de Crédito', color: '#7c3aed', icono: 'pi-credit-card' },
  { id: 'servicios', nombre: 'Servicios', color: '#16a34a', icono: 'pi-cog' },
  { id: 'impuestos', nombre: 'Impuestos', color: '#2563eb', icono: 'pi-file-text' },
  { id: 'dgr', nombre: 'DGR', color: '#dc2626', icono: 'pi-file-pdf' },
  { id: 'publicidad', nombre: 'Publicidad', color: '#ea580c', icono: 'pi-megaphone' },
  { id: 'servicios_oficina', nombre: 'Servicios Oficina', color: '#059669', icono: 'pi-desktop' },
  { id: 'otros_gastos', nombre: 'Otros Gastos', color: '#6b7280', icono: 'pi-ellipsis-h' }
];

// Subcategorías por categoría
export const subcategoriasGastos = {
  combustible: [
    { id: 'kangoo_blanca', nombre: 'Kangoo Blanca' },
    { id: 'kangoo_gris', nombre: 'Kangoo Gris' },
    { id: 'fastback', nombre: 'Fastback' },
    { id: 'berlingo', nombre: 'Berlingo' },
    { id: 'etios', nombre: 'Etios' },
    { id: 'hilux', nombre: 'Hilux' },
    { id: 'corsa', nombre: 'Corsa' },
    { id: 'otro_vehiculo', nombre: 'Otro' }
  ],
  mantenimiento_vehiculo: [
    { id: 'service', nombre: 'Service' },
    { id: 'otros_mantenimiento', nombre: 'Otros' }
  ],
  sueldo: [
    { id: 'german', nombre: 'German' },
    { id: 'mariano', nombre: 'Mariano' },
    { id: 'diego', nombre: 'Diego' },
    { id: 'ruben', nombre: 'Ruben' },
    { id: 'samuel', nombre: 'Samuel' }
  ],
  vendedores: [
    { id: 'santi', nombre: 'Santi' },
    { id: 'guille', nombre: 'Guille' }
  ],
  prestamos: [
    { id: 'kangoo_prestamo', nombre: 'Kangoo' },
    { id: 'dcg_prestamo', nombre: 'DCG' },
    { id: 'roe_sant', nombre: 'ROE Sant' },
    { id: 'bbva', nombre: 'BBVA' },
    { id: 'otro_prestamo', nombre: 'Otro' }
  ],
  proveedores: [
    { id: 'insuga', nombre: 'Insuga' },
    { id: 'baires', nombre: 'Baires' },
    { id: 'merlo', nombre: 'Merlo' },
    { id: 'leon', nombre: 'Leon' },
    { id: 'th', nombre: 'TH' },
    { id: 'euro', nombre: 'Euro' },
    { id: 'troquelados', nombre: 'Troquelados' },
    { id: 'alfolatex', nombre: 'Alfolatex' },
    { id: 'alcohol_hector', nombre: 'Alcohol Hector' },
    { id: 'san_juan_pharma', nombre: 'San Juan Pharma' },
    { id: 'mervak', nombre: 'Mervak' },
    { id: 'tecnovax', nombre: 'Tecnovax' },
    { id: 'sclab', nombre: 'Sclab' },
    { id: 'celulosa', nombre: 'Celulosa' },
    { id: 'jenner', nombre: 'Jenner' },
    { id: 'elmer', nombre: 'Elmer' },
    { id: 'guerreiro', nombre: 'Guerreiro' },
    { id: 'zoover', nombre: 'Zoover' },
    { id: 'otro_proveedor', nombre: 'Otro' }
  ],
  gastos_bancarios: [
    { id: 'comision', nombre: 'Comisión' },
    { id: 'impuesto_bancario', nombre: 'Impuesto' },
    { id: 'otro_bancario', nombre: 'Otro' }
  ],
  echeqs: [
    { id: 'entregados', nombre: 'Entregados' },
    { id: 'descontados', nombre: 'Descontados' },
    { id: 'otro_echeq', nombre: 'Otro' }
  ],
  tarjeta_credito: [
    { id: 'santander_visa', nombre: 'Santander Visa' },
    { id: 'santander_amex', nombre: 'Santander Amex' },
    { id: 'frances', nombre: 'Francés' },
    { id: 'otra_tarjeta', nombre: 'Otro' }
  ]
};

// Función para obtener subcategorías por categoría
export const getSubcategoriasByCategoria = (categoriaId) => {
  return subcategoriasGastos[categoriaId] || [];
};

export const estadosGastos = [
  { id: 'pendiente', nombre: 'Pendiente', color: '#f59e0b' },
  { id: 'pagado', nombre: 'Pagado', color: '#10b981' },
  { id: 'vencido', nombre: 'Vencido', color: '#ef4444' },
  { id: 'proximo_vencer', nombre: 'Próximo a Vencer', color: '#f97316' }
];

export const tiposProyeccion = [
  { id: 'unico', nombre: 'Único', cuotas: 1 },
  { id: 'mensual', nombre: 'Mensual', cuotas: 12 },
  { id: 'trimestral', nombre: 'Trimestral', cuotas: 4 },
  { id: 'semestral', nombre: 'Semestral', cuotas: 2 },
  { id: 'anual', nombre: 'Anual', cuotas: 1 },
  { id: 'personalizado', nombre: 'Personalizado', cuotas: 'variable' }
];

export const tiposPago = [
  { id: 'efectivo', nombre: 'Efectivo' },
  { id: 'transferencia', nombre: 'Transferencia' },
  { id: 'otro', nombre: 'Otro' }
];

// Subcategorías para tipos de pago
export const subcategoriasTiposPago = {
  transferencia: [
    { id: 'dcg_sant', nombre: 'DCG Sant' },
    { id: 'mp', nombre: 'MP' },
    { id: 'roe_sant', nombre: 'ROE Sant' },
    { id: 'dcg_galicia', nombre: 'DCG Galicia' },
    { id: 'otro_transferencia', nombre: 'Otro' }
  ]
};

// Función para obtener subcategorías por tipo de pago
export const getSubcategoriasByTipoPago = (tipoPagoId) => {
  return subcategoriasTiposPago[tipoPagoId] || [];
};

export const recordatorios = [
  { id: 1, nombre: '1 día antes' },
  { id: 3, nombre: '3 días antes' },
  { id: 7, nombre: '1 semana antes' },
  { id: 15, nombre: '15 días antes' },
  { id: 30, nombre: '1 mes antes' }
];

// Función para obtener el color del evento según estado y categoría
export const getEventColor = (gasto) => {
  if (gasto.estado === 'vencido') return '#ef4444';
  if (gasto.estado === 'proximo_vencer') return '#f97316';
  if (gasto.estado === 'pagado') return '#10b981';
  return categoriasGastos.find(c => c.id === gasto.categoria)?.color || '#6b7280';
};

// Función para determinar si un gasto está próximo a vencer
export const isProximoVencer = (fechaVencimiento, dias = 7) => {
  const hoy = new Date();
  const vencimiento = new Date(fechaVencimiento);
  const diferenciaDias = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
  return diferenciaDias <= dias && diferenciaDias >= 0;
};

// Función para determinar si un gasto está vencido
export const isVencido = (fechaVencimiento) => {
  const hoy = new Date();
  const vencimiento = new Date(fechaVencimiento);
  return vencimiento < hoy;
};

// Función para actualizar el estado de un gasto
export const actualizarEstadoGasto = (gasto) => {
  if (gasto.estado === 'pagado') return gasto;
  
  if (isVencido(gasto.fechaVencimiento)) {
    return { ...gasto, estado: 'vencido' };
  }
  
  if (isProximoVencer(gasto.fechaVencimiento)) {
    return { ...gasto, estado: 'proximo_vencer' };
  }
  
  return { ...gasto, estado: 'pendiente' };
};

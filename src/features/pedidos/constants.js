// Estados de pedidos (simplificado)
export const ESTADOS_PEDIDO = [
  { label: 'Pendiente', value: 'pendiente', color: 'warning' },
  { label: 'Facturado', value: 'facturado', color: 'success' }
];

// Condiciones de pago
export const CONDICIONES_PAGO = [
  { label: 'Contado', value: 'contado' },
  { label: 'Cuenta Corriente', value: 'cuenta_corriente' }
];

// Obtener color por estado
export const getColorEstado = (estado) => {
  const estadoObj = ESTADOS_PEDIDO.find(e => e.value === estado);
  return estadoObj ? estadoObj.color : 'secondary';
};

// Obtener label por estado
export const getLabelEstado = (estado) => {
  const estadoObj = ESTADOS_PEDIDO.find(e => e.value === estado);
  return estadoObj ? estadoObj.label : estado;
};

// Obtener label por condición de pago
export const getLabelCondicionPago = (condicion) => {
  const condicionObj = CONDICIONES_PAGO.find(c => c.value === condicion);
  return condicionObj ? condicionObj.label : condicion;
};


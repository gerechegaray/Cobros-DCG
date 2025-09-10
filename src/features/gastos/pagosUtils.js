// Sistema de pagos parciales para gastos de proveedores

// Función para calcular el saldo pendiente
export const calcularSaldoPendiente = (gasto) => {
  // Validar que el gasto no sea null o undefined
  if (!gasto) {
    return 0;
  }
  
  const montoTotal = gasto.montoTotal || gasto.monto || 0;
  const pagosParciales = gasto.pagosParciales || [];
  const totalPagado = pagosParciales.reduce((sum, pago) => sum + pago.monto, 0);
  return montoTotal - totalPagado;
};

// Función para verificar si el gasto está completamente pagado
export const estaCompletamentePagado = (gasto) => {
  const saldoPendiente = calcularSaldoPendiente(gasto);
  return saldoPendiente <= 0;
};

// Función para obtener el estado del gasto basado en pagos parciales
export const obtenerEstadoGasto = (gasto) => {
  const saldoPendiente = calcularSaldoPendiente(gasto);
  const fechaVencimiento = new Date(gasto.fechaVencimiento);
  const hoy = new Date();
  
  if (saldoPendiente <= 0) {
    return 'pagado';
  } else if (fechaVencimiento < hoy) {
    return 'vencido';
  } else if (fechaVencimiento <= new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000)) {
    return 'proximo_vencer';
  } else {
    return 'pendiente';
  }
};

// Función para agregar un pago parcial
export const agregarPagoParcial = (gasto, pagoData) => {
  const pagosParciales = gasto.pagosParciales || [];
  const nuevoPago = {
    id: Date.now().toString(),
    monto: pagoData.monto,
    fecha: pagoData.fecha,
    tipoPago: pagoData.tipoPago,
    subcategoriaTipoPago: pagoData.subcategoriaTipoPago,
    nota: pagoData.nota || '',
    usuario: pagoData.usuario,
    fechaCreacion: new Date().toISOString()
  };
  
  return {
    ...gasto,
    pagosParciales: [...pagosParciales, nuevoPago],
    estado: obtenerEstadoGasto({
      ...gasto,
      pagosParciales: [...pagosParciales, nuevoPago]
    })
  };
};

// Función para editar un pago parcial
export const editarPagoParcial = (gasto, pagoId, pagoData) => {
  const pagosParciales = gasto.pagosParciales || [];
  const pagoIndex = pagosParciales.findIndex(p => p.id === pagoId);
  
  if (pagoIndex === -1) return gasto;
  
  const pagosActualizados = [...pagosParciales];
  pagosActualizados[pagoIndex] = {
    ...pagosActualizados[pagoIndex],
    ...pagoData,
    fechaModificacion: new Date().toISOString()
  };
  
  return {
    ...gasto,
    pagosParciales: pagosActualizados,
    estado: obtenerEstadoGasto({
      ...gasto,
      pagosParciales: pagosActualizados
    })
  };
};

// Función para eliminar un pago parcial
export const eliminarPagoParcial = (gasto, pagoId) => {
  const pagosParciales = gasto.pagosParciales || [];
  const pagosActualizados = pagosParciales.filter(p => p.id !== pagoId);
  
  return {
    ...gasto,
    pagosParciales: pagosActualizados,
    estado: obtenerEstadoGasto({
      ...gasto,
      pagosParciales: pagosActualizados
    })
  };
};

// Función para obtener el resumen de pagos
export const obtenerResumenPagos = (gasto) => {
  // Validar que el gasto no sea null o undefined
  if (!gasto) {
    return {
      montoTotal: 0,
      totalPagado: 0,
      saldoPendiente: 0,
      porcentajePagado: 0,
      cantidadPagos: 0,
      ultimoPago: null
    };
  }
  
  const montoTotal = gasto.montoTotal || gasto.monto || 0;
  const pagosParciales = gasto.pagosParciales || [];
  const totalPagado = pagosParciales.reduce((sum, pago) => sum + pago.monto, 0);
  const saldoPendiente = montoTotal - totalPagado;
  const porcentajePagado = montoTotal > 0 ? (totalPagado / montoTotal) * 100 : 0;
  
  return {
    montoTotal,
    totalPagado,
    saldoPendiente,
    porcentajePagado: Math.round(porcentajePagado * 100) / 100,
    cantidadPagos: pagosParciales.length,
    ultimoPago: pagosParciales.length > 0 ? pagosParciales[pagosParciales.length - 1] : null
  };
};

// Función para verificar si un gasto permite pagos parciales
export const permitePagosParciales = (gasto) => {
  // Validar que el gasto no sea null o undefined
  if (!gasto) {
    return false;
  }
  
  // Solo gastos de proveedores con vencimiento futuro permiten pagos parciales
  return gasto.categoria === 'proveedores' && 
         gasto.estado !== 'pagado' && 
         new Date(gasto.fechaVencimiento) > new Date();
};

// Función para formatear el resumen de pagos para mostrar
export const formatearResumenPagos = (gasto) => {
  // Validar que el gasto no sea null o undefined
  if (!gasto) {
    return {
      texto: '$0 / $0',
      porcentaje: '0%',
      saldo: 'Saldo: $0',
      pagos: '0 pagos'
    };
  }
  
  const resumen = obtenerResumenPagos(gasto);
  return {
    texto: `$${resumen.totalPagado.toLocaleString('es-AR')} / $${resumen.montoTotal.toLocaleString('es-AR')}`,
    porcentaje: `${resumen.porcentajePagado}%`,
    saldo: `Saldo: $${resumen.saldoPendiente.toLocaleString('es-AR')}`,
    pagos: `${resumen.cantidadPagos} pago${resumen.cantidadPagos !== 1 ? 's' : ''}`
  };
};

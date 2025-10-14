import moment from 'moment';
import { FORMAS_PAGO, ESTADO_LABELS, ACCION_LABELS } from './constants';

// Formatear monto con separador de miles
export const formatearMonto = (monto) => {
  if (!monto && monto !== 0) return '$0';
  return `$${Number(monto).toLocaleString('es-AR')}`;
};

// Formatear fecha
export const formatearFecha = (fecha) => {
  if (!fecha) return '-';
  
  // Si es un Timestamp de Firebase
  if (fecha?.toDate) {
    return moment(fecha.toDate()).format('DD/MM/YYYY');
  }
  
  // Si es una fecha JavaScript
  if (fecha instanceof Date) {
    return moment(fecha).format('DD/MM/YYYY');
  }
  
  // Si es un string o timestamp
  return moment(fecha).format('DD/MM/YYYY');
};

// Formatear fecha y hora
export const formatearFechaHora = (fecha) => {
  if (!fecha) return '-';
  
  if (fecha?.toDate) {
    return moment(fecha.toDate()).format('DD/MM/YYYY HH:mm');
  }
  
  if (fecha instanceof Date) {
    return moment(fecha).format('DD/MM/YYYY HH:mm');
  }
  
  return moment(fecha).format('DD/MM/YYYY HH:mm');
};

// Obtener label de forma de pago
export const getFormaPagoLabel = (valor) => {
  const formaPago = FORMAS_PAGO.find(fp => fp.value === valor);
  return formaPago ? formaPago.label : valor;
};

// Obtener label de estado
export const getEstadoLabel = (estado) => {
  return ESTADO_LABELS[estado] || estado;
};

// Obtener label de acción de log
export const getAccionLabel = (accion) => {
  return ACCION_LABELS[accion] || accion;
};

// Validar monto
export const validarMonto = (monto) => {
  if (!monto || monto <= 0) {
    return 'El monto debe ser mayor a 0';
  }
  return null;
};

// Validar fecha
export const validarFecha = (fecha) => {
  if (!fecha) {
    return 'La fecha es requerida';
  }
  return null;
};

// Validar cliente
export const validarCliente = (cliente) => {
  if (!cliente || cliente.trim() === '') {
    return 'El cliente es requerido';
  }
  return null;
};

// Validar forma de pago
export const validarFormaPago = (formaPago) => {
  if (!formaPago) {
    return 'La forma de pago es requerida';
  }
  return null;
};

// Calcular totales por estado
export const calcularTotalesPorEstado = (cobros) => {
  const totales = {
    pendiente: 0,
    cargado: 0,
    total: 0
  };
  
  cobros.forEach(cobro => {
    const monto = Number(cobro.monto) || 0;
    totales.total += monto;
    
    if (cobro.estado === 'pendiente') {
      totales.pendiente += monto;
    } else if (cobro.estado === 'cargado') {
      totales.cargado += monto;
    }
  });
  
  return totales;
};

// Calcular totales por vendedor
export const calcularTotalesPorVendedor = (cobros) => {
  const totales = {};
  
  cobros.forEach(cobro => {
    const vendedor = cobro.vendedor || 'Sin asignar';
    const monto = Number(cobro.monto) || 0;
    
    if (!totales[vendedor]) {
      totales[vendedor] = {
        pendiente: 0,
        cargado: 0,
        total: 0,
        cantidad: 0
      };
    }
    
    totales[vendedor].total += monto;
    totales[vendedor].cantidad += 1;
    
    if (cobro.estado === 'pendiente') {
      totales[vendedor].pendiente += monto;
    } else if (cobro.estado === 'cargado') {
      totales[vendedor].cargado += monto;
    }
  });
  
  return totales;
};

// Calcular totales por forma de pago
export const calcularTotalesPorFormaPago = (cobros) => {
  const totales = {};
  
  cobros.forEach(cobro => {
    const formaPago = cobro.formaPago || 'Sin especificar';
    const monto = Number(cobro.monto) || 0;
    
    if (!totales[formaPago]) {
      totales[formaPago] = 0;
    }
    
    totales[formaPago] += monto;
  });
  
  return totales;
};

// Filtrar cobros por rango de fechas
export const filtrarPorRangoFechas = (cobros, fechaInicio, fechaFin) => {
  if (!fechaInicio && !fechaFin) return cobros;
  
  return cobros.filter(cobro => {
    if (!cobro.fechaCobro) return false;
    
    const fecha = cobro.fechaCobro?.toDate ? 
      cobro.fechaCobro.toDate() : 
      new Date(cobro.fechaCobro);
    
    if (fechaInicio && fecha < fechaInicio) return false;
    if (fechaFin && fecha > fechaFin) return false;
    
    return true;
  });
};

// Exportar cobros a CSV
export const exportarCobrosCsv = (cobros) => {
  const headers = ['Fecha', 'Cliente', 'Monto', 'Forma de Pago', 'Estado', 'Vendedor', 'Notas'];
  
  const rows = cobros.map(cobro => [
    formatearFecha(cobro.fechaCobro),
    cobro.cliente,
    cobro.monto,
    getFormaPagoLabel(cobro.formaPago),
    getEstadoLabel(cobro.estado),
    cobro.vendedor,
    cobro.notas || ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
};

// Descargar archivo CSV
export const descargarCsv = (contenido, nombreArchivo = 'cobros.csv') => {
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', nombreArchivo);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


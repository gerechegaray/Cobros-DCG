// Sistema de notificaciones y alertas para gastos
import moment from 'moment';

// Configurar moment para español
moment.locale('es');

// Tipos de alertas
export const TIPOS_ALERTA = {
  VENCIMIENTO_PROXIMO: 'vencimiento_proximo',
  VENCIMIENTO_URGENTE: 'vencimiento_urgente',
  VENCIDO: 'vencido',
  PAGO_PARCIAL: 'pago_parcial',
  PAGO_COMPLETO: 'pago_completo'
};

// Configuración de alertas
export const CONFIG_ALERTAS = {
  [TIPOS_ALERTA.VENCIMIENTO_PROXIMO]: {
    dias: 7,
    color: '#f59e0b',
    icono: 'pi pi-clock',
    mensaje: 'Vence en {dias} días'
  },
  [TIPOS_ALERTA.VENCIMIENTO_URGENTE]: {
    dias: 3,
    color: '#ef4444',
    icono: 'pi pi-exclamation-triangle',
    mensaje: 'Vence en {dias} días - URGENTE'
  },
  [TIPOS_ALERTA.VENCIDO]: {
    dias: 0,
    color: '#dc2626',
    icono: 'pi pi-times-circle',
    mensaje: 'VENCIDO hace {dias} días'
  },
  [TIPOS_ALERTA.PAGO_PARCIAL]: {
    color: '#3b82f6',
    icono: 'pi pi-check-circle',
    mensaje: 'Pago parcial realizado'
  },
  [TIPOS_ALERTA.PAGO_COMPLETO]: {
    color: '#10b981',
    icono: 'pi pi-check',
    mensaje: 'Gasto completamente pagado'
  }
};

// Función para calcular días hasta vencimiento
export const calcularDiasHastaVencimiento = (fechaVencimiento) => {
  const hoy = moment();
  const vencimiento = moment(fechaVencimiento);
  return vencimiento.diff(hoy, 'days');
};

// Función para determinar el tipo de alerta
export const determinarTipoAlerta = (gasto) => {
  const diasHastaVencimiento = calcularDiasHastaVencimiento(gasto.fechaVencimiento);
  
  // Si está completamente pagado
  if (gasto.estado === 'pagado') {
    return null; // No mostrar alerta
  }
  
  // Si está vencido
  if (diasHastaVencimiento < 0) {
    return TIPOS_ALERTA.VENCIDO;
  }
  
  // Si está próximo a vencer (3 días)
  if (diasHastaVencimiento <= 3) {
    return TIPOS_ALERTA.VENCIMIENTO_URGENTE;
  }
  
  // Si está próximo a vencer (7 días)
  if (diasHastaVencimiento <= 7) {
    return TIPOS_ALERTA.VENCIMIENTO_PROXIMO;
  }
  
  return null; // No mostrar alerta
};

// Función para generar alertas para un gasto
export const generarAlertasGasto = (gasto) => {
  const alertas = [];
  const tipoAlerta = determinarTipoAlerta(gasto);
  
  if (tipoAlerta) {
    const config = CONFIG_ALERTAS[tipoAlerta];
    const diasHastaVencimiento = calcularDiasHastaVencimiento(gasto.fechaVencimiento);
    
    alertas.push({
      id: `${gasto.id}_${tipoAlerta}`,
      gastoId: gasto.id,
      tipo: tipoAlerta,
      titulo: gasto.titulo,
      mensaje: config.mensaje.replace('{dias}', Math.abs(diasHastaVencimiento)),
      color: config.color,
      icono: config.icono,
      fechaVencimiento: gasto.fechaVencimiento,
      diasHastaVencimiento,
      prioridad: tipoAlerta === TIPOS_ALERTA.VENCIDO ? 1 : 
                 tipoAlerta === TIPOS_ALERTA.VENCIMIENTO_URGENTE ? 2 : 3
    });
  }
  
  return alertas;
};

// Función para generar todas las alertas
export const generarTodasLasAlertas = (gastos) => {
  const todasLasAlertas = [];
  
  gastos.forEach(gasto => {
    const alertas = generarAlertasGasto(gasto);
    todasLasAlertas.push(...alertas);
  });
  
  // Ordenar por prioridad (1 = más urgente)
  return todasLasAlertas.sort((a, b) => a.prioridad - b.prioridad);
};

// Función para filtrar alertas por tipo
export const filtrarAlertasPorTipo = (alertas, tipo) => {
  return alertas.filter(alerta => alerta.tipo === tipo);
};

// Función para obtener resumen de alertas
export const obtenerResumenAlertas = (alertas) => {
  const resumen = {
    total: alertas.length,
    vencidos: 0,
    urgentes: 0,
    proximos: 0
  };
  
  alertas.forEach(alerta => {
    switch (alerta.tipo) {
      case TIPOS_ALERTA.VENCIDO:
        resumen.vencidos++;
        break;
      case TIPOS_ALERTA.VENCIMIENTO_URGENTE:
        resumen.urgentes++;
        break;
      case TIPOS_ALERTA.VENCIMIENTO_PROXIMO:
        resumen.proximos++;
        break;
    }
  });
  
  return resumen;
};

// Función para formatear fecha de vencimiento
export const formatearFechaVencimiento = (fechaVencimiento) => {
  const diasHastaVencimiento = calcularDiasHastaVencimiento(fechaVencimiento);
  
  if (diasHastaVencimiento < 0) {
    return `Hace ${Math.abs(diasHastaVencimiento)} días`;
  } else if (diasHastaVencimiento === 0) {
    return 'Hoy';
  } else if (diasHastaVencimiento === 1) {
    return 'Mañana';
  } else {
    return `En ${diasHastaVencimiento} días`;
  }
};

// Función para verificar si un gasto necesita atención
export const necesitaAtencion = (gasto) => {
  const tipoAlerta = determinarTipoAlerta(gasto);
  return tipoAlerta !== null;
};

// Función para obtener el color de prioridad
export const obtenerColorPrioridad = (tipoAlerta) => {
  const config = CONFIG_ALERTAS[tipoAlerta];
  return config ? config.color : '#6b7280';
};

// Función para obtener el icono de prioridad
export const obtenerIconoPrioridad = (tipoAlerta) => {
  const config = CONFIG_ALERTAS[tipoAlerta];
  return config ? config.icono : 'pi pi-info-circle';
};

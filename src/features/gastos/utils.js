import moment from 'moment';
import { categoriasGastos } from './constants';

// Función para generar cuotas de un gasto
export const generarCuotas = (gasto) => {
  const cuotas = [];
  const fechaInicio = moment(gasto.fechaInicio);
  const montoCuota = gasto.montoTotal / gasto.cuotas;
  
  for (let i = 0; i < gasto.cuotas; i++) {
    const fechaCuota = fechaInicio.clone().add(i, gasto.frecuencia === 'mensual' ? 'months' : 
                                                      gasto.frecuencia === 'trimestral' ? 'quarters' :
                                                      gasto.frecuencia === 'semestral' ? 'months' : 'months');
    
    cuotas.push({
      id: `${gasto.id}_cuota_${i + 1}`,
      gastoId: gasto.id,
      cuota: i + 1,
      fecha: fechaCuota.format('YYYY-MM-DD'),
      monto: montoCuota,
      estado: i < (gasto.cuotasPagadas || 0) ? 'pagado' : 'pendiente',
      proyectado: true,
      titulo: `${gasto.titulo} - Cuota ${i + 1}`,
      categoria: gasto.categoria,
      descripcion: gasto.descripcion
    });
  }
  
  return cuotas;
};

// Función para generar eventos de calendario
export const generarEventosCalendario = (gastos) => {
  const eventos = [];
  
  gastos.forEach(gasto => {
    // Evento principal del gasto
    eventos.push({
      id: gasto.id,
      title: gasto.titulo,
      start: new Date(gasto.fechaVencimiento),
      end: new Date(gasto.fechaVencimiento),
      resource: {
        ...gasto,
        tipo: 'gasto'
      }
    });
    
    // Si tiene proyección, generar eventos de cuotas
    if (gasto.proyeccion && gasto.cuotas > 1) {
      const cuotas = generarCuotas(gasto);
      cuotas.forEach(cuota => {
        eventos.push({
          id: cuota.id,
          title: cuota.titulo,
          start: new Date(cuota.fecha),
          end: new Date(cuota.fecha),
          resource: {
            ...cuota,
            tipo: 'cuota'
          }
        });
      });
    }
  });
  
  return eventos;
};

// Función para calcular métricas de gastos
export const calcularMetricas = (gastos) => {
  const hoy = new Date();
  const proximos7Dias = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const totalPendiente = gastos
    .filter(g => g.estado === 'pendiente')
    .reduce((sum, g) => sum + g.monto, 0);
    
  const totalVencido = gastos
    .filter(g => g.estado === 'vencido')
    .reduce((sum, g) => sum + g.monto, 0);
    
  const totalPagado = gastos
    .filter(g => g.estado === 'pagado')
    .reduce((sum, g) => sum + g.monto, 0);
    
  const proximosVencer = gastos
    .filter(g => {
      const fechaVenc = new Date(g.fechaVencimiento);
      return fechaVenc >= hoy && fechaVenc <= proximos7Dias;
    })
    .reduce((sum, g) => sum + g.monto, 0);
  
  const gastosPorCategoria = categoriasGastos.map(categoria => ({
    categoria: categoria.nombre,
    monto: gastos
      .filter(g => g.categoria === categoria.id)
      .reduce((sum, g) => sum + g.monto, 0)
  }));

  const gastosPorEstado = [
    { estado: 'Pendiente', monto: totalPendiente },
    { estado: 'Vencido', monto: totalVencido },
    { estado: 'Pagado', monto: totalPagado }
  ];
  
  return {
    totalPendiente,
    totalVencido,
    totalPagado,
    proximosVencer,
    gastosPorCategoria,
    gastosPorEstado,
    totalGastos: totalPendiente + totalVencido + totalPagado
  };
};

// Función para generar datos de flujo de caja
export const generarFlujoCaja = (gastos, meses = 12) => {
  const flujoCaja = [];
  const hoy = moment();
  
  for (let i = 0; i < meses; i++) {
    const mes = hoy.clone().add(i, 'months');
    const inicioMes = mes.clone().startOf('month');
    const finMes = mes.clone().endOf('month');
    
    const gastosMes = gastos.filter(gasto => {
      const fechaGasto = moment(gasto.fechaVencimiento);
      return fechaGasto.isBetween(inicioMes, finMes, null, '[]');
    });
    
    const totalMes = gastosMes.reduce((sum, g) => sum + g.monto, 0);
    
    flujoCaja.push({
      mes: mes.format('MMM YYYY'),
      fecha: mes.format('YYYY-MM'),
      total: totalMes,
      cantidad: gastosMes.length,
      gastos: gastosMes
    });
  }
  
  return flujoCaja;
};

// Función para formatear moneda
export const formatMonto = (monto) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(monto);
};

// Función para formatear fecha
export const formatFecha = (fecha) => {
  if (!fecha) {
    return 'Sin fecha';
  }
  
  // Manejar tanto strings ISO como objetos Date
  let fechaParaMoment = fecha;
  if (fecha instanceof Date) {
    fechaParaMoment = fecha.toISOString();
  } else if (typeof fecha === 'string' && !fecha.includes('T')) {
    // Si es un string sin formato ISO, intentar parsearlo
    fechaParaMoment = new Date(fecha).toISOString();
  }
  
  const momentFecha = moment(fechaParaMoment);
  if (!momentFecha.isValid()) {
    console.log('Fecha inválida recibida:', fecha, 'tipo:', typeof fecha);
    return 'Fecha inválida';
  }
  
  return momentFecha.format('DD/MM/YYYY');
};

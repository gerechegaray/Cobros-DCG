export function formatFecha(fecha) {
  if (!fecha) return '';
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return '';
  const fechaArgentina = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return fechaArgentina.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatMonto(monto) {
  const numMonto = Number(monto);
  if (!Number.isFinite(numMonto)) return '$0,00';
  try {
    return String(
      new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(numMonto)
    );
  } catch {
    return '$0,00';
  }
}

export function soloDiaHoyCalendario() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function soloDiaVencimientoComoEnTabla(fechaVencimiento) {
  if (!fechaVencimiento) return null;
  const date = new Date(fechaVencimiento);
  if (Number.isNaN(date.getTime())) return null;
  const fechaArgentina = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return new Date(
    fechaArgentina.getFullYear(),
    fechaArgentina.getMonth(),
    fechaArgentina.getDate()
  );
}

export function esFacturaVencida(fechaVencimiento) {
  const v = soloDiaVencimientoComoEnTabla(fechaVencimiento);
  if (!v) return false;
  return v < soloDiaHoyCalendario();
}

export function esFacturaVenceEnProximosDias(fechaVencimiento, dias = 5) {
  const v = soloDiaVencimientoComoEnTabla(fechaVencimiento);
  if (!v) return false;
  const hoy = soloDiaHoyCalendario();
  const diffDias = Math.round((v.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  return diffDias >= 0 && diffDias <= dias;
}

export function montoPendienteFactura(factura) {
  return (Number(factura?.montoTotal) || 0) - (Number(factura?.montoPagado) || 0);
}

export function estaPagada(factura) {
  return factura?.estado === 'PAGADO' || montoPendienteFactura(factura) <= 0.009;
}

export function etiquetaEstado(factura) {
  if (estaPagada(factura)) return 'PAGADO';
  if (esFacturaVencida(factura.fechaVencimiento)) return 'VENCIDA';
  return 'PENDIENTE';
}

export function severityEstado(etiqueta) {
  if (etiqueta === 'PAGADO') return 'success';
  if (etiqueta === 'VENCIDA') return 'danger';
  if (etiqueta === 'PENDIENTE') return 'warning';
  return 'info';
}

export function ordenarBoletas(boletas) {
  return [...(boletas || [])].sort((a, b) => {
    const aPagada = estaPagada(a) ? 1 : 0;
    const bPagada = estaPagada(b) ? 1 : 0;
    if (aPagada !== bPagada) return aPagada - bPagada;
    const aVencida = !estaPagada(a) && esFacturaVencida(a.fechaVencimiento) ? 0 : 1;
    const bVencida = !estaPagada(b) && esFacturaVencida(b.fechaVencimiento) ? 0 : 1;
    if (aVencida !== bVencida) return aVencida - bVencida;
    const diaA = soloDiaVencimientoComoEnTabla(a.fechaVencimiento)?.getTime() || 0;
    const diaB = soloDiaVencimientoComoEnTabla(b.fechaVencimiento)?.getTime() || 0;
    return diaA - diaB;
  });
}

export function totalVencido(boletas) {
  return (boletas || [])
    .filter((factura) => !estaPagada(factura) && esFacturaVencida(factura.fechaVencimiento))
    .reduce((acc, factura) => acc + montoPendienteFactura(factura), 0);
}

export function proximosVencimientos(boletas, dias = 5) {
  return (boletas || [])
    .filter((factura) => !estaPagada(factura) && esFacturaVenceEnProximosDias(factura.fechaVencimiento, dias))
    .sort((a, b) => {
      const diaA = soloDiaVencimientoComoEnTabla(a.fechaVencimiento)?.getTime() || 0;
      const diaB = soloDiaVencimientoComoEnTabla(b.fechaVencimiento)?.getTime() || 0;
      return diaA - diaB;
    });
}

export function textoVenceEn(fechaVencimiento) {
  const v = soloDiaVencimientoComoEnTabla(fechaVencimiento);
  const hoy = soloDiaHoyCalendario();
  if (!v || !hoy) return formatFecha(fechaVencimiento);
  const diffDias = Math.round((v.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias === 0) return 'hoy';
  if (diffDias === 1) return 'mañana';
  return `el ${formatFecha(fechaVencimiento)}`;
}

export function nombreClienteCuenta(cliente, boletas) {
  if (boletas?.[0]?.clienteNombre) return boletas[0].clienteNombre;
  if (!cliente) return 'Cliente';
  return (
    cliente.name ||
    cliente.nombre ||
    cliente['Razón Social'] ||
    cliente.razonSocial ||
    cliente.id ||
    'Cliente'
  );
}

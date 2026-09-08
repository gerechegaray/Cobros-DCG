import jsPDF from 'jspdf';
import {
  esFacturaVencida,
  estaPagada,
  formatFecha,
  formatMonto,
  montoPendienteFactura,
  ordenarBoletas,
  proximosVencimientos,
  textoVenceEn,
  totalVencido
} from './estadoCuentaUtils';

const MARGIN = 15;

function pageSize(doc) {
  return {
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight()
  };
}

function asegurarEspacio(doc, currentY, mmNecesarios) {
  const { pageHeight } = pageSize(doc);
  if (currentY > pageHeight - mmNecesarios) {
    doc.addPage();
    return 20;
  }
  return currentY;
}

export function dibujarBloqueDeuda(doc, {
  nombreCliente,
  facturas,
  saldoAdeudado,
  datosSoloCache = false,
  currentY
}) {
  const { pageWidth, pageHeight } = pageSize(doc);
  const facturasPendientes = ordenarBoletas((facturas || []).filter((factura) => !estaPagada(factura)));
  const listaProximas = proximosVencimientos(facturasPendientes, 5);
  const vencido = totalVencido(facturasPendientes);

  if (currentY > pageHeight - 35) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(String(nombreCliente || 'Cliente'), MARGIN + 2, currentY + 7);

  doc.setTextColor(197, 48, 48);
  doc.text(`SALDO: ${formatMonto(saldoAdeudado)}`, pageWidth - MARGIN - 2, currentY + 7, {
    align: 'right'
  });
  currentY += 12;

  if (datosSoloCache) {
    currentY = asegurarEspacio(doc, currentY, 20);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(180, 83, 9);
    doc.text(
      'Advertencia: no se pudo actualizar desde Alegra; se usó caché (puede estar desactualizado).',
      MARGIN + 2,
      currentY
    );
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    currentY += 4;
  }

  currentY = asegurarEspacio(doc, currentY, 28);
  doc.setFontSize(8);
  if (vencido > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(127, 29, 29);
    doc.text(`Total facturas vencidas (pendiente): ${formatMonto(vencido)}`, MARGIN + 2, currentY);
    currentY += 4;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(90, 90, 90);
    doc.text('No tiene facturas vencidas.', MARGIN + 2, currentY);
    currentY += 4;
  }
  doc.setFont('helvetica', 'normal');

  if (listaProximas.length > 0) {
    currentY = asegurarEspacio(doc, currentY, 8 + listaProximas.length * 3.5);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text('Próximos vencimientos (5 días):', MARGIN + 2, currentY);
    currentY += 3.5;
    doc.setFont('helvetica', 'normal');
    listaProximas.forEach((factura) => {
      currentY = asegurarEspacio(doc, currentY, 12);
      doc.text(
        `Factura ${factura.numero ?? 'N/A'} vence ${textoVenceEn(factura.fechaVencimiento)}.`,
        MARGIN + 4,
        currentY
      );
      currentY += 3.5;
    });
  }

  doc.setTextColor(0, 0, 0);
  currentY += 2;

  if (facturasPendientes.length > 0) {
    const xFactura = MARGIN + 2;
    const xFecha = MARGIN + 28;
    const xVenc = MARGIN + 52;
    const xEstado = MARGIN + 78;
    const xMontoTot = pageWidth - MARGIN - 52;
    const xPend = pageWidth - MARGIN - 2;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Factura', xFactura, currentY);
    doc.text('Fecha', xFecha, currentY);
    doc.text('Venc.', xVenc, currentY);
    doc.text('Estado', xEstado, currentY);
    doc.text('Monto Total', xMontoTot, currentY, { align: 'right' });
    doc.text('Pendiente', xPend, currentY, { align: 'right' });

    currentY += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(MARGIN, currentY, pageWidth - MARGIN, currentY);
    currentY += 4;

    facturasPendientes.forEach((factura) => {
      if (currentY > pageHeight - 18) {
        doc.addPage();
        currentY = 20;
      }

      const vencida = esFacturaVencida(factura.fechaVencimiento);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(vencida ? 127 : 30, vencida ? 29 : 64, vencida ? 29 : 175);

      doc.text(String(factura.numero ?? 'N/A'), xFactura, currentY);
      doc.text(formatFecha(factura.fechaEmision), xFecha, currentY);
      doc.text(formatFecha(factura.fechaVencimiento), xVenc, currentY);
      doc.setFont('helvetica', 'bold');
      doc.text(vencida ? 'Vencida' : 'Pendiente', xEstado, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(formatMonto(factura.montoTotal), xMontoTot, currentY, { align: 'right' });
      doc.text(formatMonto(montoPendienteFactura(factura)), xPend, currentY, { align: 'right' });

      currentY += 5.5;
    });

    doc.setTextColor(50, 50, 50);
  } else {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('Sin facturas pendientes hoy.', MARGIN + 2, currentY);
    currentY += 4;
  }

  return currentY;
}

export function exportarEstadoCuentaClientePdf({ nombreCliente, facturas, saldoAdeudado }) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const { pageWidth, pageHeight } = pageSize(doc);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Distribuidora DCG', pageWidth / 2, 14, { align: 'center' });
  doc.setFontSize(16);
  doc.text('ESTADO DE CUENTA', pageWidth / 2, 22, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Generado el: ${new Date().toLocaleString('es-AR')}`,
    pageWidth - 10,
    28,
    { align: 'right' }
  );
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(
    'Leyenda: Vencida = vencimiento anterior a hoy. Pendiente = aún no vencida. Solo facturas con saldo.',
    MARGIN,
    34
  );
  doc.setTextColor(0, 0, 0);

  dibujarBloqueDeuda(doc, {
    nombreCliente,
    facturas,
    saldoAdeudado,
    currentY: 40
  });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Distribuidora DCG', pageWidth / 2, pageHeight - 10, { align: 'center' });

  const safe = String(nombreCliente || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_');
  const fecha = new Date().toISOString().split('T')[0];
  doc.save(`estado_cuenta_${safe}_${fecha}.pdf`);
}

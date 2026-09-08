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
const LOGO_SRC = `${import.meta.env.BASE_URL}apple-touch-icon.png`;

let logoDataUrlPromise;

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

function cargarLogoDcg() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch(LOGO_SRC)
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error('logo');
        return respuesta.blob();
      })
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          })
      )
      .catch(() => null);
  }
  return logoDataUrlPromise;
}

function nombreArchivoBase(nombreCliente) {
  const safe = String(nombreCliente || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_');
  const fecha = new Date().toISOString().split('T')[0];
  return `estado_cuenta_${safe}_${fecha}`;
}

function nombreArchivoPdf(nombreCliente) {
  return `${nombreArchivoBase(nombreCliente)}.pdf`;
}

function nombreArchivoJpeg(nombreCliente) {
  return `${nombreArchivoBase(nombreCliente)}.jpg`;
}

async function cargarLogoImagen() {
  const dataUrl = await cargarLogoDcg();
  if (!logoDataUrlEsValido(dataUrl)) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function logoDataUrlEsValido(dataUrl) {
  return typeof dataUrl === 'string' && dataUrl.startsWith('data:');
}

function facturasPendientesDe(facturas) {
  return ordenarBoletas((facturas || []).filter((factura) => !estaPagada(factura)));
}

function textoCorto(ctx, texto, maxWidth) {
  const valor = String(texto ?? '');
  if (ctx.measureText(valor).width <= maxWidth) return valor;
  let recorte = valor;
  while (recorte.length > 1 && ctx.measureText(`${recorte}…`).width > maxWidth) {
    recorte = recorte.slice(0, -1);
  }
  return `${recorte}…`;
}

function canvasAJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo generar la imagen'));
      },
      'image/jpeg',
      quality
    );
  });
}

function escalaCanvasSegura(anchoCss, altoCss) {
  const maxPixeles = 16_777_216;
  let escala = 2;
  while (escala > 1 && anchoCss * escala * altoCss * escala > maxPixeles) {
    escala -= 0.25;
  }
  if (anchoCss * escala * altoCss * escala > maxPixeles) {
    return 1;
  }
  return escala;
}

async function armarImagenCliente({ nombreCliente, facturas, saldoAdeudado }) {
  const pendientes = facturasPendientesDe(facturas);
  const vencido = totalVencido(pendientes);
  const logo = await cargarLogoImagen();

  const ancho = 1080;
  const margen = 40;
  const filaAlto = 36;
  const encabezadoAlto = 250;
  const alto = encabezadoAlto + 32 + Math.max(pendientes.length, 1) * filaAlto + 56;
  const escala = escalaCanvasSegura(ancho, alto);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(ancho * escala);
  canvas.height = Math.round(alto * escala);
  const ctx = canvas.getContext('2d');
  ctx.scale(escala, escala);
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ancho, alto);

  const logoTam = 88;
  if (logo) {
    ctx.drawImage(logo, margen, 28, logoTam, logoTam);
  }

  const textoX = logo ? margen + logoTam + 20 : margen;
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 28px Helvetica, Arial, sans-serif';
  ctx.fillText('ESTADO DE CUENTA', textoX, 52);

  ctx.font = '400 16px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Distribuidora DCG', textoX, 82);
  ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleString('es-AR'), ancho - margen, 40);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#0f172a';
  ctx.font = '700 24px Helvetica, Arial, sans-serif';
  ctx.fillText(String(nombreCliente || 'Cliente'), margen, 148);

  ctx.font = '700 22px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#b91c1c';
  ctx.textAlign = 'right';
  ctx.fillText(`Saldo ${formatMonto(saldoAdeudado)}`, ancho - margen, 148);
  ctx.textAlign = 'left';

  ctx.font = '600 16px Helvetica, Arial, sans-serif';
  if (vencido > 0) {
    ctx.fillStyle = '#7f1d1d';
    ctx.fillText(`Vencido ${formatMonto(vencido)} · ${pendientes.length} factura${pendientes.length === 1 ? '' : 's'}`, margen, 184);
  } else {
    ctx.fillStyle = '#64748b';
    ctx.fillText(`Sin facturas vencidas · ${pendientes.length} factura${pendientes.length === 1 ? '' : 's'}`, margen, 184);
  }

  const yTabla = 220;
  const cols = {
    factura: margen,
    fecha: 250,
    venc: 430,
    estado: 620,
    total: ancho - margen - 210,
    pend: ancho - margen
  };

  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(margen - 8, yTabla - 18, ancho - margen * 2 + 16, 32);
  ctx.fillStyle = '#64748b';
  ctx.font = '700 14px Helvetica, Arial, sans-serif';
  ctx.fillText('Factura', cols.factura, yTabla);
  ctx.fillText('Fecha', cols.fecha, yTabla);
  ctx.fillText('Venc.', cols.venc, yTabla);
  ctx.fillText('Estado', cols.estado, yTabla);
  ctx.textAlign = 'right';
  ctx.fillText('Total', cols.total, yTabla);
  ctx.fillText('Pendiente', cols.pend, yTabla);
  ctx.textAlign = 'left';

  if (pendientes.length === 0) {
    ctx.font = 'italic 16px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Sin facturas pendientes.', margen, yTabla + filaAlto);
  } else {
    pendientes.forEach((factura, index) => {
      const y = yTabla + 28 + index * filaAlto;
      const vencida = esFacturaVencida(factura.fechaVencimiento);
      if (index % 2 === 1) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(margen - 8, y - filaAlto / 2, ancho - margen * 2 + 16, filaAlto);
      }

      ctx.fillStyle = vencida ? '#7f1d1d' : '#1e3a8a';
      ctx.font = '600 15px Helvetica, Arial, sans-serif';
      ctx.fillText(textoCorto(ctx, factura.numero ?? 's/n', 180), cols.factura, y);
      ctx.font = '400 15px Helvetica, Arial, sans-serif';
      ctx.fillText(formatFecha(factura.fechaEmision), cols.fecha, y);
      ctx.fillText(formatFecha(factura.fechaVencimiento), cols.venc, y);
      ctx.font = '700 15px Helvetica, Arial, sans-serif';
      ctx.fillText(vencida ? 'Vencida' : 'Pendiente', cols.estado, y);
      ctx.font = '400 15px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(formatMonto(factura.montoTotal), cols.total, y);
      ctx.font = '700 15px Helvetica, Arial, sans-serif';
      ctx.fillText(formatMonto(montoPendienteFactura(factura)), cols.pend, y);
      ctx.textAlign = 'left';
    });
  }

  ctx.fillStyle = '#94a3b8';
  ctx.font = '400 13px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Distribuidora DCG', ancho / 2, alto - 24);
  ctx.textAlign = 'left';

  const blob = await canvasAJpeg(canvas, 0.82);
  return { blob, fileName: nombreArchivoJpeg(nombreCliente) };
}

export async function dibujarEncabezadoPdf(doc, { titulo, leyenda }) {
  const { pageWidth } = pageSize(doc);
  const logo = await cargarLogoDcg();
  const logoW = 22;
  const logoH = 22;
  let textX = MARGIN;

  if (logo) {
    doc.addImage(logo, 'PNG', MARGIN, 8, logoW, logoH);
    textX = MARGIN + logoW + 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(titulo, textX, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Generado el: ${new Date().toLocaleString('es-AR')}`,
    pageWidth - 10,
    12,
    { align: 'right' }
  );

  if (leyenda) {
    doc.setFontSize(7);
    doc.text(leyenda, MARGIN, 33);
  }

  doc.setTextColor(0, 0, 0);
  return 38;
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

export function textoEstadoCuentaWhatsApp({ nombreCliente, facturas, saldoAdeudado }) {
  const pendientes = facturasPendientesDe(facturas);
  const vencido = totalVencido(pendientes);
  return [
    'Distribuidora DCG',
    `Estado de cuenta de ${nombreCliente || 'cliente'}`,
    `Saldo: ${formatMonto(saldoAdeudado)}`,
    `Vencido: ${formatMonto(vencido)}`
  ].join('\n');
}

async function armarPdfCliente({ nombreCliente, facturas, saldoAdeudado }) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const { pageHeight, pageWidth } = pageSize(doc);

  const currentY = await dibujarEncabezadoPdf(doc, {
    titulo: 'ESTADO DE CUENTA',
    leyenda: 'Vencida = vencimiento anterior a hoy. Pendiente = aún no vencida. Solo facturas con saldo.'
  });

  dibujarBloqueDeuda(doc, {
    nombreCliente,
    facturas,
    saldoAdeudado,
    currentY
  });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Distribuidora DCG', pageWidth / 2, pageHeight - 10, { align: 'center' });

  const fileName = nombreArchivoPdf(nombreCliente);
  return { doc, fileName, blob: doc.output('blob') };
}

export async function exportarEstadoCuentaClientePdf(opts) {
  const { doc, fileName } = await armarPdfCliente(opts);
  doc.save(fileName);
}

export async function compartirEstadoCuentaWhatsApp(opts) {
  const { blob, fileName } = await armarImagenCliente(opts);
  const texto = textoEstadoCuentaWhatsApp(opts);
  const file = new File([blob], fileName, { type: 'image/jpeg' });
  const payload = {
    title: 'Estado de cuenta DCG',
    text: texto
  };

  if (navigator.share) {
    const puedeArchivos = !navigator.canShare || navigator.canShare({ files: [file] });
    if (puedeArchivos) {
      try {
        await navigator.share({ ...payload, files: [file] });
        return 'imagen';
      } catch (error) {
        if (error?.name === 'AbortError') throw error;
      }
    }

    await navigator.share(payload);
    return 'texto';
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
  return 'whatsapp';
}

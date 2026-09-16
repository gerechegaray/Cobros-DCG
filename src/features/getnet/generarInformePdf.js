import jsPDF from 'jspdf';
import { formatearFechaCorta, formatearFechaHora, formatearMontoArs, nombreArchivoInforme } from './utils';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 15;
const MARGIN_TOP = 13;
const MARGIN_BOTTOM = 13;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const AZUL_OSC = [13, 59, 110];
const AZUL_MED = [27, 79, 138];
const AZUL_ACENTO = [77, 163, 224];
const AZUL_KPI_BG = [235, 244, 255];
const AZUL_SEC_BG = [240, 247, 255];
const AZUL_ROW1 = [235, 244, 255];
const AZUL_TOTAL = [208, 232, 251];
const GRIS_TEXTO = [68, 68, 68];
const GRIS_LEVE = [170, 204, 238];
const SUBTITULO = [128, 184, 220];
const PERIODO = [144, 187, 217];

function setFill(doc, rgb) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function setDraw(doc, rgb) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function setText(doc, rgb) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function ensureSpace(doc, y, needed) {
  if (y + needed <= PAGE_H - MARGIN_BOTTOM) return y;
  doc.addPage();
  return MARGIN_TOP;
}

function drawSectionTitle(doc, y, texto, ancho, x = MARGIN_X) {
  const h = 7;
  setFill(doc, AZUL_SEC_BG);
  doc.rect(x, y, ancho, h, 'F');
  setFill(doc, AZUL_ACENTO);
  doc.rect(x, y, 2, h, 'F');
  setText(doc, AZUL_MED);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(texto, x + 5, y + 4.8);
  return y + h;
}

function drawHeader(doc, informe) {
  const x = MARGIN_X;
  let y = MARGIN_TOP;
  const h = 28;
  const banda = 5.5;

  setFill(doc, AZUL_ACENTO);
  doc.rect(x, y, banda, h, 'F');
  setFill(doc, AZUL_OSC);
  doc.rect(x + banda, y, CONTENT_W - banda, h, 'F');

  setText(doc, SUBTITULO);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('INFORME  DE  VENTAS', x + banda + 6, y + 8);

  setText(doc, [255, 255, 255]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(informe.propietario, x + banda + 6, y + 16.5);

  setText(doc, PERIODO);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const periodo = `Período   ${formatearFechaCorta(informe.fechaDesde)} — ${formatearFechaCorta(informe.fechaHasta)}`;
  doc.text(periodo, x + banda + 6, y + 22.5);

  return y + h + 4;
}

function drawKpis(doc, y, informe) {
  const { kpis, mostrarNeto } = informe;
  const items = [
    ['Monto Bruto', formatearMontoArs(kpis.bruto)],
    ['Transacciones', String(kpis.transacciones)],
    ['Ticket Prom.', formatearMontoArs(kpis.ticketPromedio)],
    ['Ticket Máx.', formatearMontoArs(kpis.ticketMax)],
    ['Ticket Mín.', formatearMontoArs(kpis.ticketMin)]
  ];
  if (mostrarNeto) {
    items.splice(3, 0, ['Monto Neto', formatearMontoArs(kpis.neto)]);
  }

  const gap = 1.6;
  const n = items.length;
  const w = (CONTENT_W - gap * (n - 1)) / n;
  const headH = 6;
  const bodyH = 12;

  items.forEach((item, idx) => {
    const x = MARGIN_X + idx * (w + gap);
    setFill(doc, AZUL_MED);
    doc.rect(x, y, w, headH, 'F');
    setText(doc, [255, 255, 255]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(item[0].toUpperCase(), x + w / 2, y + 4.1, { align: 'center' });

    setFill(doc, AZUL_KPI_BG);
    doc.rect(x, y + headH, w, bodyH, 'F');
    setDraw(doc, GRIS_LEVE);
    doc.setLineWidth(0.2);
    doc.rect(x, y + headH, w, bodyH, 'S');
    setFill(doc, AZUL_ACENTO);
    doc.rect(x, y + headH + bodyH - 1.6, w, 1.6, 'F');

    setText(doc, AZUL_MED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(item[1], x + w / 2, y + headH + 7, { align: 'center' });
  });

  return y + headH + bodyH + 5;
}

function drawTable(doc, startY, x, width, headers, rows, aligns, { fontSize = 7.5, totalRow = null } = {}) {
  const colW = headers.map((h) => width * h.weight);
  const rowH = 6.2;
  let y = startY;

  const paintRow = (cells, { header = false, total = false, zebra = false }) => {
    y = ensureSpace(doc, y, rowH);
    let cx = x;
    cells.forEach((cell, idx) => {
      if (header) setFill(doc, AZUL_MED);
      else if (total) setFill(doc, AZUL_TOTAL);
      else if (zebra) setFill(doc, AZUL_ROW1);
      else setFill(doc, [255, 255, 255]);
      doc.rect(cx, y, colW[idx], rowH, 'F');
      setDraw(doc, GRIS_LEVE);
      doc.setLineWidth(0.15);
      doc.rect(cx, y, colW[idx], rowH, 'S');

      if (header) setText(doc, [255, 255, 255]);
      else setText(doc, GRIS_TEXTO);
      doc.setFont('helvetica', header || total ? 'bold' : 'normal');
      doc.setFontSize(fontSize);

      const align = header ? 'center' : aligns[idx];
      const tx = align === 'right' ? cx + colW[idx] - 1.4 : align === 'center' ? cx + colW[idx] / 2 : cx + 1.4;
      const texto = doc.splitTextToSize(String(cell ?? ''), colW[idx] - 2.4)[0] || '';
      doc.text(texto, tx, y + 4.2, { align });
      cx += colW[idx];
    });
    if (header) {
      setDraw(doc, AZUL_ACENTO);
      doc.setLineWidth(0.6);
      doc.line(x, y + rowH, x + width, y + rowH);
    }
    y += rowH;
  };

  paintRow(headers.map((h) => h.label), { header: true });
  rows.forEach((row, idx) => paintRow(row, { zebra: idx % 2 === 1 }));
  if (totalRow) paintRow(totalRow, { total: true });
  return y;
}

function columnasResumen(mostrarNeto) {
  if (mostrarNeto) {
    return {
      dia: [
        { label: 'Fecha', weight: 0.32 },
        { label: 'Tx', weight: 0.18 },
        { label: 'Bruto', weight: 0.25 },
        { label: 'Neto', weight: 0.25 }
      ],
      marca: [
        { label: 'Marca', weight: 0.32 },
        { label: 'Tx', weight: 0.18 },
        { label: 'Bruto', weight: 0.25 },
        { label: 'Neto', weight: 0.25 }
      ],
      tipo: [
        { label: 'Tipo de Tarjeta', weight: 0.34 },
        { label: 'Tx', weight: 0.16 },
        { label: 'Monto Bruto', weight: 0.25 },
        { label: 'Monto Neto', weight: 0.25 }
      ],
      aligns: ['left', 'center', 'right', 'right']
    };
  }
  return {
    dia: [
      { label: 'Fecha', weight: 0.36 },
      { label: 'Transacciones', weight: 0.32 },
      { label: 'Monto Bruto', weight: 0.32 }
    ],
    marca: [
      { label: 'Marca', weight: 0.36 },
      { label: 'Transacciones', weight: 0.32 },
      { label: 'Monto Bruto', weight: 0.32 }
    ],
    tipo: [
      { label: 'Tipo de Tarjeta', weight: 0.4 },
      { label: 'Transacciones', weight: 0.3 },
      { label: 'Monto Bruto', weight: 0.3 }
    ],
    aligns: ['left', 'center', 'right']
  };
}

function filaResumen(item, etiqueta, mostrarNeto) {
  const base = [etiqueta, String(item.tx), formatearMontoArs(item.bruto)];
  if (mostrarNeto) base.push(formatearMontoArs(item.neto));
  return base;
}

function totalResumen(informe) {
  const base = ['TOTAL', String(informe.kpis.transacciones), formatearMontoArs(informe.kpis.bruto)];
  if (informe.mostrarNeto) base.push(formatearMontoArs(informe.kpis.neto));
  return base;
}

function drawResumen(doc, y, informe) {
  const cols = columnasResumen(informe.mostrarNeto);
  const gap = 4;
  const mitad = (CONTENT_W - gap) / 2;
  const yTitulo = y;
  drawSectionTitle(doc, yTitulo, 'Ventas por Día', mitad, MARGIN_X);
  drawSectionTitle(doc, yTitulo, 'Ventas por Marca', mitad, MARGIN_X + mitad + gap);

  const yTablas = yTitulo + 9;
  const rowsDia = informe.porDia.map((item) => filaResumen(item, formatearFechaCorta(item.etiqueta), informe.mostrarNeto));
  const rowsMarca = informe.porMarca.map((item) => filaResumen(item, item.etiqueta, informe.mostrarNeto));
  const alignsDia = informe.mostrarNeto ? ['center', 'center', 'right', 'right'] : ['center', 'center', 'right'];

  const yDia = drawTable(doc, yTablas, MARGIN_X, mitad, cols.dia, rowsDia, alignsDia, {
    totalRow: totalResumen(informe)
  });
  const yMarca = drawTable(doc, yTablas, MARGIN_X + mitad + gap, mitad, cols.marca, rowsMarca, cols.aligns, {
    totalRow: totalResumen(informe)
  });

  let nextY = Math.max(yDia, yMarca) + 5;
  nextY = ensureSpace(doc, nextY, 20);
  nextY = drawSectionTitle(doc, nextY, 'Ventas por Tipo de Tarjeta', CONTENT_W) + 2;
  const rowsTipo = informe.porTipo.map((item) => filaResumen(item, item.etiqueta, informe.mostrarNeto));
  nextY = drawTable(doc, nextY, MARGIN_X, CONTENT_W, cols.tipo, rowsTipo, cols.aligns, {
    totalRow: totalResumen(informe)
  });
  return nextY;
}

function columnasDetalle(informe) {
  const headers = [
    { label: 'Fecha de Operación', weight: 0, width: 28.5, align: 'left' },
    { label: 'Billetera', weight: 0, width: 25, align: 'center' },
    { label: 'Marca', weight: 0, width: 16, align: 'center' },
    { label: 'Tipo', weight: 0, width: 24, align: 'center' },
    { label: 'Nro Cupón', weight: 0, width: 28.5, align: 'center' }
  ];
  if (informe.tieneCuotas) {
    headers.push({ label: 'Plan Cuotas', weight: 0, width: 14, align: 'center' });
  }
  const fijo = headers.reduce((acc, col) => acc + col.width, 0);
  const resto = CONTENT_W - fijo;
  if (informe.mostrarNeto) {
    headers.push({ label: 'Monto Bruto', weight: 0, width: resto / 2, align: 'right' });
    headers.push({ label: 'Monto Neto', weight: 0, width: resto / 2, align: 'right' });
  } else {
    headers.push({ label: 'Monto Bruto', weight: 0, width: resto, align: 'right' });
  }
  const totalWidth = headers.reduce((acc, col) => acc + col.width, 0);
  return headers.map((col) => ({ ...col, weight: col.width / totalWidth }));
}

function drawDetalle(doc, informe) {
  doc.addPage();
  let y = MARGIN_TOP;
  y = drawSectionTitle(doc, y, 'Detalle de Transacciones', CONTENT_W) + 2;

  const cols = columnasDetalle(informe);
  const headers = cols.map((col) => ({ label: col.label, weight: col.weight }));
  const aligns = cols.map((col) => col.align);
  const rows = informe.transacciones.map((tx) => {
    const row = [
      formatearFechaHora(tx.fecha),
      tx.billetera,
      tx.marca,
      tx.tipo,
      tx.cupon
    ];
    if (informe.tieneCuotas) row.push(tx.cuotas || '—');
    row.push(formatearMontoArs(tx.bruto));
    if (informe.mostrarNeto) row.push(formatearMontoArs(tx.neto));
    return row;
  });

  const total = ['TOTAL', '', '', '', `${informe.kpis.transacciones} op.`];
  if (informe.tieneCuotas) total.push('');
  total.push(formatearMontoArs(informe.kpis.bruto));
  if (informe.mostrarNeto) total.push(formatearMontoArs(informe.kpis.neto));

  drawTable(doc, y, MARGIN_X, CONTENT_W, headers, rows, aligns, {
    fontSize: 6.6,
    totalRow: total
  });
}

export function generarInformePdf(informe) {
  const doc = new jsPDF('p', 'mm', 'a4');
  let y = drawHeader(doc, informe);
  y = drawKpis(doc, y, informe);
  drawResumen(doc, y, informe);
  drawDetalle(doc, informe);

  const filename = nombreArchivoInforme(informe.propietario, informe.fechaDesde, informe.fechaHasta);
  const blob = doc.output('blob');
  return { blob, filename };
}

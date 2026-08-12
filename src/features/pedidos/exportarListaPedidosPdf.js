import jsPDF from 'jspdf';
import { formatearFecha, lineasProductosPedido, sumarioProductosPedidos } from './utils';

const MARGIN = 15;
const PAGE_W = 210;
const PAGE_H = 297;
const COLS = [
  { key: 'codigo', header: 'Código', width: 32 },
  { key: 'producto', header: 'Producto', width: 78 },
  { key: 'cantidad', header: 'Cantidad', width: 22, align: 'center' },
  { key: 'observacion', header: 'Observación', width: 48 }
];

function ensureSpace(doc, y, needed) {
  if (y + needed > PAGE_H - 16) {
    doc.addPage();
    return 18;
  }
  return y;
}

function measureRowHeight(doc, row, minH) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  let maxLines = 1;
  COLS.forEach((col) => {
    if (col.key === 'observacion') return;
    const val = row[col.key] == null ? '' : String(row[col.key]);
    if (!val) return;
    const lines = doc.splitTextToSize(val, col.width - 3);
    maxLines = Math.max(maxLines, lines.length);
  });
  return Math.max(minH, maxLines * 3.6 + 3);
}

function drawRow(doc, y, row, { header = false, minH = 9 } = {}) {
  const h = header ? 8 : measureRowHeight(doc, row, minH);
  const startY = ensureSpace(doc, y, h);
  let x = MARGIN;

  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', header ? 'bold' : 'normal');
  doc.setFontSize(header ? 8 : 8);

  COLS.forEach((col) => {
    doc.rect(x, startY, col.width, h);
    const raw = header ? col.header : (col.key === 'observacion' ? '' : row[col.key]);
    if (raw !== '' && raw != null) {
      const text = String(raw);
      const lines = doc.splitTextToSize(text, col.width - 3);
      const textY = startY + 5;
      if (col.align === 'center') {
        doc.text(lines, x + col.width / 2, textY, { align: 'center' });
      } else {
        doc.text(lines, x + 1.5, textY);
      }
    }
    x += col.width;
  });

  return startY + h;
}

function drawTable(doc, y, filas) {
  y = drawRow(doc, y, {}, { header: true });
  if (!filas.length) {
    y = drawRow(doc, y, { codigo: '-', producto: 'Sin productos', cantidad: '' }, { minH: 9 });
    return y;
  }
  filas.forEach((fila) => {
    y = drawRow(doc, y, fila, { minH: 9 });
  });
  return y;
}

export function exportarListaPedidosPdf(pedidos) {
  const doc = new jsPDF('p', 'mm', 'a4');
  let y = 16;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const hayPresupuestos = pedidos.some((p) => p.origen === 'presupuesto');
  doc.text(
    hayPresupuestos ? 'LISTA DE PEDIDOS Y PRESUPUESTOS' : 'LISTA DE PEDIDOS',
    PAGE_W / 2,
    y,
    { align: 'center' }
  );
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Generado el: ${new Date().toLocaleString('es-AR')}`,
    PAGE_W / 2,
    y,
    { align: 'center' }
  );
  y += 10;

  pedidos.forEach((pedido) => {
    y = ensureSpace(doc, y, 22);
    const cliente = pedido.cliente || 'Cliente';
    const fecha = formatearFecha(pedido.fechaPedido);
    const etiqueta = pedido.origen === 'presupuesto' ? ' (Presupuesto)' : '';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`${cliente}${etiqueta}`, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Fecha: ${fecha}`, PAGE_W - MARGIN, y, { align: 'right' });
    y += 4;

    y = drawTable(doc, y, lineasProductosPedido(pedido));
    y += 6;
  });

  y = ensureSpace(doc, y, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('SUMARIO', MARGIN, y);
  y += 4;
  y = drawTable(doc, y, sumarioProductosPedidos(pedidos));

  const fechaArchivo = new Date().toISOString().split('T')[0];
  doc.save(`lista_pedidos_${fechaArchivo}.pdf`);
}

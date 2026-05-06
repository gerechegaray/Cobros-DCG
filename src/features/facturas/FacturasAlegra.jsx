import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { api } from '../../services/api';
import { Dialog } from 'primereact/dialog';
import { db } from '../../services/firebase';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import HojaDeRutaForm from '../hojasderuta/HojaDeRutaForm';
import { getClientesCatalogo } from '../../services/firebase.js';
import jsPDF from 'jspdf';
import { Toast } from 'primereact/toast';
import '../../styles/envios.css';

export const RESPONSABLES_ENVIOS = [
  { label: "Mariano", value: "Mariano" },
  { label: "Ruben",   value: "Ruben"   },
  { label: "Diego",   value: "Diego"   },
  { label: "Guille",  value: "Guille"  },
  { label: "Santi",   value: "Santi"   },
  { label: "German",  value: "German"  },
];

// Paleta de colores para avatares por nombre
const AVATAR_COLORS = {
  Mariano: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
  Ruben:   'linear-gradient(135deg,#0891b2,#0e7490)',
  Diego:   'linear-gradient(135deg,#dc2626,#b91c1c)',
  Guille:  'linear-gradient(135deg,#059669,#047857)',
  Santi:   'linear-gradient(135deg,#d97706,#b45309)',
  German:  'linear-gradient(135deg,#7c3aed,#6d28d9)',
};

const getAvatarStyle = (nombre) => ({
  background: AVATAR_COLORS[nombre] || 'linear-gradient(135deg,#1e3a8a,#3b82f6)',
});

const getProgressClass = (pct) => {
  if (pct >= 67) return 'progress-high';
  if (pct >= 34) return 'progress-mid';
  return 'progress-low';
};

const getProgressColor = (pct) => {
  if (pct >= 67) return '#10b981';
  if (pct >= 34) return '#f59e0b';
  return '#ef4444';
};

const FacturasAlegra = ({ user }) => {
  const [facturas, setFacturas]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [selectedFacturas, setSelectedFacturas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [hojasDeRuta, setHojasDeRuta] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [modalEdicionVisible, setModalEdicionVisible] = useState(false);
  const [hojaEnEdicion, setHojaEnEdicion] = useState(null);
  const [facturasDisponiblesParaEdicion, setFacturasDisponiblesParaEdicion] = useState([]);
  const [facturasSeleccionadasParaEdicion, setFacturasSeleccionadasParaEdicion] = useState([]);
  const toast = useRef(null);

  // Filtros
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(null);
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(null);
  const [filtroClienteTexto, setFiltroClienteTexto] = useState('');
  const [facturasFiltradas, setFacturasFiltradas] = useState([]);
  const [showFiltrosAvanzados, setShowFiltrosAvanzados] = useState(false);
  const [clientes, setClientes] = useState([]);

  // Pestañas
  const [mainTab, setMainTab]   = useState('facturas');
  const [activeTab, setActiveTab] = useState('todos');

  // Paginación
  const [currentPage, setCurrentPage]   = useState(0);
  const [rowsPerPage, setRowsPerPage]   = useState(20);
  const [hojasPage, setHojasPage]       = useState(0);
  const [hojasRowsPerPage, setHojasRowsPerPage] = useState(10);

  // Rango
  const [rangoDias, setRangoDias] = useState(5);

  // Responsive
  const [isMobile, setIsMobile] = useState(false);
  const [expandedCards, setExpandedCards]     = useState(new Set());
  const [expandedHojaCards, setExpandedHojaCards] = useState(new Set());

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Roles
  const esAdmin             = user?.role === 'admin';
  const esGuille            = user?.role === 'Guille';
  const tieneAccesoCompleto = esAdmin || esGuille;
  const esVendedor          = user?.role === 'Guille' || user?.role === 'Santi';

  // ─── MAPA DE ESTADOS O(1) ────────────────────────────────────────────────────
  const estadosPorFactura = useMemo(() => {
    const map = new Map();
    for (const hoja of hojasDeRuta) {
      if (!Array.isArray(hoja.pedidos)) continue;
      for (const pedido of hoja.pedidos) {
        if (!map.has(pedido.id)) {
          map.set(pedido.id, pedido.entregado
            ? { estado: 'entregado',  color: 'success', icon: 'pi pi-check-circle' }
            : { estado: 'en_reparto', color: 'warning', icon: 'pi pi-truck' }
          );
        }
      }
    }
    return map;
  }, [hojasDeRuta]);

  const obtenerEstadoFactura = useCallback((id) =>
    estadosPorFactura.get(id) || { estado: 'pendiente', color: 'info', icon: 'pi pi-clock' }
  , [estadosPorFactura]);

  // ─── ÍNDICE DE FACTURAS O(1) ─────────────────────────────────────────────────
  const facturasPorId = useMemo(() => {
    const map = new Map();
    for (const f of facturas) map.set(f.id, f);
    return map;
  }, [facturas]);

  // ─── FILTRADO ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let filtradas = [...facturas];
    if (filtroFechaDesde) {
      const d = toDateStr(filtroFechaDesde);
      filtradas = filtradas.filter(f => toDateStr(new Date(f.date)) >= d);
    }
    if (filtroFechaHasta) {
      const h = toDateStr(filtroFechaHasta);
      filtradas = filtradas.filter(f => toDateStr(new Date(f.date)) <= h);
    }
    if (filtroClienteTexto.trim()) {
      const q = filtroClienteTexto.toLowerCase();
      filtradas = filtradas.filter(f => {
        const n = f.client?.name || f.client?.nombre || f.client?.id || '';
        return n.toLowerCase().includes(q);
      });
    }
    setFacturasFiltradas(filtradas);
    setCurrentPage(0);
  }, [facturas, filtroFechaDesde, filtroFechaHasta, filtroClienteTexto]);

  useEffect(() => { if (user?.role) cargarClientes(); }, [user]);
  useEffect(() => { if (activeTab !== 'pendiente') setSelectedFacturas([]); }, [activeTab]);

  const cargarClientes = async () => {
    try {
      const data = await getClientesCatalogo();
      let filtrados = data;
      if (user.role !== 'admin') {
        const sellerId = user.role === 'Guille' ? "1" : "2";
        filtrados = data.filter(c => c.seller?.id === sellerId);
      }
      setClientes(filtrados.sort((a, b) =>
        (a.name || a.nombre || '').toLowerCase().localeCompare((b.name || b.nombre || '').toLowerCase())
      ));
    } catch {}
  };

  const facturasFiltradasPorEstado = useMemo(() =>
    facturasFiltradas.filter(f =>
      activeTab === 'todos' ? true : obtenerEstadoFactura(f.id).estado === activeTab
    )
  , [facturasFiltradas, activeTab, estadosPorFactura]);

  // ─── HANDLERS ────────────────────────────────────────────────────────────────
  const handleFacturaSelection = (factura) => {
    if (obtenerEstadoFactura(factura.id).estado !== 'pendiente') return;
    const sel = selectedFacturas.some(f => f.id === factura.id);
    setSelectedFacturas(sel
      ? selectedFacturas.filter(f => f.id !== factura.id)
      : [...selectedFacturas, factura]
    );
  };

  const handleMobileFacturaSelection = (factura) => {
    if (activeTab !== 'pendiente') return;
    handleFacturaSelection(factura);
  };

  const agregarFacturasAHoja = async () => {
    if (!hojaEnEdicion || !facturasSeleccionadasParaEdicion.length) {
      showToast('warn', 'Atención', 'Seleccioná al menos una factura.');
      return;
    }
    try {
      const base = hojaEnEdicion.pedidos || [];
      const nuevos = facturasSeleccionadasParaEdicion.map((f, i) => ({
        id: f.id, entregado: false, orden: base.length + i + 1
      }));
      await updateDoc(doc(db, 'hojasDeRuta', hojaEnEdicion.id), { pedidos: [...base, ...nuevos] });
      setModalEdicionVisible(false);
      setHojaEnEdicion(null);
      setFacturasSeleccionadasParaEdicion([]);
      setFacturasDisponiblesParaEdicion([]);
    } catch { showToast('error', 'Error', 'No se pudo agregar las facturas'); }
  };

  const eliminarFacturaDeHoja = async (facturaId) => {
    if (!hojaEnEdicion) return;
    try {
      const pedidos = hojaEnEdicion.pedidos.filter(p => p.id !== facturaId);
      await updateDoc(doc(db, 'hojasDeRuta', hojaEnEdicion.id), { pedidos });
      setHojaEnEdicion({ ...hojaEnEdicion, pedidos });
    } catch { showToast('error', 'Error', 'No se pudo eliminar la factura'); }
  };

  // ─── CARGAR FACTURAS ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tieneAccesoCompleto) { setLoading(false); return; }
    setLoading(true);
    api.getAlegraInvoices(rangoDias)
      .then(data => { setFacturas(data); setLoading(false); })
      .catch(err  => { setError(err.message); setLoading(false); });
  }, [esAdmin, rangoDias]);

  // ─── HOJAS EN TIEMPO REAL ─────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'hojasDeRuta'), orderBy('fecha', 'desc'));
    return onSnapshot(q, snapshot => {
      const data = [];
      snapshot.forEach(snap => {
        const hoja = { id: snap.id, ...snap.data() };
        if (hoja.estado !== 'pendiente') return;
        if (tieneAccesoCompleto) data.push(hoja);
        else if (esVendedor && hoja.responsable === user.role) data.push(hoja);
      });
      setHojasDeRuta(data);
    });
  }, [user, esAdmin, esVendedor]);

  const marcarEntregado = async (hojaId, pedidoId) => {
    try {
      const hoja = hojasDeRuta.find(h => h.id === hojaId);
      if (!Array.isArray(hoja?.pedidos)) return;
      const pedidos = hoja.pedidos.map(p =>
        p.id === pedidoId ? { ...p, entregado: !p.entregado } : p
      );
      await updateDoc(doc(db, 'hojasDeRuta', hojaId), { pedidos });
    } catch { showToast('error', 'Error', 'No se pudo actualizar el estado'); }
  };

  const cambiarOrdenPedido = async (hojaId, pedidoId, dir) => {
    try {
      const hoja = hojasDeRuta.find(h => h.id === hojaId);
      if (!hoja?.pedidos) return;
      const pedidos = [...hoja.pedidos];
      const idx = pedidos.findIndex(p => p.id === pedidoId);
      const ni  = idx + dir;
      if (ni < 0 || ni >= pedidos.length) return;
      [pedidos[idx], pedidos[ni]] = [pedidos[ni], pedidos[idx]];
      await updateDoc(doc(db, 'hojasDeRuta', hojaId), { pedidos });
    } catch {}
  };

  const eliminarHojaRuta = async (hojaId) => {
    try {
      await deleteDoc(doc(db, 'hojasDeRuta', hojaId));
      showToast('success', 'Eliminada', 'Hoja de ruta eliminada');
    } catch { showToast('error', 'Error', 'No se pudo eliminar'); }
  };

  const confirmarEliminacion = (hojaId) => confirmDialog({
    message: '¿Querés eliminar esta hoja de ruta?',
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    accept: () => eliminarHojaRuta(hojaId),
    acceptLabel: 'Eliminar', rejectLabel: 'Cancelar',
  });

  const editarHojaRuta = (hoja) => {
    setHojaEnEdicion(hoja);
    setFacturasDisponiblesParaEdicion(
      facturas.filter(f =>
        obtenerEstadoFactura(f.id).estado === 'pendiente' &&
        !hoja.pedidos?.some(p => p.id === f.id)
      )
    );
    setFacturasSeleccionadasParaEdicion([]);
    setModalEdicionVisible(true);
  };

  // ─── HELPERS ─────────────────────────────────────────────────────────────────
  const showToast = (severity, summary, detail) =>
    toast.current?.show({ severity, summary, detail, life: 3500 });

  const formatearMoneda = (v) => {
    if (!v || isNaN(v)) return '$0';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v);
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    try {
      let d;
      if (fecha?._seconds !== undefined)      d = new Date(fecha._seconds * 1000);
      else if (fecha?.seconds !== undefined)  d = new Date(fecha.seconds * 1000);
      else if (typeof fecha?.toDate === 'function') d = fecha.toDate();
      else if (fecha instanceof Date)         d = fecha;
      else if (typeof fecha === 'string' && fecha.includes('T')) d = new Date(fecha + 'Z');
      else d = new Date(fecha);
      if (!d || isNaN(d.getTime())) return '-';
      return `${d.getUTCDate().toString().padStart(2,'0')}/${(d.getUTCMonth()+1).toString().padStart(2,'0')}/${d.getUTCFullYear()}`;
    } catch { return '-'; }
  };

  const calcularTotalHojaRuta = useCallback((pedidos) => {
    if (!Array.isArray(pedidos)) return 0;
    return pedidos.reduce((t, p) => t + (facturasPorId.get(p.id)?.total || p.total || 0), 0);
  }, [facturasPorId]);

  const obtenerDetalleProductos = useCallback((pedidos) => {
    if (!Array.isArray(pedidos)) return {};
    const result = {};
    pedidos.forEach(pedido => {
      const factura = facturasPorId.get(pedido.id);
      const items = factura?.items || pedido.detalle || [];
      if (!Array.isArray(items)) return;
      if (!result[pedido.cliente]) result[pedido.cliente] = [];
      items.forEach(item => result[pedido.cliente].push({
        producto: item.name || item.producto || 'Producto',
        cantidad: item.quantity || item.cantidad || 1,
      }));
    });
    return result;
  }, [facturasPorId]);

  // ─── PDF NATIVO ───────────────────────────────────────────────────────────────
  const exportarHojaRutaPDF = (hoja) => {
    if (!hoja?.pedidos?.length) { showToast('warn', 'Sin datos', 'No hay datos para exportar'); return; }
    const pdf    = new jsPDF('p', 'mm', 'a4');
    const margen = 15;
    const ancho  = 210 - margen * 2;
    let y = 20;

    const linea = (txt, x = margen, av = 7, style = 'normal', size = 11) => {
      pdf.setFontSize(size); pdf.setFont('helvetica', style); pdf.text(txt, x, y); y += av;
    };
    const checkPag = () => { if (y > 270) { pdf.addPage(); y = 20; } };

    pdf.setFillColor(44, 62, 80);
    pdf.rect(0, 0, 210, 14, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
    pdf.text('HOJA DE RUTA', 105, 9, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    y = 22;

    linea(`Responsable: ${hoja.responsable || 'N/A'}`, margen, 6, 'bold', 10);
    linea(`Fecha: ${formatFecha(hoja.fechaCreacion || hoja.fecha)}`, margen, 6, 'normal', 10);
    linea(`Generado: ${new Date().toLocaleDateString('es-AR')}`, margen, 10, 'normal', 9);

    const totalPedidos = hoja.pedidos.length;
    const entregados   = hoja.pedidos.filter(p => p.entregado).length;
    const totalHoja    = calcularTotalHojaRuta(hoja.pedidos);

    pdf.setFillColor(240, 240, 240);
    pdf.rect(margen, y, ancho, 22, 'F');
    y += 5;
    linea('RESUMEN', margen + 2, 6, 'bold', 10);
    linea(`Pedidos: ${totalPedidos}   Entregados: ${entregados}   Pendientes: ${totalPedidos - entregados}   Total: ${formatearMoneda(totalHoja)}`, margen + 2, 8, 'normal', 9);
    y += 5;

    linea('DETALLE POR CLIENTE', margen, 7, 'bold', 11);
    const productosPorCliente = obtenerDetalleProductos(hoja.pedidos);
    hoja.pedidos.forEach((pedido, idx) => {
      checkPag();
      const productos = productosPorCliente[pedido.cliente] || [];
      const estado    = pedido.entregado ? '✓' : '○';
      const alto      = 10 + productos.length * 5;
      pdf.setFillColor(pedido.entregado ? 232 : 248, pedido.entregado ? 245 : 248, pedido.entregado ? 233 : 248);
      pdf.rect(margen, y - 1, ancho, alto, 'F');
      pdf.rect(margen, y - 1, ancho, alto);
      linea(`${idx + 1}. ${estado} ${pedido.cliente}`, margen + 2, 6, 'bold', 10);
      productos.forEach(p => { checkPag(); linea(`    • ${p.cantidad}x ${p.producto}`, margen + 2, 5, 'normal', 9); });
      y += 4;
    });

    const fileName = `hoja_ruta_${(hoja.responsable || 'X').replace(/[^a-zA-Z0-9]/g,'_')}_${formatFecha(hoja.fechaCreacion || hoja.fecha).replace(/\//g,'-')}.pdf`;
    pdf.save(fileName);
    showToast('success', 'PDF Exportado', 'Listo ✓');
  };

  // ─── RENDER: ESTADO CHIP ──────────────────────────────────────────────────────
  const renderEstadoChip = (rowData) => {
    const info = obtenerEstadoFactura(rowData.id);
    const icons = { entregado: '✓', en_reparto: '↗', pendiente: '○' };
    const labels = { entregado: 'Entregado', en_reparto: 'En Reparto', pendiente: 'Pendiente' };
    return (
      <span className={`estado-chip ${info.estado}`}>
        {icons[info.estado]} {labels[info.estado]}
      </span>
    );
  };

  // ─── CARD DE HOJA DE RUTA (desktop) ──────────────────────────────────────────
  const HojaCard = ({ hoja }) => {
    const totalPedidos = hoja.pedidos?.length || 0;
    const entregados   = hoja.pedidos?.filter(p => p.entregado).length || 0;
    const pct          = totalPedidos > 0 ? Math.round((entregados / totalPedidos) * 100) : 0;
    const completa     = entregados === totalPedidos && totalPedidos > 0;
    const isExpanded   = expandedRows[hoja.id];
    const inicial      = (hoja.responsable || '?')[0].toUpperCase();

    return (
      <div className={`hoja-card ${completa ? 'completa' : ''}`}>
        <div className="hoja-card-header">
          <div className="hoja-avatar" style={completa ? { background: 'linear-gradient(135deg,#059669,#10b981)' } : getAvatarStyle(hoja.responsable)}>
            {completa ? '✓' : inicial}
          </div>
          <div className="hoja-card-meta">
            <div className="hoja-responsable">{hoja.responsable}</div>
            <div className="hoja-fecha">{typeof hoja.fecha === 'string' ? hoja.fecha : formatFecha(hoja.fecha)}</div>
          </div>
        </div>

        <div className="hoja-card-total">{formatearMoneda(calcularTotalHojaRuta(hoja.pedidos))}</div>

        <div className="hoja-progress-wrapper">
          <div className="hoja-progress-label">
            <span className="hoja-progress-text">{entregados}/{totalPedidos} entregados</span>
            <span className="hoja-progress-pct" style={{ color: getProgressColor(pct) }}>{pct}%</span>
          </div>
          <div className="hoja-progress-bar">
            <div className={`hoja-progress-fill ${getProgressClass(pct)}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Lista de pedidos */}
        <div className="hoja-pedidos-list">
          {hoja.pedidos?.slice(0, isExpanded ? undefined : 3).map((pedido, idx) => (
            <div key={pedido.id} className="hoja-pedido-row">
              <span style={{ fontSize: '0.72rem', color: 'var(--dcg-text-muted)', width: '16px', flexShrink: 0 }}>{idx + 1}</span>
              <span className={`hoja-pedido-nombre ${pedido.entregado ? 'entregado' : ''}`}>{pedido.cliente}</span>
              {esVendedor && !pedido.entregado && (
                <div style={{ display: 'flex', gap: 2 }}>
                  <button className="hoja-action-btn" style={{ flex: 'none', padding: '3px 6px' }}
                    onClick={() => cambiarOrdenPedido(hoja.id, pedido.id, -1)} disabled={idx === 0}>
                    <i className="pi pi-arrow-up" style={{ fontSize: '0.65rem' }} />
                  </button>
                  <button className="hoja-action-btn" style={{ flex: 'none', padding: '3px 6px' }}
                    onClick={() => cambiarOrdenPedido(hoja.id, pedido.id, 1)} disabled={idx === (hoja.pedidos?.length || 0) - 1}>
                    <i className="pi pi-arrow-down" style={{ fontSize: '0.65rem' }} />
                  </button>
                </div>
              )}
              <button
                className={`check-circle-btn ${pedido.entregado ? 'checked' : ''}`}
                onClick={() => marcarEntregado(hoja.id, pedido.id)}
                title={pedido.entregado ? 'Desmarcar' : 'Marcar entregado'}
              >
                <i className="pi pi-check" style={{ fontSize: '0.65rem' }} />
              </button>
            </div>
          ))}
          {(hoja.pedidos?.length || 0) > 3 && (
            <button
              onClick={() => setExpandedRows(prev => ({ ...prev, [hoja.id]: !prev[hoja.id] }))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dcg-text-muted)', fontSize: '0.78rem', padding: '4px 0', textAlign: 'left' }}
            >
              {isExpanded ? '↑ Ver menos' : `+ ${hoja.pedidos.length - 3} más`}
            </button>
          )}
        </div>

        <div className="hoja-card-actions">
          <button className="hoja-action-btn info" onClick={() => exportarHojaRutaPDF(hoja)}>
            <i className="pi pi-file-pdf" style={{ fontSize: '0.75rem' }} /> PDF
          </button>
          {tieneAccesoCompleto && (
            <>
              <button className="hoja-action-btn" onClick={() => editarHojaRuta(hoja)}>
                <i className="pi pi-pencil" style={{ fontSize: '0.75rem' }} /> Editar
              </button>
              <button className="hoja-action-btn danger" onClick={() => confirmarEliminacion(hoja.id)}>
                <i className="pi pi-trash" style={{ fontSize: '0.75rem' }} /> Eliminar
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // ─── MOBILE: CARD FACTURA ─────────────────────────────────────────────────────
  const MobileFacturaCard = ({ factura }) => {
    const isExpanded = expandedCards.has(factura.id);
    const isSelected = selectedFacturas.some(f => f.id === factura.id);
    const canSelect  = activeTab === 'pendiente';
    const info       = obtenerEstadoFactura(factura.id);
    const labels     = { entregado: 'Entregado', en_reparto: 'En Reparto', pendiente: 'Pendiente' };

    const toggle = () => setExpandedCards(prev => {
      const s = new Set(prev); s.has(factura.id) ? s.delete(factura.id) : s.add(factura.id); return s;
    });

    return (
      <div className={`m-factura-card ${isSelected ? 'selected' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className={`estado-chip ${info.estado}`} style={{ fontSize: '0.72rem' }}>
                {labels[info.estado]}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--dcg-text-muted)' }}>{formatFecha(factura.date)}</span>
            </div>
            <div style={{ fontWeight: 700, color: 'var(--dcg-text-primary)', fontSize: '0.9rem', marginBottom: 2 }}>
              {factura.client?.name || factura.client?.id || 'Cliente no disponible'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--dcg-text-secondary)', fontWeight: 600 }}>
              {formatearMoneda(factura.total)}
            </div>
            {canSelect && (
              <button
                onClick={() => handleMobileFacturaSelection(factura)}
                style={{
                  marginTop: 8, padding: '5px 14px', borderRadius: 20,
                  border: `1.5px solid ${isSelected ? 'var(--dcg-success)' : 'var(--dcg-border)'}`,
                  background: isSelected ? 'rgba(16,185,129,0.1)' : 'transparent',
                  color: isSelected ? 'var(--dcg-success)' : 'var(--dcg-text-secondary)',
                  fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {isSelected ? '✓ Seleccionada' : '+ Seleccionar'}
              </button>
            )}
          </div>
          <button onClick={toggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dcg-text-muted)', padding: 4 }}>
            <i className={`pi ${isExpanded ? 'pi-chevron-up' : 'pi-chevron-down'}`} />
          </button>
        </div>
        {isExpanded && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--dcg-border-light)', fontSize: '0.8rem', color: 'var(--dcg-text-secondary)' }}>
            <div>Nº {factura.numberTemplate?.number || factura.number || factura.id}</div>
            <div>{factura.items?.length || 0} items</div>
          </div>
        )}
      </div>
    );
  };

  // ─── MOBILE: CARD HOJA ───────────────────────────────────────────────────────
  const MobileHojaCard = ({ hoja }) => {
    const isExpanded   = expandedHojaCards.has(hoja.id);
    const totalPedidos = hoja.pedidos?.length || 0;
    const entregados   = hoja.pedidos?.filter(p => p.entregado).length || 0;
    const pct          = totalPedidos > 0 ? Math.round((entregados / totalPedidos) * 100) : 0;
    const inicial      = (hoja.responsable || '?')[0].toUpperCase();

    const toggle = () => setExpandedHojaCards(prev => {
      const s = new Set(prev); s.has(hoja.id) ? s.delete(hoja.id) : s.add(hoja.id); return s;
    });

    return (
      <div className="m-hoja-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="hoja-avatar" style={{ ...getAvatarStyle(hoja.responsable), width: 36, height: 36, borderRadius: 10, fontSize: '0.9rem' }}>
            {inicial}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--dcg-text-primary)', fontSize: '0.9rem' }}>{hoja.responsable}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--dcg-text-muted)' }}>{typeof hoja.fecha === 'string' ? hoja.fecha : formatFecha(hoja.fecha)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--dcg-text-primary)' }}>{formatearMoneda(calcularTotalHojaRuta(hoja.pedidos))}</div>
            <div style={{ fontSize: '0.72rem', color: getProgressColor(pct), fontWeight: 600 }}>{pct}%</div>
          </div>
          <button onClick={toggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dcg-text-muted)', padding: 4 }}>
            <i className={`pi ${isExpanded ? 'pi-chevron-up' : 'pi-chevron-down'}`} />
          </button>
        </div>

        <div className="hoja-progress-bar" style={{ marginTop: 10 }}>
          <div className={`hoja-progress-fill ${getProgressClass(pct)}`} style={{ width: `${pct}%` }} />
        </div>

        {isExpanded && (
          <div style={{ marginTop: 12 }}>
            {hoja.pedidos?.map((pedido, idx) => (
              <div key={idx} className="hoja-pedido-row">
                <span className={`hoja-pedido-nombre ${pedido.entregado ? 'entregado' : ''}`}>{pedido.cliente}</span>
                <button className={`check-circle-btn ${pedido.entregado ? 'checked' : ''}`}
                  onClick={() => marcarEntregado(hoja.id, pedido.id)}>
                  <i className="pi pi-check" style={{ fontSize: '0.65rem' }} />
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button className="hoja-action-btn info" onClick={() => exportarHojaRutaPDF(hoja)}>
                <i className="pi pi-file-pdf" style={{ fontSize: '0.72rem' }} /> PDF
              </button>
              {tieneAccesoCompleto && (
                <>
                  <button className="hoja-action-btn" onClick={() => editarHojaRuta(hoja)}>
                    <i className="pi pi-pencil" style={{ fontSize: '0.72rem' }} /> Editar
                  </button>
                  <button className="hoja-action-btn danger" onClick={() => confirmarEliminacion(hoja.id)}>
                    <i className="pi pi-trash" style={{ fontSize: '0.72rem' }} /> Eliminar
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── LAYOUTS ─────────────────────────────────────────────────────────────────
  const MobileFacturasLayout = () => {
    const start  = currentPage * rowsPerPage;
    const pagina = facturasFiltradasPorEstado.slice(start, start + rowsPerPage);
    const total  = Math.ceil(facturasFiltradasPorEstado.length / rowsPerPage);
    return (
      <div>
        {pagina.map(f => <MobileFacturaCard key={f.id} factura={f} />)}
        {facturasFiltradasPorEstado.length > rowsPerPage && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12, fontSize: '0.85rem', color: 'var(--dcg-text-muted)' }}>
            <button className="hoja-action-btn" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>‹</button>
            <span>{currentPage + 1} / {total}</span>
            <button className="hoja-action-btn" onClick={() => setCurrentPage(p => Math.min(total - 1, p + 1))} disabled={currentPage >= total - 1}>›</button>
          </div>
        )}
      </div>
    );
  };

  const MobileHojasLayout = () => (
    <div>{hojasDeRuta.map(h => <MobileHojaCard key={h.id} hoja={h} />)}</div>
  );

  const DesktopFacturasLayout = () => (
    <div className="envios-table-wrapper">
      <DataTable
        value={facturasFiltradasPorEstado}
        dataKey="id" paginator
        rows={rowsPerPage}
        first={currentPage * rowsPerPage}
        onPage={e => { setCurrentPage(e.page); setRowsPerPage(e.rows); }}
        rowsPerPageOptions={[10, 20, 50]}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        currentPageReportTemplate="{first}–{last} de {totalRecords}"
        emptyMessage={
          <div className="envios-empty">
            <span className="envios-empty-icon">📋</span>
            <span className="envios-empty-text">No hay facturas para mostrar</span>
          </div>
        }
        className="p-datatable-sm"
        selection={activeTab === 'pendiente' ? selectedFacturas : null}
        onSelectionChange={e => { if (activeTab === 'pendiente') setSelectedFacturas(e.value); }}
        selectionMode={activeTab === 'pendiente' ? 'multiple' : null}
      >
        {activeTab === 'pendiente' && <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />}
        <Column field="id" header="Nº" body={r => r.numberTemplate?.number || r.number || r.id} style={{ width: '80px' }} />
        <Column field="date" header="Fecha" body={r => formatFecha(r.date)} style={{ width: '100px' }} />
        <Column field="client.name" header="Cliente" body={r => r.client?.name || r.client?.nombre || '-'} />
        <Column field="total" header="Total" body={r => formatearMoneda(r.total)} style={{ width: '120px' }} />
        <Column field="status" header="Estado" body={renderEstadoChip} style={{ width: '130px' }} />
      </DataTable>
    </div>
  );

  const DesktopHojasLayout = () => (
    hojasDeRuta.length === 0
      ? <div className="envios-empty">
          <span className="envios-empty-icon">🚚</span>
          <span className="envios-empty-text">{esAdmin ? 'No hay hojas de ruta creadas' : 'No tenés hojas asignadas'}</span>
        </div>
      : <div className="hojas-grid">
          {hojasDeRuta.map(h => <HojaCard key={h.id} hoja={h} />)}
        </div>
  );

  // ─── RENDER PRINCIPAL ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="envios-loading">
      <div className="envios-loading-spinner" />
      <span>Cargando facturas...</span>
    </div>
  );
  if (error) return <p style={{ color: 'var(--dcg-error)', padding: '1rem' }}>Error: {error}</p>;

  const hayFiltrosActivos = filtroClienteTexto || filtroFechaDesde || filtroFechaHasta;

  return (
    <div style={{ padding: '1.25rem 1.5rem' }}>
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* ─── HEADER ─── */}
      <div className="envios-header">
        <div>
          <h1 className="envios-titulo">Envíos</h1>
          <div className="envios-subtitulo">
            {facturasFiltradas.length} factura{facturasFiltradas.length !== 1 ? 's' : ''} disponible{facturasFiltradas.length !== 1 ? 's' : ''}
            {' · '}
            {hojasDeRuta.length} hoja{hojasDeRuta.length !== 1 ? 's' : ''} en curso
          </div>
        </div>
      </div>

      {/* ─── PESTAÑAS PRINCIPALES ─── */}
      <div className="envios-main-tabs">
        <button
          className={`envios-main-tab ${mainTab === 'facturas' ? 'active' : ''}`}
          onClick={() => setMainTab('facturas')}
        >
          <span className="tab-icon">📋</span>
          Facturas
          {facturasFiltradas.length > 0 && (
            <span className="envios-tab-badge">{facturasFiltradas.length}</span>
          )}
        </button>
        <button
          className={`envios-main-tab ${mainTab === 'hojas' ? 'active active-hojas' : ''}`}
          onClick={() => setMainTab('hojas')}
        >
          <span className="tab-icon">🚚</span>
          Hojas de Ruta
          {hojasDeRuta.length > 0 && (
            <span className="envios-tab-badge">{hojasDeRuta.length}</span>
          )}
        </button>
      </div>

      {/* ─── TAB: FACTURAS ─── */}
      {mainTab === 'facturas' && tieneAccesoCompleto && (
        <div>
          {/* Barra de filtros rápidos */}
          <div className="envios-filter-bar">
            {/* Chips de rango */}
            <div className="envios-range-chips">
              {[{ label: 'Hoy', value: 1 }, { label: '3 días', value: 3 }, { label: '5 días', value: 5 }].map(op => (
                <button key={op.value}
                  className={`envios-range-chip ${rangoDias === op.value ? 'active' : ''}`}
                  onClick={() => setRangoDias(op.value)}
                >{op.label}</button>
              ))}
            </div>

            {/* Búsqueda rápida de cliente */}
            <div className="envios-search-wrapper">
              <i className="pi pi-search" />
              <input
                className="envios-search-input"
                placeholder="Buscar cliente..."
                value={filtroClienteTexto}
                onChange={e => setFiltroClienteTexto(e.target.value)}
              />
            </div>

            {/* Filtros avanzados (fechas) */}
            <button
              className={`envios-range-chip ${showFiltrosAvanzados ? 'active' : ''}`}
              onClick={() => setShowFiltrosAvanzados(v => !v)}
              title="Filtros de fecha"
            >
              <i className="pi pi-sliders-h" style={{ marginRight: 4 }} />
              Fechas
              {(filtroFechaDesde || filtroFechaHasta) && ' ●'}
            </button>

            {hayFiltrosActivos && (
              <button className="envios-range-chip"
                onClick={() => { setFiltroClienteTexto(''); setFiltroFechaDesde(null); setFiltroFechaHasta(null); }}
                style={{ borderColor: 'var(--dcg-error)', color: 'var(--dcg-error)' }}
              >
                ✕ Limpiar
              </button>
            )}
          </div>

          {/* Panel de fechas */}
          {showFiltrosAvanzados && (
            <div className="envios-filters-panel">
              <div>
                <label>Fecha desde</label>
                <Calendar value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.value)}
                  showIcon dateFormat="dd/mm/yy" className="w-full" />
              </div>
              <div>
                <label>Fecha hasta</label>
                <Calendar value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.value)}
                  showIcon dateFormat="dd/mm/yy" className="w-full" />
              </div>
            </div>
          )}

          {/* Sub-tabs de estado */}
          <div className="envios-status-tabs">
            {[
              { key: 'todos',      label: 'Todos',      dot: 'dot-todos'     },
              { key: 'pendiente',  label: 'Pendientes', dot: 'dot-pendiente' },
              { key: 'en_reparto', label: 'En Reparto', dot: 'dot-en_reparto'},
              { key: 'entregado',  label: 'Entregadas', dot: 'dot-entregado' },
            ].map(tab => {
              const count = tab.key === 'todos'
                ? facturasFiltradas.length
                : facturasFiltradas.filter(f => obtenerEstadoFactura(f.id).estado === tab.key).length;
              return (
                <button key={tab.key}
                  className={`envios-status-tab ${activeTab === tab.key ? `active-${tab.key}` : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span className={`status-dot ${tab.dot}`} />
                  {tab.label}
                  <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Botón crear hoja */}
          {activeTab === 'pendiente' && selectedFacturas.length > 0 && (
            <button className="envios-crear-btn" onClick={() => setModalVisible(true)}>
              <i className="pi pi-plus" />
              Crear Hoja de Ruta · {selectedFacturas.length} factura{selectedFacturas.length !== 1 ? 's' : ''}
            </button>
          )}

          {isMobile ? <MobileFacturasLayout /> : <DesktopFacturasLayout />}
        </div>
      )}

      {mainTab === 'facturas' && !tieneAccesoCompleto && (
        <div className="envios-empty">
          <span className="envios-empty-icon">🔒</span>
          <span className="envios-empty-text">Solo administradores y Guille pueden ver las facturas.</span>
        </div>
      )}

      {/* ─── TAB: HOJAS DE RUTA ─── */}
      {mainTab === 'hojas' && (
        <div>
          {isMobile ? <MobileHojasLayout /> : <DesktopHojasLayout />}
        </div>
      )}

      {/* ─── MODALES ─── */}
      <HojaDeRutaForm
        visible={modalVisible}
        onHide={() => setModalVisible(false)}
        onSave={() => { setModalVisible(false); setSelectedFacturas([]); }}
        pedidosSeleccionados={selectedFacturas.map(f => ({
          id: f.id,
          cliente: f.client?.name || f.id,
          fecha: { toDate: () => new Date(f.date) },
          items: f.items || [],
          estadoFactura: f.status,
          total: f.total || 0,
        }))}
        user={user}
      />

      <Dialog
        visible={modalEdicionVisible}
        onHide={() => { setModalEdicionVisible(false); setHojaEnEdicion(null); setFacturasSeleccionadasParaEdicion([]); setFacturasDisponiblesParaEdicion([]); }}
        header={`Editar — ${hojaEnEdicion?.responsable || ''}`}
        style={{ width: '90vw', maxWidth: '1000px' }} modal
      >
        {hojaEnEdicion && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--dcg-bg-tertiary)', borderRadius: 10, padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.85rem' }}>
              <div><span style={{ color: 'var(--dcg-text-muted)' }}>Responsable</span><div style={{ fontWeight: 700 }}>{hojaEnEdicion.responsable}</div></div>
              <div><span style={{ color: 'var(--dcg-text-muted)' }}>Fecha</span><div style={{ fontWeight: 700 }}>{formatFecha(hojaEnEdicion.fechaCreacion)}</div></div>
              <div><span style={{ color: 'var(--dcg-text-muted)' }}>Total</span><div style={{ fontWeight: 700 }}>{formatearMoneda(calcularTotalHojaRuta(hojaEnEdicion.pedidos))}</div></div>
              <div><span style={{ color: 'var(--dcg-text-muted)' }}>Pedidos</span><div style={{ fontWeight: 700 }}>{hojaEnEdicion.pedidos?.length || 0}</div></div>
            </div>

            <div>
              <h4 style={{ marginBottom: 10, fontWeight: 700 }}>Pedidos actuales</h4>
              <DataTable value={hojaEnEdicion.pedidos || []} dataKey="id" className="p-datatable-sm" emptyMessage="Sin pedidos">
                <Column field="cliente" header="Cliente" body={r => r.cliente || '-'} />
                <Column field="entregado" header="Estado" body={r => (
                  <span className={`estado-chip ${r.entregado ? 'entregado' : 'pendiente'}`}>
                    {r.entregado ? '✓ Entregado' : '○ Pendiente'}
                  </span>
                )} />
                <Column header="" style={{ width: 60 }} body={r => (
                  <button className="hoja-action-btn danger" onClick={() => eliminarFacturaDeHoja(r.id)} style={{ padding: '4px 10px' }}>
                    <i className="pi pi-trash" style={{ fontSize: '0.72rem' }} />
                  </button>
                )} />
              </DataTable>
            </div>

            <div>
              <h4 style={{ marginBottom: 10, fontWeight: 700 }}>Agregar facturas</h4>
              <DataTable value={facturasDisponiblesParaEdicion} dataKey="id" className="p-datatable-sm"
                selection={facturasSeleccionadasParaEdicion}
                onSelectionChange={e => setFacturasSeleccionadasParaEdicion(e.value)}
                selectionMode="multiple" emptyMessage="No hay facturas disponibles">
                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                <Column field="id" header="Nº" body={r => r.numberTemplate?.number || r.number || r.id} />
                <Column field="date" header="Fecha" body={r => formatFecha(r.date)} />
                <Column field="client.name" header="Cliente" body={r => r.client?.name || '-'} />
                <Column field="total" header="Total" body={r => formatearMoneda(r.total)} />
              </DataTable>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button label="Cancelar" icon="pi pi-times"
                onClick={() => { setModalEdicionVisible(false); setHojaEnEdicion(null); }}
                className="p-button-secondary p-button-outlined" />
              <Button
                label={`Agregar ${facturasSeleccionadasParaEdicion.length} factura${facturasSeleccionadasParaEdicion.length !== 1 ? 's' : ''}`}
                icon="pi pi-plus" onClick={agregarFacturasAHoja}
                disabled={!facturasSeleccionadasParaEdicion.length}
                className="p-button-success" />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

const toDateStr = (d) => {
  if (!d || isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export default FacturasAlegra;

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "primereact/card";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { ProgressSpinner } from "primereact/progressspinner";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";
import { Dialog } from "primereact/dialog";
import { api } from "../../services/api";
import { useEsMovil } from "../../hooks/useEsMovil";
import ClientePickerMovil, { nombreCliente } from "../../components/ClientePickerMovil";
import {
  boletasVisibles as listarBoletasVisibles,
  esFacturaVencida,
  estaPagada,
  etiquetaEstado,
  formatFecha,
  formatMonto,
  montoPendienteFactura,
  nombreClienteCuenta,
  proximosVencimientos,
  severityEstado,
  totalVencido
} from "./estadoCuentaUtils";
import { dibujarBloqueDeuda, exportarEstadoCuentaClientePdf } from "./exportarEstadoCuentaPdf";
import jsPDF from 'jspdf';
import './EstadoCuenta.css';
import '../../styles/estado-cuenta.css';

const FILTROS_BOLETA = [
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'vencidas', label: 'Vencidas' },
  { id: 'todas', label: 'Todas' }
];

function EstadoCuenta({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useRef(null);
  const esMovil = useEsMovil();
  
  const [cliente, setCliente] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [boletas, setBoletas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshingCache, setRefreshingCache] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [cacheExists, setCacheExists] = useState(false);
  const [expandedRows, setExpandedRows] = useState(null);
  const [filtroBoletas, setFiltroBoletas] = useState('pendientes');
  const [totales, setTotales] = useState({
    totalAdeudado: 0,
    totalPagado: 0,
    totalGeneral: 0
  });

  // 🆕 Estados para Reporte Masivo
  const [mostrarDialogMasivo, setMostrarDialogMasivo] = useState(false);
  const [clientesSeleccionados, setClientesSeleccionados] = useState([]);
  const [generandoReporte, setGenerandoReporte] = useState(false);

  const boletasFiltradas = useMemo(
    () => listarBoletasVisibles(boletas, filtroBoletas),
    [boletas, filtroBoletas]
  );
  const montoVencido = useMemo(() => totalVencido(boletas), [boletas]);
  const listaProximos = useMemo(() => proximosVencimientos(boletas, 5), [boletas]);

  const getSellerId = () => {
    if (user?.role === 'Guille') return 1;
    if (user?.role === 'Santi') return 2;
    if (user?.role === 'admin') return null; // Admin ve todos
    return null;
  };

  // Cargar clientes al montar el componente
  useEffect(() => {
    const fetchClientes = async () => {
      setLoadingClientes(true);
      try {
        const data = await api.getClientesFirebase();
        
        // Filtrar clientes según el rol del usuario
        const sellerId = getSellerId();
        let clientesFiltrados = data;
        
        if (sellerId !== null) {
          // Filtrar por sellerId específico - el seller es un objeto con id
          clientesFiltrados = data.filter(cliente => {
            if (cliente.seller && cliente.seller.id) {
              return cliente.seller.id === sellerId.toString();
            }
            return false;
          });
        } else if (user?.role === 'admin') {
          clientesFiltrados = data;
        } else {
          clientesFiltrados = [];
        }
        
        // Ordenar clientes alfabéticamente
        const clientesOrdenados = clientesFiltrados
          .sort((a, b) => {
            const nombreA = a.name || a.nombre || a['Razón Social'] || '';
            const nombreB = b.name || b.nombre || b['Razón Social'] || '';
            return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
          });
        
        setClientes(clientesOrdenados);
        
        // Si hay un cliente desde navegación o parámetros URL, seleccionarlo automáticamente
        let clienteAPreseleccionar = null;
        
        // Verificar si viene desde location.state (navegación programática)
        if (location.state?.cliente && clientesOrdenados.length > 0) {
          clienteAPreseleccionar = clientesOrdenados.find(c => 
            c.id === location.state.cliente.id || 
            c.name === location.state.cliente.name ||
            c.nombre === location.state.cliente.nombre ||
            c['Razón Social'] === location.state.cliente['Razón Social']
          );
        }
        
        // Verificar si viene desde parámetros URL (navegación desde MenuClientes)
        const clienteParam = searchParams.get('cliente');
        // console.log('[EstadoCuenta] Parámetro cliente de URL:', clienteParam, 'tipo:', typeof clienteParam);
        // console.log('[EstadoCuenta] Primeros 5 clientes con sus tipos de ID:', clientesOrdenados.slice(0, 5).map(c => ({ id: c.id, idType: typeof c.id, name: c.name })));
        
        if (clienteParam && clientesOrdenados.length > 0 && !clienteAPreseleccionar) {
          // Convertir el parámetro a número para comparar con el ID
          const clienteParamNum = Number(clienteParam);
          
          clienteAPreseleccionar = clientesOrdenados.find(c => 
            c.id === clienteParamNum ||  // Comparar como número
            c.id === clienteParam ||     // También comparar como string por si acaso
            c.name === clienteParam ||
            c.nombre === clienteParam ||
            c['Razón Social'] === clienteParam
          );
          // console.log('[EstadoCuenta] Cliente encontrado para preseleccionar:', clienteAPreseleccionar);
        }
        
        if (clienteAPreseleccionar) {
          setCliente(clienteAPreseleccionar);
          cargarEstadoCuenta(clienteAPreseleccionar);
        }
      } catch (error) {
        console.error('Error al cargar clientes:', error);
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar la lista de clientes'
        });
      } finally {
        setLoadingClientes(false);
      }
    };
    
    fetchClientes();
  }, [user, location.state, searchParams]);

  const handleClienteChange = (clienteSeleccionado) => {
    setCliente(clienteSeleccionado);
    setExpandedRows(null);
    if (clienteSeleccionado) {
      cargarEstadoCuenta(clienteSeleccionado);
    } else {
      setBoletas([]);
      setTotales({
        totalAdeudado: 0,
        totalPagado: 0,
        totalGeneral: 0
      });
    }
  };

  // 🆕 Función para calcular tiempo relativo
  const calcularTiempoRelativo = (timestamp) => {
    if (!timestamp) return 'Nunca';
    
    const ahora = new Date();
    const fecha = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const diferenciaMs = ahora - fecha;
    const diferenciaMinutos = Math.floor(diferenciaMs / (1000 * 60));
    const diferenciaHoras = Math.floor(diferenciaMs / (1000 * 60 * 60));
    const diferenciaDias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
    
    if (diferenciaMinutos < 1) return 'Hace menos de un minuto';
    if (diferenciaMinutos < 60) return `Hace ${diferenciaMinutos} minuto${diferenciaMinutos > 1 ? 's' : ''}`;
    if (diferenciaHoras < 24) return `Hace ${diferenciaHoras} hora${diferenciaHoras > 1 ? 's' : ''}`;
    return `Hace ${diferenciaDias} día${diferenciaDias > 1 ? 's' : ''}`;
  };

  const cargarEstadoCuenta = async (clienteData) => {
    setLoading(true);
    try {
      // 🆕 Primero consultar caché
      console.log('[ESTADO CUENTA] Consultando caché para cliente:', clienteData.id);
      const cacheData = await api.getEstadoCuentaCache(clienteData.id);
      
      if (cacheData.exists && cacheData.facturas && cacheData.facturas.length > 0) {
        // Mostrar datos del caché inmediatamente
        console.log('[ESTADO CUENTA] Datos encontrados en caché:', cacheData.facturas.length, 'facturas');
        setBoletas(cacheData.facturas);
        setTotales({
          totalAdeudado: cacheData.totalAdeudado || 0,
          totalPagado: cacheData.totalPagado || 0,
          totalGeneral: cacheData.totalFacturado || 0
        });
        setUltimaActualizacion(cacheData.ultimaActualizacion);
        setCacheExists(true);
        
        // No mostrar toast, los datos ya están visibles
      } else {
        // No hay caché, mostrar mensaje pero no consultar Alegra automáticamente
        console.log('[ESTADO CUENTA] No hay caché disponible');
        setBoletas([]);
        setTotales({
          totalAdeudado: 0,
          totalPagado: 0,
          totalGeneral: 0
        });
        setUltimaActualizacion(null);
        setCacheExists(false);
        
        toast.current.show({
          severity: 'info',
          summary: 'Sin datos en caché',
          detail: 'Presiona "Actualizar ahora" para cargar el estado de cuenta desde Alegra',
          life: 5000
        });
      }

    } catch (error) {
      console.error('Error al cargar estado de cuenta desde caché:', error);
      
      // En caso de error, mostrar tabla vacía
      setBoletas([]);
      setTotales({
        totalAdeudado: 0,
        totalPagado: 0,
        totalGeneral: 0
      });
      setUltimaActualizacion(null);
      setCacheExists(false);

      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo cargar el estado de cuenta desde caché'
      });
    } finally {
      setLoading(false);
    }
  };

  const actualizarDesdeAlegra = async () => {
    if (!cliente) return;
    
    setRefreshingCache(true);
    try {
      // 🆕 Llamar al endpoint de refresh que consulta Alegra y actualiza caché
      console.log('[ESTADO CUENTA] Refrescando desde Alegra para cliente:', cliente.id);
      const resultado = await api.refreshEstadoCuentaCache(cliente.id, true); // forzar = true
      
      if (resultado.fresh) {
        // Caché estaba fresco, usar datos existentes
        console.log('[ESTADO CUENTA] Caché estaba fresco, usando datos existentes');
        toast.current.show({
          severity: 'info',
          summary: 'Caché actualizado',
          detail: 'Los datos ya estaban actualizados'
        });
      } else {
        // Caché fue actualizado, recargar datos
        console.log('[ESTADO CUENTA] Caché actualizado, recargando datos');
      await cargarEstadoCuenta(cliente);
      
      toast.current.show({
        severity: 'success',
        summary: 'Actualizado',
        detail: 'Estado de cuenta actualizado desde Alegra'
      });
      }

    } catch (error) {
      console.error('Error al actualizar desde Alegra:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar desde Alegra'
      });
    } finally {
      setRefreshingCache(false);
    }
  };

  const estadoBody = (rowData) => {
    const etiqueta = etiquetaEstado(rowData);
    return <Tag value={etiqueta} severity={severityEstado(etiqueta)} />;
  };

  const adeudadoBody = (rowData) => {
    const pendiente = montoPendienteFactura(rowData);
    const vencida = !estaPagada(rowData) && esFacturaVencida(rowData.fechaVencimiento);
    return (
      <span className={vencida ? 'cuenta-monto-vencido' : ''}>
        {formatMonto(pendiente)}
      </span>
    );
  };

  const detalleExpandido = (rowData) => (
    <div className="estado-cuenta-expanded-details">
      <strong>Pagos</strong>
      {rowData.pagos && rowData.pagos.length > 0 ? (
        <ul>
          {rowData.pagos.map((pago, idx) => (
            <li key={idx}>
              {formatFecha(pago.date)} · {formatMonto(pago.amount)}
              {pago.notes ? ` · ${pago.notes}` : ''}
            </li>
          ))}
        </ul>
      ) : (
        <p>Sin pagos registrados.</p>
      )}
      <strong>Productos</strong>
      {rowData.productos && rowData.productos.length > 0 ? (
        <ul>
          {rowData.productos.map((producto, idx) => (
            <li key={idx}>
              {producto.quantity || 1}× {producto.name || producto.description || 'Producto'}
              {producto.total ? ` · ${formatMonto(producto.total)}` : ''}
            </li>
          ))}
        </ul>
      ) : (
        <p>Sin productos registrados.</p>
      )}
    </div>
  );

  const exportarPDF = () => {
    if (!cliente || boletas.length === 0) {
      toast.current.show({
        severity: 'warn',
        summary: 'Sin datos',
        detail: 'No hay datos para exportar'
      });
      return;
    }

    try {
      exportarEstadoCuentaClientePdf({
        nombreCliente: nombreClienteCuenta(cliente, boletas),
        facturas: boletas,
        saldoAdeudado: totales.totalAdeudado
      });
      toast.current.show({
        severity: 'success',
        summary: 'PDF exportado',
        detail: 'Estado de cuenta listo para imprimir'
      });
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo exportar el PDF'
      });
    }
  };

  const generarReporteMasivo = async () => {
    if (clientesSeleccionados.length === 0) return;

    setGenerandoReporte(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let currentY = 20;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('HOJA SÁBANA DE ESTADOS DE CUENTA', pageWidth / 2, 16, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado el: ${new Date().toLocaleString('es-AR')}`, pageWidth - 10, 22, { align: 'right' });

      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text(
        'Leyenda: Vencida = vencimiento anterior a hoy (texto rojo). Pendiente = aún no vencida (texto azul).',
        15,
        29
      );
      doc.setTextColor(0, 0, 0);

      currentY = 36;

      const clientesSinRefreshOk = [];

      for (const [index, clienteSel] of clientesSeleccionados.entries()) {
        let cacheData;
        let datosSoloCache = false;
        try {
          const resultado = await api.refreshEstadoCuentaCache(clienteSel.id, true);
          cacheData = resultado?.data ?? resultado;
          if (!cacheData || !Array.isArray(cacheData.facturas)) {
            cacheData = await api.getEstadoCuentaCache(clienteSel.id);
            datosSoloCache = true;
          }
        } catch (err) {
          console.error('[Reporte masivo] Error refrescando estado de cuenta:', clienteSel.id, err);
          try {
            cacheData = await api.getEstadoCuentaCache(clienteSel.id);
            datosSoloCache = true;
          } catch {
            cacheData = { facturas: [], totalAdeudado: 0, exists: false };
            datosSoloCache = true;
          }
        }

        if (datosSoloCache) {
          clientesSinRefreshOk.push(clienteSel.name || clienteSel.nombre || String(clienteSel.id));
        }

        if (index < clientesSeleccionados.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 450));
        }

        currentY = dibujarBloqueDeuda(doc, {
          nombreCliente: clienteSel.name || clienteSel.nombre || 'Cliente',
          facturas: cacheData.facturas || [],
          saldoAdeudado: cacheData.totalAdeudado || 0,
          datosSoloCache,
          currentY
        });
        currentY += 8;
      }

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Distribuidora DCG - Reporte de Deuda Masivo', pageWidth / 2, pageHeight - 10, { align: 'center' });

      doc.save(`Repo_Masivo_Deuda_${new Date().toISOString().split('T')[0]}.pdf`);

      const detalleBase = `Se actualizó desde Alegra y se incluyeron ${clientesSeleccionados.length} cliente(s).`;
      const detalleAdvertencia =
        clientesSinRefreshOk.length > 0
          ? ` ${clientesSinRefreshOk.length} sin refrescar (caché previo o error).`
          : '';

      toast.current.show({
        severity: clientesSinRefreshOk.length > 0 ? 'warn' : 'success',
        summary: 'Reporte generado',
        detail: detalleBase + detalleAdvertencia
      });

      setMostrarDialogMasivo(false);
      setClientesSeleccionados([]);
    } catch (error) {
      console.error('Error generando reporte masivo:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo generar el reporte masivo'
      });
    } finally {
      setGenerandoReporte(false);
    }
  };

  if (loadingClientes) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <ProgressSpinner />
        <p>Cargando clientes...</p>
      </div>
    );
  }

  return (
    <div className="estado-cuenta-container">
      <Toast ref={toast} />

      <Card className="estado-cuenta-card">
        {/* Header */}
        <div className="estado-cuenta-header">
          <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center flex-wrap gap-3">
            <div style={{ flex: "1", minWidth: "0" }}>
              <h1>Estado de Cuenta</h1>
              {cliente ? (
                <div>
                  <p className="estado-cuenta-subtitle">
                  Cliente: <strong>{nombreCliente(cliente)}</strong>
                </p>
                  {ultimaActualizacion && (
                    <p className="estado-cuenta-update-time">
                      {calcularTiempoRelativo(ultimaActualizacion)}
                    </p>
                  )}
                  {!cacheExists && (
                    <p className="estado-cuenta-warning">
                      Sin datos en caché. Tocá Actualizar ahora para cargar.
                    </p>
                  )}
                </div>
              ) : (
                <p className="estado-cuenta-subtitle">
                  {user?.role === 'admin' ? (
                    <>
                      Elegí un cliente abajo para ver su estado de cuenta individual, o usá{" "}
                      <strong>Reporte masivo</strong> para generar una hoja sábana con varios clientes a la vez.
                    </>
                  ) : (
                    "Selecciona un cliente para ver su estado de cuenta"
                  )}
                </p>
              )}
            </div>
            <div className="estado-cuenta-header-buttons">
              <Button
                label="Volver"
                icon="pi pi-arrow-left"
                className="p-button-outlined"
                onClick={() => navigate('/dashboard')}
              />
              {user?.role === 'admin' && (
                <Button
                  label="Reporte masivo"
                  icon="pi pi-users"
                  className="p-button-success"
                  onClick={() => setMostrarDialogMasivo(true)}
                  tooltip="Generar hoja sábana de múltiples clientes (sin elegir uno individual)"
                />
              )}
              {cliente && (
                <>
                  <Button
                    label={refreshingCache ? "Actualizando..." : "Actualizar ahora"}
                    icon={refreshingCache ? "pi pi-spin pi-spinner" : "pi pi-refresh"}
                    className="p-button-outlined"
                    onClick={actualizarDesdeAlegra}
                    disabled={refreshingCache}
                  />
                  <Button
                    label="Exportar PDF"
                    icon="pi pi-file-pdf"
                    className="p-button-outlined"
                    onClick={exportarPDF}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="estado-cuenta-selector">
          <div className="p-field">
            <label className="p-block p-mb-2">Cliente</label>
            {esMovil ? (
              <ClientePickerMovil
                clientes={clientes}
                value={cliente}
                onChange={handleClienteChange}
                loading={loadingClientes}
              />
            ) : (
              <Dropdown
                value={cliente}
                options={clientes}
                onChange={(e) => handleClienteChange(e.value)}
                optionLabel="name"
                placeholder="Selecciona un cliente"
                filter
                filterPlaceholder="Buscar cliente..."
                showClear
                className="p-fluid"
                style={{ width: '100%' }}
              />
            )}
          </div>
        </div>

        {cliente && (
          <div className="cuenta-resumen">
            <div className="cuenta-resumen__fila">
              <span>Adeudado</span>
              <strong className="cuenta-resumen__monto is-deuda">
                {formatMonto(totales.totalAdeudado)}
              </strong>
            </div>
            <div className="cuenta-resumen__fila">
              <span>Vencido</span>
              <strong className="cuenta-resumen__monto is-deuda">
                {formatMonto(montoVencido)}
              </strong>
            </div>
            <div className="cuenta-resumen__fila">
              <span>Pagado</span>
              <strong className="cuenta-resumen__monto is-ok">
                {formatMonto(totales.totalPagado)}
              </strong>
            </div>
            {listaProximos.length > 0 && (
              <p className="cuenta-resumen__aviso">
                Vence en 5 días:{' '}
                {listaProximos
                  .map((factura) => `#${factura.numero} (${formatFecha(factura.fechaVencimiento)})`)
                  .join(' · ')}
              </p>
            )}
          </div>
        )}

        {cliente && (
          <div className="estado-cuenta-tabla-container">
            <div className="cuenta-tabla-toolbar">
              <h3 className="estado-cuenta-tabla-title">Facturas</h3>
              <div className="cuenta-filtros">
                {FILTROS_BOLETA.map((filtro) => (
                  <button
                    key={filtro.id}
                    type="button"
                    className={`cuenta-filtro ${filtroBoletas === filtro.id ? 'is-active' : ''}`}
                    onClick={() => setFiltroBoletas(filtro.id)}
                  >
                    {filtro.label}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <ProgressSpinner />
                <p style={{ marginTop: '1rem' }}>Cargando estado de cuenta...</p>
              </div>
            ) : (
              <>
                <div className="vista-desktop estado-cuenta-table">
                  <DataTable
                    value={boletasFiltradas}
                    paginator
                    rows={20}
                    emptyMessage="No hay facturas en este filtro."
                    className="p-datatable-sm"
                    dataKey="numero"
                    expandedRows={expandedRows}
                    onRowToggle={(e) => setExpandedRows(e.data)}
                    rowExpansionTemplate={detalleExpandido}
                    rowClassName={(data) =>
                      !estaPagada(data) && esFacturaVencida(data.fechaVencimiento)
                        ? 'cuenta-fila-vencida'
                        : ''
                    }
                  >
                    <Column expander style={{ width: '3rem' }} />
                    <Column field="numero" header="Nº" style={{ width: '12%' }} />
                    <Column
                      field="fechaEmision"
                      header="Emisión"
                      body={(row) => formatFecha(row.fechaEmision)}
                      style={{ width: '12%' }}
                    />
                    <Column
                      field="fechaVencimiento"
                      header="Vence"
                      body={(row) => formatFecha(row.fechaVencimiento)}
                      style={{ width: '12%' }}
                    />
                    <Column
                      field="montoTotal"
                      header="Total"
                      body={(row) => formatMonto(row.montoTotal)}
                      style={{ width: '14%' }}
                    />
                    <Column
                      field="montoPagado"
                      header="Pagado"
                      body={(row) => formatMonto(row.montoPagado)}
                      style={{ width: '14%' }}
                    />
                    <Column header="Adeudado" body={adeudadoBody} style={{ width: '14%' }} />
                    <Column header="Estado" body={estadoBody} style={{ width: '12%' }} />
                  </DataTable>
                </div>

                <div className="vista-movil">
                  {boletasFiltradas.length === 0 ? (
                    <p className="lista-movil__vacio">No hay facturas en este filtro.</p>
                  ) : (
                    boletasFiltradas.map((boleta, index) => {
                      const adeudado = montoPendienteFactura(boleta);
                      const etiqueta = etiquetaEstado(boleta);
                      const abierta = Boolean(expandedRows?.[boleta.numero]);
                      return (
                        <article
                          key={boleta.numero || index}
                          className={`lista-movil__card cuenta-boleta ${
                            etiqueta === 'VENCIDA' ? 'cuenta-boleta--vencida' : ''
                          }`}
                        >
                          <div className="lista-movil__top">
                            <strong>Factura #{boleta.numero}</strong>
                            <span className={`lista-movil__monto ${adeudado > 0 ? 'cuenta-boleta__adeudado' : ''}`}>
                              {formatMonto(adeudado)}
                            </span>
                          </div>
                          <div className="lista-movil__meta">
                            <Tag value={etiqueta} severity={severityEstado(etiqueta)} />
                            <span>Emisión {formatFecha(boleta.fechaEmision)}</span>
                            <span>Vence {formatFecha(boleta.fechaVencimiento)}</span>
                          </div>
                          <div className="cuenta-boleta__montos">
                            <span>Total {formatMonto(boleta.montoTotal)}</span>
                            <span>Pagado {formatMonto(boleta.montoPagado)}</span>
                          </div>
                          <button
                            type="button"
                            className="cuenta-boleta__toggle"
                            onClick={() => {
                              setExpandedRows((prev) => ({
                                ...(prev || {}),
                                [boleta.numero]: !prev?.[boleta.numero]
                              }));
                            }}
                          >
                            {abierta ? 'Ocultar detalle' : 'Ver pagos y productos'}
                          </button>
                          {abierta && detalleExpandido(boleta)}
                        </article>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      {/* 🆕 Diálogo para Reporte Masivo */}
      <Dialog
        header="Generar Reporte Masivo (Hoja Sábana)"
        visible={mostrarDialogMasivo}
        style={{ width: '450px' }}
        onHide={() => {
          if (!generandoReporte) {
            setMostrarDialogMasivo(false);
            setClientesSeleccionados([]);
          }
        }}
        footer={
          <div>
            <Button
              label="Cancelar"
              icon="pi pi-times"
              onClick={() => {
                setMostrarDialogMasivo(false);
                setClientesSeleccionados([]);
              }}
              className="p-button-text"
              disabled={generandoReporte}
            />
            <Button
              label={generandoReporte ? "Actualizando y generando..." : "Actualizar y generar PDF"}
              icon={generandoReporte ? "pi pi-spin pi-spinner" : "pi pi-file-pdf"}
              onClick={generarReporteMasivo}
              className="p-button-success"
              disabled={generandoReporte || clientesSeleccionados.length === 0}
            />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--dcg-text-secondary)' }}>
            Seleccioná los clientes. Al generar, se <strong>actualiza el estado de cuenta desde Alegra</strong> para cada
            uno (como &quot;Actualizar ahora&quot;) y luego se arma el PDF con datos al día. Con muchos clientes puede
            tardar varios minutos.
          </p>
          <div className="p-field">
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Buscar Clientes:</label>
            <MultiSelect
              value={clientesSeleccionados}
              options={clientes}
              onChange={(e) => setClientesSeleccionados(e.value)}
              optionLabel="name"
              placeholder="Elegir clientes..."
              filter
              filterPlaceholder="Nombre del cliente"
              className="w-full"
              style={{ width: '100%' }}
              maxSelectedLabels={3}
              selectedItemsLabel="{0} clientes seleccionados"
            />
          </div>
          {generandoReporte && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <ProgressSpinner style={{ width: '30px', height: '30px' }} />
              <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>
                Actualizando cada cliente en Alegra y generando el PDF. Puede tardar si la lista es larga.
              </p>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}

export default EstadoCuenta;

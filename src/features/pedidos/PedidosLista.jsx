import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Panel } from 'primereact/panel';
import PedidoForm from './PedidoForm';
import PedidoFormMovil from './PedidoFormMovil';
import VerPedido from './VerPedido';
import { getPedidosRealtime, getPedidosByVendedorRealtime, eliminarPedido, cambiarEstadoPedido } from './pedidosService';
import { ESTADOS_PEDIDO, CONDICIONES_PAGO, getColorEstado, getLabelEstado, getLabelCondicionPago } from './constants';
import { formatearMoneda, formatearFecha } from './utils';
import { exportarListaPedidosPdf } from './exportarListaPedidosPdf';
import { api } from '../../services/api';
import './PedidosLista.css';

const PedidosLista = ({ user }) => {
  const toast = useRef(null);
  const [pedidos, setPedidos] = useState([]);
  const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [pedidosSeleccionados, setPedidosSeleccionados] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarVerPedido, setMostrarVerPedido] = useState(false);
  const [loading, setLoading] = useState(true);
  const [esMovil, setEsMovil] = useState(false);
  const [mostrarPresupuestos, setMostrarPresupuestos] = useState(false);
  const [presupuestos, setPresupuestos] = useState([]);
  const [cargandoPresupuestos, setCargandoPresupuestos] = useState(false);
  
  // Filtros
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroEstado, setFiltroEstado] = useState(null);
  const [filtroCondicionPago, setFiltroCondicionPago] = useState(null);
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(null);
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(null);
  const [filtrosColapsados, setFiltrosColapsados] = useState(true);

  const esAdmin = user?.role === 'admin';

  // 🆕 Detección robusta de móvil (breakpoint + dispositivo táctil)
  useEffect(() => {
    const detectarMovil = () => {
      const ancho = window.innerWidth;
      
      // Verificar ancho de pantalla (breakpoint < 768px)
      const esBreakpointMovil = ancho < 768;
      
      // Verificar si es dispositivo táctil
      const esTactil = 'ontouchstart' in window || 
                       navigator.maxTouchPoints > 0 || 
                       navigator.msMaxTouchPoints > 0;
      
      // Verificar user agent para detectar móviles/tablets (útil en device emulation)
      const userAgent = navigator.userAgent.toLowerCase();
      const esUserAgentMovil = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      
      // Considerar móvil si:
      // 1. Ancho muy pequeño (< 600px) - funciona siempre, incluso en device emulation
      // 2. Breakpoint móvil (< 768px) Y (dispositivo táctil O user agent móvil)
      // Esto permite que funcione en device emulation cuando se simula un user agent móvil
      const esMovilDetectado = ancho < 600 || 
                                (esBreakpointMovil && (esTactil || esUserAgentMovil));
      
      setEsMovil(esMovilDetectado);
    };

    // Detectar al montar
    detectarMovil();
    
    // Detectar en cambios de tamaño
    window.addEventListener('resize', detectarMovil);
    
    return () => {
      window.removeEventListener('resize', detectarMovil);
    };
  }, []);

  // Cargar pedidos en tiempo real
  useEffect(() => {
    let unsubscribe;
    
    if (esAdmin) {
      unsubscribe = getPedidosRealtime((pedidosData) => {
        setPedidos(pedidosData);
        setLoading(false);
      });
    } else {
      unsubscribe = getPedidosByVendedorRealtime(user.email, (pedidosData) => {
        setPedidos(pedidosData);
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, esAdmin]);

  // Aplicar filtros
  useEffect(() => {
    const aplicarFiltrosComunes = (lista) => {
      let filtrados = [...lista];

      if (filtroCliente) {
        filtrados = filtrados.filter(p =>
          p.cliente?.toLowerCase().includes(filtroCliente.toLowerCase())
        );
      }

      if (filtroFechaDesde) {
        filtrados = filtrados.filter(p => {
          const fechaPedido = p.fechaPedido?.toDate ? p.fechaPedido.toDate() : new Date(p.fechaPedido);
          return fechaPedido >= filtroFechaDesde;
        });
      }

      if (filtroFechaHasta) {
        filtrados = filtrados.filter(p => {
          const fechaPedido = p.fechaPedido?.toDate ? p.fechaPedido.toDate() : new Date(p.fechaPedido);
          return fechaPedido <= filtroFechaHasta;
        });
      }

      return filtrados;
    };

    let filtrados = aplicarFiltrosComunes(pedidos);

    if (filtroEstado) {
      filtrados = filtrados.filter(p => p.estado === filtroEstado);
    }

    if (filtroCondicionPago) {
      filtrados = filtrados.filter(p => p.condicionPago === filtroCondicionPago);
    }

    if (esAdmin && mostrarPresupuestos && filtroEstado !== 'facturado') {
      filtrados = [...filtrados, ...aplicarFiltrosComunes(presupuestos)];
    }

    setPedidosFiltrados(filtrados);
  }, [pedidos, presupuestos, mostrarPresupuestos, esAdmin, filtroCliente, filtroEstado, filtroCondicionPago, filtroFechaDesde, filtroFechaHasta]);

  const limpiarFiltros = () => {
    setFiltroCliente('');
    setFiltroEstado(null);
    setFiltroCondicionPago(null);
    setFiltroFechaDesde(null);
    setFiltroFechaHasta(null);
  };

  const togglePresupuestos = async () => {
    if (!esAdmin) return;

    if (mostrarPresupuestos) {
      setMostrarPresupuestos(false);
      setPresupuestos([]);
      setPedidosSeleccionados((sel) => (sel || []).filter((p) => p.origen !== 'presupuesto'));
      return;
    }

    setCargandoPresupuestos(true);
    try {
      const data = await api.getAlegraEstimatesUnbilled(150, user?.role);
      const lista = Array.isArray(data) ? data : [];
      setPresupuestos(lista);
      setMostrarPresupuestos(true);
      toast.current?.show({
        severity: lista.length ? 'success' : 'info',
        summary: 'Presupuestos',
        detail: lista.length
          ? `Se cargaron ${lista.length} presupuesto(s) sin facturar`
          : 'No hay presupuestos sin facturar en Alegra'
      });
    } catch (error) {
      console.error('Error cargando presupuestos de Alegra:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar los presupuestos de Alegra'
      });
    } finally {
      setCargandoPresupuestos(false);
    }
  };

  const exportarListaPdf = () => {
    if (pedidosSeleccionados.length === 0) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Sin selección',
        detail: 'Seleccioná al menos un pedido para exportar'
      });
      return;
    }

    try {
      exportarListaPedidosPdf(pedidosSeleccionados);
      toast.current?.show({
        severity: 'success',
        summary: 'PDF generado',
        detail: `Se exportaron ${pedidosSeleccionados.length} pedido(s)`
      });
    } catch (error) {
      console.error('Error exportando lista de pedidos:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo generar el PDF'
      });
    }
  };

  const handleNuevoPedido = () => {
    setPedidoSeleccionado(null);
    setMostrarForm(true);
  };

  const verPedido = (pedido) => {
    setPedidoSeleccionado(pedido);
    setMostrarVerPedido(true);
  };

  const handleEditarPedido = (pedido) => {
    setPedidoSeleccionado(pedido);
    setMostrarForm(true);
  };

  const handleEliminarPedido = (pedido) => {
    confirmDialog({
      message: `¿Está seguro de eliminar el pedido de ${pedido.cliente}?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: async () => {
        try {
          await eliminarPedido(pedido.id, user);
          toast.current?.show({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Pedido eliminado correctamente'
          });
        } catch (error) {
          console.error('Error eliminando pedido:', error);
          toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al eliminar el pedido'
          });
        }
      }
    });
  };

  const handleCambiarEstado = async (pedido, nuevoEstado) => {
    // Validar que solo admin pueda cambiar a facturado
    if (nuevoEstado === 'facturado' && !esAdmin) {
      toast.current?.show({
        severity: 'error',
        summary: 'Acceso denegado',
        detail: 'Solo el administrador puede marcar pedidos como facturados'
      });
      return;
    }

    try {
      await cambiarEstadoPedido(pedido.id, nuevoEstado, user);
      toast.current?.show({
        severity: 'success',
        summary: 'Éxito',
        detail: `Estado cambiado a ${getLabelEstado(nuevoEstado)}`
      });
    } catch (error) {
      console.error('Error cambiando estado:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Error al cambiar el estado'
      });
    }
  };

  // Templates para columnas
  const clienteTemplate = (rowData) => {
    return (
      <span data-label="Cliente">
        {rowData.cliente}
        {rowData.origen === 'presupuesto' && (
          <Tag value="Presupuesto" severity="info" className="ml-2" />
        )}
      </span>
    );
  };

  const fechaTemplate = (rowData) => {
    return <span data-label="Fecha Pedido">{formatearFecha(rowData.fechaPedido)}</span>;
  };

  const condicionPagoTemplate = (rowData) => {
    if (rowData.origen === 'presupuesto') {
      return <span data-label="Condición de Pago">-</span>;
    }
    return <span data-label="Condición de Pago">{getLabelCondicionPago(rowData.condicionPago || 'contado')}</span>;
  };

  const estadoTemplate = (rowData) => {
    return <span data-label="Estado"><Tag value={getLabelEstado(rowData.estado)} severity={getColorEstado(rowData.estado)} /></span>;
  };

  const totalTemplate = (rowData) => {
    return <span data-label="Total">{formatearMoneda(rowData.total)}</span>;
  };

  const vendedorTemplate = (rowData) => {
    return <span data-label="Vendedor">{rowData.vendedorNombre || rowData.vendedor}</span>;
  };

  const accionesTemplate = (rowData) => {
    const esPresupuesto = rowData.origen === 'presupuesto';
    const puedeEditar = !esPresupuesto && (esAdmin || (rowData.vendedor === user.email && rowData.estado !== 'facturado'));
    const puedeEliminar = !esPresupuesto && (esAdmin || (rowData.vendedor === user.email && rowData.estado !== 'facturado'));
    
    return (
      <span data-label="Acciones">
        <div className="flex gap-2">
          <Button
            icon="pi pi-eye"
            className="p-button-rounded p-button-info p-button-text"
            onClick={() => verPedido(rowData)}
            tooltip="Ver detalles"
          />
          {puedeEditar && (
            <Button
              icon="pi pi-pencil"
              className="p-button-rounded p-button-success p-button-text"
              onClick={() => handleEditarPedido(rowData)}
              tooltip="Editar"
            />
          )}
          {puedeEliminar && (
            <Button
              icon="pi pi-trash"
              className="p-button-rounded p-button-danger p-button-text"
              onClick={() => handleEliminarPedido(rowData)}
              tooltip="Eliminar"
            />
          )}
          {esAdmin && !esPresupuesto && rowData.estado === 'pendiente' && (
            <Button
              icon="pi pi-check"
              className="p-button-rounded p-button-success p-button-text"
              onClick={() => handleCambiarEstado(rowData, 'facturado')}
              tooltip="Marcar como facturado"
            />
          )}
        </div>
      </span>
    );
  };

  const header = (
    <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-2">
      <h3 className="m-0">Lista de Pedidos ({pedidosFiltrados.length})</h3>
      <div className="flex flex-wrap gap-2">
        {esAdmin && (
          <Button
            label={mostrarPresupuestos ? 'Ocultar presupuestos' : 'Mostrar presupuestos'}
            icon={mostrarPresupuestos ? 'pi pi-eye-slash' : 'pi pi-file'}
            className="p-button-outlined"
            loading={cargandoPresupuestos}
            onClick={togglePresupuestos}
          />
        )}
        <Button
          label="Seleccionar filtrados"
          icon="pi pi-check-square"
          className="p-button-outlined"
          onClick={() => setPedidosSeleccionados([...pedidosFiltrados])}
          disabled={!pedidosFiltrados.length}
        />
        <Button
          label={pedidosSeleccionados.length ? `Exportar PDF (${pedidosSeleccionados.length})` : 'Exportar PDF'}
          icon="pi pi-file-pdf"
          onClick={exportarListaPdf}
          disabled={pedidosSeleccionados.length === 0}
        />
        <Button
          label="Nuevo Pedido"
          icon="pi pi-plus"
          onClick={handleNuevoPedido}
          className="p-button-success"
        />
      </div>
    </div>
  );

  return (
    <div className="pedidos-lista">
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* Filtros */}
      <Panel
        header="Filtros"
        toggleable
        collapsed={filtrosColapsados}
        onToggle={(e) => setFiltrosColapsados(e.value)}
        className="mb-3"
      >
        <div className="grid">
          <div className="col-12 md:col-3">
            <div className="field">
              <label htmlFor="filtroCliente">Cliente</label>
              <InputText
                id="filtroCliente"
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                placeholder="Buscar por cliente..."
              />
            </div>
          </div>

          <div className="col-12 md:col-2">
            <div className="field">
              <label htmlFor="filtroEstado">Estado</label>
              <Dropdown
                id="filtroEstado"
                value={filtroEstado}
                options={ESTADOS_PEDIDO}
                onChange={(e) => setFiltroEstado(e.value)}
                placeholder="Todos"
                showClear
              />
            </div>
          </div>

          <div className="col-12 md:col-2">
            <div className="field">
              <label htmlFor="filtroCondicionPago">Condición de Pago</label>
              <Dropdown
                id="filtroCondicionPago"
                value={filtroCondicionPago}
                options={CONDICIONES_PAGO}
                onChange={(e) => setFiltroCondicionPago(e.value)}
                placeholder="Todas"
                showClear
              />
            </div>
          </div>

          <div className="col-12 md:col-2">
            <div className="field">
              <label htmlFor="filtroFechaDesde">Desde</label>
              <Calendar
                id="filtroFechaDesde"
                value={filtroFechaDesde}
                onChange={(e) => setFiltroFechaDesde(e.value)}
                dateFormat="dd/mm/yy"
                showIcon
                showButtonBar
              />
            </div>
          </div>

          <div className="col-12 md:col-2">
            <div className="field">
              <label htmlFor="filtroFechaHasta">Hasta</label>
              <Calendar
                id="filtroFechaHasta"
                value={filtroFechaHasta}
                onChange={(e) => setFiltroFechaHasta(e.value)}
                dateFormat="dd/mm/yy"
                showIcon
                showButtonBar
              />
            </div>
          </div>

          <div className="col-12 md:col-1 flex align-items-end">
            <Button
              label="Limpiar"
              icon="pi pi-filter-slash"
              className="p-button-outlined w-full"
              onClick={limpiarFiltros}
            />
          </div>
        </div>
      </Panel>

      {/* Tabla de pedidos */}
      <div className="pedidos-table">
        <DataTable
          value={pedidosFiltrados}
          header={header}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 50]}
          loading={loading}
          emptyMessage="No hay pedidos registrados"
          responsiveLayout="stack"
          breakpoint="960px"
          dataKey="id"
          selection={pedidosSeleccionados}
          onSelectionChange={(e) => setPedidosSeleccionados(Array.isArray(e.value) ? e.value : [])}
          selectionMode="checkbox"
        >
        <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
        <Column field="cliente" header="Cliente" body={clienteTemplate} sortable />
        <Column 
          field="fechaPedido" 
          header="Fecha Pedido" 
          body={fechaTemplate}
          sortable 
        />
        <Column 
          field="condicionPago" 
          header="Condición de Pago" 
          body={condicionPagoTemplate}
          sortable 
        />
        <Column field="estado" header="Estado" body={estadoTemplate} sortable />
        <Column 
          field="total" 
          header="Total" 
          body={totalTemplate}
          sortable 
        />
        <Column 
          field="vendedorNombre" 
          header="Vendedor" 
          body={vendedorTemplate}
          sortable 
        />
        <Column body={accionesTemplate} header="Acciones" style={{ width: '180px' }} />
      </DataTable>
      </div>

      {/* Formulario de pedido */}
      {/* 🆕 Usar formulario móvil o desktop según detección */}
      {esMovil ? (
        <PedidoFormMovil
          visible={mostrarForm}
          onHide={() => {
            setMostrarForm(false);
            setPedidoSeleccionado(null);
          }}
          pedido={pedidoSeleccionado}
          onSuccess={() => {
            setMostrarForm(false);
            setPedidoSeleccionado(null);
            toast.current?.show({
              severity: 'success',
              summary: 'Éxito',
              detail: pedidoSeleccionado ? 'Pedido actualizado' : 'Pedido creado'
            });
          }}
          user={user}
        />
      ) : (
        <PedidoForm
          visible={mostrarForm}
          onHide={() => {
            setMostrarForm(false);
            setPedidoSeleccionado(null);
          }}
          pedido={pedidoSeleccionado}
          onSuccess={() => {
            setMostrarForm(false);
            setPedidoSeleccionado(null);
            toast.current?.show({
              severity: 'success',
              summary: 'Éxito',
              detail: pedidoSeleccionado ? 'Pedido actualizado' : 'Pedido creado'
            });
          }}
          user={user}
        />
      )}

      <VerPedido
        visible={mostrarVerPedido}
        onHide={() => {
          setMostrarVerPedido(false);
          setPedidoSeleccionado(null);
        }}
        pedido={pedidoSeleccionado}
      />
    </div>
  );
};

export default PedidosLista;


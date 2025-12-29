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
import './PedidosLista.css';

const PedidosLista = ({ user }) => {
  const toast = useRef(null);
  const [pedidos, setPedidos] = useState([]);
  const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarVerPedido, setMostrarVerPedido] = useState(false);
  const [loading, setLoading] = useState(true);
  
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
      // Verificar ancho de pantalla (breakpoint < 768px)
      const esBreakpointMovil = window.innerWidth < 768;
      
      // Verificar si es dispositivo táctil
      const esTactil = 'ontouchstart' in window || 
                       navigator.maxTouchPoints > 0 || 
                       navigator.msMaxTouchPoints > 0;
      
      // Considerar móvil si: breakpoint móvil Y dispositivo táctil
      // O si el ancho es muy pequeño (< 600px) independientemente de táctil
      const esMovilDetectado = (esBreakpointMovil && esTactil) || window.innerWidth < 600;
      
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
    let filtrados = [...pedidos];

    // Filtro por cliente
    if (filtroCliente) {
      filtrados = filtrados.filter(p => 
        p.cliente?.toLowerCase().includes(filtroCliente.toLowerCase())
      );
    }

    // Filtro por estado
    if (filtroEstado) {
      filtrados = filtrados.filter(p => p.estado === filtroEstado);
    }

    // Filtro por condición de pago
    if (filtroCondicionPago) {
      filtrados = filtrados.filter(p => p.condicionPago === filtroCondicionPago);
    }

    // Filtro por fecha desde
    if (filtroFechaDesde) {
      filtrados = filtrados.filter(p => {
        const fechaPedido = p.fechaPedido?.toDate ? p.fechaPedido.toDate() : new Date(p.fechaPedido);
        return fechaPedido >= filtroFechaDesde;
      });
    }

    // Filtro por fecha hasta
    if (filtroFechaHasta) {
      filtrados = filtrados.filter(p => {
        const fechaPedido = p.fechaPedido?.toDate ? p.fechaPedido.toDate() : new Date(p.fechaPedido);
        return fechaPedido <= filtroFechaHasta;
      });
    }

    setPedidosFiltrados(filtrados);
  }, [pedidos, filtroCliente, filtroEstado, filtroCondicionPago, filtroFechaDesde, filtroFechaHasta]);

  const limpiarFiltros = () => {
    setFiltroCliente('');
    setFiltroEstado(null);
    setFiltroCondicionPago(null);
    setFiltroFechaDesde(null);
    setFiltroFechaHasta(null);
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
    return <span data-label="Cliente">{rowData.cliente}</span>;
  };

  const fechaTemplate = (rowData) => {
    return <span data-label="Fecha Pedido">{formatearFecha(rowData.fechaPedido)}</span>;
  };

  const condicionPagoTemplate = (rowData) => {
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
    const puedeEditar = esAdmin || (rowData.vendedor === user.email && rowData.estado !== 'facturado');
    const puedeEliminar = esAdmin || (rowData.vendedor === user.email && rowData.estado !== 'facturado');
    
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
          {esAdmin && rowData.estado === 'pendiente' && (
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
      <Button
        label="Nuevo Pedido"
        icon="pi pi-plus"
        onClick={handleNuevoPedido}
        className="p-button-success"
      />
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
        className="pedidos-table"
      >
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


import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Card } from 'primereact/card';
import { Panel } from 'primereact/panel';
import './CobrosLista.css';
import { 
  getCobrosRealtime, 
  getCobrosByVendedorRealtime, 
  eliminarCobro,
  marcarComoCargado,
  marcarComoPendiente 
} from './cobrosService';
import { FORMAS_PAGO, ESTADO_COLORS, ESTADO_ICONS } from './constants';
import { 
  formatearMonto, 
  formatearFecha, 
  getFormaPagoLabel, 
  getEstadoLabel,
  exportarCobrosExcel
} from './utils';
import CobroForm from './CobroForm';

const CobrosLista = ({ user }) => {
  const [cobros, setCobros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedEstado, setSelectedEstado] = useState(null);
  const [selectedFormaPago, setSelectedFormaPago] = useState(null);
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCobro, setSelectedCobro] = useState(null);
  const [filtrosVisible, setFiltrosVisible] = useState(false);
  const toast = useRef(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    let unsubscribe;

    if (isAdmin) {
      // Admin ve todos los cobros
      unsubscribe = getCobrosRealtime((data) => {
        setCobros(data);
        setLoading(false);
      });
    } else {
      // Vendedor solo ve sus cobros
      unsubscribe = getCobrosByVendedorRealtime(user.email, (data) => {
        setCobros(data);
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, isAdmin]);

  const handleNuevoCobro = () => {
    setSelectedCobro(null);
    setShowDialog(true);
  };

  const handleEditarCobro = (cobro) => {
    // Solo permitir editar si es el vendedor del cobro o es admin
    if (isAdmin || cobro.vendedor === user.email) {
      setSelectedCobro(cobro);
      setShowDialog(true);
    } else {
      toast.current?.show({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No tienes permisos para editar este cobro',
        life: 3000
      });
    }
  };

  const handleEliminarCobro = (cobro) => {
    // Solo admin puede eliminar
    if (!isAdmin) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No tienes permisos para eliminar cobros',
        life: 3000
      });
      return;
    }

    confirmDialog({
      message: `¿Estás seguro de eliminar el cobro de ${cobro.cliente} por ${formatearMonto(cobro.monto)}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await eliminarCobro(cobro.id, user);
          toast.current?.show({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Cobro eliminado correctamente',
            life: 3000
          });
        } catch (error) {
          console.error('Error eliminando cobro:', error);
          toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al eliminar el cobro',
            life: 3000
          });
        }
      }
    });
  };

  const handleMarcarCargado = async (cobro) => {
    if (!isAdmin) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Solo administradores pueden marcar cobros como cargados',
        life: 3000
      });
      return;
    }

    try {
      await marcarComoCargado(cobro.id, user);
      toast.current?.show({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Cobro marcado como cargado',
        life: 3000
      });
    } catch (error) {
      console.error('Error marcando cobro:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al actualizar el estado',
        life: 3000
      });
    }
  };

  const handleMarcarPendiente = async (cobro) => {
    if (!isAdmin) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Solo administradores pueden cambiar el estado',
        life: 3000
      });
      return;
    }

    try {
      await marcarComoPendiente(cobro.id, user);
      toast.current?.show({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Cobro marcado como pendiente',
        life: 3000
      });
    } catch (error) {
      console.error('Error marcando cobro:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al actualizar el estado',
        life: 3000
      });
    }
  };

  const handleExportar = () => {
    const cobrosParaExportar = getCobrosFiltrados();
    exportarCobrosExcel(cobrosParaExportar);
    toast.current?.show({
      severity: 'success',
      summary: 'Éxito',
      detail: `Se exportaron ${cobrosParaExportar.length} cobros a Excel`,
      life: 3000
    });
  };

  const getCobrosFiltrados = () => {
    return cobros.filter(cobro => {
      // Filtro de estado
      if (selectedEstado && cobro.estado !== selectedEstado) return false;
      
      // Filtro de forma de pago
      if (selectedFormaPago && cobro.formaPago !== selectedFormaPago) return false;
      
      // Filtro de fechas
      if (fechaInicio || fechaFin) {
        const fecha = cobro.fechaCobro?.toDate ? 
          cobro.fechaCobro.toDate() : 
          new Date(cobro.fechaCobro);
        
        if (fechaInicio && fecha < fechaInicio) return false;
        if (fechaFin && fecha > fechaFin) return false;
      }
      
      return true;
    });
  };

  const limpiarFiltros = () => {
    setSelectedEstado(null);
    setSelectedFormaPago(null);
    setFechaInicio(null);
    setFechaFin(null);
    setGlobalFilter('');
  };

  // Templates para las columnas
  const montoTemplate = (rowData) => {
    return <span className="font-semibold">{formatearMonto(rowData.monto)}</span>;
  };

  const fechaTemplate = (rowData) => {
    return formatearFecha(rowData.fechaCobro);
  };

  const formaPagoTemplate = (rowData) => {
    return getFormaPagoLabel(rowData.formaPago);
  };

  const estadoTemplate = (rowData) => {
    const severity = ESTADO_COLORS[rowData.estado];
    const icon = ESTADO_ICONS[rowData.estado];
    
    return (
      <Tag 
        value={getEstadoLabel(rowData.estado)} 
        severity={severity}
        icon={icon}
      />
    );
  };

  const accionesTemplate = (rowData) => {
    const esVendedorDelCobro = rowData.vendedor === user.email;
    const puedeEditar = isAdmin || esVendedorDelCobro;

    return (
      <div className="flex gap-1 md:gap-2 justify-content-center md:justify-content-start">
        {puedeEditar && rowData.estado === 'pendiente' && (
          <Button
            icon="pi pi-pencil"
            className="p-button-rounded p-button-text p-button-warning p-button-sm"
            onClick={() => handleEditarCobro(rowData)}
            tooltip="Editar"
            tooltipOptions={{ position: 'top' }}
          />
        )}
        
        {isAdmin && rowData.estado === 'pendiente' && (
          <Button
            icon="pi pi-check"
            className="p-button-rounded p-button-text p-button-success p-button-sm"
            onClick={() => handleMarcarCargado(rowData)}
            tooltip="Marcar como Cargado"
            tooltipOptions={{ position: 'top' }}
          />
        )}
        
        {isAdmin && rowData.estado === 'cargado' && (
          <Button
            icon="pi pi-refresh"
            className="p-button-rounded p-button-text p-button-secondary p-button-sm"
            onClick={() => handleMarcarPendiente(rowData)}
            tooltip="Marcar como Pendiente"
            tooltipOptions={{ position: 'top' }}
          />
        )}
        
        {isAdmin && (
          <Button
            icon="pi pi-trash"
            className="p-button-rounded p-button-text p-button-danger p-button-sm"
            onClick={() => handleEliminarCobro(rowData)}
            tooltip="Eliminar"
            tooltipOptions={{ position: 'top' }}
          />
        )}
      </div>
    );
  };

  const headerTemplate = (
    <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-3">
      <h2 className="m-0 text-2xl md:text-3xl">
        <i className="pi pi-dollar mr-2"></i>
        {isAdmin ? 'Todos los Cobros' : 'Mis Cobros'}
      </h2>
      <div className="flex gap-2 w-full md:w-auto">
        {isAdmin && (
          <Button
            label="Exportar Excel"
            icon="pi pi-file-excel"
            className="p-button-success flex-1 md:flex-none"
            onClick={handleExportar}
            disabled={cobros.length === 0}
          />
        )}
        <Button
          label="Nuevo Cobro"
          icon="pi pi-plus"
          className="flex-1 md:flex-none"
          onClick={handleNuevoCobro}
        />
      </div>
    </div>
  );

  return (
    <>
      <Toast ref={toast} />
      <ConfirmDialog />
      
      <Card className="cobros-lista">
        {headerTemplate}
        
        {/* Panel de filtros desplegable */}
        <Panel 
          header="Filtros" 
          toggleable 
          collapsed={!filtrosVisible}
          onToggle={(e) => setFiltrosVisible(!e.value)}
          className="mt-3"
          icons={(
            <Button
              icon="pi pi-filter-slash"
              className="p-button-text p-button-rounded p-button-plain"
              onClick={limpiarFiltros}
              tooltip="Limpiar filtros"
              tooltipOptions={{ position: 'left' }}
            />
          )}
        >
          <div className="grid mt-2">
            <div className="col-12 md:col-6 lg:col-3">
              <label className="block mb-2 text-sm font-medium">Búsqueda</label>
              <span className="p-input-icon-left w-full">
                <i className="pi pi-search" />
                <InputText
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full"
                />
              </span>
            </div>
            
            <div className="col-12 md:col-6 lg:col-2">
              <label className="block mb-2 text-sm font-medium">Estado</label>
              <Dropdown
                value={selectedEstado}
                options={[
                  { label: 'Pendiente', value: 'pendiente' },
                  { label: 'Cargado', value: 'cargado' }
                ]}
                onChange={(e) => setSelectedEstado(e.value)}
                placeholder="Todos"
                className="w-full"
                showClear
              />
            </div>
            
            <div className="col-12 md:col-6 lg:col-2">
              <label className="block mb-2 text-sm font-medium">Forma de Pago</label>
              <Dropdown
                value={selectedFormaPago}
                options={FORMAS_PAGO}
                onChange={(e) => setSelectedFormaPago(e.value)}
                placeholder="Todas"
                className="w-full"
                showClear
              />
            </div>
            
            <div className="col-12 md:col-6 lg:col-2">
              <label className="block mb-2 text-sm font-medium">Fecha Desde</label>
              <Calendar
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.value)}
                placeholder="Fecha inicial"
                dateFormat="dd/mm/yy"
                showIcon
                className="w-full"
                touchUI
              />
            </div>
            
            <div className="col-12 md:col-6 lg:col-2">
              <label className="block mb-2 text-sm font-medium">Fecha Hasta</label>
              <Calendar
                value={fechaFin}
                onChange={(e) => setFechaFin(e.value)}
                placeholder="Fecha final"
                dateFormat="dd/mm/yy"
                showIcon
                className="w-full"
                touchUI
              />
            </div>
          </div>
        </Panel>

        <DataTable
          value={getCobrosFiltrados()}
          loading={loading}
          globalFilter={globalFilter}
          emptyMessage="No se encontraron cobros"
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          sortField="fechaCobro"
          sortOrder={-1}
          responsiveLayout="scroll"
          stripedRows
          className="mt-3"
        >
          <Column 
            field="fechaCobro" 
            header="Fecha" 
            body={fechaTemplate}
            sortable
            style={{ width: '15%' }}
          />
          <Column 
            field="cliente" 
            header="Cliente" 
            sortable
            filter
            filterPlaceholder="Buscar por cliente"
            style={{ width: '25%' }}
          />
          <Column 
            field="monto" 
            header="Monto" 
            body={montoTemplate}
            sortable
            style={{ width: '15%' }}
          />
          <Column 
            field="formaPago" 
            header="Forma de Pago" 
            body={formaPagoTemplate}
            sortable
            style={{ width: '15%' }}
          />
          {isAdmin && (
            <Column 
              field="vendedor" 
              header="Vendedor" 
              sortable
              style={{ width: '20%' }}
            />
          )}
          <Column 
            field="estado" 
            header="Estado" 
            body={estadoTemplate}
            sortable
            style={{ width: '10%' }}
          />
          <Column 
            field="notas" 
            header="Notas" 
            style={{ width: '15%' }}
          />
          <Column 
            header="Acciones" 
            body={accionesTemplate}
            style={{ width: '10%' }}
          />
        </DataTable>
      </Card>

      <CobroForm
        visible={showDialog}
        onHide={() => setShowDialog(false)}
        cobro={selectedCobro}
        onSuccess={() => {
          // Los datos se actualizan automáticamente por el listener en tiempo real
        }}
        user={user}
      />
    </>
  );
};

export default CobrosLista;


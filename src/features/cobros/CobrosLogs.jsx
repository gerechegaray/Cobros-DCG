import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Timeline } from 'primereact/timeline';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { getLogsRealtime } from './cobrosService';
import { formatearFechaHora, getAccionLabel } from './utils';

const CobrosLogs = ({ user }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [vistaTimeline, setVistaTimeline] = useState(false);

  useEffect(() => {
    const unsubscribe = getLogsRealtime((data) => {
      setLogs(data);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const getAccionSeverity = (accion) => {
    switch (accion) {
      case 'crear':
        return 'info';
      case 'editar':
        return 'warning';
      case 'eliminar':
        return 'danger';
      case 'marcar_cargado':
        return 'success';
      case 'marcar_pendiente':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getAccionIcon = (accion) => {
    switch (accion) {
      case 'crear':
        return 'pi pi-plus-circle';
      case 'editar':
        return 'pi pi-pencil';
      case 'eliminar':
        return 'pi pi-trash';
      case 'marcar_cargado':
        return 'pi pi-check-circle';
      case 'marcar_pendiente':
        return 'pi pi-clock';
      default:
        return 'pi pi-info-circle';
    }
  };

  const fechaTemplate = (rowData) => {
    return formatearFechaHora(rowData.timestamp);
  };

  const accionTemplate = (rowData) => {
    const severity = getAccionSeverity(rowData.accion);
    return (
      <Tag 
        value={getAccionLabel(rowData.accion)} 
        severity={severity}
        icon={getAccionIcon(rowData.accion)}
      />
    );
  };

  const cambiosTemplate = (rowData) => {
    if (!rowData.cambios) return '-';
    
    const { anterior, nuevo } = rowData.cambios;
    
    if (rowData.accion === 'crear') {
      return (
        <div className="text-sm">
          <div className="text-green-600">
            <i className="pi pi-plus mr-2"></i>
            Cobro creado
          </div>
        </div>
      );
    }
    
    if (rowData.accion === 'eliminar') {
      return (
        <div className="text-sm">
          <div className="text-red-600">
            <i className="pi pi-trash mr-2"></i>
            Cobro eliminado
          </div>
        </div>
      );
    }
    
    // Para ediciones y cambios de estado
    const cambiosRelevantes = [];
    
    if (anterior?.monto !== nuevo?.monto && nuevo?.monto !== undefined) {
      cambiosRelevantes.push(`Monto: $${anterior?.monto || 0} → $${nuevo.monto}`);
    }
    
    if (anterior?.estado !== nuevo?.estado && nuevo?.estado !== undefined) {
      cambiosRelevantes.push(`Estado: ${anterior?.estado || 'N/A'} → ${nuevo.estado}`);
    }
    
    if (anterior?.cliente !== nuevo?.cliente && nuevo?.cliente !== undefined) {
      cambiosRelevantes.push(`Cliente: ${anterior?.cliente || 'N/A'} → ${nuevo.cliente}`);
    }
    
    if (anterior?.formaPago !== nuevo?.formaPago && nuevo?.formaPago !== undefined) {
      cambiosRelevantes.push(`Forma de pago: ${anterior?.formaPago || 'N/A'} → ${nuevo.formaPago}`);
    }
    
    return (
      <div className="text-sm">
        {cambiosRelevantes.length > 0 ? (
          cambiosRelevantes.map((cambio, idx) => (
            <div key={idx} className="mb-1">
              <i className="pi pi-arrow-right mr-2 text-blue-500"></i>
              {cambio}
            </div>
          ))
        ) : (
          <span className="text-gray-500">Sin cambios específicos</span>
        )}
      </div>
    );
  };

  const customizedMarker = (item) => {
    return (
      <span 
        className={`flex align-items-center justify-content-center text-white border-circle`}
        style={{ 
          width: '2.5rem', 
          height: '2.5rem',
          backgroundColor: getAccionSeverity(item.accion) === 'success' ? '#22C55E' :
                           getAccionSeverity(item.accion) === 'danger' ? '#EF4444' :
                           getAccionSeverity(item.accion) === 'warning' ? '#F59E0B' : '#3B82F6'
        }}
      >
        <i className={getAccionIcon(item.accion)}></i>
      </span>
    );
  };

  const customizedContent = (item) => {
    return (
      <Card className="mb-3">
        <div className="flex flex-column">
          <div className="flex justify-content-between align-items-center mb-2">
            <Tag 
              value={getAccionLabel(item.accion)} 
              severity={getAccionSeverity(item.accion)}
            />
            <small className="text-gray-500">{formatearFechaHora(item.timestamp)}</small>
          </div>
          <div className="mb-2">
            <strong>Usuario:</strong> {item.usuario}
          </div>
          <div>
            {cambiosTemplate(item)}
          </div>
        </div>
      </Card>
    );
  };

  const header = (
    <div className="flex flex-column md:flex-row md:justify-content-between gap-3">
      <div>
        <h2 className="m-0">
          <i className="pi pi-history mr-2"></i>
          Auditoría de Cobros
        </h2>
        <p className="text-gray-600 mt-2 mb-0">
          Registro completo de todas las operaciones realizadas
        </p>
      </div>
      <div className="flex gap-2 align-items-center">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Buscar..."
          />
        </span>
        <Button
          icon={vistaTimeline ? "pi pi-table" : "pi pi-chart-line"}
          className="p-button-outlined"
          onClick={() => setVistaTimeline(!vistaTimeline)}
          tooltip={vistaTimeline ? "Ver como tabla" : "Ver como línea de tiempo"}
        />
      </div>
    </div>
  );

  return (
    <Card>
      {header}
      
      <div className="mt-4">
        {vistaTimeline ? (
          <Timeline 
            value={logs} 
            align="alternate" 
            className="customized-timeline"
            marker={customizedMarker}
            content={customizedContent}
          />
        ) : (
          <DataTable
            value={logs}
            loading={loading}
            globalFilter={globalFilter}
            emptyMessage="No hay registros de auditoría"
            paginator
            rows={20}
            rowsPerPageOptions={[20, 50, 100]}
            sortField="timestamp"
            sortOrder={-1}
            responsiveLayout="scroll"
            stripedRows
          >
            <Column 
              field="timestamp" 
              header="Fecha y Hora" 
              body={fechaTemplate}
              sortable
              style={{ width: '180px' }}
            />
            <Column 
              field="usuario" 
              header="Usuario" 
              sortable
              filter
              filterPlaceholder="Buscar por usuario"
              style={{ width: '200px' }}
            />
            <Column 
              field="accion" 
              header="Acción" 
              body={accionTemplate}
              sortable
              style={{ width: '180px' }}
            />
            <Column 
              field="cobroId" 
              header="ID Cobro" 
              sortable
              style={{ width: '150px' }}
            />
            <Column 
              header="Cambios" 
              body={cambiosTemplate}
            />
          </DataTable>
        )}
      </div>
    </Card>
  );
};

export default CobrosLogs;


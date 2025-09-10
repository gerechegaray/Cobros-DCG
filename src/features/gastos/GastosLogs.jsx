import React, { useState, useEffect } from 'react';
import { 
  Card, 
  DataTable, 
  Column, 
  Tag, 
  Button, 
  Dropdown, 
  Calendar, 
  InputText,
  Dialog,
  ProgressSpinner,
  Toast,
  Divider
} from 'primereact';
import { getLogsRealtime } from './gastosService';
import { formatFecha } from './utils';
import moment from 'moment';

const GastosLogs = ({ user }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    accion: 'todas',
    usuario: 'todos',
    fechaInicio: null,
    fechaFin: null,
    busqueda: ''
  });
  const [showDetails, setShowDetails] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [toast, setToast] = useState(null);

  // Obtener logs en tiempo real
  useEffect(() => {
    const unsubscribe = getLogsRealtime((logsData) => {
      setLogs(logsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filtrar logs
  const logsFiltrados = logs.filter(log => {
    if (filtros.accion !== 'todas' && log.accion !== filtros.accion) return false;
    if (filtros.usuario !== 'todos' && log.usuario !== filtros.usuario) return false;
    if (filtros.busqueda && !log.gastoId.toLowerCase().includes(filtros.busqueda.toLowerCase())) return false;
    
    if (filtros.fechaInicio || filtros.fechaFin) {
      const fechaLog = moment(log.timestamp?.toDate?.() || log.timestamp);
      if (filtros.fechaInicio && fechaLog.isBefore(filtros.fechaInicio, 'day')) return false;
      if (filtros.fechaFin && fechaLog.isAfter(filtros.fechaFin, 'day')) return false;
    }
    
    return true;
  });

  // Obtener usuarios únicos
  const usuarios = [...new Set(logs.map(log => log.usuario))].map(usuario => ({
    label: usuario,
    value: usuario
  }));

  // Obtener acciones únicas
  const acciones = [
    { label: 'Todas las acciones', value: 'todas' },
    { label: 'Crear', value: 'crear' },
    { label: 'Editar', value: 'editar' },
    { label: 'Eliminar', value: 'eliminar' },
    { label: 'Pagar', value: 'pagar' }
  ];

  // Manejar filtros
  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      accion: 'todas',
      usuario: 'todos',
      fechaInicio: null,
      fechaFin: null,
      busqueda: ''
    });
  };

  // Formatear fecha
  const fechaTemplate = (rowData) => {
    const fecha = rowData.timestamp?.toDate?.() || rowData.timestamp;
    return formatFecha(fecha);
  };

  // Template de acción
  const accionTemplate = (rowData) => {
    const colores = {
      crear: 'success',
      editar: 'info',
      eliminar: 'danger',
      pagar: 'warning'
    };
    
    const iconos = {
      crear: 'pi-plus',
      editar: 'pi-pencil',
      eliminar: 'pi-trash',
      pagar: 'pi-check'
    };
    
    return (
      <Tag 
        value={rowData.accion.toUpperCase()} 
        severity={colores[rowData.accion] || 'info'}
        icon={iconos[rowData.accion]}
      />
    );
  };

  // Template de usuario
  const usuarioTemplate = (rowData) => {
    return (
      <div className="flex align-items-center gap-2">
        <i className="pi pi-user" />
        <span>{rowData.usuario}</span>
      </div>
    );
  };

  // Template de cambios
  const cambiosTemplate = (rowData) => {
    return (
      <Button
        label="Ver Cambios"
        icon="pi pi-eye"
        className="p-button-text p-button-sm"
        onClick={() => {
          setSelectedLog(rowData);
          setShowDetails(true);
        }}
      />
    );
  };

  // Template de IP
  const ipTemplate = (rowData) => {
    return (
      <code className="text-xs">{rowData.ip || 'N/A'}</code>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <ProgressSpinner />
      </div>
    );
  }

  return (
    <>
      <Toast ref={setToast} />
      
      <div className="grid">
        {/* Filtros */}
        <div className="col-12">
          <Card title="Filtros de Auditoría">
            <div className="grid">
              <div className="col-12 md:col-3">
                <label className="block mb-2">Acción</label>
                <Dropdown
                  value={filtros.accion}
                  options={acciones}
                  onChange={(e) => handleFiltroChange('accion', e.value)}
                  placeholder="Seleccionar acción"
                />
              </div>
              
              <div className="col-12 md:col-3">
                <label className="block mb-2">Usuario</label>
                <Dropdown
                  value={filtros.usuario}
                  options={[
                    { label: 'Todos los usuarios', value: 'todos' },
                    ...usuarios
                  ]}
                  onChange={(e) => handleFiltroChange('usuario', e.value)}
                  placeholder="Seleccionar usuario"
                />
              </div>
              
              <div className="col-12 md:col-2">
                <label className="block mb-2">Fecha Inicio</label>
                <Calendar
                  value={filtros.fechaInicio}
                  onChange={(e) => handleFiltroChange('fechaInicio', e.value)}
                  dateFormat="dd/mm/yy"
                  showIcon
                />
              </div>
              
              <div className="col-12 md:col-2">
                <label className="block mb-2">Fecha Fin</label>
                <Calendar
                  value={filtros.fechaFin}
                  onChange={(e) => handleFiltroChange('fechaFin', e.value)}
                  dateFormat="dd/mm/yy"
                  showIcon
                />
              </div>
              
              <div className="col-12 md:col-2">
                <label className="block mb-2">Búsqueda</label>
                <InputText
                  value={filtros.busqueda}
                  onChange={(e) => handleFiltroChange('busqueda', e.target.value)}
                  placeholder="ID del gasto"
                />
              </div>
            </div>
            
            <div className="flex justify-content-end gap-2 mt-3">
              <Button
                label="Limpiar Filtros"
                icon="pi pi-filter-slash"
                className="p-button-text"
                onClick={limpiarFiltros}
              />
            </div>
          </Card>
        </div>

        {/* Tabla de Logs */}
        <div className="col-12">
          <Card title={`Logs de Auditoría (${logsFiltrados.length} registros)`}>
            <DataTable
              value={logsFiltrados}
              paginator
              rows={20}
              responsiveLayout="scroll"
              emptyMessage="No hay logs para mostrar"
              sortField="timestamp"
              sortOrder={-1}
            >
              <Column 
                field="timestamp" 
                header="Fecha" 
                body={fechaTemplate}
                sortable
                style={{ width: '120px' }}
              />
              <Column 
                field="accion" 
                header="Acción" 
                body={accionTemplate}
                style={{ width: '100px' }}
              />
              <Column 
                field="usuario" 
                header="Usuario" 
                body={usuarioTemplate}
                style={{ width: '150px' }}
              />
              <Column 
                field="gastoId" 
                header="ID Gasto" 
                style={{ width: '120px' }}
              />
              <Column 
                field="ip" 
                header="IP" 
                body={ipTemplate}
                style={{ width: '100px' }}
              />
              <Column 
                field="cambios" 
                header="Cambios" 
                body={cambiosTemplate}
                style={{ width: '100px' }}
              />
            </DataTable>
          </Card>
        </div>
      </div>

      {/* Detalles del Log */}
      <Dialog
        header="Detalles del Log"
        visible={showDetails}
        onHide={() => setShowDetails(false)}
        style={{ width: '80vw', maxWidth: '800px' }}
        modal
      >
        {selectedLog && (
          <div className="grid">
            <div className="col-12">
              <h4>Información del Log</h4>
              <Divider />
            </div>
            
            <div className="col-6">
              <strong>ID del Log:</strong>
            </div>
            <div className="col-6">
              <code>{selectedLog.id}</code>
            </div>
            
            <div className="col-6">
              <strong>ID del Gasto:</strong>
            </div>
            <div className="col-6">
              <code>{selectedLog.gastoId}</code>
            </div>
            
            <div className="col-6">
              <strong>Acción:</strong>
            </div>
            <div className="col-6">
              {accionTemplate(selectedLog)}
            </div>
            
            <div className="col-6">
              <strong>Usuario:</strong>
            </div>
            <div className="col-6">
              {usuarioTemplate(selectedLog)}
            </div>
            
            <div className="col-6">
              <strong>Fecha:</strong>
            </div>
            <div className="col-6">
              {fechaTemplate(selectedLog)}
            </div>
            
            <div className="col-6">
              <strong>IP:</strong>
            </div>
            <div className="col-6">
              {ipTemplate(selectedLog)}
            </div>
            
            <div className="col-12">
              <h5>Cambios Realizados</h5>
              <Divider />
            </div>
            
            {selectedLog.cambios?.anterior && (
              <div className="col-12 lg:col-6">
                <h6>Estado Anterior:</h6>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(selectedLog.cambios.anterior, null, 2)}
                </pre>
              </div>
            )}
            
            {selectedLog.cambios?.nuevo && (
              <div className="col-12 lg:col-6">
                <h6>Estado Nuevo:</h6>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(selectedLog.cambios.nuevo, null, 2)}
                </pre>
              </div>
            )}
            
            {!selectedLog.cambios?.anterior && !selectedLog.cambios?.nuevo && (
              <div className="col-12">
                <p className="text-gray-600">No hay cambios registrados para este log.</p>
              </div>
            )}
            
            <div className="col-12 flex justify-content-end gap-2 mt-3">
              <Button
                label="Cerrar"
                icon="pi pi-times"
                className="p-button-text"
                onClick={() => setShowDetails(false)}
              />
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
};

export default GastosLogs;

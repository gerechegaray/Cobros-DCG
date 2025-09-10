import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  Button, 
  Tag, 
  DataTable, 
  Column, 
  Dialog, 
  Toast, 
  ProgressSpinner,
  Badge,
  Divider,
  Panel
} from 'primereact';
import { 
  generarTodasLasAlertas, 
  obtenerResumenAlertas, 
  formatearFechaVencimiento,
  obtenerColorPrioridad,
  obtenerIconoPrioridad,
  TIPOS_ALERTA
} from './notificaciones';
import { formatMonto } from './utils';

const AlertasGastos = ({ gastos, onGastoClick, visible, onHide }) => {
  const [toast, setToast] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [gastoSeleccionado, setGastoSeleccionado] = useState(null);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);

  // Generar alertas basadas en los gastos
  const alertas = useMemo(() => {
    return generarTodasLasAlertas(gastos);
  }, [gastos]);

  // Filtrar alertas por tipo
  const alertasFiltradas = useMemo(() => {
    if (filtroTipo === 'todos') {
      return alertas;
    }
    return alertas.filter(alerta => alerta.tipo === filtroTipo);
  }, [alertas, filtroTipo]);

  // Resumen de alertas
  const resumen = useMemo(() => {
    return obtenerResumenAlertas(alertas);
  }, [alertas]);

  // Manejar click en alerta
  const handleAlertaClick = (alerta) => {
    const gasto = gastos.find(g => g.id === alerta.gastoId);
    if (gasto) {
      setGastoSeleccionado(gasto);
      setMostrarDetalles(true);
      if (onGastoClick) {
        onGastoClick(gasto);
      }
    }
  };

  // Template para el tipo de alerta
  const tipoTemplate = (rowData) => {
    const color = obtenerColorPrioridad(rowData.tipo);
    const icono = obtenerIconoPrioridad(rowData.tipo);
    
    return (
      <Tag 
        value={rowData.tipo.replace('_', ' ').toUpperCase()} 
        severity={rowData.tipo === TIPOS_ALERTA.VENCIDO ? 'danger' : 
                 rowData.tipo === TIPOS_ALERTA.VENCIMIENTO_URGENTE ? 'warning' : 'info'}
        icon={icono}
        style={{ backgroundColor: color, color: 'white' }}
      />
    );
  };

  // Template para el mensaje
  const mensajeTemplate = (rowData) => {
    return (
      <div className="flex align-items-center gap-2">
        <i className={`pi ${obtenerIconoPrioridad(rowData.tipo)}`} 
           style={{ color: obtenerColorPrioridad(rowData.tipo) }} />
        <span>{rowData.mensaje}</span>
      </div>
    );
  };

  // Template para la fecha de vencimiento
  const fechaTemplate = (rowData) => {
    const diasHastaVencimiento = rowData.diasHastaVencimiento;
    const color = diasHastaVencimiento < 0 ? '#dc2626' : 
                  diasHastaVencimiento <= 3 ? '#ef4444' : '#f59e0b';
    
    return (
      <div className="flex align-items-center gap-2">
        <i className="pi pi-calendar" style={{ color }} />
        <span style={{ color }}>
          {formatearFechaVencimiento(rowData.fechaVencimiento)}
        </span>
      </div>
    );
  };

  // Template para acciones
  const accionesTemplate = (rowData) => {
    return (
      <Button
        label="Ver Gasto"
        icon="pi pi-eye"
        className="p-button-sm p-button-text"
        onClick={() => handleAlertaClick(rowData)}
      />
    );
  };

  // Opciones de filtro
  const opcionesFiltro = [
    { label: 'Todas las alertas', value: 'todos' },
    { label: 'Vencidos', value: TIPOS_ALERTA.VENCIDO },
    { label: 'Urgentes', value: TIPOS_ALERTA.VENCIMIENTO_URGENTE },
    { label: 'Próximos', value: TIPOS_ALERTA.VENCIMIENTO_PROXIMO }
  ];

  return (
    <>
      <Toast ref={setToast} />
      
      <Dialog
        header="🚨 Alertas de Gastos"
        visible={visible}
        onHide={onHide}
        style={{ width: '90vw', maxWidth: '1200px' }}
        modal
      >
        <div className="grid">
          {/* Resumen de alertas */}
          <div className="col-12">
            <div className="grid">
              <div className="col-12 md:col-3">
                <Card className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    <Badge value={resumen.vencidos} severity="danger" />
                  </div>
                  <div className="text-sm text-gray-600">Vencidos</div>
                </Card>
              </div>
              <div className="col-12 md:col-3">
                <Card className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    <Badge value={resumen.urgentes} severity="warning" />
                  </div>
                  <div className="text-sm text-gray-600">Urgentes</div>
                </Card>
              </div>
              <div className="col-12 md:col-3">
                <Card className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    <Badge value={resumen.proximos} severity="info" />
                  </div>
                  <div className="text-sm text-gray-600">Próximos</div>
                </Card>
              </div>
              <div className="col-12 md:col-3">
                <Card className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    <Badge value={resumen.total} severity="info" />
                  </div>
                  <div className="text-sm text-gray-600">Total</div>
                </Card>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="col-12">
            <div className="flex justify-content-between align-items-center">
              <h4 className="mt-0 mb-0">Alertas Activas</h4>
              <div className="flex gap-2">
                <Button
                  label="Vencidos"
                  icon="pi pi-times-circle"
                  className="p-button-danger p-button-sm"
                  onClick={() => setFiltroTipo(TIPOS_ALERTA.VENCIDO)}
                />
                <Button
                  label="Urgentes"
                  icon="pi pi-exclamation-triangle"
                  className="p-button-warning p-button-sm"
                  onClick={() => setFiltroTipo(TIPOS_ALERTA.VENCIMIENTO_URGENTE)}
                />
                <Button
                  label="Próximos"
                  icon="pi pi-clock"
                  className="p-button-info p-button-sm"
                  onClick={() => setFiltroTipo(TIPOS_ALERTA.VENCIMIENTO_PROXIMO)}
                />
                <Button
                  label="Todas"
                  icon="pi pi-list"
                  className="p-button-outlined p-button-sm"
                  onClick={() => setFiltroTipo('todos')}
                />
              </div>
            </div>
            <Divider />
          </div>

          {/* Lista de alertas */}
          <div className="col-12">
            {alertasFiltradas.length === 0 ? (
              <Card className="text-center">
                <i className="pi pi-check-circle text-6xl text-green-500 mb-3"></i>
                <h3 className="mt-0 mb-2">¡Excelente!</h3>
                <p className="text-gray-600">
                  {filtroTipo === 'todos' 
                    ? 'No hay alertas activas' 
                    : `No hay alertas de tipo ${filtroTipo.replace('_', ' ')}`
                  }
                </p>
              </Card>
            ) : (
              <DataTable
                value={alertasFiltradas}
                paginator
                rows={10}
                responsiveLayout="scroll"
                emptyMessage="No hay alertas"
                className="p-datatable-sm"
              >
                <Column field="titulo" header="Gasto" />
                <Column field="tipo" header="Tipo" body={tipoTemplate} />
                <Column field="mensaje" header="Mensaje" body={mensajeTemplate} />
                <Column field="fechaVencimiento" header="Vencimiento" body={fechaTemplate} />
                <Column header="Acciones" body={accionesTemplate} style={{ width: '120px' }} />
              </DataTable>
            )}
          </div>
        </div>
      </Dialog>

      {/* Detalles del gasto */}
      {gastoSeleccionado && (
        <Dialog
          header={`Detalles del Gasto: ${gastoSeleccionado.titulo}`}
          visible={mostrarDetalles}
          onHide={() => setMostrarDetalles(false)}
          style={{ width: '600px' }}
          modal
        >
          <div className="grid">
            <div className="col-12">
              <Panel header="Información del Gasto">
                <div className="grid">
                  <div className="col-6">
                    <strong>Monto:</strong> {formatMonto(gastoSeleccionado.monto)}
                  </div>
                  <div className="col-6">
                    <strong>Estado:</strong> 
                    <Tag 
                      value={gastoSeleccionado.estado} 
                      severity={gastoSeleccionado.estado === 'pagado' ? 'success' : 'warning'}
                    />
                  </div>
                  <div className="col-6">
                    <strong>Fecha de Vencimiento:</strong> 
                    {new Date(gastoSeleccionado.fechaVencimiento).toLocaleDateString('es-AR')}
                  </div>
                  <div className="col-6">
                    <strong>Categoría:</strong> {gastoSeleccionado.categoria}
                  </div>
                  {gastoSeleccionado.subcategoria && (
                    <div className="col-6">
                      <strong>Subcategoría:</strong> {gastoSeleccionado.subcategoria}
                    </div>
                  )}
                  {gastoSeleccionado.nota && (
                    <div className="col-12">
                      <strong>Nota:</strong> {gastoSeleccionado.nota}
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
};

export default AlertasGastos;

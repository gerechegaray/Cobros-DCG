import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { 
  Card, 
  Button, 
  Dropdown, 
  ToggleButton, 
  Dialog, 
  DataTable, 
  Column, 
  Tag, 
  Toast,
  ProgressSpinner,
  Divider
} from 'primereact';
import { getGastosRealtime, eliminarGasto, marcarComoPagado } from './gastosService';
import { formatMonto, formatFecha } from './utils';
import { getEventColor, categoriasGastos, estadosGastos, getSubcategoriasByCategoria } from './constants';
import GastoForm from './GastoForm';
import GastoRecurrenteForm from './GastoRecurrenteForm';
import BusquedaCompacta from './BusquedaCompacta';
import TemplatesGastos from './TemplatesGastos';
import PagosParciales from './PagosParciales';
import AlertasGastos from './AlertasGastos';
import { permitePagosParciales, formatearResumenPagos } from './pagosUtils';
import { generarTodasLasAlertas, obtenerResumenAlertas } from './notificaciones';

// Configurar moment para español
moment.locale('es');

const localizer = momentLocalizer(moment);

const GastosCalendario = ({ user }) => {
  const [gastos, setGastos] = useState([]);
  const [gastosFiltrados, setGastosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showRecurrenteForm, setShowRecurrenteForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPagosParciales, setShowPagosParciales] = useState(false);
  const [showAlertas, setShowAlertas] = useState(false);
  const [selectedGasto, setSelectedGasto] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [filtros, setFiltros] = useState({
    categoria: 'todas',
    estado: 'todos',
    proyectado: true
  });
  const [toast, setToast] = useState(null);

  // Obtener gastos en tiempo real
  useEffect(() => {
    const unsubscribe = getGastosRealtime((gastosData) => {
      setGastos(gastosData);
      setGastosFiltrados(gastosData); // Inicializar con todos los gastos
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Generar alertas
  const alertas = useMemo(() => {
    return generarTodasLasAlertas(gastosFiltrados);
  }, [gastosFiltrados]);

  // Resumen de alertas
  const resumenAlertas = useMemo(() => {
    return obtenerResumenAlertas(alertas);
  }, [alertas]);

  // Generar eventos para el calendario
  const eventos = useMemo(() => {
    let gastosParaEventos = [...gastosFiltrados];

    // Los filtros ya se aplicaron en el componente de búsqueda
    // Aquí solo procesamos los gastos filtrados

    // Generar eventos
    const eventosCalendario = [];
    
    gastosParaEventos.forEach(gasto => {
      // Si es un gasto recurrente (recordatorio), generar eventos de recordatorio
      if (gasto.proyeccion && gasto.tipo === 'recurrente') {
        const fechaInicio = moment(gasto.fechaInicio || gasto.fechaVencimiento);
        
        for (let i = 0; i < gasto.cuotas; i++) {
          const fechaCuota = fechaInicio.clone().add(i, 
            gasto.frecuencia === 'mensual' ? 'months' : 
            gasto.frecuencia === 'trimestral' ? 'quarters' :
            gasto.frecuencia === 'semestral' ? 'months' : 'months'
          );
          
          eventosCalendario.push({
            id: `${gasto.id}_recordatorio_${i + 1}`,
            title: `📅 ${gasto.titulo} (Recordatorio)`,
            start: fechaCuota.toDate(),
            end: fechaCuota.toDate(),
            resource: {
              ...gasto,
              tipo: 'recurrente',
              cuotaActual: i + 1,
              esRecordatorio: true
            }
          });
        }
      } else if (gasto.proyeccion && gasto.cuotas > 1) {
        // Si es un gasto con cuotas específicas (préstamos, etc.)
        const fechaInicio = moment(gasto.fechaInicio || gasto.fechaVencimiento);
        const montoCuota = gasto.montoTotal / gasto.cuotas;
        
        for (let i = 0; i < gasto.cuotas; i++) {
          const fechaCuota = fechaInicio.clone().add(i, 
            gasto.frecuencia === 'mensual' ? 'months' : 
            gasto.frecuencia === 'trimestral' ? 'quarters' :
            gasto.frecuencia === 'semestral' ? 'months' : 'months'
          );
          
          const cuotaPagada = i < (gasto.cuotasPagadas || 0);
          
          eventosCalendario.push({
            id: `${gasto.id}_cuota_${i + 1}`,
            title: `🔄 ${gasto.titulo} - Cuota ${i + 1}`,
            start: fechaCuota.toDate(),
            end: fechaCuota.toDate(),
            resource: {
              ...gasto,
              tipo: 'cuota',
              cuota: i + 1,
              monto: montoCuota,
              estado: cuotaPagada ? 'pagado' : 'pendiente',
              fechaVencimiento: fechaCuota.format('YYYY-MM-DD')
            }
          });
        }
      } else {
        // Gasto único normal
        let titulo = `💰 ${gasto.titulo}`;
        
        // Si permite pagos parciales, mostrar resumen
        if (permitePagosParciales(gasto)) {
          const resumen = formatearResumenPagos(gasto);
          titulo += ` - ${resumen.texto}`;
        } else {
          titulo += ` - ${formatMonto(gasto.monto)}`;
        }
        
        // Usar la fecha correcta según el estado del gasto
        const fechaEvento = gasto.estado === 'pagado' ? gasto.fechaPago : gasto.fechaVencimiento;
        
        // Solo crear el evento si hay una fecha válida
        if (fechaEvento) {
          // Convertir a Date si es necesario
          const fechaDate = fechaEvento instanceof Date ? fechaEvento : new Date(fechaEvento);
          
          // Verificar que la fecha es válida
          if (!isNaN(fechaDate.getTime())) {
            eventosCalendario.push({
              id: gasto.id,
              title: titulo,
              start: fechaDate,
              end: fechaDate,
              resource: {
                ...gasto,
                tipo: 'gasto'
              }
            });
          } else {
            console.log('Fecha inválida para evento:', fechaEvento, 'tipo:', typeof fechaEvento);
          }
        }
      }
    });

    return eventosCalendario;
  }, [gastosFiltrados]);

  // Estilos para eventos
  const eventStyleGetter = (event) => {
    const color = getEventColor(event.resource);
    return {
      style: {
        backgroundColor: color,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  // Manejar click en evento
  const handleSelectEvent = (event) => {
    setSelectedGasto(event.resource);
    
    // Si es un recordatorio, abrir formulario de gasto único para editarlo
    if (event.resource.tipo === 'recurrente') {
      setShowForm(true);
    } else if (permitePagosParciales(event.resource)) {
      // Si permite pagos parciales, abrir gestión de pagos
      setShowPagosParciales(true);
    } else {
      // Mostrar detalles normales
      setShowDetails(true);
    }
  };

  // Manejar click en slot vacío
  const handleSelectSlot = (slotInfo) => {
    setSelectedGasto(null);
    setShowForm(true);
  };

  // Manejar navegación del calendario
  const handleNavigate = (newDate) => {
    setDate(newDate);
  };

  // Manejar cambio de vista
  const handleViewChange = (newView) => {
    setView(newView);
  };

  // Manejar filtros
  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  // Manejar eliminación de gasto
  const handleEliminarGasto = async (gastoId) => {
    try {
      await eliminarGasto(gastoId, user);
      setToast({ severity: 'success', summary: 'Éxito', detail: 'Gasto eliminado correctamente' });
    } catch (error) {
      console.error('Error eliminando gasto:', error);
      setToast({ severity: 'error', summary: 'Error', detail: 'Error al eliminar el gasto' });
    }
  };

  // Manejar marcado como pagado
  const handleMarcarComoPagado = async (gastoId) => {
    try {
      await marcarComoPagado(gastoId, user);
      
      // Forzar actualización completa de la vista
      setTimeout(() => {
        // Recargar los gastos desde la base de datos
        const unsubscribe = getGastosRealtime((gastosData) => {
          setGastos(gastosData);
          setGastosFiltrados(gastosData);
          unsubscribe(); // Desuscribirse después de la primera actualización
        });
      }, 500); // Pequeño delay para asegurar que la BD se actualice
      
      setToast({ severity: 'success', summary: 'Éxito', detail: 'Gasto marcado como pagado correctamente' });
    } catch (error) {
      console.error('Error marcando gasto como pagado:', error);
      setToast({ severity: 'error', summary: 'Error', detail: 'No se pudo marcar el gasto como pagado' });
    }
  };

  // Formatear monto en tabla
  const montoTemplate = (rowData) => {
    return formatMonto(rowData.monto || rowData.montoTotal);
  };

  // Formatear fecha en tabla
  const fechaTemplate = (rowData) => {
    // Usar la fecha correcta según el estado del gasto
    const fecha = rowData.estado === 'pagado' ? rowData.fechaPago : rowData.fechaVencimiento;
    return formatFecha(fecha);
  };

  // Template de estado
  const estadoTemplate = (rowData) => {
    const estado = estadosGastos.find(e => e.id === rowData.estado);
    return (
      <Tag 
        value={estado?.nombre || rowData.estado} 
        severity={rowData.estado === 'vencido' ? 'danger' : 
                 rowData.estado === 'proximo_vencer' ? 'warning' :
                 rowData.estado === 'pagado' ? 'success' : 'info'}
      />
    );
  };

  // Template de categoría
  const categoriaTemplate = (rowData) => {
    const categoria = categoriasGastos.find(c => c.id === rowData.categoria);
    const subcategorias = getSubcategoriasByCategoria(rowData.categoria);
    const subcategoria = subcategorias.find(s => s.id === rowData.subcategoria);
    
    return (
      <div className="flex align-items-center gap-2">
        <i className={`pi ${categoria?.icono || 'pi-circle'}`} style={{ color: categoria?.color }} />
        <div>
          <div className="font-semibold">{categoria?.nombre || rowData.categoria}</div>
          {subcategoria && (
            <div className="text-sm text-gray-600">{subcategoria.nombre}</div>
          )}
        </div>
      </div>
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
        {/* Búsqueda y Filtros */}
        <div className="col-12">
          <Card>
            <div className="flex justify-content-between align-items-center mb-3">
              <h5 className="m-0">Filtros de Búsqueda</h5>
              <div className="flex gap-2">
                <Button
                  label="Actualizar"
                  icon="pi pi-refresh"
                  className="p-button-outlined p-button-sm"
                  onClick={() => {
                    const unsubscribe = getGastosRealtime((gastosData) => {
                      setGastos(gastosData);
                      setGastosFiltrados(gastosData);
                      unsubscribe();
                    });
                  }}
                  tooltip="Actualizar datos desde la base de datos"
                />
                <Button
                  label="Mostrar Todos"
                  icon="pi pi-eye"
                  className="p-button-outlined p-button-sm"
                  onClick={() => setGastosFiltrados(gastos)}
                  tooltip="Mostrar todos los gastos sin filtros"
                />
              </div>
            </div>
            <BusquedaCompacta
              gastos={gastos}
              onFiltrar={setGastosFiltrados}
              onLimpiar={() => setGastosFiltrados(gastos)}
            />
          </Card>
        </div>

        {/* Controles */}
        <div className="col-12">
          <Card>
            <div className="flex flex-wrap gap-3 align-items-center justify-content-between">
              <div className="flex gap-2">
                <Button
                  label="Gasto Único"
                  icon="pi pi-plus"
                  onClick={() => {
                    setSelectedGasto(null);
                    setShowForm(true);
                  }}
                  className="p-button-success"
                />
                <Button
                  label="Gasto Recurrente"
                  icon="pi pi-refresh"
                  onClick={() => {
                    setSelectedGasto(null);
                    setShowRecurrenteForm(true);
                  }}
                  className="p-button-info"
                />
                <Button
                  label="Templates"
                  icon="pi pi-bookmark"
                  onClick={() => setShowTemplates(true)}
                  className="p-button-secondary"
                />
                
                <Button
                  label={`Alertas ${resumenAlertas.total > 0 ? `(${resumenAlertas.total})` : ''}`}
                  icon="pi pi-bell"
                  onClick={() => setShowAlertas(true)}
                  className={resumenAlertas.total > 0 ? 'p-button-warning' : 'p-button-outlined'}
                  tooltip="Ver alertas de vencimiento"
                />
              </div>
              
              <div className="flex gap-2">
                <Dropdown
                  value={filtros.categoria}
                  options={[
                    { label: 'Todas las categorías', value: 'todas' },
                    ...categoriasGastos.map(c => ({ label: c.nombre, value: c.id }))
                  ]}
                  onChange={(e) => handleFiltroChange('categoria', e.value)}
                  placeholder="Categoría"
                />
                
                <Dropdown
                  value={filtros.estado}
                  options={[
                    { label: 'Todos los estados', value: 'todos' },
                    ...estadosGastos.map(e => ({ label: e.nombre, value: e.id }))
                  ]}
                  onChange={(e) => handleFiltroChange('estado', e.value)}
                  placeholder="Estado"
                />
                
                <ToggleButton
                  checked={filtros.proyectado}
                  onChange={(e) => handleFiltroChange('proyectado', e.value)}
                  onLabel="Con Proyección"
                  offLabel="Solo Reales"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Calendario */}
        <div className="col-12">
          <Card>
            <div style={{ height: '600px' }}>
              <Calendar
                localizer={localizer}
                events={eventos}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                view={view}
                date={date}
                onNavigate={handleNavigate}
                onView={handleViewChange}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                selectable
                eventPropGetter={eventStyleGetter}
                messages={{
                  next: 'Siguiente',
                  previous: 'Anterior',
                  today: 'Hoy',
                  month: 'Mes',
                  week: 'Semana',
                  day: 'Día',
                  agenda: 'Agenda',
                  date: 'Fecha',
                  time: 'Hora',
                  event: 'Evento',
                  noEventsInRange: 'No hay eventos en este rango',
                  showMore: total => `+ Ver ${total} más`
                }}
                popup
                popupOffset={{ x: 10, y: 10 }}
              />
            </div>
          </Card>
        </div>

        {/* Resumen de Eventos */}
        <div className="col-12">
          <Card title="Resumen de Gastos">
            <DataTable
              value={eventos.map(e => e.resource)}
              paginator
              rows={10}
              responsiveLayout="scroll"
              emptyMessage="No hay gastos para mostrar"
            >
              <Column field="titulo" header="Título" />
              <Column field="categoria" header="Categoría" body={categoriaTemplate} />
              <Column field="monto" header="Monto" body={montoTemplate} />
              <Column field="fechaVencimiento" header="Fecha" body={fechaTemplate} />
              <Column field="estado" header="Estado" body={estadoTemplate} />
              <Column 
                field="tipo" 
                header="Tipo" 
                body={(rowData) => {
                  let tipo = 'Gasto';
                  let severity = 'success';
                  
                  if (rowData.tipo === 'cuota') {
                    tipo = 'Cuota';
                    severity = 'info';
                  } else if (rowData.tipo === 'recurrente') {
                    tipo = 'Recordatorio';
                    severity = 'warning';
                  }
                  
                  return (
                    <Tag 
                      value={tipo} 
                      severity={severity}
                    />
                  );
                }}
              />
              <Column 
                field="nota" 
                header="Nota" 
                body={(rowData) => (
                  <span className="text-sm" style={{ maxWidth: '200px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rowData.nota || '-'}
                  </span>
                )}
              />
              <Column 
                header="Acciones" 
                body={(rowData) => (
                  <div className="flex gap-2">
                    {rowData.estado === 'pendiente' && (
                      <Button
                        icon="pi pi-check"
                        className="p-button-success p-button-sm"
                        onClick={() => handleMarcarComoPagado(rowData.id)}
                        tooltip="Marcar como pagado"
                      />
                    )}
                    <Button
                      icon="pi pi-trash"
                      className="p-button-danger p-button-sm"
                      onClick={() => handleEliminarGasto(rowData.id)}
                      tooltip="Eliminar gasto"
                    />
                  </div>
                )}
              />
            </DataTable>
          </Card>
        </div>
      </div>

      {/* Formulario de Gasto Único */}
      <GastoForm
        visible={showForm}
        onHide={() => setShowForm(false)}
        gasto={selectedGasto}
        onSuccess={() => {
          setShowForm(false);
          setSelectedGasto(null);
        }}
        user={user}
      />

      {/* Formulario de Gasto Recurrente */}
      <GastoRecurrenteForm
        visible={showRecurrenteForm}
        onHide={() => setShowRecurrenteForm(false)}
        gasto={selectedGasto}
        onSuccess={() => {
          setShowRecurrenteForm(false);
          setSelectedGasto(null);
        }}
        user={user}
      />

      {/* Templates de Gastos */}
      <TemplatesGastos
        visible={showTemplates}
        onHide={() => setShowTemplates(false)}
        onCrearDesdeTemplate={(gastoData) => {
          setSelectedGasto(gastoData);
          setShowForm(true);
        }}
        user={user}
      />

      {/* Pagos Parciales */}
      <PagosParciales
        visible={showPagosParciales}
        onHide={() => setShowPagosParciales(false)}
        gasto={selectedGasto}
        onActualizar={async () => {
          // Recargar gastos desde Firebase
          setShowPagosParciales(false);
        }}
        user={user}
      />

      {/* Alertas de Gastos */}
      <AlertasGastos
        visible={showAlertas}
        onHide={() => setShowAlertas(false)}
        gastos={gastosFiltrados}
        onGastoClick={(gasto) => {
          setSelectedGasto(gasto);
          setShowAlertas(false);
          // Abrir el gasto correspondiente
          if (permitePagosParciales(gasto)) {
            setShowPagosParciales(true);
          } else {
            setShowDetails(true);
          }
        }}
      />

      {/* Detalles del Gasto */}
      <Dialog
        header="Detalles del Gasto"
        visible={showDetails}
        onHide={() => setShowDetails(false)}
        style={{ width: '500px' }}
        modal
      >
        {selectedGasto && (
          <div className="grid">
            <div className="col-12">
              <h4>{selectedGasto.titulo}</h4>
              <Divider />
            </div>
            
            <div className="col-6">
              <strong>Categoría:</strong>
            </div>
            <div className="col-6">
              {categoriaTemplate(selectedGasto)}
            </div>
            
            <div className="col-6">
              <strong>Monto:</strong>
            </div>
            <div className="col-6">
              {montoTemplate(selectedGasto)}
            </div>
            
            <div className="col-6">
              <strong>Fecha:</strong>
            </div>
            <div className="col-6">
              {fechaTemplate(selectedGasto)}
            </div>
            
            <div className="col-6">
              <strong>Estado:</strong>
            </div>
            <div className="col-6">
              {estadoTemplate(selectedGasto)}
            </div>
            
            {selectedGasto.nota && (
              <>
                <div className="col-6">
                  <strong>Nota:</strong>
                </div>
                <div className="col-6">
                  <span className="text-sm" style={{ wordBreak: 'break-word' }}>
                    {selectedGasto.nota}
                  </span>
                </div>
              </>
            )}
            
            {selectedGasto.descripcion && (
              <>
                <div className="col-6">
                  <strong>Descripción:</strong>
                </div>
                <div className="col-6">
                  {selectedGasto.descripcion}
                </div>
              </>
            )}
            
            {selectedGasto.proveedor && (
              <>
                <div className="col-6">
                  <strong>Proveedor:</strong>
                </div>
                <div className="col-6">
                  {selectedGasto.proveedor}
                </div>
              </>
            )}
            
            <div className="col-12 flex justify-content-end gap-2 mt-3">
              <Button
                label="Editar"
                icon="pi pi-pencil"
                onClick={() => {
                  setShowDetails(false);
                  setShowForm(true);
                }}
              />
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

export default GastosCalendario;

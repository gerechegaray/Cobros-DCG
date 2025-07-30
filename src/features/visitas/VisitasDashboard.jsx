import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { ProgressSpinner } from "primereact/progressspinner";
import { Checkbox } from "primereact/checkbox";
import { Tag } from 'primereact/tag';
import { InputText } from 'primereact/inputtext';

export default function VisitasDashboard({ user }) {
  const [visitas, setVisitas] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroFecha, setFiltroFecha] = useState(new Date());
  const [mostrarNuevoPrograma, setMostrarNuevoPrograma] = useState(false);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [mostrarReprogramar, setMostrarReprogramar] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [visitaSeleccionada, setVisitaSeleccionada] = useState(null);
  const [fechaReprogramar, setFechaReprogramar] = useState('');
  
  // 🆕 Estados para diseño responsive
  const [isMobile, setIsMobile] = useState(false);
  const [expandedCards, setExpandedCards] = useState(new Set());
  
  // Estado para el nuevo programa
  const [nuevoPrograma, setNuevoPrograma] = useState({
    vendedorId: null,
    clienteId: null,
    clienteNombre: '',
    frecuencia: 'semanal',
    diaSemana: 1, // Lunes por defecto
    horario: 'mañana',
    fechaInicio: new Date().toISOString().split('T')[0],
    activo: true
  });
  const [reporteVisita, setReporteVisita] = useState({
    estado: 'realizada',
    resultado: 'pedido',
    comentario: ''
  });
  
  // Estado para confirmación de eliminación
  const [mostrarConfirmacionEliminar, setMostrarConfirmacionEliminar] = useState(false);
  const [programaAEliminar, setProgramaAEliminar] = useState(null);
  
  // Estado para edición de programas
  const [mostrarEditarPrograma, setMostrarEditarPrograma] = useState(false);
  const [programaAEditar, setProgramaAEditar] = useState(null);
  const [programaEditado, setProgramaEditado] = useState({
    vendedorId: null,
    clienteId: null,
    clienteNombre: '',
    frecuencia: 'semanal',
    diaSemana: 1,
    horario: 'mañana',
    fechaInicio: new Date().toISOString().split('T')[0],
    activo: true
  });
  
  // Estado para controlar la visibilidad de programas de visitas
  const [mostrarProgramas, setMostrarProgramas] = useState(false);
  
  const navigate = useNavigate();
  const toast = useRef(null);

  // 🆕 Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 🆕 Función para alternar expansión de tarjetas
  const toggleCardExpansion = (visitaId) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(visitaId)) {
        newSet.delete(visitaId);
      } else {
        newSet.add(visitaId);
      }
      return newSet;
    });
  };

  // 🆕 Función para manejar acciones en móvil
  const handleMobileAction = (action, visita) => {
    switch (action) {
      case 'reporte':
        abrirReporte(visita);
        break;
      case 'estadoCuenta':
        irAEstadoCuenta(visita);
        break;
      case 'cancelar':
        if (window.confirm('¿Estás seguro de que quieres cancelar esta visita?')) {
          cancelarVisita(visita.id);
        }
        break;
      default:
        break;
    }
  };

  // 🆕 Componente de tarjeta móvil para visitas
  const MobileCard = ({ visita }) => {
    const isExpanded = expandedCards.has(visita.id);
    
    return (
      <Card className="mb-3 shadow-sm">
        <div className="p-3">
          {/* Estado cerrado */}
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{visita.clienteNombre}</div>
              <div className="text-sm text-gray-600">
                {formatFechaVisita(visita.fecha)} - {visita.horario}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {renderEstado(visita)}
              <Button
                icon={isExpanded ? "pi pi-chevron-up" : "pi pi-chevron-down"}
                className="p-button-rounded p-button-text p-button-sm"
                onClick={() => toggleCardExpansion(visita.id)}
              />
            </div>
          </div>
          
          {/* Estado expandido */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="space-y-2">
                {esAdmin && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Vendedor:</span>
                    <span className="text-sm font-medium">
                      {visita.vendedorId === 1 ? 'Guille' : visita.vendedorId === 2 ? 'Santi' : '-'}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Resultado:</span>
                  <div>{renderResultado(visita)}</div>
                </div>
                
                {visita.comentario && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-500">Observaciones:</span>
                    <span className="text-sm text-gray-700 max-w-xs text-right">
                      {visita.comentario.length > 50 
                        ? `${visita.comentario.substring(0, 50)}...` 
                        : visita.comentario
                      }
                    </span>
                  </div>
                )}
                
                {/* Botones de acción */}
                <div className="flex gap-2 pt-2">
                  <Button
                    icon="pi pi-pencil"
                    label="Reportar"
                    size="small"
                    severity="info"
                    onClick={() => handleMobileAction('reporte', visita)}
                    className="flex-1"
                  />
                  <Button
                    icon="pi pi-credit-card"
                    label="Estado Cuenta"
                    size="small"
                    severity="success"
                    onClick={() => handleMobileAction('estadoCuenta', visita)}
                    className="flex-1"
                  />
                  {esAdmin && (
                    <Button
                      icon="pi pi-times"
                      label="Cancelar"
                      size="small"
                      severity="danger"
                      onClick={() => handleMobileAction('cancelar', visita)}
                      className="flex-1"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  // 🆕 Componente de layout móvil
  const MobileLayout = () => (
    <div className="space-y-4">
      {visitasFiltradas.length > 0 ? (
        visitasFiltradas.map(visita => (
          <MobileCard key={visita.id} visita={visita} />
        ))
      ) : (
        <Card className="text-center py-8">
          <div className="text-gray-500">
            <i className="pi pi-calendar-times text-4xl mb-2"></i>
            <p>No hay visitas para esta fecha</p>
          </div>
        </Card>
      )}
    </div>
  );

  // 🆕 Componente de layout desktop
  const DesktopLayout = () => (
    <DataTable 
      value={visitasFiltradas} 
      paginator 
      rows={10}
      rowsPerPageOptions={[5, 10, 20]}
      emptyMessage="No hay visitas para esta fecha"
    >
      <Column field="clienteNombre" header="Cliente" sortable />
      {esAdmin && (
        <Column 
          field="vendedorId" 
          header="Vendedor" 
          body={(visita) => visita.vendedorId === 1 ? 'Guille' : visita.vendedorId === 2 ? 'Santi' : '-'}
          sortable 
        />
      )}
      <Column field="fecha" header="Fecha" sortable body={(visita) => formatFechaVisita(visita.fecha)} />
      <Column field="horario" header="Horario" />
      <Column field="estado" header="Estado" body={renderEstado} />
      <Column field="resultado" header="Resultado" body={renderResultado} />
      <Column 
        field="comentario" 
        header="Observaciones" 
        body={(visita) => (
          <div className="max-w-xs">
            {visita.comentario ? (
              <span className="text-sm text-gray-700" title={visita.comentario}>
                {visita.comentario.length > 50 
                  ? `${visita.comentario.substring(0, 50)}...` 
                  : visita.comentario
                }
              </span>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </div>
        )}
      />
      <Column header="Acciones" body={renderAcciones} />
    </DataTable>
  );

  // Obtener el sellerId según el rol del usuario
  const getSellerId = () => {
    if (user?.role === 'Guille') return 1;
    if (user?.role === 'Santi') return 2;
    if (user?.role === 'admin') return null; // Admin ve todos
    return null;
  };

  // Verificar si el usuario es admin
  const esAdmin = user?.role === 'admin';

  // Opciones para los dropdowns
  const frecuencias = [
    { label: 'Semanal', value: 'semanal' },
    { label: 'Quincenal', value: 'quincenal' },
    { label: 'Mensual', value: 'mensual' }
  ];

  const diasSemana = [
    { label: 'Domingo', value: 0 },
    { label: 'Lunes', value: 1 },
    { label: 'Martes', value: 2 },
    { label: 'Miércoles', value: 3 },
    { label: 'Jueves', value: 4 },
    { label: 'Viernes', value: 5 },
    { label: 'Sábado', value: 6 }
  ];

  const horarios = [
    { label: 'Mañana', value: 'mañana' },
    { label: 'Tarde', value: 'tarde' }
  ];

  // Cargar clientes del vendedor (solo para admin)
  useEffect(() => {
    const cargarClientes = async () => {
      try {
        const res = await fetch('/api/clientes-firebase');
        if (!res.ok) throw new Error('Error al cargar clientes');
        const data = await res.json();
        
        // Solo admin puede ver todos los clientes para crear programas
        if (esAdmin) {
          setClientes(data);
        } else {
          // Vendedores solo ven sus clientes asignados
          const sellerId = getSellerId();
          if (sellerId !== null) {
            let clientesFiltrados = data.filter(cliente => {
              if (cliente.seller && cliente.seller.id) {
                return cliente.seller.id === sellerId.toString();
              }
              return false;
            });
            setClientes(clientesFiltrados);
          } else {
            setClientes([]);
          }
        }
      } catch (error) {
        console.error('Error cargando clientes:', error);
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los clientes'
        });
      }
    };

    if (user) {
      cargarClientes();
    }
  }, [user, esAdmin]);

  // Cargar programas de visitas (solo admin puede ver todos)
  useEffect(() => {
    const cargarProgramas = async () => {
      try {
        const sellerId = getSellerId();
        
        // Si es admin, no filtrar por vendedorId
        const url = esAdmin 
          ? '/api/visitas-programadas'
          : `/api/visitas-programadas?vendedorId=${sellerId}`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error('Error al cargar programas');
        const data = await res.json();
        setProgramas(data);
      } catch (error) {
        console.error('Error cargando programas:', error);
        // Solo mostrar error si no es admin (para evitar spam en consola)
        if (!esAdmin) {
          toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los programas'
          });
        }
      }
    };

    if (user) {
      cargarProgramas();
    }
  }, [user, esAdmin]);

  // Cargar visitas del vendedor
  useEffect(() => {
    const cargarVisitas = async () => {
      try {
        setLoading(true);
        const sellerId = getSellerId();
        
        // Si es admin, no filtrar por vendedorId
        const urlVisitas = esAdmin
          ? '/api/visitas-cache' // 🆕 Usar endpoint con caché
          : `/api/visitas-cache?vendedorId=${sellerId}`; // 🆕 Usar endpoint con caché
        
        const res = await fetch(urlVisitas);
        if (!res.ok) throw new Error('Error al cargar visitas');
        const data = await res.json();
        
        setVisitas(data);
      } catch (error) {
        console.error('Error cargando visitas:', error);
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las visitas'
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      cargarVisitas();
    }
  }, [user, esAdmin]);

  // Filtrar visitas por fecha
  const visitasFiltradas = useMemo(() => {
    if (!filtroFecha) return visitas;
    
    // Convertir la fecha del filtro a string YYYY-MM-DD sin problemas de timezone
    const fechaFiltro = new Date(filtroFecha);
    const fechaFiltroStr = `${fechaFiltro.getFullYear()}-${String(fechaFiltro.getMonth() + 1).padStart(2, '0')}-${String(fechaFiltro.getDate()).padStart(2, '0')}`;
    

    
    return visitas.filter(visita => {
      // La fecha de la visita ya viene como string YYYY-MM-DD desde el backend
      const fechaVisitaStr = visita.fecha;
      
      return fechaVisitaStr === fechaFiltroStr;
    });
  }, [visitas, filtroFecha]);

  // Filtrar clientes según el vendedor seleccionado (para nuevo programa)
  const clientesFiltrados = useMemo(() => {
    if (!nuevoPrograma.vendedorId) return [];
    
    return clientes.filter(cliente => {
      if (cliente.seller && cliente.seller.id) {
        return cliente.seller.id === nuevoPrograma.vendedorId.toString();
      }
      return false;
    });
  }, [clientes, nuevoPrograma.vendedorId]);

  // Filtrar clientes según el vendedor seleccionado (para editar programa)
  const clientesFiltradosEdicion = useMemo(() => {
    if (!programaEditado.vendedorId) return [];
    
    return clientes.filter(cliente => {
      if (cliente.seller && cliente.seller.id) {
        return cliente.seller.id === programaEditado.vendedorId.toString();
      }
      return false;
    });
  }, [clientes, programaEditado.vendedorId]);

  // Limpiar cliente cuando cambie el vendedor (nuevo programa)
  useEffect(() => {
    setNuevoPrograma(prev => ({
      ...prev,
      clienteId: null,
      clienteNombre: ''
    }));
  }, [nuevoPrograma.vendedorId]);

  // Limpiar cliente cuando cambie el vendedor (editar programa)
  useEffect(() => {
    if (mostrarEditarPrograma) {
      setProgramaEditado(prev => ({
        ...prev,
        clienteId: null,
        clienteNombre: ''
      }));
    }
  }, [programaEditado.vendedorId, mostrarEditarPrograma]);

  // Renderizar estado de la visita
  const renderEstado = (visita) => {
    if (visita.estado === 'pendiente') {
      return <Tag value="Pendiente" severity="warning" />;
    } else if (visita.estado === 'realizada') {
      return <Tag value="Realizada" severity="success" />;
    } else {
      return <Tag value="No realizada" severity="danger" />;
    }
  };

  // Renderizar resultado de la visita
  const renderResultado = (visita) => {
    if (!visita.resultado) return '-';
    
    const resultados = {
      'pedido': { label: 'Pedido', severity: 'success' },
      'pago': { label: 'Pago', severity: 'info' },
      'pedido_pago': { label: 'Pedido y Pago', severity: 'success' },
      'sin_pedido': { label: 'Sin pedido', severity: 'warning' },
      'no_visito': { label: 'No visitó', severity: 'danger' },
      'no_estaba': { label: 'No estaba', severity: 'warning' }
    };
    
    const resultado = resultados[visita.resultado];
    return <Tag value={resultado.label} severity={resultado.severity} />;
  };

  // Renderizar acciones de la visita
  const renderAcciones = (visita) => (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <Button
        icon="pi pi-pencil"
        className="p-button-rounded p-button-text p-button-info p-button-sm"
        style={{
          width: 32,
          height: 32,
          minWidth: 32,
          minHeight: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.9rem'
        }}
        onClick={() => abrirReporte(visita)}
        tooltip="Editar reporte"
        tooltipOptions={{ position: "top" }}
      />
      
      {/* Botón Estado de Cuenta */}
      <Button
        icon="pi pi-credit-card"
        className="p-button-rounded p-button-text p-button-success p-button-sm"
        style={{
          width: 32,
          height: 32,
          minWidth: 32,
          minHeight: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.9rem'
        }}
        onClick={() => irAEstadoCuenta(visita)}
        tooltip="Ver estado de cuenta"
        tooltipOptions={{ position: "top" }}
      />
      
      {esAdmin && (
        <Button
          icon="pi pi-times"
          className="p-button-rounded p-button-text p-button-danger p-button-sm"
          style={{
            width: 32,
            height: 32,
            minWidth: 32,
            minHeight: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem'
          }}
          onClick={() => cancelarVisita(visita.id)}
          tooltip="Cancelar visita"
          tooltipOptions={{ position: "top" }}
        />
      )}
    </div>
  );

  // Abrir modal de reporte
  const abrirReporte = (visita) => {
    setVisitaSeleccionada(visita);
    setReporteVisita({
      estado: visita.estado || 'realizada',
      resultado: visita.resultado || 'pedido',
      comentario: visita.comentario || ''
    });
    setMostrarReporte(true);
  };

  // Ver detalle de visita completada
  const verDetalle = (visita) => {
    setVisitaSeleccionada(visita);
    setMostrarDetalle(true);
  };

  // Guardar reporte
  const guardarReporte = async () => {
    try {
      const res = await fetch(`/api/visitas/${visitaSeleccionada.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          estado: reporteVisita.estado,
          resultado: reporteVisita.resultado,
          comentario: reporteVisita.comentario
        })
      });

      if (!res.ok) throw new Error('Error al guardar reporte');

      toast.current.show({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Reporte guardado correctamente'
      });

      setMostrarReporte(false);
      // Recargar visitas
      const sellerId = getSellerId();
      const urlVisitas = esAdmin 
        ? '/api/visitas-cache' // 🆕 Usar endpoint con caché
        : `/api/visitas-cache?vendedorId=${sellerId}`; // 🆕 Usar endpoint con caché
      const resVisitas = await fetch(urlVisitas);
      const dataVisitas = await resVisitas.json();
      setVisitas(dataVisitas);
    } catch (error) {
      console.error('Error guardando reporte:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al guardar el reporte'
      });
    }
  };

  // Abrir modal de reprogramar
  const abrirReprogramar = () => {
    // Establecer fecha por defecto (día siguiente)
    const nuevaFecha = new Date(visitaSeleccionada.fecha);
    nuevaFecha.setDate(nuevaFecha.getDate() + 1);
    setFechaReprogramar(nuevaFecha.toISOString().split('T')[0]);
    setMostrarReprogramar(true);
  };

  // Reprogramar visita con fecha seleccionada
  const reprogramarVisita = async () => {
    try {
      if (!fechaReprogramar) {
        toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Debes seleccionar una fecha'
        });
        return;
      }

      // Guardar el reporte actual primero
      await guardarReporte();

      // Crear nueva visita para la fecha seleccionada
      const res = await fetch('/api/visitas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clienteId: visitaSeleccionada.clienteId,
          clienteNombre: visitaSeleccionada.clienteNombre,
          vendedorId: visitaSeleccionada.vendedorId,
          fecha: fechaReprogramar,
          horario: visitaSeleccionada.horario,
          estado: 'pendiente',
          resultado: null,
          comentario: `Reprogramada desde ${visitaSeleccionada.fecha}`
        })
      });

      if (!res.ok) throw new Error('Error al reprogramar visita');

      toast.current.show({
        severity: 'success',
        summary: 'Éxito',
        detail: `Visita reprogramada para el ${fechaReprogramar}`
      });

      setMostrarReprogramar(false);
      setMostrarReporte(false);
      // Recargar visitas
      const sellerId = getSellerId();
      const urlVisitas = esAdmin 
        ? '/api/visitas-cache'
        : `/api/visitas-cache?vendedorId=${sellerId}`;
      const resVisitas = await fetch(urlVisitas);
      const dataVisitas = await resVisitas.json();
      setVisitas(dataVisitas);
    } catch (error) {
      console.error('Error reprogramando visita:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al reprogramar la visita'
      });
    }
  };

  // Cancelar visita (solo admin)
  const cancelarVisita = async (visitaId) => {
    try {
      const res = await fetch(`/api/visitas/${visitaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          estado: 'no_realizada'
        })
      });

      if (!res.ok) throw new Error('Error al cancelar visita');

      toast.current.show({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Visita cancelada correctamente'
      });

      // Recargar visitas
      const sellerId = getSellerId();
      const urlVisitas = esAdmin 
        ? '/api/visitas-cache' // 🆕 Usar endpoint con caché
        : `/api/visitas-cache?vendedorId=${sellerId}`; // 🆕 Usar endpoint con caché
      const resVisitas = await fetch(urlVisitas);
      const dataVisitas = await resVisitas.json();
      setVisitas(dataVisitas);
    } catch (error) {
      console.error('Error cancelando visita:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al cancelar la visita'
      });
    }
  };

  // Guardar nuevo programa
  const guardarNuevoPrograma = async () => {
    try {
      // Validar que estén seleccionados vendedor y cliente
      if (!nuevoPrograma.vendedorId || !nuevoPrograma.clienteId) {
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Debes seleccionar un vendedor y un cliente'
        });
        return;
      }

      const res = await fetch('/api/visitas-programadas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nuevoPrograma)
      });

      if (!res.ok) throw new Error('Error al crear programa');

      const result = await res.json();

      toast.current?.show({
        severity: 'success',
        summary: 'Éxito',
        detail: `Programa creado correctamente. Se generaron ${result.visitasGeneradas} visitas automáticamente.`
      });

      setMostrarNuevoPrograma(false);
      setNuevoPrograma({
        vendedorId: null,
        clienteId: null,
        clienteNombre: '',
        frecuencia: 'semanal',
        diaSemana: 1,
        horario: 'mañana',
        fechaInicio: new Date().toISOString().split('T')[0],
        activo: true
      });

      // Recargar programas
      const urlProgramas = esAdmin 
        ? '/api/visitas-programadas'
        : `/api/visitas-programadas?vendedorId=${getSellerId()}`;
      const resProgramas = await fetch(urlProgramas);
      const dataProgramas = await resProgramas.json();
      setProgramas(dataProgramas);
    } catch (error) {
      console.error('Error guardando programa:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al crear el programa'
      });
    }
  };

  // Generar visitas desde programas (solo admin)
  const generarVisitas = async () => {
    try {
      const fechaInicio = new Date();
      const fechaFin = new Date();
      fechaFin.setDate(fechaFin.getDate() + 30); // Generar para el próximo mes

      const res = await fetch('/api/visitas/generar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fechaInicio: fechaInicio.toISOString().split('T')[0],
          fechaFin: fechaFin.toISOString().split('T')[0],
          vendedorId: esAdmin ? null : getSellerId()
        })
      });

      if (!res.ok) throw new Error('Error al generar visitas');

      const result = await res.json();

      toast.current?.show({
        severity: 'success',
        summary: 'Éxito',
        detail: `${result.visitasGeneradas} visitas generadas desde ${result.programas} programas`
      });

      // Recargar visitas
      const sellerId = getSellerId();
      const urlVisitas = esAdmin 
        ? '/api/visitas-cache' // 🆕 Usar endpoint con caché
        : `/api/visitas-cache?vendedorId=${sellerId}`; // 🆕 Usar endpoint con caché
      const resVisitas = await fetch(urlVisitas);
      const dataVisitas = await resVisitas.json();
      setVisitas(dataVisitas);
    } catch (error) {
      console.error('Error generando visitas:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al generar visitas'
      });
    }
  };

  // Eliminar programa y todas sus visitas
  const eliminarPrograma = async (programaId) => {
    try {
      const res = await fetch(`/api/visitas-programadas/${programaId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Error al eliminar programa');

      const result = await res.json();

      toast.current?.show({
        severity: 'success',
        summary: 'Éxito',
        detail: `Programa eliminado correctamente. Se eliminaron ${result.visitasEliminadas} visitas asociadas.`
      });

      // Recargar programas
      const urlProgramas = esAdmin 
        ? '/api/visitas-programadas'
        : `/api/visitas-programadas?vendedorId=${getSellerId()}`;
      const resProgramas = await fetch(urlProgramas);
      const dataProgramas = await resProgramas.json();
      setProgramas(dataProgramas);

      // Recargar visitas
      const sellerId = getSellerId();
      const urlVisitas = esAdmin 
        ? '/api/visitas-cache' // 🆕 Usar endpoint con caché
        : `/api/visitas-cache?vendedorId=${sellerId}`; // 🆕 Usar endpoint con caché
      const resVisitas = await fetch(urlVisitas);
      const dataVisitas = await resVisitas.json();
      setVisitas(dataVisitas);
    } catch (error) {
      console.error('Error eliminando programa:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al eliminar el programa'
      });
    }
  };

  // Abrir modal de edición de programa
  const abrirEditarPrograma = (programa) => {
    setProgramaAEditar(programa);
    
    // Corregir la fecha para evitar problemas de zona horaria
    let fechaInicio = new Date().toISOString().split('T')[0];
    if (programa.fechaInicio) {
      // Si la fecha viene como string, usarla directamente
      if (typeof programa.fechaInicio === 'string') {
        fechaInicio = programa.fechaInicio.split('T')[0];
      } else {
        // Si viene como timestamp, convertirla
        fechaInicio = new Date(programa.fechaInicio._seconds * 1000).toISOString().split('T')[0];
      }
    }
    
    setProgramaEditado({
      vendedorId: programa.vendedorId,
      clienteId: programa.clienteId,
      clienteNombre: programa.clienteNombre,
      frecuencia: programa.frecuencia,
      diaSemana: programa.diaSemana,
      horario: programa.horario,
      fechaInicio: fechaInicio,
      activo: programa.activo
    });
    setMostrarEditarPrograma(true);
  };

  // Guardar cambios del programa editado
  const guardarProgramaEditado = async () => {
    try {
      // Validar que estén seleccionados vendedor y cliente
      if (!programaEditado.vendedorId || !programaEditado.clienteId) {
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Debes seleccionar un vendedor y un cliente'
        });
        return;
      }

      const res = await fetch(`/api/visitas-programadas/${programaAEditar.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...programaEditado,
          fechaActualizacion: new Date()
        })
      });

      if (!res.ok) throw new Error('Error al actualizar programa');

      const result = await res.json();

      toast.current?.show({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Programa actualizado correctamente'
      });

      setMostrarEditarPrograma(false);
      setProgramaAEditar(null);
      setProgramaEditado({
        vendedorId: null,
        clienteId: null,
        clienteNombre: '',
        frecuencia: 'semanal',
        diaSemana: 1,
        horario: 'mañana',
        fechaInicio: new Date().toISOString().split('T')[0],
        activo: true
      });

      // Recargar programas
      const urlProgramas = esAdmin 
        ? '/api/visitas-programadas'
        : `/api/visitas-programadas?vendedorId=${getSellerId()}`;
      const resProgramas = await fetch(urlProgramas);
      const dataProgramas = await resProgramas.json();
      setProgramas(dataProgramas);
    } catch (error) {
      console.error('Error actualizando programa:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al actualizar el programa'
      });
    }
  };

  // Función para formatear fechas en formato DD/MM/YYYY
  const formatFechaVisita = (fecha) => {
    if (!fecha) return '-';
    
    try {
      let fechaObj = null;
      
      // Si es un string en formato YYYY-MM-DD, convertirlo evitando problemas de timezone
      if (typeof fecha === 'string' && fecha.includes('-')) {
        const [year, month, day] = fecha.split('-').map(Number);
        fechaObj = new Date(year, month - 1, day); // month - 1 porque los meses van de 0-11
      }
      // Si es un objeto de Firestore Timestamp con seconds
      else if (fecha && typeof fecha === 'object' && fecha.seconds !== undefined) {
        fechaObj = new Date(fecha.seconds * 1000);
      }
      // Si es un objeto de Firestore con toDate()
      else if (fecha && typeof fecha === 'object' && typeof fecha.toDate === 'function') {
        fechaObj = fecha.toDate();
      }
      // Si es una fecha normal
      else if (fecha instanceof Date) {
        fechaObj = fecha;
      }
      // Si es un string o número
      else if (typeof fecha === 'string' || typeof fecha === 'number') {
        fechaObj = new Date(fecha);
      }
      
      if (fechaObj && !isNaN(fechaObj.getTime())) {
        // Formato DD/MM/YYYY
        const dia = fechaObj.getDate().toString().padStart(2, '0');
        const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
        const año = fechaObj.getFullYear().toString();
        return `${dia}/${mes}/${año}`;
      }
      
      // Si no se puede formatear, devolver un string por defecto
      return 'Fecha inválida';
    } catch (error) {
      // Si hay error, devolver un string por defecto
      return 'Error en fecha';
    }
  };

  // Navegar a la página de estado de cuenta del cliente
  const irAEstadoCuenta = (visita) => {
    // Buscar el cliente en la lista de clientes
    const clienteEncontrado = clientes.find(c => c.id === visita.clienteId);
    
    if (clienteEncontrado) {
      // Navegar al estado de cuenta pasando el cliente como estado
      navigate("/estado-cuenta", { 
        state: { 
          cliente: {
            id: clienteEncontrado.id,
            name: clienteEncontrado.name,
            // Agregar otros datos del cliente si es necesario
            ...clienteEncontrado
          } 
        } 
      });
    } else {
      toast.current?.show({
        severity: 'warning',
        summary: 'Atención',
        detail: 'No se pudo encontrar la información del cliente.'
      });
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "50vh",
        gap: "1rem"
      }}>
        <ProgressSpinner />
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <ConfirmDialog />
      
      {/* Header con acciones */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Visitas - {user.role}</h2>
        {esAdmin && (
          <div className="flex gap-2">
            <Button 
              label="Nuevo Programa" 
              icon="pi pi-plus" 
              severity="success"
              onClick={() => setMostrarNuevoPrograma(true)}
            />
            <Button 
              label="Generar Visitas" 
              icon="pi pi-calendar-plus" 
              severity="info"
              onClick={generarVisitas}
            />
          </div>
        )}
      </div>

      {/* Información para vendedores */}
      {!esAdmin && (
        <Card className="mb-4">
          <div className="text-center">
            <i className="pi pi-info-circle text-blue-500 text-xl mb-2"></i>
            <p className="text-gray-600">
              Aquí puedes ver tus visitas programadas y reportar las que hayas realizado.
              Solo el administrador puede crear nuevos programas de visitas.
            </p>
          </div>
        </Card>
      )}

      {/* Filtro de fecha */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Filtrar por fecha:</label>
        <Calendar 
          value={filtroFecha} 
          onChange={(e) => setFiltroFecha(e.value)}
          showIcon
          placeholder="Seleccionar fecha"
          dateFormat="dd/mm/yy"
        />
      </div>

      {/* Sección colapsable de programas de visitas (solo admin) */}
      {esAdmin && (
        <Card className="mb-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Programas de Visitas</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{programas.length} programas activos</span>
              <Button 
                icon={mostrarProgramas ? "pi pi-chevron-up" : "pi pi-chevron-down"}
                size="small"
                severity="secondary"
                onClick={() => setMostrarProgramas(!mostrarProgramas)}
                tooltip={mostrarProgramas ? "Ocultar programas" : "Mostrar programas"}
              />
            </div>
          </div>
          
          {mostrarProgramas && (
            <div className="mt-4">
              {programas.length > 0 ? (
                <DataTable
                  value={programas}
                  paginator
                  rows={5}
                  rowsPerPageOptions={[5, 10]}
                  emptyMessage="No hay programas de visitas creados"
                >
                  <Column field="clienteNombre" header="Cliente" sortable />
                  <Column
                    field="vendedorId"
                    header="Vendedor"
                    body={(programa) => programa.vendedorId === 1 ? 'Guille' : 'Santi'}
                    sortable
                  />
                  <Column
                    field="frecuencia"
                    header="Frecuencia"
                    body={(programa) => {
                      const frecuencias = {
                        'semanal': 'Semanal',
                        'quincenal': 'Quincenal',
                        'mensual': 'Mensual'
                      };
                      return frecuencias[programa.frecuencia] || programa.frecuencia;
                    }}
                    sortable
                  />
                  <Column
                    field="diaSemana"
                    header="Día"
                    body={(programa) => {
                      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                      return dias[programa.diaSemana] || programa.diaSemana;
                    }}
                    sortable
                  />
                  <Column
                    field="horario"
                    header="Horario"
                    body={(programa) => programa.horario === 'mañana' ? 'Mañana' : 'Tarde'}
                    sortable
                  />
                  <Column
                    field="activo"
                    header="Estado"
                    body={(programa) => (
                      <Tag
                        value={programa.activo ? 'Activo' : 'Inactivo'}
                        severity={programa.activo ? 'success' : 'danger'}
                      />
                    )}
                    sortable
                  />
                  <Column
                    header="Acciones"
                    body={(programa) => (
                      <div className="flex gap-2">
                        <Button
                          icon="pi pi-pencil"
                          size="small"
                          severity="info"
                          tooltip="Editar programa"
                          onClick={() => abrirEditarPrograma(programa)}
                        />
                        <Button
                          icon="pi pi-trash"
                          size="small"
                          severity="danger"
                          tooltip="Eliminar programa"
                          onClick={() => {
                            setProgramaAEliminar(programa);
                            setMostrarConfirmacionEliminar(true);
                          }}
                        />
                      </div>
                    )}
                  />
                </DataTable>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No hay programas de visitas creados
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Tabla de visitas */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Visitas Individuales</h3>
          <span className="text-sm text-gray-500">{visitasFiltradas.length} visitas para esta fecha</span>
        </div>
        {isMobile ? (
          <MobileLayout />
        ) : (
          <DesktopLayout />
        )}
      </Card>

      {/* Modal para nuevo programa (solo admin) */}
      {esAdmin && (
        <Dialog 
          header="Nuevo Programa de Visitas" 
          visible={mostrarNuevoPrograma} 
          onHide={() => setMostrarNuevoPrograma(false)}
          style={{ width: '500px' }}
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p className="text-sm text-blue-800">
                <i className="pi pi-info-circle mr-2"></i>
                Primero selecciona un vendedor, luego aparecerán solo los clientes asignados a ese vendedor.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Vendedor:</label>
              <Dropdown
                value={nuevoPrograma.vendedorId}
                options={[{ label: 'Seleccionar Vendedor', value: null }, { label: 'Guille', value: 1 }, { label: 'Santi', value: 2 }]}
                onChange={(e) => setNuevoPrograma({...nuevoPrograma, vendedorId: e.value})}
                placeholder="Seleccionar vendedor"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cliente:</label>
              <Dropdown
                value={nuevoPrograma.clienteId}
                options={nuevoPrograma.vendedorId 
                  ? clientesFiltrados.map(c => ({ label: c.name, value: c.id }))
                  : [{ label: 'Selecciona un vendedor primero', value: null }]
                }
                onChange={(e) => {
                  if (e.value) {
                    const clienteSeleccionado = clientesFiltrados.find(c => c.id === e.value);
                    setNuevoPrograma({
                      ...nuevoPrograma, 
                      clienteId: e.value,
                      clienteNombre: clienteSeleccionado?.name || ''
                    });
                  }
                }}
                placeholder={nuevoPrograma.vendedorId ? "Seleccionar cliente" : "Selecciona un vendedor primero"}
                disabled={!nuevoPrograma.vendedorId}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Frecuencia:</label>
              <Dropdown
                value={nuevoPrograma.frecuencia}
                options={frecuencias}
                onChange={(e) => setNuevoPrograma({...nuevoPrograma, frecuencia: e.value})}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Día de la semana:</label>
              <Dropdown
                value={nuevoPrograma.diaSemana}
                options={diasSemana}
                onChange={(e) => setNuevoPrograma({...nuevoPrograma, diaSemana: e.value})}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Horario:</label>
              <Dropdown
                value={nuevoPrograma.horario}
                options={horarios}
                onChange={(e) => setNuevoPrograma({...nuevoPrograma, horario: e.value})}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Fecha de inicio:</label>
              <Calendar
                value={nuevoPrograma.fechaInicio}
                onChange={(e) => setNuevoPrograma({...nuevoPrograma, fechaInicio: e.value})}
                showIcon
                className="w-full"
                dateFormat="dd/mm/yy"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button 
              label="Cancelar" 
              severity="secondary" 
              onClick={() => setMostrarNuevoPrograma(false)}
            />
            <Button 
              label="Guardar" 
              severity="success" 
              onClick={guardarNuevoPrograma}
            />
          </div>
        </Dialog>
      )}

      {/* Modal para editar programa (solo admin) */}
      {esAdmin && (
        <Dialog 
          header="Editar Programa de Visitas" 
          visible={mostrarEditarPrograma} 
          onHide={() => setMostrarEditarPrograma(false)}
          style={{ width: '500px' }}
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p className="text-sm text-blue-800">
                <i className="pi pi-info-circle mr-2"></i>
                Modifica los parámetros del programa. Los cambios se aplicarán a las visitas futuras.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Vendedor:</label>
              <Dropdown
                value={programaEditado.vendedorId}
                options={[{ label: 'Seleccionar Vendedor', value: null }, { label: 'Guille', value: 1 }, { label: 'Santi', value: 2 }]}
                onChange={(e) => setProgramaEditado({...programaEditado, vendedorId: e.value})}
                placeholder="Seleccionar vendedor"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cliente:</label>
              <Dropdown
                value={programaEditado.clienteId}
                options={programaEditado.vendedorId 
                  ? clientesFiltradosEdicion.map(c => ({ label: c.name, value: c.id }))
                  : [{ label: 'Selecciona un vendedor primero', value: null }]
                }
                onChange={(e) => {
                  if (e.value) {
                    const clienteSeleccionado = clientesFiltradosEdicion.find(c => c.id === e.value);
                    setProgramaEditado({
                      ...programaEditado, 
                      clienteId: e.value,
                      clienteNombre: clienteSeleccionado?.name || ''
                    });
                  }
                }}
                placeholder={programaEditado.vendedorId ? "Seleccionar cliente" : "Selecciona un vendedor primero"}
                disabled={!programaEditado.vendedorId}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Frecuencia:</label>
              <Dropdown
                value={programaEditado.frecuencia}
                options={[
                  { label: 'Semanal', value: 'semanal' },
                  { label: 'Quincenal', value: 'quincenal' },
                  { label: 'Mensual', value: 'mensual' }
                ]}
                onChange={(e) => setProgramaEditado({...programaEditado, frecuencia: e.value})}
                placeholder="Seleccionar frecuencia"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Día de la semana:</label>
              <Dropdown
                value={programaEditado.diaSemana}
                options={[
                  { label: 'Domingo', value: 0 },
                  { label: 'Lunes', value: 1 },
                  { label: 'Martes', value: 2 },
                  { label: 'Miércoles', value: 3 },
                  { label: 'Jueves', value: 4 },
                  { label: 'Viernes', value: 5 },
                  { label: 'Sábado', value: 6 }
                ]}
                onChange={(e) => setProgramaEditado({...programaEditado, diaSemana: e.value})}
                placeholder="Seleccionar día"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Horario:</label>
              <Dropdown
                value={programaEditado.horario}
                options={[
                  { label: 'Mañana', value: 'mañana' },
                  { label: 'Tarde', value: 'tarde' }
                ]}
                onChange={(e) => setProgramaEditado({...programaEditado, horario: e.value})}
                placeholder="Seleccionar horario"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Fecha de inicio:</label>
              <Calendar 
                value={programaEditado.fechaInicio ? new Date(programaEditado.fechaInicio + 'T00:00:00') : null} 
                onChange={(e) => setProgramaEditado({...programaEditado, fechaInicio: e.value ? e.value.toISOString().split('T')[0] : ''})}
                showIcon
                className="w-full"
                dateFormat="dd/mm/yy"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={programaEditado.activo}
                onChange={(e) => setProgramaEditado({...programaEditado, activo: e.checked})}
              />
              <label className="text-sm">Programa activo</label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                label="Cancelar" 
                severity="secondary"
                onClick={() => setMostrarEditarPrograma(false)}
              />
              <Button 
                label="Guardar Cambios" 
                severity="success"
                onClick={guardarProgramaEditado}
              />
            </div>
          </div>
        </Dialog>
      )}

      {/* Modal para reporte */}
      <Dialog 
        header="Reportar Visita" 
        visible={mostrarReporte} 
        onHide={() => setMostrarReporte(false)}
        style={{ width: '500px' }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Estado:</label>
            <Dropdown
              value={reporteVisita.estado}
              options={[
                { label: 'Realizada', value: 'realizada' },
                { label: 'No realizada', value: 'no_realizada' }
              ]}
              onChange={(e) => {
                const nuevoEstado = e.value;
                let nuevoResultado = reporteVisita.resultado;
                
                // Si cambia a "no_realizada", forzar resultado a "no_visito"
                if (nuevoEstado === 'no_realizada') {
                  nuevoResultado = 'no_visito';
                } else if (nuevoEstado === 'realizada' && reporteVisita.resultado === 'no_visito') {
                  // Si cambia a "realizada" y el resultado era "no_visito", resetear
                  nuevoResultado = 'pedido';
                }
                
                setReporteVisita({
                  ...reporteVisita, 
                  estado: nuevoEstado,
                  resultado: nuevoResultado
                });
              }}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Resultado:</label>
            <Dropdown
              value={reporteVisita.resultado}
              options={
                reporteVisita.estado === 'no_realizada' 
                  ? [{ label: 'No visitó', value: 'no_visito' }]
                  : [
                      { label: 'Pedido', value: 'pedido' },
                      { label: 'Pago', value: 'pago' },
                      { label: 'Pedido y Pago', value: 'pedido_pago' },
                      { label: 'Sin pedido', value: 'sin_pedido' },
                      { label: 'No estaba', value: 'no_estaba' }
                    ]
              }
              onChange={(e) => setReporteVisita({...reporteVisita, resultado: e.value})}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Comentario:</label>
            <InputTextarea
              value={reporteVisita.comentario}
              onChange={(e) => setReporteVisita({...reporteVisita, comentario: e.target.value})}
              rows={3}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button 
            label="Cancelar" 
            severity="secondary" 
            onClick={() => setMostrarReporte(false)}
          />
          {(reporteVisita.estado === 'no_realizada' || reporteVisita.resultado === 'no_estaba') && (
            <Button 
              label="Reprogramar" 
              severity="warning" 
              icon="pi pi-calendar-plus"
              onClick={abrirReprogramar}
            />
          )}
          <Button 
            label="Guardar" 
            severity="success" 
            onClick={guardarReporte}
          />
        </div>
      </Dialog>

      {/* Modal para detalle */}
      <Dialog 
        header="Detalle de Visita" 
        visible={mostrarDetalle} 
        onHide={() => setMostrarDetalle(false)}
        style={{ width: '500px' }}
      >
        {visitaSeleccionada && (
          <div className="space-y-4">
            <div>
              <strong>Cliente:</strong> {visitaSeleccionada.clienteNombre}
            </div>
            <div>
              <strong>Fecha:</strong> {formatFechaVisita(visitaSeleccionada.fecha)}
            </div>
            <div>
              <strong>Horario:</strong> {visitaSeleccionada.horario}
            </div>
            <div>
              <strong>Estado:</strong> {visitaSeleccionada.estado}
            </div>
            <div>
              <strong>Resultado:</strong> {visitaSeleccionada.resultado || '-'}
            </div>
            {visitaSeleccionada.comentario && (
              <div>
                <strong>Comentario:</strong> {visitaSeleccionada.comentario}
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Modal para reprogramar */}
      <Dialog 
        header="Reprogramar Visita" 
        visible={mostrarReprogramar} 
        onHide={() => setMostrarReprogramar(false)}
        style={{ width: '400px' }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Fecha para reprogramar:</label>
            <Calendar 
              value={fechaReprogramar ? new Date(fechaReprogramar + 'T00:00:00') : null}
              onChange={(e) => setFechaReprogramar(e.value.toISOString().split('T')[0])}
              showIcon
              minDate={new Date()}
              className="w-full"
              dateFormat="dd/mm/yy"
            />
          </div>
          
          <div className="text-sm text-gray-600">
            <p>• Se guardará el reporte actual de la visita</p>
            <p>• Se creará una nueva visita para la fecha seleccionada</p>
            <p>• La nueva visita quedará en estado "Pendiente"</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button 
            label="Cancelar" 
            severity="secondary" 
            onClick={() => setMostrarReprogramar(false)}
          />
          <Button 
            label="Reprogramar y Guardar" 
            severity="success" 
            icon="pi pi-calendar-plus"
            onClick={reprogramarVisita}
          />
        </div>
      </Dialog>

      {/* Confirmación de eliminación */}
      <ConfirmDialog
        visible={mostrarConfirmacionEliminar}
        onHide={() => setMostrarConfirmacionEliminar(false)}
        message="¿Estás seguro de que quieres eliminar este programa de visitas? Esto eliminará todas las visitas programadas para este cliente."
        header="Confirmar Eliminación"
        icon="pi pi-exclamation-triangle"
        acceptClassName="p-button-danger"
        rejectClassName="p-button-light"
        accept={() => {
          if (programaAEliminar) {
            eliminarPrograma(programaAEliminar.id);
          }
          setMostrarConfirmacionEliminar(false);
        }}
        reject={() => setMostrarConfirmacionEliminar(false)}
      />
    </div>
  );
}
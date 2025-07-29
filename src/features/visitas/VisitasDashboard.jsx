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
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [visitaSeleccionada, setVisitaSeleccionada] = useState(null);
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
  
  const navigate = useNavigate();
  const toast = useRef(null);

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
        const url = esAdmin 
          ? '/api/visitas'
          : `/api/visitas?vendedorId=${sellerId}`;
        
        const res = await fetch(url);
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
    
    // Convertir la fecha del filtro a string YYYY-MM-DD
    const fechaFiltroStr = filtroFecha.toISOString().split('T')[0];
    
    return visitas.filter(visita => {
      // Convertir la fecha de la visita a string YYYY-MM-DD
      const fechaVisitaStr = visita.fecha;
      
      console.log('Comparando fechas:', { fechaVisitaStr, fechaFiltroStr });
      
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
      'sin_pedido': { label: 'Sin pedido', severity: 'warning' },
      'no_visito': { label: 'No visitó', severity: 'danger' }
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
          onClick={() => cancelarVisita(visita)}
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
      estado: 'realizada',
      resultado: 'pedido',
      comentario: ''
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
        ? '/api/visitas'
        : `/api/visitas?vendedorId=${sellerId}`;
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
        ? '/api/visitas'
        : `/api/visitas?vendedorId=${sellerId}`;
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
      const urlVisitas = esAdmin 
        ? '/api/visitas'
        : `/api/visitas?vendedorId=${getSellerId()}`;
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
      const urlVisitas = esAdmin 
        ? '/api/visitas'
        : `/api/visitas?vendedorId=${getSellerId()}`;
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
          dateFormat="dd/mm/yy"
        />
      </div>

      {/* Tabla de programas de visitas (solo admin) */}
      {esAdmin && (
        <Card className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Programas de Visitas</h3>
            <span className="text-sm text-gray-500">{programas.length} programas activos</span>
          </div>
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
        </Card>
      )}

      {/* Tabla de visitas */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Visitas Individuales</h3>
          <span className="text-sm text-gray-500">{visitasFiltradas.length} visitas para esta fecha</span>
        </div>
        <DataTable 
          value={visitasFiltradas} 
          paginator 
          rows={10}
          rowsPerPageOptions={[5, 10, 20]}
          emptyMessage="No hay visitas para esta fecha"
        >
          <Column field="clienteNombre" header="Cliente" sortable />
          <Column field="fecha" header="Fecha" sortable />
          <Column field="horario" header="Horario" />
          <Column field="estado" header="Estado" body={renderEstado} />
          <Column field="resultado" header="Resultado" body={renderResultado} />
          <Column header="Acciones" body={renderAcciones} />
        </DataTable>
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
                dateFormat="dd/mm/yy"
                className="w-full"
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
                value={new Date(programaEditado.fechaInicio)} 
                onChange={(e) => setProgramaEditado({...programaEditado, fechaInicio: e.value.toISOString().split('T')[0]})}
                showIcon
                dateFormat="dd/mm/yy"
                className="w-full"
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
              onChange={(e) => setReporteVisita({...reporteVisita, estado: e.value})}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Resultado:</label>
            <Dropdown
              value={reporteVisita.resultado}
              options={[
                { label: 'Pedido', value: 'pedido' },
                { label: 'Pago', value: 'pago' },
                { label: 'Sin pedido', value: 'sin_pedido' },
                { label: 'No visitó', value: 'no_visito' }
              ]}
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
              <strong>Fecha:</strong> {visitaSeleccionada.fecha}
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
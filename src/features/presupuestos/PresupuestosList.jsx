import React, { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { useNavigate } from "react-router-dom";
import { Card } from "primereact/card";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Toast } from "primereact/toast";
import { ProgressSpinner } from "primereact/progressspinner";
import { useRef } from "react";
import PresupuestoForm from "./PresupuestoForm";
import { getClientesCatalogo } from "../../services/firebase.js";
import { api } from "../../services/api";

function PresupuestosList({ user }) {
  const [presupuestos, setPresupuestos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("pendiente");
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [presupuestoDetalle, setPresupuestoDetalle] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [filtroCliente, setFiltroCliente] = useState(null);
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(null);
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(null);
  const [presupuestosFiltrados, setPresupuestosFiltrados] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPresupuesto, setEditingPresupuesto] = useState(null);
  const [activeTab, setActiveTab] = useState('todos'); // Estado para pestañas
  const [showFiltros, setShowFiltros] = useState(false); // Estado para mostrar/ocultar filtros
  const [isMobile, setIsMobile] = useState(false); // 🆕 Estado para detectar móvil
  const [expandedCards, setExpandedCards] = useState(new Set()); // 🆕 Estado para cards expandidos
  
  // 🆕 Estados para paginación
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  
  const toast = useRef(null);

  const estados = [
    { label: "Pendiente", value: "pendiente" },
    { label: "Facturado", value: "facturado" }
  ];
  const navigate = useNavigate();

  // 🆕 Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 🆕 Función para alternar expansión de cards
  const toggleCardExpansion = (presupuestoId) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(presupuestoId)) {
        newSet.delete(presupuestoId);
      } else {
        newSet.add(presupuestoId);
      }
      return newSet;
    });
  };

  // 🆕 Función para manejar acciones en móvil
  const handleMobileAction = (action, presupuesto) => {
    switch (action) {
      case 'ver':
        abrirDetalle(presupuesto);
        break;
      case 'editar':
        setEditingPresupuesto(presupuesto);
        setShowForm(true);
        break;
      case 'eliminar':
        if (window.confirm('¿Estás seguro de que quieres eliminar este presupuesto?')) {
          eliminarPresupuesto(presupuesto.id);
        }
        break;
      default:
        break;
    }
  };

  // 🆕 Componente Card para móvil
  const MobileCard = ({ presupuesto }) => {
    const isExpanded = expandedCards.has(presupuesto.id);
    
    // Calcular total de productos
    const getTotalProductos = () => {
      let itemsArray = null;
      if (Array.isArray(presupuesto.items)) {
        itemsArray = presupuesto.items;
      } else if (typeof presupuesto.items === 'string') {
        try {
          itemsArray = JSON.parse(presupuesto.items);
        } catch (error) {
          return 0;
        }
      } else if (presupuesto.items && typeof presupuesto.items === 'object') {
        itemsArray = Object.entries(presupuesto.items).map(([key, item]) => item);
      }
      return Array.isArray(itemsArray) ? itemsArray.length : 0;
    };

    // Calcular total monetario
    const getTotalMonetario = () => {
      let itemsArray = null;
      if (Array.isArray(presupuesto.items)) {
        itemsArray = presupuesto.items;
      } else if (typeof presupuesto.items === 'string') {
        try {
          itemsArray = JSON.parse(presupuesto.items);
        } catch (error) {
          return 0;
        }
      } else if (presupuesto.items && typeof presupuesto.items === 'object') {
        itemsArray = Object.entries(presupuesto.items).map(([key, item]) => item);
      }
      
      if (!Array.isArray(itemsArray)) return 0;
      
      return itemsArray.reduce((total, item) => {
        const prod = productos.find(p => p.id == item.producto);
        const precio = getPrecioGeneral(prod);
        const subtotal = item.cantidad * precio * (1 - (item.bonificacion || 0) / 100);
        return total + subtotal;
      }, 0);
    };

    // Obtener icono y color del estado
    const getEstadoInfo = () => {
      switch (presupuesto.estado) {
        case 'facturado':
          return { icon: '✅', color: 'text-green-600', label: 'Facturado' };
        case 'pendiente-alegra':
          return { icon: '⏳', color: 'text-yellow-600', label: 'Pendiente' };
        default:
          return { icon: '📋', color: 'text-blue-600', label: 'Sin facturar' };
      }
    };

    const estadoInfo = getEstadoInfo();

    return (
      <Card className="mb-3 shadow-sm border-1 border-gray-200">
        {/* Estado Cerrado */}
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-gray-500">📅 {formatFecha(presupuesto.fechaCreacion)}</span>
              <span className={`text-sm font-medium ${estadoInfo.color}`}>
                {estadoInfo.icon} {estadoInfo.label}
              </span>
            </div>
            <div className="font-medium text-gray-900">
              🏢 {getClienteNombre(presupuesto.clienteId)}
            </div>
            <div className="text-sm text-gray-600">
              💰 ${getTotalMonetario().toLocaleString('es-AR')}
            </div>
          </div>
          <Button
            icon={isExpanded ? "pi pi-chevron-up" : "pi pi-chevron-down"}
            className="p-button-text p-button-sm"
            onClick={() => toggleCardExpansion(presupuesto.id)}
          />
        </div>

        {/* Estado Expandido */}
        {isExpanded && (
          <div className="pt-3 border-t border-gray-200 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">👤 Vendedor:</span>
                <div className="font-medium">{getVendedorNombre(presupuesto.vendedor)}</div>
              </div>
              <div>
                <span className="text-gray-500">🛒 Productos:</span>
                <div className="font-medium">{getTotalProductos()} items</div>
              </div>
            </div>
            
            {presupuesto.observaciones && (
              <div>
                <span className="text-gray-500 text-sm">📝 Observaciones:</span>
                <div className="text-sm text-gray-700 mt-1">{presupuesto.observaciones}</div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-2 pt-2">
              <Button
                label="Ver detalles"
                icon="pi pi-eye"
                className="p-button-sm p-button-outlined"
                onClick={() => handleMobileAction('ver', presupuesto)}
              />
              <Button
                label="Editar"
                icon="pi pi-pencil"
                className="p-button-sm p-button-outlined"
                onClick={() => handleMobileAction('editar', presupuesto)}
              />
              {user.role === 'admin' && (
                <Button
                  label="Eliminar"
                  icon="pi pi-trash"
                  className="p-button-sm p-button-danger p-button-outlined"
                  onClick={() => handleMobileAction('eliminar', presupuesto)}
                />
              )}
            </div>
          </div>
        )}
      </Card>
    );
  };

  // 🆕 Componente Layout para móvil
  const MobileLayout = () => (
    <div className="space-y-2">
      {presupuestosFiltrados.map((presupuesto) => (
        <MobileCard key={presupuesto.id} presupuesto={presupuesto} />
      ))}
    </div>
  );

  // 🆕 Componente Layout para desktop
  const DesktopLayout = () => (
    <DataTable 
      value={presupuestosFiltrados}
      paginator 
      rows={rowsPerPage}
      rowsPerPageOptions={[10, 20, 50, 100]}
      className="p-datatable-sm"
      emptyMessage="No hay pedidos para mostrar"
      lazy
      first={(currentPage - 1) * rowsPerPage}
      totalRecords={pagination.total}
      onPage={onPageChange}
      onRowsPerPageChange={onRowsPerPageChange}
      loading={loading}
    >
      <Column field="fechaCreacion" header="Fecha" body={row => {
        const camposFecha = ['fechaCreacion', 'fecha', 'timestamp', 'date', 'createdAt', 'fechaCreacionTimestamp'];
        let fecha = null;
        
        for (const campo of camposFecha) {
          if (row[campo]) {
            fecha = row[campo];
            break;
          }
        }
        
        return formatFecha(fecha);
      }} />
      <Column field="clienteId" header="Cliente" body={row => getClienteNombre(row.clienteId)} />
      <Column field="estado" header="Estado" body={row => {
         let label = row.estado === 'facturado' ? 'Facturada' : 'Sin facturar';
         let severity = row.estado === 'facturado' ? 'success' : (row.estado === 'pendiente-alegra' ? 'warning' : 'info');
         return <Tag value={label} severity={severity} />;
        }} />
      <Column field="vendedor" header="Usuario" body={row => getVendedorNombre(row.vendedor)} />
      <Column header="Acciones" body={row => <Button label="Ver" icon="pi pi-eye" className="p-button-text" onClick={() => abrirDetalle(row)} />} />
      {user.role === 'admin' && (
        <Column header="Eliminar" body={row => <Button icon="pi pi-trash" className="p-button-danger p-button-text" onClick={() => eliminarPresupuesto(row.id)} />} />
      )}
    </DataTable>
  );

  // Cargar clientes y productos de Firestore para mostrar nombres
  useEffect(() => {
    async function fetchCatalogos() {
      try {
        const clientesData = await api.getClientesFirebase();
        setClientes(clientesData);
        const productosData = await api.getProductosFirebase();
        setProductos(productosData);
      } catch {}
    }
    fetchCatalogos();
  }, []);

  // Cargar presupuestos desde Firestore (sin consultar Alegra)
  useEffect(() => {
    async function fetchPresupuestos() {
      setLoading(true);
      try {
        // 🆕 Construir parámetros para la API con paginación
        const params = {
          page: currentPage,
          limit: rowsPerPage
        };
        
        // 🆕 Agregar filtros si están activos
        if (activeTab !== 'todos') {
          if (activeTab === 'facturados') {
            params.estado = 'facturado';
          } else if (activeTab === 'sin-facturar') {
            params.estado = 'pendiente';
          }
        }
        
        if (filtroCliente) {
          params.clienteId = filtroCliente;
        }
        
        if (filtroFechaDesde) {
          params.fechaDesde = filtroFechaDesde.toISOString().split('T')[0];
        }
        
        if (filtroFechaHasta) {
          params.fechaHasta = filtroFechaHasta.toISOString().split('T')[0];
        }
        
        const response = await api.getPresupuestos(user.email, user.role, params);
        
        // 🆕 Extraer datos y paginación de la respuesta
        const { data, pagination: paginationData } = response;
        
        // Limpiar datos antes de establecer el estado
        const datosLimpios = limpiarDatosParaRender(data);
        setPresupuestos(datosLimpios);
        setPresupuestosFiltrados(datosLimpios);
        setPagination(paginationData);
        
        console.log(`🆕 Presupuestos cargados: ${datosLimpios.length} de ${paginationData.total} total`);
        console.log(`🆕 Página ${paginationData.page} de ${paginationData.totalPages}`);
      } catch (err) {
        console.error('Error cargando presupuestos:', err);
        setPresupuestos([]);
        setPresupuestosFiltrados([]);
      } finally {
        setLoading(false);
      }
    }
    if (user?.email && user?.role) fetchPresupuestos();
  }, [user, currentPage, rowsPerPage, activeTab, filtroCliente, filtroFechaDesde, filtroFechaHasta]);

  // 🆕 Función para limpiar filtros
  const limpiarFiltros = () => {
    setFiltroCliente(null);
    setFiltroFechaDesde(null);
    setFiltroFechaHasta(null);
    setCurrentPage(1); // Resetear a la primera página
  };

  // 🆕 Función para cambiar página
  const onPageChange = (event) => {
    setCurrentPage(event.page + 1);
  };

  // 🆕 Función para cambiar filas por página
  const onRowsPerPageChange = (event) => {
    setRowsPerPage(event.value);
    setCurrentPage(1); // Resetear a la primera página
  };

  // Aplicar filtros cuando cambien
  useEffect(() => {
    // Los filtros ahora se aplican en el servidor, por lo que esta función ya no es necesaria.
    // setPresupuestosFiltrados(filtradas); // Esto ya no es necesario
  }, [presupuestos, filtroCliente, filtroFechaDesde, filtroFechaHasta, activeTab]);

  // 🆕 Cargar clientes para el filtro
  const cargarClientes = async () => {
    try {
      const data = await getClientesCatalogo(); // Usar caché como en otros componentes
      
      // Filtrar clientes según el rol del usuario
      let clientesFiltrados = data;
      if (user.role !== 'admin') {
        const sellerId = user.role === 'Guille' ? "1" : "2"; // Asegurar string comparison
        clientesFiltrados = data.filter(cliente => {
          if (cliente.seller && cliente.seller.id) {
            return cliente.seller.id === sellerId;
          }
          return false;
        });
      }
      
      // Ordenar alfabéticamente por nombre
      const clientesOrdenados = clientesFiltrados.sort((a, b) => {
        const nombreA = (a.name || a.nombre || a['Razón Social'] || '').toLowerCase();
        const nombreB = (b.name || b.nombre || b['Razón Social'] || '').toLowerCase();
        return nombreA.localeCompare(nombreB);
      });
      
      setClientes(clientesOrdenados);
    } catch (error) {
      // Error cargando clientes
    }
  };

  useEffect(() => {
    if (user?.role) {
      cargarClientes();
    }
  }, [user]);

  const filtered = filtroEstado
    ? presupuestos.filter(p => p.estado === filtroEstado)
    : presupuestos;

  // Obtener nombre de cliente
  const getClienteNombre = (id) => {
    const c = clientes.find(c => c.id == id);
    return c ? c.name : id;
  };
  // Obtener nombre de producto
  const getProductoNombre = (id) => {
    const p = productos.find(p => p.id == id);
    return p ? p.name : id;
  };
  // Obtener nombre de vendedor
  const getVendedorNombre = (v) => v === 1 ? "Guille" : v === 2 ? "Santi" : v;
  const getPrecioGeneral = (prod) => {
    if (!prod || !Array.isArray(prod.price)) return 0;
    const general = prod.price.find(p => p.name === "General");
    return general?.price || 0;
  };

  // Mostrar detalle en modal
  const handleVerDetalle = (row) => {
    setDetalle(row);
    setModalVisible(true);
  };

  const abrirDetalle = (presupuesto) => {
    setPresupuestoDetalle(presupuesto);
    setNuevoEstado(presupuesto.estado);
    setModalVisible(true);
  };

  const cambiarEstado = async () => {
    if (!presupuestoDetalle) return;
    await api.updatePresupuesto(presupuestoDetalle.id, { estado: nuevoEstado });
    setPresupuestos(prev => prev.map(p => p.id === presupuestoDetalle.id ? { ...p, estado: nuevoEstado } : p));
    setModalVisible(false);
  };

  // Eliminar presupuesto
  const eliminarPresupuesto = async (id) => {
    await api.deletePresupuesto(id);
    setPresupuestos(prev => prev.filter(p => p.id !== id));
  };

  // Sincronizar estados manualmente
  const sincronizarEstados = async () => {
    await api.syncEstadosPresupuestos();
    // Refrescar lista
    if (user?.email && user?.role) {
      setLoading(true);
      const data = await api.getPresupuestos(user.email, user.role);
      setPresupuestos(data);
      setLoading(false);
    }
  };

  // Utilidad para formatear fecha en formato DD/MM/YYYY
  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    
    try {
      let fechaObj = null;
      
      // Si es un string en formato DD/MM/YY (formato de Alegra)
      if (typeof fecha === 'string' && fecha.includes('/')) {
        const partes = fecha.split('/');
        if (partes.length === 3) {
          const dia = parseInt(partes[0]);
          const mes = parseInt(partes[1]) - 1; // Meses en JS van de 0-11
          const año = parseInt(partes[2]);
          // Asumir siglo 20xx si el año tiene 2 dígitos
          const añoCompleto = año < 100 ? 2000 + año : año;
          fechaObj = new Date(añoCompleto, mes, dia);
        }
      }
      // Si es un objeto de Firestore Timestamp con _seconds
      else if (fecha && typeof fecha === 'object' && fecha._seconds !== undefined) {
        fechaObj = new Date(fecha._seconds * 1000);
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
      // Si es un string o número (formato estándar)
      else if (typeof fecha === 'string' || typeof fecha === 'number') {
        // 🆕 Para fechas de Alegra, usar UTC para evitar problemas de zona horaria
        if (typeof fecha === 'string' && fecha.includes('T')) {
          // Es una fecha ISO de Alegra, usar UTC
          fechaObj = new Date(fecha + 'Z'); // Asegurar que sea UTC
        } else {
          fechaObj = new Date(fecha);
        }
      }
      
      if (fechaObj && !isNaN(fechaObj.getTime())) {
        // 🆕 Usar UTC para evitar problemas de zona horaria
        const dia = fechaObj.getUTCDate().toString().padStart(2, '0');
        const mes = (fechaObj.getUTCMonth() + 1).toString().padStart(2, '0');
        const año = fechaObj.getUTCFullYear().toString();
        const resultado = `${dia}/${mes}/${año}`;
        return resultado;
      }
      
      return '-';
    } catch (error) {
      return '-';
    }
  };

  // 🆕 Función para limpiar datos antes de renderizar
  const limpiarDatosParaRender = (datos) => {
    return datos.map(presupuesto => {
      const presupuestoLimpio = { ...presupuesto };
      
      // Asegurarse de que todos los campos sean strings o números
      Object.keys(presupuestoLimpio).forEach(key => {
        const valor = presupuestoLimpio[key];
        
        // Si es null o undefined, convertirlo a string
        if (valor === null || valor === undefined) {
          presupuestoLimpio[key] = '-';
          return;
        }
        
        // Si ya es string o número, dejarlo como está
        if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') {
          return;
        }
        
        // Si es un objeto, convertirlo
        if (typeof valor === 'object') {
          
          // Si es un timestamp de Firestore, convertirlo a string con formato unificado
          if (valor._seconds !== undefined || valor.seconds !== undefined || typeof valor.toDate === 'function') {
            presupuestoLimpio[key] = formatFecha(valor);
          } else {
            // Para cualquier otro objeto, convertirlo a string
            presupuestoLimpio[key] = JSON.stringify(valor);
          }
        }
      });
      
      return presupuestoLimpio;
    });
  };

  return (
    <div className="p-4">
      <Toast ref={toast} />
      
      {/* Header con acciones */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">Presupuestos - {user.role}</h2>
          <p className="text-sm text-gray-600 mt-1">
            📅 Solo se muestran presupuestos de los últimos 7 días
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            label="Nuevo Presupuesto" 
            icon="pi pi-plus" 
            severity="success"
            onClick={() => setShowForm(true)}
          />
          <Button 
            label="Sincronizar Estados" 
            icon="pi pi-refresh" 
            severity="info"
            onClick={sincronizarEstados}
          />
        </div>
      </div>

      {/* PESTAÑAS */}
      <div className="flex mb-4 border-b border-gray-200">
        <Button
          label="Todos"
          className={`p-button-text ${activeTab === 'todos' ? 'p-button-primary border-bottom-2 border-primary' : ''}`}
          onClick={() => setActiveTab('todos')}
        />
        <Button
          label="Sin Facturar"
          className={`p-button-text ${activeTab === 'sin-facturar' ? 'p-button-primary border-bottom-2 border-primary' : ''}`}
          onClick={() => setActiveTab('sin-facturar')}
        />
        <Button
          label="Facturados"
          className={`p-button-text ${activeTab === 'facturados' ? 'p-button-primary border-bottom-2 border-primary' : ''}`}
          onClick={() => setActiveTab('facturados')}
        />
      </div>

      {/* BOTONES DE FILTROS */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Button
            label={showFiltros ? "Ocultar Filtros" : "Mostrar Filtros"}
            icon={showFiltros ? "pi pi-eye-slash" : "pi pi-filter"}
            onClick={() => setShowFiltros(!showFiltros)}
            className="p-button-outlined p-button-sm"
          />
          {(filtroCliente || filtroFechaDesde || filtroFechaHasta) && (
            <Button
              label="Limpiar Filtros"
              icon="pi pi-times"
              onClick={limpiarFiltros}
              className="p-button-secondary p-button-sm"
            />
          )}
        </div>
      </div>

      {/* SECCIÓN DE FILTROS (DESPLEGABLE) */}
      {showFiltros && (
        <Card className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro por Cliente */}
            <div className="flex flex-col">
              <label className="mb-2 font-semibold">Cliente</label>
              <Dropdown
                value={filtroCliente}
                options={clientes.map(c => ({ 
                  label: c.name || c.nombre || c['Razón Social'] || c.id || '(Sin nombre)', 
                  value: c.name || c.nombre || c['Razón Social'] || c.id 
                }))}
                onChange={(e) => setFiltroCliente(e.value)}
                placeholder="Seleccionar cliente"
                showClear
                filter
                filterPlaceholder="Buscar cliente..."
                className="w-full"
              />
            </div>

            {/* Filtro por Fecha Desde */}
            <div className="flex flex-col">
              <label className="mb-2 font-semibold">Fecha Desde</label>
              <Calendar
                value={filtroFechaDesde}
                onChange={(e) => setFiltroFechaDesde(e.value)}
                showIcon
                dateFormat="dd/mm/yyyy"
                placeholder="Seleccionar fecha"
                className="w-full"
              />
            </div>

            {/* Filtro por Fecha Hasta */}
            <div className="flex flex-col">
              <label className="mb-2 font-semibold">Fecha Hasta</label>
              <Calendar
                value={filtroFechaHasta}
                onChange={(e) => setFiltroFechaHasta(e.value)}
                showIcon
                dateFormat="dd/mm/yyyy"
                placeholder="Seleccionar fecha"
                className="w-full"
              />
            </div>
          </div>

          {/* RESUMEN DE FILTROS */}
          <div className="mt-3 text-sm text-gray-600">
            Mostrando {presupuestosFiltrados.length} de {pagination.total} pedidos
            {(filtroCliente || filtroFechaDesde || filtroFechaHasta) && (
              <span className="ml-2 text-blue-600">
                (filtros activos)
              </span>
            )}
            <span className="ml-2 text-gray-500">
              Página {pagination.page} de {pagination.totalPages}
            </span>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <ProgressSpinner />
        </div>
      ) : (
        <>
          {isMobile ? (
            <MobileLayout />
          ) : (
            <DesktopLayout />
          )}

          <Dialog header="Detalle de Presupuesto" visible={modalVisible} style={{ width: '500px' }} onHide={() => setModalVisible(false)}>
            {detalle && (
              <div>
                <p><b>Cliente:</b> {getClienteNombre(detalle.clienteId)}</p>
                <p><b>Estado:</b> {detalle.estado}</p>
                <p><b>Fecha:</b> {formatFecha(detalle.fechaCreacion)}</p>
                <p><b>Observaciones:</b> {detalle.observaciones || '-'}</p>
                <p><b>Productos:</b></p>
                <ul>
                  {(() => {
                    let itemsArray = null;
                    
                    // Si items es un array, usarlo directamente
                    if (Array.isArray(detalle.items)) {
                      itemsArray = detalle.items;
                    }
                    // Si items es un string JSON, parsearlo
                    else if (typeof detalle.items === 'string') {
                      try {
                        itemsArray = JSON.parse(detalle.items);
                      } catch (error) {
                        console.error('Error parsing items JSON:', error);
                      }
                    }
                    // Si items es un objeto, convertirlo a array
                    else if (detalle.items && typeof detalle.items === 'object') {
                      itemsArray = Object.entries(detalle.items).map(([key, item]) => item);
                    }
                    
                    if (Array.isArray(itemsArray) && itemsArray.length > 0) {
                      return itemsArray.map((item, idx) => (
                        <li key={idx}>{getProductoNombre(item.producto)} - Cantidad: {item.cantidad}</li>
                      ));
                    } else {
                      return <li>No hay productos disponibles o la estructura de datos no es válida</li>;
                    }
                  })()}
                </ul>
              </div>
            )}
          </Dialog>

          <Dialog header="Detalle de Presupuesto" visible={modalVisible} style={{ width: 600 }} onHide={() => setModalVisible(false)}>
            {presupuestoDetalle && (
              <div>
                <div><b>Cliente:</b> {getClienteNombre(presupuestoDetalle.clienteId)}</div>
                <div><b>Vendedor:</b> {getVendedorNombre(presupuestoDetalle.vendedor)}</div>
                <div><b>Fecha:</b> {formatFecha(presupuestoDetalle.fechaCreacion)}</div>
                <div><b>Estado:</b> {presupuestoDetalle.estado}</div>
                {/* Mostrar factura asociada si está facturado */}
                {presupuestoDetalle.estado === 'facturado' && Array.isArray(presupuestoDetalle.facturaAlegra) && presupuestoDetalle.facturaAlegra.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <b>Factura asociada:</b>
                    <ul>
                      {presupuestoDetalle.facturaAlegra.map((fact, idx) => (
                        <li key={idx}>
                          N°: {fact.number || fact.id || '-'}
                          {fact.date ? ` - Fecha: ${new Date(fact.date).toLocaleDateString()}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div style={{ marginTop: 10 }}>
                  <b>Productos:</b>
                  <ul>
                    {(() => {
                      let itemsArray = null;
                      
                      // Si items es un array, usarlo directamente
                      if (Array.isArray(presupuestoDetalle.items)) {
                        itemsArray = presupuestoDetalle.items;
                      }
                      // Si items es un string JSON, parsearlo
                      else if (typeof presupuestoDetalle.items === 'string') {
                        try {
                          itemsArray = JSON.parse(presupuestoDetalle.items);
                        } catch (error) {
                          console.error('Error parsing items JSON:', error);
                        }
                      }
                      // Si items es un objeto, convertirlo a array
                      else if (presupuestoDetalle.items && typeof presupuestoDetalle.items === 'object') {
                        itemsArray = Object.entries(presupuestoDetalle.items).map(([key, item]) => item);
                      }
                      
                      if (Array.isArray(itemsArray) && itemsArray.length > 0) {
                        return itemsArray.map((item, idx) => {
                          const prod = productos.find(p => p.id == item.producto);
                          const precio = getPrecioGeneral(prod);
                          const subtotal = item.cantidad * precio * (1 - (item.bonificacion || 0) / 100);
                          return (
                            <li key={idx}>
                              {getProductoNombre(item.producto)} - Cantidad: {item.cantidad} - Bonificación: {item.bonificacion || 0}% - Precio: {precio.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })} - Subtotal: {subtotal.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                            </li>
                          );
                        });
                      } else {
                        return <li>No hay productos disponibles o la estructura de datos no es válida. Tipo de items: {typeof presupuestoDetalle.items}</li>;
                      }
                    })()}
                  </ul>
                </div>
                <div style={{ marginTop: 10 }}><b>Observaciones:</b> {presupuestoDetalle.observaciones}</div>
                {/* Eliminar opción de cambiar estado manualmente */}
              </div>
            )}
          </Dialog>
        </>
      )}

      {/* Formulario de Presupuesto */}
      <Dialog 
        visible={showForm} 
        onHide={() => {
          setShowForm(false);
          setEditingPresupuesto(null);
        }}
        header={editingPresupuesto ? "Editar Pedido" : "Nuevo Pedido"}
        style={{ width: '90vw', maxWidth: '800px' }}
        modal
      >
        <PresupuestoForm 
          presupuesto={editingPresupuesto}
          onSave={(presupuesto) => {
            setShowForm(false);
            setEditingPresupuesto(null);
            // Recargar la lista
            fetchPresupuestos();
            toast.current?.show({
              severity: 'success',
              summary: 'Éxito',
              detail: editingPresupuesto ? 'Pedido actualizado' : 'Pedido creado'
            });
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingPresupuesto(null);
          }}
          user={user}
        />
      </Dialog>
    </div>
  );
}

export default PresupuestosList; 
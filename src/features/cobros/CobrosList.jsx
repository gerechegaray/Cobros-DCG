import React, { useEffect, useState, useRef } from "react";
import { db } from "../../services/firebase";
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { getClientesCatalogo } from '../../services/firebase';
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Card } from "primereact/card";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { ProgressSpinner } from "primereact/progressspinner";
import { Dialog } from "primereact/dialog";
import { api } from "../../services/api";

function CobrosList({ user, showOnlyMyCobros = false, onNavigateToDashboard }) {
  const [cobros, setCobros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const toast = useRef(null);
  const [clientesCatalogo, setClientesCatalogo] = useState([]);
  const [loadingClientesCatalogo, setLoadingClientesCatalogo] = useState(true);
  const [catalogoCargado, setCatalogoCargado] = useState(false);

  // Estados para filtros
  const [filtroCliente, setFiltroCliente] = useState(null);
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(null);
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(null);
  const [cobranzasFiltradas, setCobranzasFiltradas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [showFiltros, setShowFiltros] = useState(false);

  // Estado para móvil
  const [isMobile, setIsMobile] = useState(false);
  const [expandedCards, setExpandedCards] = useState(new Set());

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

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchCobranzas = async (force = false) => {
    setLoading(true);
    try {
      console.log(`🔍 Usuario actual:`, { role: user.role, email: user.email });
      
      // 🆕 Construir parámetros para la API con paginación
      const params = {
        page: currentPage,
        limit: rowsPerPage
      };
      
      // 🆕 Agregar filtros si están activos
      if (filtroCliente) {
        params.clienteId = filtroCliente;
      }
      
      if (filtroFechaDesde) {
        params.fechaDesde = filtroFechaDesde.toISOString().split('T')[0];
      }
      
      if (filtroFechaHasta) {
        params.fechaHasta = filtroFechaHasta.toISOString().split('T')[0];
      }
      
      // 🆕 Agregar filtro por cobrador si no es admin (igual que en dashboard)
      if (user.role !== 'admin') {
        // Usar el mismo filtrado que en dashboard: por campo cobrador
        params.cobrador = user.role;
        console.log(`🔍 Aplicando filtro de cobrador: ${user.role} -> cobrador: ${user.role}`);
      }
      
      console.log(`🔍 Parámetros de búsqueda:`, params);
      const response = await api.getCobros(params);
      
      // 🆕 Extraer datos y paginación de la respuesta
      const { data, pagination: paginationData } = response;
      
      console.log(`🔍 Respuesta de la API:`, { data: data?.length || 0, pagination: paginationData });
      console.log(`🔍 Datos crudos:`, data);
      
      // Limpiar datos antes de establecer el estado
      const datosLimpios = limpiarDatosParaRender(data);
      setCobros(datosLimpios);
      setCobranzasFiltradas(datosLimpios);
      setPagination(paginationData);
      
      console.log(`🆕 Cobros cargados: ${datosLimpios.length} de ${paginationData.total} total`);
      console.log(`🆕 Página ${paginationData.page} de ${paginationData.totalPages}`);
    } catch (error) {
      console.error('Error cargando cobros:', error);
      setCobros([]);
      setCobranzasFiltradas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 🆕 Limpiar caché para forzar recarga
    localStorage.removeItem("cobranzas_list");
    fetchCobranzas(true);
  }, [currentPage, rowsPerPage, filtroCliente, filtroFechaDesde, filtroFechaHasta]);

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

  // 🆕 Función unificada para formatear fechas en DD/MM/YYYY
  const formatFechaUnificada = (fecha) => {
    if (!fecha) return '-';
    
    try {
      // 🆕 Si ya es un string en formato dd/mm/aaaa, devolverlo tal como está
      if (typeof fecha === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
        return fecha;
      }
      
      let fechaObj = null;
      
      // Si es un objeto de Firestore Timestamp con _seconds
      if (fecha && typeof fecha === 'object' && fecha._seconds !== undefined) {
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
      // Si es un string o número
      else if (typeof fecha === 'string' || typeof fecha === 'number') {
        fechaObj = new Date(fecha);
      }
      
      if (fechaObj && !isNaN(fechaObj.getTime())) {
        // Formato DD/MM/YYYY
        const dia = fechaObj.getDate().toString().padStart(2, '0');
        const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
        const año = fechaObj.getFullYear().toString(); // Año completo con 4 dígitos
        return `${dia}/${mes}/${año}`;
      }
      
      return '-';
    } catch (error) {
      return '-';
    }
  };

  // 🆕 Función para limpiar datos antes de renderizar
  const limpiarDatosParaRender = (datos) => {
    return datos.map(cobro => {
      const cobroLimpio = { ...cobro };
      
      // Asegurarse de que todos los campos sean strings o números
      Object.keys(cobroLimpio).forEach(key => {
        const valor = cobroLimpio[key];
        
        // Si es null o undefined, convertirlo a string
        if (valor === null || valor === undefined) {
          cobroLimpio[key] = '-';
          return;
        }
        
        // Si ya es string o número, dejarlo como está
        if (typeof valor === 'string' || typeof valor === 'number') {
          return;
        }
        
        // Si es boolean, mantenerlo como boolean (no convertir a string)
        if (typeof valor === 'boolean') {
          return;
        }
        
        // Si es un objeto, convertirlo
        if (typeof valor === 'object') {
  
          
          // Si es un timestamp de Firestore, convertirlo a string con formato unificado
          if (valor._seconds !== undefined || valor.seconds !== undefined || typeof valor.toDate === 'function') {
            cobroLimpio[key] = formatFechaUnificada(valor);
          } else {
            // Para cualquier otro objeto, convertirlo a string
            cobroLimpio[key] = JSON.stringify(valor);
          }
        }
      });
      
      return cobroLimpio;
    });
  };

  // Cargar clientes para el filtro usando caché
  const cargarClientes = async () => {
    try {
      const data = await getClientesCatalogo();
      
      // Filtrar clientes según el rol del usuario
      let clientesFiltrados = data;
      if (user.role !== 'admin') {
        let sellerId;
        if (user.role === 'Guille') {
          sellerId = 1;
        } else if (user.role === 'Santi') {
          sellerId = 2;
        } else {
          // Si no es un rol conocido, no aplicar filtro
          console.warn(`Rol de usuario no reconocido para filtro de clientes: ${user.role}`);
        }
        
        if (sellerId) {
          clientesFiltrados = data.filter(cliente => {
            if (cliente.seller && cliente.seller.id) {
              return cliente.seller.id === sellerId.toString();
            }
            return false;
          });
        }
      }
      
      // Convertir a formato para dropdown
      const options = clientesFiltrados
        .slice()
        .sort((a, b) => ((a.name || a.nombre || a['Razón Social'] || '').localeCompare(b.name || b.nombre || b['Razón Social'] || '')))
        .map((c) => ({ 
          label: c.name || c.nombre || c['Razón Social'] || c.id || '(Sin nombre)', 
          value: c.name || c.nombre || c['Razón Social'] || c.id 
        }));
      
      setClientes(options);
    } catch (error) {
      // Error cargando clientes
    }
  };

  useEffect(() => {
    cargarClientes();
  }, [user.role]);

  // Cargar catálogo de clientes
  useEffect(() => {
    async function fetchClientesCatalogo() {
      try {
        const data = await getClientesCatalogo();
        setClientesCatalogo(data);
        setCatalogoCargado(true);
      } catch (error) {
        // Error al obtener clientes de Firestore
      } finally {
        setLoadingClientesCatalogo(false);
      }
    }
    fetchClientesCatalogo();
  }, []);

  // Agregar función para obtener razón social
  const getRazonSocial = (clienteId) => {
    if (!clienteId) return '-';
    
    // Si el clienteId ya es un nombre completo (contiene espacios), devolverlo tal como está
    if (typeof clienteId === 'string' && clienteId.includes(' ')) {
      return clienteId;
    }
    
    // Para códigos numéricos o IDs, intentar buscar en el catálogo
    if (catalogoCargado && clientesCatalogo.length > 0) {
      // Buscar por id exacto
      let cliente = clientesCatalogo.find(c => c.id === clienteId);
      
      // Si no se encuentra por id, buscar por otros campos
      if (!cliente) {
        cliente = clientesCatalogo.find(c => 
          c.name === clienteId || 
          c.nombre === clienteId || 
          c['Razón Social'] === clienteId
        );
      }
      
      // Si se encuentra el cliente, devolver su razón social
      if (cliente) {
        return cliente['Razón Social'] || cliente.name || cliente.nombre || clienteId;
      }
    }
    
    // Si no se encuentra, devolver el ID tal como está
    return String(clienteId);
  };

  const formatMonto = (monto) => {
    if (!monto || isNaN(monto)) {
      return "$0";
    }
    const resultado = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(monto);
    return resultado;
  };

  // 🆕 Función para validar y formatear cualquier valor
  const safeRender = (value, formatter = null) => {
    // Si es null o undefined
    if (value === null || value === undefined) return '-';
    
    // Si es un objeto (incluyendo Firestore Timestamps)
    if (typeof value === 'object' && value !== null) {
      
      // Si es un timestamp de Firestore, usar formato unificado
      if (value._seconds !== undefined || value.seconds !== undefined || typeof value.toDate === 'function') {
        return formatFechaUnificada(value);
      }
      
      // Si hay un formatter personalizado
      if (formatter) {
        try {
          return formatter(value);
        } catch (error) {
          return '[Error]';
        }
      }
      
      // Si no hay formatter, mostrar información del objeto
      return `[${Object.keys(value).join(', ')}]`;
    }
    
    // Si es un string, número, boolean, etc.
    return String(value);
  };

  const updateCargadoStatus = async (cobroId, newStatus) => {
    setUpdatingId(cobroId);
    try {
      // 🆕 Usar la nueva API
      await api.updateCobro(cobroId, {
        cargado: newStatus
      });
      
      toast.current.show({ 
        severity: 'success', 
        summary: 'Actualizado', 
        detail: `Estado actualizado a: ${newStatus ? 'Cargado' : 'No cargado'}` 
      });
      
      // Recargar datos
      fetchCobranzas();
    } catch (error) {
      console.error('Error actualizando cobro:', error);
      toast.current.show({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'Error al actualizar el estado' 
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // 🆕 Función para eliminar cobro (solo admin)
  const deleteCobro = async (cobroId) => {
    setUpdatingId(cobroId);
    try {
      // 🆕 Usar la nueva API
      await api.deleteCobro(cobroId);
      
      toast.current.show({ 
        severity: 'success', 
        summary: 'Eliminado', 
        detail: 'Cobranza eliminada correctamente' 
      });
      
      // Recargar datos
      fetchCobranzas();
    } catch (error) {
      console.error('Error eliminando cobro:', error);
      toast.current.show({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'Error al eliminar la cobranza' 
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // 🆕 Funciones para manejo de cards móviles
  const toggleCardExpansion = (cobroId) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cobroId)) {
      newExpanded.delete(cobroId);
    } else {
      newExpanded.add(cobroId);
    }
    setExpandedCards(newExpanded);
  };

  const handleMobileAction = (action, cobroId) => {
    if (action === 'toggleStatus') {
      const cobro = cobranzasFiltradas.find(c => c.id === cobroId);
      if (cobro) {
        if (cobro.cargado) {
          confirmDialog({
            message: '¿Marcar como NO cargado?',
            header: 'Confirmar cambio',
            icon: 'pi pi-exclamation-triangle',
            accept: () => updateCargadoStatus(cobroId, false)
          });
        } else {
          updateCargadoStatus(cobroId, true);
        }
      }
    } else if (action === 'delete') {
      confirmDialog({
        message: '¿Estás seguro de que quieres eliminar esta cobranza?',
        header: 'Confirmar eliminación',
        icon: 'pi pi-exclamation-triangle',
        accept: () => deleteCobro(cobroId)
      });
    }
  };

  // 🆕 Componente para card móvil
  const MobileCard = ({ cobro }) => {
    const isExpanded = expandedCards.has(cobro.id);
    
    return (
      <Card className="mb-3 shadow-sm border-1 border-gray-200">
        <div className="space-y-3">
          {/* Estado Cerrado */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">📅 {cobro.fecha}</span>
            </div>
            <div className="text-sm font-medium text-gray-900">
              🏢 {getRazonSocial(cobro.cliente)}
            </div>
            <div className="text-sm font-bold text-green-600">
              💰 {formatMonto(cobro.monto)}
            </div>
            <div className="flex justify-between items-center">
              <Tag 
                value={cobro.cargado ? "Cargado" : "No cargado"} 
                severity={cobro.cargado ? "success" : "danger"}
                className="text-xs"
              />
              <Button 
                icon={isExpanded ? "pi pi-chevron-up" : "pi pi-chevron-down"}
                onClick={() => toggleCardExpansion(cobro.id)} 
                className="p-button-text p-button-sm"
              />
            </div>
          </div>
          
          {/* Estado Expandido */}
          {isExpanded && (
            <div className="pt-3 border-t border-gray-200 space-y-3">
              <div className="text-sm text-gray-700">
                👤 <span className="font-medium">Cobrador:</span> {cobro.cobrador || '-'}
              </div>
              <div className="text-sm text-gray-700">
                💳 <span className="font-medium">Forma:</span> {cobro.forma || '-'}
              </div>
              
              {/* Botones de acción */}
              {user?.role === "admin" && (
                <div className="flex flex-col gap-2 pt-2">
                  <Button 
                    label={cobro.cargado ? "Marcar como no cargado" : "Marcar como cargado"}
                    icon={cobro.cargado ? "pi pi-times" : "pi pi-check"}
                    className={`p-button-sm ${cobro.cargado ? 'p-button-danger' : 'p-button-success'}`}
                    loading={updatingId === cobro.id}
                    onClick={() => handleMobileAction('toggleStatus', cobro.id)}
                  />
                  <Button 
                    label="Eliminar cobranza"
                    icon="pi pi-trash"
                    className="p-button-sm p-button-danger"
                    loading={updatingId === cobro.id}
                    onClick={() => handleMobileAction('delete', cobro.id)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  // 🆕 Componente para layout de escritorio
  const DesktopLayout = () => (
    <div className="overflow-x-auto">
      <DataTable 
        value={cobranzasFiltradas}
        paginator 
        rows={rowsPerPage}
        rowsPerPageOptions={[10, 20, 50, 100]}
        className="p-datatable-sm"
        emptyMessage="No hay cobranzas para mostrar"
        responsiveLayout="scroll"
        showGridlines
        stripedRows
        size="small"
        removableSort
        sortMode="multiple"
        lazy
        first={(currentPage - 1) * rowsPerPage}
        totalRecords={pagination.total}
        onPage={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        loading={loading}
      >
        <Column field="fecha" header="Fecha" sortable style={{ minWidth: '85px', maxWidth: '100px' }}>
          {(rowData) => (
            <span className="text-xs md:text-sm font-medium">
              {rowData.fecha || '-'}
            </span>
          )}
        </Column>
        
        <Column field="cliente" header="Cliente" sortable style={{ minWidth: '140px' }}>
          {(rowData) => (
            <div className="flex flex-col">
              <span className="text-xs md:text-sm font-medium text-gray-900">
                {getRazonSocial(rowData.cliente)}
              </span>
            </div>
          )}
        </Column>
        
        <Column field="monto" header="Monto" sortable style={{ minWidth: '110px' }}
          body={(rowData) => {
            return (
              <span className="font-bold text-xs md:text-sm text-green-700">
                {formatMonto(rowData.monto)}
              </span>
            );
          }}
        />
        
        <Column field="cobrador" header="Cobrador" sortable style={{ minWidth: '85px' }}>
          {(rowData) => (
            <span className="text-xs md:text-sm text-gray-700">
              {rowData.cobrador || '-'}
            </span>
          )}
        </Column>
        
        <Column field="forma" header="Forma" sortable style={{ minWidth: '85px' }}>
          {(rowData) => (
            <span className="text-xs md:text-sm text-gray-700">
              {rowData.forma || '-'}
            </span>
          )}
        </Column>
        
        <Column field="nota" header="Notas" sortable style={{ minWidth: '120px', maxWidth: '200px' }}>
          {(rowData) => (
            <div className="text-xs md:text-sm text-gray-700">
              {rowData.nota ? (
                <div className="max-w-xs">
                  <span className="line-clamp-2" title={rowData.nota}>
                    {rowData.nota}
                  </span>
                </div>
              ) : (
                <span className="text-gray-400 italic">-</span>
              )}
            </div>
          )}
        </Column>
        
        <Column field="cargado" header="Estado" sortable style={{ minWidth: '90px' }}
          body={(rowData) => {
            const valor = rowData.cargado ? "Cargado" : "No cargado";
            const severity = rowData.cargado ? "success" : "danger";
            return (
              <Tag 
                value={valor}
                severity={severity}
                className="text-xs font-medium"
              />
            );
          }}
        />
        
        <Column header="Acciones" style={{ width: '90px', minWidth: '90px' }}
          body={(rowData) => {
            return (
              <div className="flex gap-1 justify-center">
                {user?.role === "admin" && (
                  <>
                    <Button
                      icon={rowData.cargado ? "pi pi-times" : "pi pi-check"}
                      className={`p-button-sm p-button-text ${rowData.cargado ? 'p-button-danger' : 'p-button-success'}`}
                      loading={updatingId === rowData.id}
                      onClick={() => {
                        if (rowData.cargado) {
                          confirmDialog({
                            message: '¿Marcar como NO cargado?',
                            header: 'Confirmar cambio',
                            icon: 'pi pi-exclamation-triangle',
                            accept: () => updateCargadoStatus(rowData.id, false)
                          });
                        } else {
                          updateCargadoStatus(rowData.id, true);
                        }
                      }}
                      tooltip={rowData.cargado ? "Marcar como no cargado" : "Marcar como cargado"}
                    />
                    <Button
                      icon="pi pi-trash"
                      className="p-button-sm p-button-text p-button-danger"
                      loading={updatingId === rowData.id}
                      onClick={() => {
                        confirmDialog({
                          message: '¿Estás seguro de que quieres eliminar esta cobranza?',
                          header: 'Confirmar eliminación',
                          icon: 'pi pi-exclamation-triangle',
                          accept: () => deleteCobro(rowData.id)
                        });
                      }}
                      tooltip="Eliminar cobranza"
                    />
                  </>
                )}
              </div>
            );
          }}
        />
      </DataTable>
    </div>
  );

  // 🆕 Componente para layout móvil
  const MobileLayout = () => (
    <div className="space-y-3">
      {cobranzasFiltradas.map((cobro) => (
        <MobileCard key={cobro.id} cobro={cobro} />
      ))}
    </div>
  );

  return (
    <div className="p-2 md:p-4">
      <Toast ref={toast} />
      <ConfirmDialog />
      
      {/* Header responsive mejorado */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-3">
        <h1 className="text-lg md:text-2xl font-bold text-center md:text-left">Lista de Cobranzas</h1>
        <div className="flex flex-wrap gap-2 justify-center md:justify-end">
          <Button
            label={showFiltros ? "Ocultar" : "Filtros"}
            icon={showFiltros ? "pi pi-eye-slash" : "pi pi-filter"}
            onClick={() => setShowFiltros(!showFiltros)}
            className="p-button-outlined p-button-sm"
          />
          {(filtroCliente || filtroFechaDesde || filtroFechaHasta) && (
            <Button
              label="Limpiar"
              icon="pi pi-times"
              onClick={limpiarFiltros}
              className="p-button-secondary p-button-sm"
            />
          )}
        </div>
      </div>

      {/* SECCIÓN DE FILTROS - Optimizada para móvil */}
      {showFiltros && (
        <Card className="mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {/* Filtro por Cliente */}
            <div className="flex flex-col">
              <label className="mb-1 md:mb-2 font-semibold text-sm md:text-base">Cliente</label>
              <Dropdown
                value={filtroCliente}
                options={clientes}
                onChange={(e) => setFiltroCliente(e.value)}
                placeholder="Seleccionar cliente"
                showClear
                className="w-full"
                filter
                filterPlaceholder="Buscar cliente..."
              />
            </div>

            {/* Filtro por Fecha Desde */}
            <div className="flex flex-col">
              <label className="mb-1 md:mb-2 font-semibold text-sm md:text-base">Desde</label>
              <Calendar 
                value={filtroFechaDesde}
                onChange={(e) => setFiltroFechaDesde(e.value)}
                showIcon 
                dateFormat="dd/mm/yyyy"
                placeholder="Fecha desde"
                className="w-full"
                touchUI
              />
            </div>

            {/* Filtro por Fecha Hasta */}
            <div className="flex flex-col">
              <label className="mb-1 md:mb-2 font-semibold text-sm md:text-base">Hasta</label>
              <Calendar
                value={filtroFechaHasta}
                onChange={(e) => setFiltroFechaHasta(e.value)}
                showIcon
                dateFormat="dd/mm/yyyy"
                placeholder="Fecha hasta"
                className="w-full"
                touchUI
              />
            </div>
          </div>

          {/* RESUMEN DE FILTROS - Mejorado */}
          <div className="mt-3 text-xs md:text-sm text-gray-600 text-center md:text-left">
            <span className="font-medium">Mostrando {cobranzasFiltradas.length} de {pagination.total} cobranzas</span>
            {(filtroCliente || filtroFechaDesde || filtroFechaHasta) && (
              <span className="ml-2 text-blue-600 font-medium">
                (filtros activos)
              </span>
            )}
            <span className="ml-2 text-gray-500">
              Página {pagination.page} de {pagination.totalPages}
            </span>
          </div>
        </Card>
      )}

      {/* Botón actualizar solo para admin - Responsive */}
      {user.role === "admin" && (
        <div className="flex justify-center md:justify-start mb-4">
          <Button 
            label="Actualizar" 
            icon="pi pi-refresh" 
            onClick={() => fetchCobranzas(true)} 
            className="p-button-sm p-button-info" 
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <ProgressSpinner />
        </div>
      ) : (
        <>
          {/* Renderizar layout según dispositivo */}
          {isMobile ? <MobileLayout /> : <DesktopLayout />}
        </>
      )}
      
      {/* Estilos CSS para truncamiento de texto */}
      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </div>
  );
}

export default CobrosList;

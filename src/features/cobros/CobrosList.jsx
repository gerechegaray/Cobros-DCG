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
    let data = [];
    if (!force) {
      const cache = localStorage.getItem("cobranzas_list");
      if (cache) {
        data = JSON.parse(cache);
        // Aplicar filtrado por rol
        let filteredData = data;
        if (user.role === "Santi" || user.role === "Guille") {
          filteredData = data.filter(cobro => cobro.cobrador === user.role);
        } else if (user.role === "admin") {
          filteredData = data;
        }
        // Limpiar datos antes de establecer el estado
        const datosLimpios = limpiarDatosParaRender(filteredData);
        setCobros(datosLimpios);
        setLoading(false);
        return;
      }
    }
    try {
      const q = query(collection(db, "cobranzas"), orderBy("fecha", "desc"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      localStorage.setItem("cobranzas_list", JSON.stringify(data));
      
      // Aplicar filtrado por rol
      let filteredData = data;
      if (user.role === "Santi" || user.role === "Guille") {
        filteredData = data.filter(cobro => cobro.cobrador === user.role);
      } else if (user.role === "admin") {
        filteredData = data;
      }
      // Limpiar datos antes de establecer el estado
      const datosLimpios = limpiarDatosParaRender(filteredData);
      setCobros(datosLimpios);
    } catch (error) {
      // Error al cargar cobranzas
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 🆕 Limpiar caché para forzar recarga
    localStorage.removeItem("cobranzas_list");
    fetchCobranzas(true);
  }, []);

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

  // 🆕 Función para aplicar filtros
  const aplicarFiltros = (datos) => {
    let filtradas = [...datos];

    // Filtro por cliente
    if (filtroCliente) {
      filtradas = filtradas.filter(cobro => {
        const clienteNombre = getRazonSocial(cobro.cliente);
        return clienteNombre.toLowerCase().includes(filtroCliente.toLowerCase());
      });
    }

    // Filtro por fecha desde
    if (filtroFechaDesde) {
      filtradas = filtradas.filter(cobro => {
        // Convertir la fecha del cobro a Date para comparación
        let fechaCobro = null;
        if (typeof cobro.fecha === 'string') {
          // Si ya es string, intentar parsearlo
          const partes = cobro.fecha.split('/');
          if (partes.length === 3) {
            // Formato DD/MM/YY
            const dia = parseInt(partes[0]);
            const mes = parseInt(partes[1]) - 1; // Meses van de 0-11
            const año = 2000 + parseInt(partes[2]); // Asumir siglo 21
            fechaCobro = new Date(año, mes, dia);
          } else {
            fechaCobro = new Date(cobro.fecha);
          }
        } else {
          fechaCobro = new Date(cobro.fecha);
        }
        
        return !isNaN(fechaCobro.getTime()) && fechaCobro >= filtroFechaDesde;
      });
    }

    // Filtro por fecha hasta
    if (filtroFechaHasta) {
      filtradas = filtradas.filter(cobro => {
        // Convertir la fecha del cobro a Date para comparación
        let fechaCobro = null;
        if (typeof cobro.fecha === 'string') {
          // Si ya es string, intentar parsearlo
          const partes = cobro.fecha.split('/');
          if (partes.length === 3) {
            // Formato DD/MM/YY
            const dia = parseInt(partes[0]);
            const mes = parseInt(partes[1]) - 1; // Meses van de 0-11
            const año = 2000 + parseInt(partes[2]); // Asumir siglo 21
            fechaCobro = new Date(año, mes, dia);
          } else {
            fechaCobro = new Date(cobro.fecha);
          }
        } else {
          fechaCobro = new Date(cobro.fecha);
        }
        
        const fechaHasta = new Date(filtroFechaHasta);
        fechaHasta.setHours(23, 59, 59, 999); // Incluir todo el día
        return !isNaN(fechaCobro.getTime()) && fechaCobro <= fechaHasta;
      });
    }

    // 🆕 Validación final: asegurarse de que no haya objetos problemáticos
    filtradas = filtradas.map(cobro => {
      const cobroFinal = { ...cobro };
      Object.keys(cobroFinal).forEach(key => {
        // Solo convertir objetos que no sean booleanos (como timestamps)
        if (typeof cobroFinal[key] === 'object' && cobroFinal[key] !== null && typeof cobroFinal[key] !== 'boolean') {
  
          // Si es un timestamp, convertirlo a string
          if (cobroFinal[key]._seconds !== undefined || cobroFinal[key].seconds !== undefined || typeof cobroFinal[key].toDate === 'function') {
            cobroFinal[key] = formatFechaUnificada(cobroFinal[key]);
          } else {
            cobroFinal[key] = '[Objeto]';
          }
        }
      });
      return cobroFinal;
    });

    setCobranzasFiltradas(filtradas);
  };

  // 🆕 Función para limpiar filtros
  const limpiarFiltros = () => {
    setFiltroCliente(null);
    setFiltroFechaDesde(null);
    setFiltroFechaHasta(null);
    setCobranzasFiltradas(cobros);
  };

  // 🆕 Función unificada para formatear fechas en DD/MM/YYYY
  const formatFechaUnificada = (fecha) => {
    if (!fecha) return '-';
    
    try {
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

  // Aplicar filtros cuando cambien
  useEffect(() => {
    const datosLimpios = limpiarDatosParaRender(cobros);
    aplicarFiltros(datosLimpios);
  }, [cobros, filtroCliente, filtroFechaDesde, filtroFechaHasta]);

  // Cargar clientes para el filtro usando caché
  const cargarClientes = async () => {
    try {
      const data = await getClientesCatalogo();
      
      // Filtrar clientes según el rol del usuario
      let clientesFiltrados = data;
      if (user.role !== 'admin') {
        const sellerId = user.role === 'Guille' ? 1 : 2;
        clientesFiltrados = data.filter(cliente => {
          if (cliente.seller && cliente.seller.id) {
            return cliente.seller.id === sellerId.toString();
          }
          return false;
        });
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

  // Agregar función para obtener razón social
  const getRazonSocial = (clienteId) => {
    if (!clienteId) return '-';
    if (catalogoCargado && clientesCatalogo.length > 0) {
      const cliente = clientesCatalogo.find(c => c.id === clienteId);
      return cliente ? cliente['Razón Social'] : String(clienteId);
    }
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
      const cobroRef = doc(db, "cobranzas", cobroId);
      await updateDoc(cobroRef, {
        cargado: newStatus
      });
      toast.current.show({ 
        severity: 'success', 
        summary: 'Actualizado', 
        detail: `Estado actualizado a: ${newStatus ? 'Cargado' : 'No cargado'}` 
      });
      fetchCobranzas(true); // Recargar datos
    } catch (error) {
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
      const cobroRef = doc(db, "cobranzas", cobroId);
      await deleteDoc(cobroRef);
      toast.current.show({ 
        severity: 'success', 
        summary: 'Eliminado', 
        detail: 'Cobranza eliminada correctamente' 
      });
      fetchCobranzas(true); // Recargar datos
    } catch (error) {
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
        rows={5}
        rowsPerPageOptions={[5, 10, 20, 50]}
        className="p-datatable-sm"
        emptyMessage="No hay cobranzas para mostrar"
        responsiveLayout="scroll"
        showGridlines
        stripedRows
        size="small"
        removableSort
        sortMode="multiple"
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
            <span className="font-medium">Mostrando {cobranzasFiltradas.length} de {cobros.length} cobranzas</span>
            {(filtroCliente || filtroFechaDesde || filtroFechaHasta) && (
              <span className="ml-2 text-blue-600 font-medium">
                (filtros activos)
              </span>
            )}
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
    </div>
  );
}

export default CobrosList;

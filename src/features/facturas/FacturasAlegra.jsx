import React, { useEffect, useState, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { api } from '../../services/api';
import { Dialog } from 'primereact/dialog';
import { db } from '../../services/firebase';
import { collection, addDoc, query, onSnapshot, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Tag } from 'primereact/tag';
import HojaDeRutaForm from '../hojasderuta/HojaDeRutaForm';
import { Card } from 'primereact/card';
import { getClientesCatalogo } from '../../services/firebase.js';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';

const COBRADORES = [
  { label: "Mariano", value: "Mariano" },
  { label: "Ruben", value: "Ruben" },
  { label: "Diego", value: "Diego" },
  { label: "Guille", value: "Guille" },
  { label: "Santi", value: "Santi" },
  { label: "German", value: "German" }
];

const FacturasAlegra = ({ user }) => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFacturas, setSelectedFacturas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [hojasDeRuta, setHojasDeRuta] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [edicionHoja, setEdicionHoja] = useState({ visible: false, hojaId: null, hojaData: null });
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modalEdicionVisible, setModalEdicionVisible] = useState(false);
  const [hojaEnEdicion, setHojaEnEdicion] = useState(null);
  const [facturasDisponiblesParaEdicion, setFacturasDisponiblesParaEdicion] = useState([]);
  const [facturasSeleccionadasParaEdicion, setFacturasSeleccionadasParaEdicion] = useState([]);
  const toast = useRef(null);

  // 🆕 Estados para filtros
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(null);
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(null);
  const [filtroCliente, setFiltroCliente] = useState(null);
  const [facturasFiltradas, setFacturasFiltradas] = useState([]);
  const [showFiltros, setShowFiltros] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [activeTab, setActiveTab] = useState('todos');
  
  // 🆕 Estados para paginación
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // 🆕 Estado para rango de días
  const [rangoDias, setRangoDias] = useState(5); // Default 5 días
  
  // 🆕 Opciones de rango disponibles
  const opcionesRango = [
    { label: "Hoy", value: 1 },
    { label: "Últimos 3 días", value: 3 },
    { label: "Últimos 5 días", value: 5 }
  ];
  
  // 🆕 Estados para responsive
  const [isMobile, setIsMobile] = useState(false);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [expandedHojaCards, setExpandedHojaCards] = useState(new Set());
  const [presupuestoDetalle, setPresupuestoDetalle] = useState(null);

  // 🆕 Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 🆕 Función para alternar expansión de cards de facturas
  const toggleFacturaCardExpansion = (facturaId) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(facturaId)) {
        newSet.delete(facturaId);
      } else {
        newSet.add(facturaId);
      }
      return newSet;
    });
  };

  // 🆕 Función para alternar expansión de cards de hojas de ruta
  const toggleHojaCardExpansion = (hojaId) => {
    setExpandedHojaCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hojaId)) {
        newSet.delete(hojaId);
      } else {
        newSet.add(hojaId);
      }
      return newSet;
    });
  };

  // 🆕 Función para manejar selección de facturas en móvil
  const handleMobileFacturaSelection = (factura) => {
    if (activeTab !== 'pendiente') return;
    
    const isSelected = selectedFacturas.some(f => f.id === factura.id);
    if (isSelected) {
      setSelectedFacturas(prev => prev.filter(f => f.id !== factura.id));
    } else {
      setSelectedFacturas(prev => [...prev, factura]);
    }
  };

  // 🆕 Función para manejar cambio de página
  const onPageChange = (event) => {
    setCurrentPage(event.page);
  };

  // 🆕 Función para manejar cambio de filas por página
  const onRowsPerPageChange = (event) => {
    setRowsPerPage(event.value);
    setCurrentPage(0); // Resetear a la primera página cuando cambie el número de filas
  };

  // 🆕 Componente Card para facturas en móvil
  const MobileFacturaCard = ({ factura }) => {
    const isExpanded = expandedCards.has(factura.id);
    const isSelected = selectedFacturas.some(f => f.id === factura.id);
    const canSelect = activeTab === 'pendiente';

    // 🆕 Obtener estado real de la factura (no solo el status de Alegra)
    const getEstadoInfo = () => {
      // Primero verificar el estado real en las hojas de ruta
      const estadoReal = obtenerEstadoFactura(factura.id);
      
      switch (estadoReal.estado) {
        case 'entregado':
          return { icon: '✅', color: 'text-green-600', label: 'Entregado' };
        case 'en_reparto':
          return { icon: '🚚', color: 'text-blue-600', label: 'En Reparto' };
        case 'pendiente':
          return { icon: '⏳', color: 'text-yellow-600', label: 'Pendiente' };
        default:
          // Si no hay estado en hojas de ruta, usar el status de Alegra
          switch (factura.status) {
            case 'paid':
              return { icon: '✅', color: 'text-green-600', label: 'Pagada' };
            case 'pending':
              return { icon: '⏳', color: 'text-yellow-600', label: 'Pendiente' };
            case 'overdue':
              return { icon: '⚠️', color: 'text-red-600', label: 'Vencida' };
            default:
              return { icon: '📋', color: 'text-blue-600', label: 'Sin estado' };
          }
      }
    };

    const estadoInfo = getEstadoInfo();

    return (
      <Card className={`mb-3 shadow-sm border-1 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
        {/* Estado Cerrado */}
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-gray-500">📅 {formatFecha(factura.date)}</span>
              <span className={`text-sm font-medium ${estadoInfo.color}`}>
                {estadoInfo.icon} {estadoInfo.label}
              </span>
            </div>
            <div className="font-medium text-gray-900">
              🏢 {factura.client?.name || factura.client?.nombre || factura.client?.id || 'Cliente no disponible'}
            </div>
            <div className="text-sm text-gray-600">
              💰 {formatearMoneda(factura.total)}
            </div>
            {canSelect && (
              <div className="mt-2">
                <Button
                  label={isSelected ? "Deseleccionar" : "Seleccionar"}
                  icon={isSelected ? "pi pi-check-circle" : "pi pi-circle"}
                  className={`p-button-sm ${isSelected ? 'p-button-success' : 'p-button-outlined'}`}
                  onClick={() => handleMobileFacturaSelection(factura)}
                />
              </div>
            )}
          </div>
          <Button
            icon={isExpanded ? "pi pi-chevron-up" : "pi pi-chevron-down"}
            className="p-button-text p-button-sm"
            onClick={() => toggleFacturaCardExpansion(factura.id)}
          />
        </div>

        {/* Estado Expandido */}
        {isExpanded && (
          <div className="pt-3 border-t border-gray-200 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">📄 Número:</span>
                <div className="font-medium">{factura.numberTemplate?.number || factura.number || factura.id}</div>
              </div>
              <div>
                <span className="text-gray-500">📊 Estado:</span>
                <div className="font-medium">{estadoInfo.label}</div>
              </div>
            </div>
            
            {factura.items && factura.items.length > 0 && (
              <div>
                <span className="text-gray-500 text-sm">🛒 Productos:</span>
                <div className="text-sm text-gray-700 mt-1">
                  {factura.items.length} items
                </div>
              </div>
            )}

            {canSelect && (
              <div className="pt-2">
                <Button
                  label={isSelected ? "Quitar de selección" : "Agregar a selección"}
                  icon={isSelected ? "pi pi-minus" : "pi pi-plus"}
                  className={`p-button-sm ${isSelected ? 'p-button-danger p-button-outlined' : 'p-button-success p-button-outlined'}`}
                  onClick={() => handleMobileFacturaSelection(factura)}
                />
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  // 🆕 Componente Card para hojas de ruta en móvil
  const MobileHojaCard = ({ hoja }) => {
    const isExpanded = expandedHojaCards.has(hoja.id);
    const totalPedidos = hoja.pedidos?.length || 0;
    const entregados = hoja.pedidos?.filter(p => p.entregado).length || 0;
    const porcentaje = totalPedidos > 0 ? Math.round((entregados / totalPedidos) * 100) : 0;

    return (
      <Card className="mb-3 shadow-sm border-1 border-gray-200">
        {/* Estado Cerrado */}
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-gray-500">📅 {formatFecha(hoja.fecha)}</span>
              <span className="text-sm font-medium text-blue-600">
                👤 {hoja.responsable}
              </span>
            </div>
            <div className="font-medium text-gray-900">
              💰 {formatearMoneda(calcularTotalHojaRuta(hoja.pedidos))}
            </div>
            <div className="text-sm text-gray-600">
              📦 {entregados}/{totalPedidos} entregados
            </div>
            {totalPedidos > 0 && (
              <div className="mt-1">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <Button
            icon={isExpanded ? "pi pi-chevron-up" : "pi pi-chevron-down"}
            className="p-button-text p-button-sm"
            onClick={() => toggleHojaCardExpansion(hoja.id)}
          />
        </div>

        {/* Estado Expandido */}
        {isExpanded && (
          <div className="pt-3 border-t border-gray-200 space-y-3">
            {/* Detalles de la hoja */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">📊 Progreso:</span>
                <div className="font-medium">{porcentaje}% completado</div>
              </div>
              <div>
                <span className="text-gray-500">📦 Total:</span>
                <div className="font-medium">{totalPedidos} pedidos</div>
              </div>
            </div>

            {/* Lista de pedidos */}
            {hoja.pedidos && hoja.pedidos.length > 0 && (
              <div>
                <span className="text-gray-500 text-sm">📋 Pedidos:</span>
                <div className="space-y-2 mt-2">
                  {hoja.pedidos.map((pedido, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{pedido.cliente}</div>
                        <div className="text-xs text-gray-500">
                          {pedido.entregado ? '✅ Entregado' : '⏳ Pendiente'}
                        </div>
                      </div>
                      {!pedido.entregado && (
                        <Button
                          icon="pi pi-check"
                          className="p-button-sm p-button-success p-button-outlined"
                          onClick={() => marcarEntregado(hoja.id, pedido.id)}
                          tooltip="Marcar como entregado"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

                         {/* Botones de acción */}
             <div className="flex gap-2 pt-2">
               <Button
                 label="Ver detalles"
                 icon="pi pi-eye"
                 className="p-button-sm p-button-outlined"
                 onClick={() => {
                   // Mostrar detalles en un modal para móvil
                   console.log('=== DEBUG: Ver detalles de Hoja de Ruta ===');
                   console.log('Hoja completa:', hoja);
                   
                   // Asegurar que pedidos sea un array
                   let pedidosArray = [];
                   if (hoja.pedidos && Array.isArray(hoja.pedidos)) {
                     pedidosArray = hoja.pedidos;
                   } else if (hoja.pedidos && typeof hoja.pedidos === 'string') {
                     try {
                       pedidosArray = JSON.parse(hoja.pedidos);
                     } catch (e) {
                       console.error('❌ Error parsing pedidos string:', e);
                       pedidosArray = [];
                     }
                   }
                   
                   // Crear items para el modal usando la misma lógica que el desktop
                   const productosPorCliente = obtenerDetalleProductos(pedidosArray);
                   
                   // Convertir productosPorCliente a items para el modal
                   const items = [];
                   Object.entries(productosPorCliente).forEach(([cliente, productos]) => {
                     productos.forEach(producto => {
                       items.push({
                         producto: `${cliente} - ${producto.producto}`,
                         cantidad: producto.cantidad || 1,
                         bonificacion: 0,
                         price: 0, // No tenemos el precio individual en esta estructura
                         entregado: false // No tenemos el estado individual en esta estructura
                       });
                     });
                   });
                   
                   const detalleData = {
                     id: hoja.id,
                     clienteId: 'Hoja de Ruta',
                     vendedor: hoja.responsable || 'No especificado',
                     fechaCreacion: hoja.fecha || new Date(),
                     estado: 'en_reparto',
                     items: items,
                     pedidosOriginales: pedidosArray, // 🆕 Guardar los pedidos originales
                     observaciones: `Hoja de Ruta - ${hoja.responsable || 'No especificado'} - ${pedidosArray.length} pedidos - Total: ${formatearMoneda(calcularTotalHojaRuta(pedidosArray))}`
                   };
                   
                   console.log('=== FIN DEBUG ===');
                   
                   setModalVisible(true);
                   setPresupuestoDetalle(detalleData);
                 }}
               />
                                {tieneAccesoCompleto && (
                   <>
                     <Button
                       label="Editar"
                       icon="pi pi-pencil"
                       className="p-button-sm p-button-outlined"
                       onClick={() => editarHojaRuta(hoja)}
                     />
                     <Button
                       label="Eliminar"
                       icon="pi pi-trash"
                       className="p-button-sm p-button-danger p-button-outlined"
                       onClick={() => confirmarEliminacion(hoja.id)}
                     />
                   </>
                 )}
             </div>
          </div>
        )}
      </Card>
    );
  };

  // 🆕 Componente Layout para facturas en móvil
  const MobileFacturasLayout = () => {
    // Calcular las facturas para la página actual
    const startIndex = currentPage * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const facturasPagina = facturasFiltradasPorEstado.slice(startIndex, endIndex);
    const totalPages = Math.ceil(facturasFiltradasPorEstado.length / rowsPerPage);

    return (
      <div>
        <div className="space-y-2">
          {facturasPagina.map((factura) => (
            <MobileFacturaCard key={factura.id} factura={factura} />
          ))}
        </div>
        
        {/* Paginación para móvil */}
        {facturasFiltradasPorEstado.length > rowsPerPage && (
          <div className="mt-4 p-3 border-round surface-100">
            <div className="flex justify-content-between align-items-center mb-3">
              <span className="text-sm text-gray-600">
                Mostrando {startIndex + 1} a {Math.min(endIndex, facturasFiltradasPorEstado.length)} de {facturasFiltradasPorEstado.length} facturas
              </span>
              <Dropdown
                value={rowsPerPage}
                options={[
                  { label: '10 por página', value: 10 },
                  { label: '20 por página', value: 20 },
                  { label: '50 por página', value: 50 }
                ]}
                onChange={(e) => {
                  setRowsPerPage(e.value);
                  setCurrentPage(0); // Reset to first page when changing rows per page
                }}
                className="w-auto"
              />
            </div>
            
            <div className="flex justify-content-center align-items-center gap-2">
              <Button
                icon="pi pi-angle-double-left"
                className="p-button-text p-button-sm"
                onClick={() => setCurrentPage(0)}
                disabled={currentPage === 0}
                tooltip="Primera página"
              />
              <Button
                icon="pi pi-angle-left"
                className="p-button-text p-button-sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 0}
                tooltip="Página anterior"
              />
              
              <span className="mx-3 text-sm">
                Página {currentPage + 1} de {totalPages}
              </span>
              
              <Button
                icon="pi pi-angle-right"
                className="p-button-text p-button-sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                tooltip="Página siguiente"
              />
              <Button
                icon="pi pi-angle-double-right"
                className="p-button-text p-button-sm"
                onClick={() => setCurrentPage(totalPages - 1)}
                disabled={currentPage >= totalPages - 1}
                tooltip="Última página"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // 🆕 Componente Layout para hojas de ruta en móvil
  const MobileHojasLayout = () => (
    <div className="space-y-2">
      {hojasDeRuta.map((hoja) => (
        <MobileHojaCard key={hoja.id} hoja={hoja} />
      ))}
    </div>
  );

  // 🆕 Componente Layout para facturas en desktop
  const DesktopFacturasLayout = () => (
    <DataTable 
      value={facturasFiltradasPorEstado} 
      dataKey="id" 
      paginator 
      rows={rowsPerPage}
      first={currentPage * rowsPerPage}
      totalRecords={facturasFiltradasPorEstado.length}
      onPage={onPageChange}
      onRowsPerPageChange={onRowsPerPageChange}
      rowsPerPageOptions={[10, 20, 50]}
      emptyMessage="No hay facturas disponibles"
      className="p-datatable-sm"
      selection={activeTab === 'pendiente' ? selectedFacturas : null}
      onSelectionChange={(e) => {
        if (activeTab === 'pendiente') {
          setSelectedFacturas(e.value);
        }
      }}
      selectionMode={activeTab === 'pendiente' ? 'multiple' : null}
    >
      {activeTab === 'pendiente' && (
        <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
      )}
      <Column 
        field="id" 
        header="Número" 
        body={(rowData) => rowData.numberTemplate?.number || rowData.number || rowData.id}
      />
      <Column 
        field="date" 
        header="Fecha" 
        body={(rowData) => formatFecha(rowData.date)}
      />
      <Column 
        field="client.name" 
        header="Cliente" 
        body={(rowData) => rowData.client?.name || rowData.client?.nombre || rowData.client?.id || '-'}
      />
      <Column 
        field="total" 
        header="Total" 
        body={(rowData) => formatearMoneda(rowData.total)}
      />
      <Column 
        field="status" 
        header="Estado" 
        body={renderEstadoFactura}
      />
    </DataTable>
  );

  // 🆕 Componente Layout para hojas de ruta en desktop
  const DesktopHojasLayout = () => (
    <DataTable 
      value={hojasDeRuta} 
      dataKey="id" 
      paginator 
      rows={10}
      emptyMessage={esAdmin ? "No hay hojas de ruta creadas" : "No tienes hojas de ruta asignadas"}
      className="p-datatable-sm"
      expandedRows={expandedRows}
      onRowToggle={(e) => setExpandedRows(e.data)}
      rowExpansionTemplate={renderExpandedContent}
    >
      <Column expander style={{ width: '3rem' }} />
      <Column field="responsable" header="Responsable" />
      <Column field="fecha" header="Fecha Asignación" 
        body={(rowData) => {
          if (typeof rowData.fecha === 'string') {
            return rowData.fecha;
          }
          return formatFecha(rowData.fecha);
        }}
      />
      <Column 
        field="total" 
        header="Total" 
        body={(rowData) => formatearMoneda(calcularTotalHojaRuta(rowData.pedidos))}
      />
      <Column header="Acciones" style={{ width: '150px' }} body={renderAcciones} />
      <Column 
        header="Estado Entregas" 
        body={(rowData) => {
          const totalPedidos = rowData.pedidos?.length || 0;
          const entregados = rowData.pedidos?.filter(p => p.entregado).length || 0;
          const porcentaje = totalPedidos > 0 ? Math.round((entregados / totalPedidos) * 100) : 0;
          
          return (
            <div className="flex align-items-center gap-2">
              <span className="text-sm font-semibold">
                {entregados}/{totalPedidos} entregados
              </span>
              {totalPedidos > 0 && (
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              )}
              {entregados === totalPedidos && totalPedidos > 0 && (
                <span className="text-green-600 text-lg">✅</span>
              )}
            </div>
          );
        }}
      />
             {!tieneAccesoCompleto && (
         <Column header="Estado" style={{ width: '100px' }}>
           {(rowData) => (
             <Tag 
               value={rowData.estado || 'pendiente'} 
               severity={rowData.estado === 'completado' ? 'success' : 'warning'}
             />
           )}
         </Column>
       )}
    </DataTable>
  );

  // 🆕 Función para aplicar filtros a facturas de Alegra
  const aplicarFiltros = () => {
    let filtradas = [...facturas];

    // Filtro por fecha desde
    if (filtroFechaDesde) {
      filtradas = filtradas.filter(factura => {
        // Convertir la fecha de la factura a Date para comparación
        let fechaFactura = null;
        if (factura.date) {
          if (typeof factura.date === 'string') {
            // Formato de Alegra: "2025-07-29T00:00:00.000Z"
            fechaFactura = new Date(factura.date);
          } else if (typeof factura.date === 'object') {
            fechaFactura = new Date(factura.date);
          }
        }
        
        if (!fechaFactura || isNaN(fechaFactura.getTime())) {
          return false;
        }
        
        // Construir fechas en formato YYYY-MM-DD manualmente para evitar problemas de zona horaria
        const fechaFacturaStr = `${fechaFactura.getFullYear()}-${String(fechaFactura.getMonth() + 1).padStart(2, '0')}-${String(fechaFactura.getDate()).padStart(2, '0')}`;
        const fechaDesdeStr = `${filtroFechaDesde.getFullYear()}-${String(filtroFechaDesde.getMonth() + 1).padStart(2, '0')}-${String(filtroFechaDesde.getDate()).padStart(2, '0')}`;
        
        return fechaFacturaStr >= fechaDesdeStr;
      });
    }

    // Filtro por fecha hasta
    if (filtroFechaHasta) {
      filtradas = filtradas.filter(factura => {
        // Convertir la fecha de la factura a Date para comparación
        let fechaFactura = null;
        if (factura.date) {
          if (typeof factura.date === 'string') {
            // Formato de Alegra: "2025-07-29T00:00:00.000Z"
            fechaFactura = new Date(factura.date);
          } else if (typeof factura.date === 'object') {
            fechaFactura = new Date(factura.date);
          }
        }
        
        if (!fechaFactura || isNaN(fechaFactura.getTime())) {
          return false;
        }
        
        // Construir fechas en formato YYYY-MM-DD manualmente para evitar problemas de zona horaria
        const fechaFacturaStr = `${fechaFactura.getFullYear()}-${String(fechaFactura.getMonth() + 1).padStart(2, '0')}-${String(fechaFactura.getDate()).padStart(2, '0')}`;
        const fechaHastaStr = `${filtroFechaHasta.getFullYear()}-${String(filtroFechaHasta.getMonth() + 1).padStart(2, '0')}-${String(filtroFechaHasta.getDate()).padStart(2, '0')}`;
        
        return fechaFacturaStr <= fechaHastaStr;
      });
    }

    // Filtro por cliente
    if (filtroCliente) {
      filtradas = filtradas.filter(factura => {
        const nombreCliente = factura.client?.name || factura.client?.nombre || factura.client?.id || '';
        return nombreCliente.toLowerCase().includes(filtroCliente.toLowerCase());
      });
    }

    setFacturasFiltradas(filtradas);
  };

  // 🆕 Función para limpiar filtros
  const limpiarFiltros = () => {
    setFiltroFechaDesde(null);
    setFiltroFechaHasta(null);
    setFiltroCliente(null);
    setFacturasFiltradas(facturas);
  };

  // 🆕 Función para cargar clientes con cache y filtro por rol
  const cargarClientes = async () => {
    try {
      const data = await getClientesCatalogo();
      let clientesFiltrados = data;
      if (user.role !== 'admin') {
        const sellerId = user.role === 'Guille' ? "1" : "2";
        clientesFiltrados = data.filter(cliente => {
          if (cliente.seller && cliente.seller.id) {
            return cliente.seller.id === sellerId;
          }
          return false;
        });
      }
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

  // 🆕 Aplicar filtros cuando cambien
  useEffect(() => {
    aplicarFiltros();
  }, [facturas, filtroFechaDesde, filtroFechaHasta, filtroCliente]);

  // 🆕 Cargar clientes cuando cambie el usuario
  useEffect(() => {
    if (user?.role) {
      cargarClientes();
    }
  }, [user]);

  // 🆕 Limpiar selección cuando cambie de pestaña (pero mantener la página actual)
  useEffect(() => {
    if (activeTab !== 'pendiente') {
      setSelectedFacturas([]);
      // 🆕 NO resetear la paginación para mantener la página actual
    }
  }, [activeTab]);

  // 🆕 Mantener la página actual cuando se seleccionen facturas
  useEffect(() => {
    // 🆕 No resetear la paginación cuando cambie la selección
    // Esto permite mantener la página actual cuando se seleccionen facturas de diferentes páginas
  }, [selectedFacturas]);

  // 🆕 Verificar si el usuario es admin o Guille (acceso completo)
  const esAdmin = user?.role === 'admin';
  const esGuille = user?.role === 'Guille';
  const tieneAccesoCompleto = esAdmin || esGuille;
  
  // 🆕 Verificar si el usuario es vendedor (Guille o Santi)
  const esVendedor = user?.role === 'Guille' || user?.role === 'Santi';

  // 🆕 Función para determinar el estado de una factura
  const obtenerEstadoFactura = (facturaId) => {
    // Buscar en todas las hojas de ruta
    for (const hoja of hojasDeRuta) {
      // Verificar que pedidos sea un array
      if (hoja.pedidos && Array.isArray(hoja.pedidos)) {
        const pedido = hoja.pedidos.find(p => p.id === facturaId);
        if (pedido) {
          if (pedido.entregado) {
            return { estado: 'entregado', color: 'success', icon: 'pi pi-check-circle' };
          } else {
            return { estado: 'en_reparto', color: 'warning', icon: 'pi pi-truck' };
          }
        }
      }
    }
    return { estado: 'pendiente', color: 'info', icon: 'pi pi-clock' };
  };

  // 🆕 Función para filtrar facturas por estado
  const facturasFiltradasPorEstado = useMemo(() => {
    return facturasFiltradas.filter(factura => {
      if (activeTab === 'todos') return true;
      const estadoInfo = obtenerEstadoFactura(factura.id);
      return estadoInfo.estado === activeTab;
    });
  }, [facturasFiltradas, activeTab, hojasDeRuta]);

  // 🆕 Función para verificar si una factura puede ser seleccionada
  const puedeSeleccionarFactura = (facturaId) => {
    const estadoInfo = obtenerEstadoFactura(facturaId);
    return estadoInfo.estado === 'pendiente';
  };

  // 🆕 Función para manejar selección de facturas (solo pendientes)
  const handleFacturaSelection = (factura) => {
    if (!puedeSeleccionarFactura(factura.id)) {
      return; // No permitir seleccionar facturas que no están pendientes
    }
    
    const isSelected = selectedFacturas.some(f => f.id === factura.id);
    if (isSelected) {
      setSelectedFacturas(selectedFacturas.filter(f => f.id !== factura.id));
    } else {
      setSelectedFacturas([...selectedFacturas, factura]);
    }
  };

  // 🆕 Función para manejar selección de facturas en modal de edición
  const handleFacturaSelectionEdicion = (factura) => {
    const isSelected = facturasSeleccionadasParaEdicion.some(f => f.id === factura.id);
    if (isSelected) {
      setFacturasSeleccionadasParaEdicion(facturasSeleccionadasParaEdicion.filter(f => f.id !== factura.id));
    } else {
      setFacturasSeleccionadasParaEdicion([...facturasSeleccionadasParaEdicion, factura]);
    }
  };

  // 🆕 Función para agregar facturas a la hoja de ruta
  const agregarFacturasAHoja = async () => {
    if (!hojaEnEdicion || facturasSeleccionadasParaEdicion.length === 0) {
      alert('Selecciona al menos una factura para agregar.');
      return;
    }

    try {
      const pedidosActuales = hojaEnEdicion.pedidos || [];
      const nuevosPedidos = facturasSeleccionadasParaEdicion.map(factura => ({
        id: factura.id,
        entregado: false,
        orden: pedidosActuales.length + facturasSeleccionadasParaEdicion.indexOf(factura) + 1
      }));

      const pedidosActualizados = [...pedidosActuales, ...nuevosPedidos];

      await updateDoc(doc(db, 'hojasDeRuta', hojaEnEdicion.id), {
        pedidos: pedidosActualizados
      });

      setModalEdicionVisible(false);
      setHojaEnEdicion(null);
      setFacturasSeleccionadasParaEdicion([]);
      setFacturasDisponiblesParaEdicion([]);
    } catch (error) {
      alert('Error al agregar facturas a la hoja de ruta');
    }
  };

  // 🆕 Función para eliminar factura de la hoja de ruta
  const eliminarFacturaDeHoja = async (facturaId) => {
    if (!hojaEnEdicion) return;

    try {
      const pedidosActualizados = hojaEnEdicion.pedidos.filter(p => p.id !== facturaId);
      
      await updateDoc(doc(db, 'hojasDeRuta', hojaEnEdicion.id), {
        pedidos: pedidosActualizados
      });

      // Actualizar el estado local
      setHojaEnEdicion({
        ...hojaEnEdicion,
        pedidos: pedidosActualizados
      });
    } catch (error) {
      alert('Error al eliminar factura de la hoja de ruta');
    }
  };

  useEffect(() => {
    // 🆕 Solo admin o Guille pueden ver las facturas de Alegra
    if (!tieneAccesoCompleto) {
      setLoading(false);
      return;
    }
    
    api.getAlegraInvoices(rangoDias)
      .then(data => {
        console.log('🆕 Frontend: Facturas recibidas:', data.length);
        if (data.length > 0) {
          console.log('🆕 Frontend: Fechas de las primeras 3 facturas:');
          data.slice(0, 3).forEach((factura, index) => {
            console.log(`  ${index + 1}. ID: ${factura.id}, Fecha: ${factura.date}, Cliente: ${factura.client?.name || 'N/A'}, Status: ${factura.status}`);
          });
        }
        setFacturas(data);
        setFacturasFiltradas(data); // Inicializar facturas filtradas
        setLoading(false);
        
        // 🆕 Mostrar información sobre el filtro de facturas excluidas
        if (data.length > 0) {
          console.log('🆕 Frontend: Se muestran solo facturas válidas (las anuladas, cerradas y pagadas han sido excluidas automáticamente)');
        }
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [esAdmin, rangoDias]);

  // Obtener hojas de ruta pendientes desde Firestore
  useEffect(() => {
    const q = query(collection(db, 'hojasDeRuta'), orderBy('fecha', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        const hoja = { id: doc.id, ...doc.data() };
                 if (hoja.estado === 'pendiente') {
           // 🆕 Filtrar por responsable según el rol del usuario
           if (tieneAccesoCompleto) {
             // Admin y Guille ven todas las hojas de ruta
             data.push(hoja);
           } else if (esVendedor) {
             // Vendedores solo ven hojas de ruta donde son responsables
             if (hoja.responsable === user.role) {
               data.push(hoja);
             }
           }
         }
      });
      // 🆕 Limpiar datos antes de establecer el estado
      const datosLimpios = limpiarDatosParaRender(data);
      setHojasDeRuta(datosLimpios);
    });
    return () => unsubscribe();
  }, [user, esAdmin, esVendedor]);

  const handleAbrirModal = () => {
    if (selectedFacturas.length === 0) {
      alert('Selecciona al menos una factura.');
      return;
    }
    setModalVisible(true);
  };

  // 🆕 Función para marcar pedido como entregado
  const marcarEntregado = async (hojaId, pedidoId) => {
    try {
      const hoja = hojasDeRuta.find(h => h.id === hojaId);
      if (!hoja || !hoja.pedidos || !Array.isArray(hoja.pedidos)) return;

      const pedidosActualizados = hoja.pedidos.map(pedido => {
        if (pedido.id === pedidoId) {
          return { ...pedido, entregado: !pedido.entregado };
        }
        return pedido;
      });

      await updateDoc(doc(db, 'hojasDeRuta', hojaId), {
        pedidos: pedidosActualizados
      });
    } catch (error) {
      console.error('Error marcando como entregado:', error);
      alert('Error al marcar como entregado');
    }
  };

  // 🆕 Función para cambiar orden de pedidos
  const cambiarOrdenPedido = async (hojaId, pedidoId, direccion) => {
    try {
      const hoja = hojasDeRuta.find(h => h.id === hojaId);
      if (!hoja || !hoja.pedidos || !Array.isArray(hoja.pedidos)) return;

      const pedidos = [...hoja.pedidos];
      const indexActual = pedidos.findIndex(p => p.id === pedidoId);
      const nuevoIndex = indexActual + direccion;

      if (nuevoIndex >= 0 && nuevoIndex < pedidos.length) {
        const temp = pedidos[indexActual];
        pedidos[indexActual] = pedidos[nuevoIndex];
        pedidos[nuevoIndex] = temp;

        await updateDoc(doc(db, 'hojasDeRuta', hojaId), {
          pedidos: pedidos
        });
      }
    } catch (error) {
      console.error('Error cambiando orden:', error);
      alert('Error al cambiar el orden');
    }
  };

  // 🆕 Función para eliminar hoja de ruta
  const eliminarHojaRuta = async (hojaId) => {
    try {
      await deleteDoc(doc(db, 'hojasDeRuta', hojaId));
    } catch (error) {
      console.error('Error eliminando hoja de ruta:', error);
      alert('Error al eliminar la hoja de ruta');
    }
  };

  // 🆕 Función para confirmar eliminación
  const confirmarEliminacion = (hojaId) => {
    confirmDialog({
      message: '¿Estás seguro de que quieres eliminar esta hoja de ruta?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => eliminarHojaRuta(hojaId),
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar'
    });
  };

  // 🆕 Función para editar hoja de ruta
  const editarHojaRuta = (hoja) => {
    setHojaEnEdicion(hoja);
    
    // Obtener facturas disponibles (solo pendientes que no están en esta hoja)
    const facturasDisponibles = facturas.filter(factura => {
      const estadoInfo = obtenerEstadoFactura(factura.id);
      // Solo facturas pendientes que no están en esta hoja
      return estadoInfo.estado === 'pendiente' && 
             !hoja.pedidos?.some(p => p.id === factura.id);
    });
    
    setFacturasDisponiblesParaEdicion(facturasDisponibles);
    setFacturasSeleccionadasParaEdicion([]);
    setModalEdicionVisible(true);
  };

  // 🆕 Función para formatear moneda
  const formatearMoneda = (valor) => {
    if (!valor || isNaN(valor)) return "$0";
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(valor);
  };

  // 🆕 Función para formatear fechas en formato DD/MM/YYYY
  const formatFecha = (fecha) => {
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
        return `${dia}/${mes}/${año}`;
      }
      
      return '-';
    } catch (error) {
      console.error('Error formateando fecha:', error, fecha);
      return '-';
    }
  };

  // 🆕 Función para limpiar datos antes de renderizar
  const limpiarDatosParaRender = (datos) => {
    return datos.map(hoja => {
      const hojaLimpia = { ...hoja };
      
      // Asegurarse de que todos los campos sean strings o números
      Object.keys(hojaLimpia).forEach(key => {
        const valor = hojaLimpia[key];
        
        // Si es null o undefined, convertirlo a string
        if (valor === null || valor === undefined) {
          hojaLimpia[key] = '-';
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
            hojaLimpia[key] = formatFecha(valor);
          } else if (key === 'pedidos' && Array.isArray(valor)) {
            // Preservar arrays de pedidos como arrays
            hojaLimpia[key] = valor;
          } else {
            // Para cualquier otro objeto, convertirlo a string
            hojaLimpia[key] = JSON.stringify(valor);
          }
        }
      });
      
      return hojaLimpia;
    });
  };

  // 🆕 Función para calcular total de facturas en una hoja de ruta
  const calcularTotalHojaRuta = (pedidos) => {
    if (!pedidos || !Array.isArray(pedidos)) return 0;
    return pedidos.reduce((total, pedido) => {
      // 🆕 Buscar en facturas si están disponibles (admin) o usar total guardado
      const factura = facturas.find(f => f.id === pedido.id);
      const pedidoTotal = factura?.total || pedido.total || 0;
      return total + pedidoTotal;
    }, 0);
  };

  // 🆕 Función para obtener detalles completos de productos agrupados por cliente
  const obtenerDetalleProductos = (pedidos) => {
    if (!pedidos || !Array.isArray(pedidos)) return {};
    
    const productosPorCliente = {};
    
    pedidos.forEach(pedido => {
      // 🆕 Buscar en facturas si están disponibles (admin) o usar datos guardados
      const factura = facturas.find(f => f.id === pedido.id);
      const items = factura?.items || pedido.detalle || [];
      
      if (items && Array.isArray(items)) {
        if (!productosPorCliente[pedido.cliente]) {
          productosPorCliente[pedido.cliente] = [];
        }
        
        items.forEach(item => {
          productosPorCliente[pedido.cliente].push({
            producto: item.name || item.producto || 'Producto',
            cantidad: item.quantity || item.cantidad || 1
          });
        });
      }
    });
    
    return productosPorCliente;
  };

  // 🆕 Función para mostrar clientes con totales (versión resumida)
  const mostrarClientesConTotales = (pedidos) => {
    if (!pedidos || !Array.isArray(pedidos)) return 'Sin clientes';
    
    return pedidos.map(pedido => {
      const factura = facturas.find(f => f.id === pedido.id);
      const total = factura?.total || 0;
      const entregado = pedido.entregado ? ' ✅' : '';
      return `${pedido.cliente} (${formatearMoneda(total)})${entregado}`;
    }).join(', ');
  };

  // 🆕 Función para renderizar el estado de la factura
  const renderEstadoFactura = (rowData) => {
    const estadoInfo = obtenerEstadoFactura(rowData.id);
    
    return (
      <div className={`flex align-items-center gap-2 p-1 border-round surface-${estadoInfo.color}-50`}>
        <i className={`${estadoInfo.icon} text-${estadoInfo.color}-600`}></i>
        <span className={`text-${estadoInfo.color}-600 font-semibold`}>
          {estadoInfo.estado === 'entregado' && 'Entregado'}
          {estadoInfo.estado === 'en_reparto' && 'En Reparto'}
          {estadoInfo.estado === 'pendiente' && 'Pendiente'}
        </span>
      </div>
    );
  };

  // 🆕 Función para renderizar las acciones
  const renderAcciones = (rowData) => {
    return (
      <div className="flex gap-1">
        <Button
          icon="pi pi-file-pdf"
          className="p-button-sm p-button-text p-button-info"
          onClick={() => exportarHojaRutaPDF(rowData)}
          tooltip="Exportar PDF"
        />
                 {tieneAccesoCompleto && (
           <>
             <Button
               icon="pi pi-pencil"
               className="p-button-sm p-button-text"
               onClick={() => editarHojaRuta(rowData)}
               tooltip="Editar"
             />
             <Button
               icon="pi pi-trash"
               className="p-button-sm p-button-text p-button-danger"
               onClick={() => confirmarEliminacion(rowData.id)}
               tooltip="Eliminar"
             />
           </>
         )}
      </div>
    );
  };

  // 🆕 Función para renderizar el contenido expandido
  const renderExpandedContent = (rowData) => {
    console.log('[FacturasAlegra] Renderizando contenido expandido:', rowData);
    console.log('[FacturasAlegra] Pedidos:', rowData.pedidos);
    console.log('[FacturasAlegra] Facturas disponibles:', facturas.length);
    
    const productosPorCliente = obtenerDetalleProductos(rowData.pedidos);
    console.log('[FacturasAlegra] Productos por cliente:', productosPorCliente);
    
    if (Object.keys(productosPorCliente).length === 0) {
      return (
        <div className="p-3">
          <p className="text-gray-500">No hay productos disponibles para mostrar.</p>
          <p className="text-sm text-gray-400">Debug: {JSON.stringify(rowData.pedidos?.slice(0, 2))}</p>
        </div>
      );
    }

    return (
      <div className="p-3">
        <h5 className="mb-3">Productos por Cliente</h5>
        <div className="grid">
          {Object.entries(productosPorCliente).map(([cliente, productos], index) => (
            <div key={index} className="col-12 md:col-6 lg:col-4">
              <div className="p-3 border-round surface-100">
                <div className="font-bold text-blue-600 mb-2">{cliente}</div>
                <div className="space-y-1">
                  {productos.map((producto, prodIndex) => (
                    <div key={prodIndex} className="text-sm pl-2 border-left-2 border-blue-200">
                      <span className="font-semibold">• {producto.cantidad} - {producto.producto}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* 🆕 Sección de seguimiento simplificada */}
        <div className="mt-3 p-3 border-round surface-200">
          <h6 className="mb-2">Estado de Entregas</h6>
          <div className="flex flex-column gap-2">
            {rowData.pedidos?.map((pedido, index) => (
              <div key={pedido.id} className="flex align-items-center gap-2 p-2 border-round surface-50">
                <span className="text-sm flex-1">
                  <span className="font-bold">{index + 1}.</span> {pedido.cliente}
                  {pedido.entregado && <span className="text-green-600 ml-1">✅ Entregado</span>}
                </span>
                <div className="flex gap-1">
                  {/* 🆕 Controles de orden para vendedores */}
                  {esVendedor && (
                    <>
                      <Button
                        icon="pi pi-arrow-up"
                        className="p-button-text p-button-sm"
                        onClick={() => cambiarOrdenPedido(rowData.id, pedido.id, -1)}
                        disabled={index === 0}
                        tooltip="Mover arriba"
                      />
                      <Button
                        icon="pi pi-arrow-down"
                        className="p-button-text p-button-sm"
                        onClick={() => cambiarOrdenPedido(rowData.id, pedido.id, 1)}
                        disabled={index === rowData.pedidos.length - 1}
                        tooltip="Mover abajo"
                      />
                    </>
                  )}
                  <Button
                    icon={pedido.entregado ? "pi pi-times" : "pi pi-check"}
                    className={`p-button-sm ${pedido.entregado ? 'p-button-danger' : 'p-button-success'}`}
                    onClick={() => marcarEntregado(rowData.id, pedido.id)}
                    tooltip={pedido.entregado ? "Marcar como no entregado" : "Marcar como entregado"}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-3 p-3 border-round surface-200">
          <div className="font-bold text-lg">
            Total de la Hoja de Ruta: {formatearMoneda(calcularTotalHojaRuta(rowData.pedidos))}
          </div>
        </div>
      </div>
    );
  };

  // 🆕 Función para renderizar estado de seguimiento simplificado
  const renderSeguimientoSimplificado = (rowData) => {
    const entregados = rowData.pedidos?.filter(p => p.entregado).length || 0;
    const total = rowData.pedidos?.length || 0;
    
    return (
      <div className="flex align-items-center gap-2">
        <span className="text-sm">
          {entregados}/{total} entregados
        </span>
        {entregados === total && total > 0 && (
          <span className="text-green-600">✅</span>
        )}
      </div>
    );
  };

  // 🆕 Función para exportar hoja de ruta a PDF
  const exportarHojaRutaPDF = (hoja) => {
    if (!hoja || !hoja.pedidos || hoja.pedidos.length === 0) {
      toast?.current?.show({
        severity: 'warn',
        summary: 'Sin datos',
        detail: 'No hay datos para exportar'
      });
      return;
    }

    try {
      // Crear un elemento temporal para el PDF
      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.top = '0';
      pdfContainer.style.width = '800px';
      pdfContainer.style.backgroundColor = 'white';
      pdfContainer.style.color = '#000000'; // Color base oscuro para evitar herencia de tema
      pdfContainer.style.padding = '20px';
      pdfContainer.style.fontFamily = 'Arial, sans-serif';

      // Obtener productos por cliente
      const productosPorCliente = obtenerDetalleProductos(hoja.pedidos);
      const totalHoja = calcularTotalHojaRuta(hoja.pedidos);
      const entregados = hoja.pedidos.filter(p => p.entregado).length;
      const totalPedidos = hoja.pedidos.length;

      // Crear el contenido del PDF
      pdfContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 15px; color: #000000;">
          <h1 style="color: #2c3e50 !important; margin: 0; font-size: 18px;">HOJA DE RUTA</h1>
        </div>
        
        <div style="margin-bottom: 10px; color: #000000;">
          <p style="margin: 2px 0; font-size: 11px; color: #000000 !important;"><strong style="color: #000000 !important;">Responsable:</strong> ${hoja.responsable || 'N/A'}</p>
          <p style="margin: 2px 0; font-size: 11px; color: #000000 !important;"><strong style="color: #000000 !important;">Fecha:</strong> ${formatFecha(hoja.fechaCreacion)}</p>
          <p style="margin: 2px 0; color: #7f8c8d !important; font-size: 11px;"><strong style="color: #7f8c8d !important;">Generado el:</strong> ${new Date().toLocaleDateString('es-AR')}</p>
        </div>
        
        <div style="margin-bottom: 12px; color: #000000;">
          <h2 style="color: #2c3e50 !important; margin-bottom: 6px; font-size: 14px;">RESUMEN</h2>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; color: #000000;">
            <span style="color: #2c3e50 !important;"><strong style="color: #2c3e50 !important;">Total de Pedidos:</strong> ${totalPedidos}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; color: #000000;">
            <span style="color: #27ae60 !important;"><strong style="color: #27ae60 !important;">Entregados:</strong> ${entregados}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; color: #000000;">
            <span style="color: #e74c3c !important;"><strong style="color: #e74c3c !important;">Pendientes:</strong> ${totalPedidos - entregados}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; color: #000000;">
            <span style="color: #2c3e50 !important;"><strong style="color: #2c3e50 !important;">Total General:</strong> ${formatearMoneda(totalHoja)}</span>
          </div>
        </div>
        
        <div style="margin-bottom: 10px; color: #000000;">
          <h2 style="color: #2c3e50 !important; margin-bottom: 6px; font-size: 14px;">DETALLE DE PRODUCTOS POR CLIENTE</h2>
          ${Object.entries(productosPorCliente).map(([cliente, productos]) => `
            <div style="margin-bottom: 8px; border: 1px solid #ddd; border-radius: 4px; padding: 6px; color: #000000;">
              <h3 style="color: #34495e !important; margin: 0 0 4px 0; font-size: 12px;">${cliente}</h3>
              <ul style="margin: 0; padding-left: 15px; list-style-type: none; color: #000000;">
                ${productos.map(producto => `
                  <li style="margin: 2px 0; font-size: 10px; padding: 1px 0; color: #000000 !important;">
                    <span style="font-weight: bold; color: #2c3e50 !important;">${producto.cantidad}x</span> <span style="color: #000000 !important;">${producto.producto}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      `;

      // Agregar el contenedor al DOM
      document.body.appendChild(pdfContainer);

      // Capturar la imagen
      html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      }).then(canvas => {
        // Remover el contenedor temporal
        document.body.removeChild(pdfContainer);

        // Convertir a PDF usando jsPDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        // Guardar el PDF
        const responsable = hoja.responsable || 'Responsable';
        const fileName = `hoja_ruta_${responsable.replace(/[^a-zA-Z0-9]/g, '_')}_${formatFecha(hoja.fechaCreacion).replace(/\//g, '-')}.pdf`;
        pdf.save(fileName);

        toast?.current?.show({
          severity: 'success',
          summary: 'PDF Exportado',
          detail: 'Hoja de ruta exportada correctamente'
        });
      });

    } catch (error) {
      console.error('Error al exportar PDF:', error);
      toast?.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: `Error al exportar PDF: ${error.message}`
      });
    }
  };

  if (loading) return <p>Cargando facturas...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Envíos</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 🆕 Filtro por Rango de Días */}
            <div className="flex flex-col">
              <label className="mb-2 font-semibold">Rango de Días</label>
              <Dropdown
                value={rangoDias}
                options={opcionesRango}
                onChange={(e) => setRangoDias(e.value)}
                placeholder="Seleccionar rango"
                className="w-full"
              />
            </div>

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
                dateFormat="dd/mm/yy"
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
                dateFormat="dd/mm/yy"
                placeholder="Seleccionar fecha"
                className="w-full"
              />
            </div>
          </div>

          {/* RESUMEN DE FILTROS */}
          <div className="mt-3 text-sm text-gray-600">
            Mostrando {facturasFiltradasPorEstado.length} de {facturas.length} facturas
            {(filtroCliente || filtroFechaDesde || filtroFechaHasta) && (
              <span className="ml-2 text-blue-600">
                (filtros activos)
              </span>
            )}
            {activeTab !== 'todos' && (
              <span className="ml-2 text-green-600">
                (pestaña: {activeTab === 'pendiente' ? 'Pendientes' : activeTab === 'en_reparto' ? 'En Reparto' : 'Entregadas'})
              </span>
            )}
          </div>
        </Card>
      )}

             {/* Lista de Facturas (solo para admin o Guille) */}
       {tieneAccesoCompleto && (
        <div className="mb-6">
          <div className="mb-3">
            <h3 className="text-lg font-semibold">Facturas Disponibles</h3>
            <p className="text-sm text-gray-600 mt-1">
              📅 Solo se muestran facturas abiertas de los últimos {rangoDias} día{rangoDias !== 1 ? 's' : ''}
            </p>
          </div>
          
          {/* PESTAÑAS */}
          <div className="flex mb-4 border-b border-gray-200">
            <Button
              label="Todos"
              className={`p-button-text ${activeTab === 'todos' ? 'p-button-primary border-bottom-2 border-primary' : ''}`}
              onClick={() => setActiveTab('todos')}
            />
            <Button
              label="Pendientes"
              className={`p-button-text ${activeTab === 'pendiente' ? 'p-button-primary border-bottom-2 border-primary' : ''}`}
              onClick={() => setActiveTab('pendiente')}
            />
            <Button
              label="En Reparto"
              className={`p-button-text ${activeTab === 'en_reparto' ? 'p-button-primary border-bottom-2 border-primary' : ''}`}
              onClick={() => setActiveTab('en_reparto')}
            />
            <Button
              label="Entregadas"
              className={`p-button-text ${activeTab === 'entregado' ? 'p-button-primary border-bottom-2 border-primary' : ''}`}
              onClick={() => setActiveTab('entregado')}
            />
          </div>

          {/* BOTÓN CREAR HOJA DE RUTA (solo para pendientes) */}
          {activeTab === 'pendiente' && selectedFacturas.length > 0 && (
            <div className="mb-4">
              <Button
                label={`Crear Hoja de Ruta (${selectedFacturas.length} facturas seleccionadas)`}
                icon="pi pi-plus"
                onClick={handleAbrirModal}
                className="p-button-success"
              />
            </div>
          )}

          {isMobile ? (
            <MobileFacturasLayout />
          ) : (
            <DesktopFacturasLayout />
          )}
        </div>
      )}

             {/* Hojas de Ruta */}
       <div className="mb-6">
         <h3>{tieneAccesoCompleto ? 'Hojas de Ruta Pendientes' : 'Mis Hojas de Ruta Pendientes'}</h3>
        {isMobile ? (
          <MobileHojasLayout />
        ) : (
          <DesktopHojasLayout />
        )}
      </div>

      {/* Formulario de Hoja de Ruta */}
      <HojaDeRutaForm
        visible={modalVisible}
        onHide={() => {
          setModalVisible(false);
        }}
        onSave={(hojaDeRuta) => {
          setModalVisible(false);
          // No need to fetchHojasDeRuta here, as it's not directly tied to this modal's state
          // The useEffect for hojasDeRuta already handles updates
        }}
        pedidosSeleccionados={selectedFacturas.map(f => ({
          id: f.id,
          cliente: f.client?.name || f.id,
          fecha: { toDate: () => new Date(f.date) },
          items: f.items || [],
          estadoFactura: f.status,
          total: f.total || 0 // 🆕 Agregar el total de la factura
        }))}
        user={user}
      />

      {/* Modal de Edición de Hoja de Ruta */}
      <Dialog 
        visible={modalEdicionVisible} 
        onHide={() => {
          setModalEdicionVisible(false);
          setHojaEnEdicion(null);
          setFacturasSeleccionadasParaEdicion([]);
          setFacturasDisponiblesParaEdicion([]);
        }}
        header={`Editar Hoja de Ruta - ${hojaEnEdicion?.responsable || ''}`}
        style={{ width: '90vw', maxWidth: '1000px' }}
        modal
      >
        {hojaEnEdicion && (
          <div className="space-y-6">
            {/* INFORMACIÓN DE LA HOJA */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Información de la Hoja de Ruta</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Responsable:</strong> {hojaEnEdicion.responsable}
                </div>
                <div>
                  <strong>Fecha Creación:</strong> {formatFecha(hojaEnEdicion.fechaCreacion)}
                </div>
                <div>
                  <strong>Total Actual:</strong> {formatearMoneda(calcularTotalHojaRuta(hojaEnEdicion.pedidos))}
                </div>
                <div>
                  <strong>Pedidos Actuales:</strong> {hojaEnEdicion.pedidos?.length || 0}
                </div>
              </div>
            </div>

            {/* PEDIDOS ACTUALES */}
            <div>
              <h4 className="font-semibold mb-3">Pedidos Actuales</h4>
              <DataTable 
                value={hojaEnEdicion.pedidos || []} 
                dataKey="id" 
                className="p-datatable-sm"
                emptyMessage="No hay pedidos en esta hoja de ruta"
              >
                <Column 
                  field="cliente" 
                  header="Cliente" 
                  body={(rowData) => rowData.cliente || 'Cliente no disponible'}
                />
                <Column 
                  field="entregado" 
                  header="Estado" 
                  body={(rowData) => (
                    <Tag 
                      value={rowData.entregado ? 'Entregado' : 'Pendiente'} 
                      severity={rowData.entregado ? 'success' : 'warning'}
                    />
                  )}
                />
                <Column 
                  header="Acciones" 
                  body={(rowData) => (
                    <Button
                      icon="pi pi-trash"
                      className="p-button-sm p-button-text p-button-danger"
                      onClick={() => eliminarFacturaDeHoja(rowData.id)}
                      tooltip="Eliminar de la hoja"
                    />
                  )}
                />
              </DataTable>
            </div>

            {/* AGREGAR NUEVOS PEDIDOS */}
            <div>
              <h4 className="font-semibold mb-3">Agregar Nuevos Pedidos</h4>
              <DataTable 
                value={facturasDisponiblesParaEdicion} 
                dataKey="id" 
                className="p-datatable-sm"
                selection={facturasSeleccionadasParaEdicion}
                onSelectionChange={(e) => setFacturasSeleccionadasParaEdicion(e.value)}
                selectionMode="multiple"
                emptyMessage="No hay facturas pendientes disponibles"
              >
                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                <Column 
                  field="id" 
                  header="Número" 
                  body={(rowData) => rowData.numberTemplate?.number || rowData.number || rowData.id}
                />
                <Column 
                  field="date" 
                  header="Fecha" 
                  body={(rowData) => formatFecha(rowData.date)}
                />
                <Column 
                  field="client.name" 
                  header="Cliente" 
                  body={(rowData) => rowData.client?.name || rowData.client?.nombre || rowData.client?.id || '-'}
                />
                <Column 
                  field="total" 
                  header="Total" 
                  body={(rowData) => formatearMoneda(rowData.total)}
                />
              </DataTable>
            </div>

            {/* BOTONES */}
            <div className="flex justify-end gap-2">
              <Button
                label="Cancelar"
                icon="pi pi-times"
                onClick={() => {
                  setModalEdicionVisible(false);
                  setHojaEnEdicion(null);
                  setFacturasSeleccionadasParaEdicion([]);
                  setFacturasDisponiblesParaEdicion([]);
                }}
                className="p-button-secondary"
              />
              <Button
                label={`Agregar ${facturasSeleccionadasParaEdicion.length} Facturas`}
                icon="pi pi-plus"
                onClick={agregarFacturasAHoja}
                disabled={facturasSeleccionadasParaEdicion.length === 0}
                className="p-button-success"
              />
            </div>
          </div>
        )}
      </Dialog>

      {/* Formulario de Edición */}
      <Dialog 
        visible={edicionHoja.visible} 
        onHide={() => setEdicionHoja({ visible: false, hojaId: null, hojaData: null })}
        header="Editar Hoja de Ruta"
        style={{ width: '90vw', maxWidth: '800px' }}
        modal
      >
        <HojaDeRutaForm
          hojaDeRuta={edicionHoja.hojaData}
          onSave={(hojaDeRuta) => {
            setEdicionHoja({ visible: false, hojaId: null, hojaData: null });
            // No need to fetchHojasDeRuta here, as it's not directly tied to this modal's state
            // The useEffect for hojasDeRuta already handles updates
          }}
          onCancel={() => setEdicionHoja({ visible: false, hojaId: null, hojaData: null })}
          user={user}
        />
      </Dialog>

      {/* Modal para detalles de hoja de ruta en móvil */}
      <Dialog 
        header="Detalles de Hoja de Ruta" 
        visible={modalVisible && presupuestoDetalle?.clienteId === 'Hoja de Ruta'} 
        style={{ width: '90vw', maxWidth: '600px' }} 
        onHide={() => {
          console.log('Cerrando modal de detalles de hoja de ruta');
          setModalVisible(false);
          setPresupuestoDetalle(null);
        }}
        onShow={() => {
          console.log('=== DEBUG: Modal abierto ===');
          console.log('modalVisible:', modalVisible);
          console.log('presupuestoDetalle:', presupuestoDetalle);
          console.log('presupuestoDetalle.clienteId:', presupuestoDetalle?.clienteId);
        }}
      >
        {presupuestoDetalle && presupuestoDetalle.clienteId === 'Hoja de Ruta' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">👤 Responsable:</span>
                <div className="font-medium">{presupuestoDetalle.vendedor || 'No especificado'}</div>
              </div>
              <div>
                <span className="text-gray-500">📅 Fecha:</span>
                <div className="font-medium">{formatFecha(presupuestoDetalle.fechaCreacion) || 'Fecha no disponible'}</div>
              </div>
            </div>
            
            <div>
              <span className="text-gray-500 text-sm">📋 Productos por Cliente:</span>
              <div className="mt-2 space-y-2">
                {(() => {
                  if (presupuestoDetalle.items && Array.isArray(presupuestoDetalle.items) && presupuestoDetalle.items.length > 0) {
                    return presupuestoDetalle.items.map((item, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="font-medium">{item.producto || 'Producto no especificado'}</div>
                            <div className="text-sm text-gray-500">
                              Cantidad: {item.cantidad}
                            </div>
                          </div>
                          <Tag 
                            value="Producto" 
                            severity="info"
                            className="text-xs"
                          />
                        </div>
                      </div>
                    ));
                  } else {
                    return (
                      <div className="p-3 bg-gray-50 rounded-lg text-center text-gray-500">
                        {presupuestoDetalle.items ? 
                          `No hay productos disponibles (${presupuestoDetalle.items.length} items encontrados pero vacíos)` : 
                          'No hay productos disponibles (items es null/undefined)'
                        }
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
            
            {/* 🆕 Sección de estado de entregas por cliente */}
            <div>
              <span className="text-gray-500 text-sm">🚚 Estado de Entregas:</span>
              <div className="mt-2 space-y-2">
                                                  {(() => {
                   // Obtener los pedidos originales para mostrar el estado de entrega
                   const pedidosOriginales = presupuestoDetalle.pedidosOriginales || [];
                   
                   if (pedidosOriginales && Array.isArray(pedidosOriginales) && pedidosOriginales.length > 0) {
                    return pedidosOriginales.map((pedido, idx) => (
                      <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="font-medium">{pedido.cliente || 'Cliente no especificado'}</div>
                            <div className="text-sm text-gray-500">
                              Pedido #{idx + 1}
                            </div>
                          </div>
                          <Tag 
                            value={pedido.entregado ? "Entregado" : "Pendiente"} 
                            severity={pedido.entregado ? "success" : "warning"}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    ));
                  } else {
                    return (
                      <div className="p-3 bg-blue-50 rounded-lg text-center text-gray-500">
                        No hay información de estado de entregas disponible
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
            
            {presupuestoDetalle.observaciones && (
              <div>
                <span className="text-gray-500 text-sm">📝 Observaciones:</span>
                <div className="text-sm text-gray-700 mt-1">{presupuestoDetalle.observaciones}</div>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Toast para notificaciones */}
      <Toast ref={toast} />
      
      {/* ConfirmDialog para eliminación */}
      <ConfirmDialog />
    </div>
  );
};

export default FacturasAlegra; 
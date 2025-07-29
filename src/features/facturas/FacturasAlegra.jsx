import React, { useEffect, useState, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { getAlegraInvoices } from '../../services/alegra';
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

  // 🆕 Estados para filtros
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(null);
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(null);
  const [filtroCliente, setFiltroCliente] = useState(null);
  const [facturasFiltradas, setFacturasFiltradas] = useState([]);
  const [showFiltros, setShowFiltros] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [activeTab, setActiveTab] = useState('todos');

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
        
        // Comparar fechas usando strings YYYY-MM-DD para evitar problemas de zona horaria
        const fechaFacturaStr = fechaFactura.toISOString().split('T')[0];
        const fechaDesdeStr = filtroFechaDesde.toISOString().split('T')[0];
        
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
        
        // Comparar fechas usando strings YYYY-MM-DD para evitar problemas de zona horaria
        const fechaFacturaStr = fechaFactura.toISOString().split('T')[0];
        const fechaHastaStr = filtroFechaHasta.toISOString().split('T')[0];
        
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

  // 🆕 Limpiar selección cuando cambie de pestaña
  useEffect(() => {
    if (activeTab !== 'pendiente') {
      setSelectedFacturas([]);
    }
  }, [activeTab]);

  // 🆕 Verificar si el usuario es admin
  const esAdmin = user?.role === 'admin';
  
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
    // 🆕 Solo admin puede ver las facturas de Alegra
    if (!esAdmin) {
      setLoading(false);
      return;
    }
    
    getAlegraInvoices()
      .then(data => {
        setFacturas(data);
        setFacturasFiltradas(data); // Inicializar facturas filtradas
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [esAdmin]);

  // Obtener hojas de ruta pendientes desde Firestore
  useEffect(() => {
    const q = query(collection(db, 'hojasDeRuta'), orderBy('fecha', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        const hoja = { id: doc.id, ...doc.data() };
        if (hoja.estado === 'pendiente') {
          // 🆕 Filtrar por responsable según el rol del usuario
          if (esAdmin) {
            // Admin ve todas las hojas de ruta
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

  // 🆕 Función para formatear fechas en formato DD/MM/YY
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
        fechaObj = new Date(fecha);
      }
      
      if (fechaObj && !isNaN(fechaObj.getTime())) {
        // Formato DD/MM/YY
        const dia = fechaObj.getDate().toString().padStart(2, '0');
        const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
        const año = fechaObj.getFullYear().toString().slice(-2); // Solo los últimos 2 dígitos
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
    if (esAdmin) {
      return (
        <div className="flex gap-1">
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
        </div>
      );
    } else {
      return <span style={{ color: 'gray', fontSize: '12px' }}>-</span>;
    }
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

      {/* Lista de Facturas (solo para admin) */}
      {esAdmin && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Facturas Disponibles</h3>
          
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

          <DataTable 
            value={facturasFiltradasPorEstado} 
            dataKey="id" 
            paginator 
            rows={10}
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
            <Column field="id" header="ID" />
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
        </div>
      )}

      {/* Hojas de Ruta */}
      <div className="mb-6">
        <h3>{esAdmin ? 'Hojas de Ruta Pendientes' : 'Mis Hojas de Ruta Pendientes'}</h3>
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
              // Si ya es un string formateado, devolverlo directamente
              if (typeof rowData.fecha === 'string') {
                return rowData.fecha;
              }
              // Si es un timestamp, formatearlo
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
          {!esAdmin && (
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
                <Column field="id" header="ID" />
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

      {/* ConfirmDialog para eliminación */}
      <ConfirmDialog />
    </div>
  );
};

export default FacturasAlegra; 
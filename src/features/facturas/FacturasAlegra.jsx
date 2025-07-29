import React, { useEffect, useState } from 'react';
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
import HojaDeRutaForm from '../hojasderuta/HojaDeRutaForm';

const COBRADORES = [
  { label: "Mariano", value: "Mariano" },
  { label: "Ruben", value: "Ruben" },
  { label: "Diego", value: "Diego" },
  { label: "Guille", value: "Guille" },
  { label: "Santi", value: "Santi" },
  { label: "German", value: "German" }
];

const FacturasAlegra = () => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFacturas, setSelectedFacturas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [hojasDeRuta, setHojasDeRuta] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [edicionHoja, setEdicionHoja] = useState({ visible: false, hojaId: null, hojaData: null });
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // 🆕 Función para determinar el estado de una factura (MOVIDA ARRIBA)
  const obtenerEstadoFactura = (facturaId) => {
    // Buscar en todas las hojas de ruta
    for (const hoja of hojasDeRuta) {
      const pedido = hoja.pedidos?.find(p => p.id === facturaId);
      if (pedido) {
        if (pedido.entregado) {
          return { estado: 'entregado', color: 'success', icon: 'pi pi-check-circle' };
        } else {
          return { estado: 'en_reparto', color: 'warning', icon: 'pi pi-truck' };
        }
      }
    }
    return { estado: 'pendiente', color: 'info', icon: 'pi pi-clock' };
  };

  // 🆕 Función para filtrar facturas por estado
  const facturasFiltradas = facturas.filter(factura => {
    if (filtroEstado === 'todos') return true;
    const estadoInfo = obtenerEstadoFactura(factura.id);
    return estadoInfo.estado === filtroEstado;
  });

  // 🆕 Función para verificar si una factura puede ser seleccionada
  const puedeSeleccionarFactura = (facturaId) => {
    const estadoInfo = obtenerEstadoFactura(facturaId);
    return estadoInfo.estado === 'pendiente';
  };

  useEffect(() => {
    getAlegraInvoices()
      .then(data => {
        setFacturas(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Obtener hojas de ruta pendientes desde Firestore
  useEffect(() => {
    const q = query(collection(db, 'hojasDeRuta'), orderBy('fecha', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        const hoja = { id: doc.id, ...doc.data() };
        if (hoja.estado === 'pendiente') data.push(hoja);
      });
      setHojasDeRuta(data);
    });
    return () => unsubscribe();
  }, []);

  const handleAbrirModal = () => {
    console.log('[FacturasAlegra] Handler abrir modal. selectedFacturas:', selectedFacturas);
    if (selectedFacturas.length === 0) {
      alert('Selecciona al menos una factura.');
      return;
    }
    setModalVisible(true);
    console.log('[FacturasAlegra] Modal debería abrirse.');
  };

  // 🆕 Función para marcar pedido como entregado
  const marcarEntregado = async (hojaId, pedidoId) => {
    try {
      const hoja = hojasDeRuta.find(h => h.id === hojaId);
      if (!hoja) return;

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
      if (!hoja) return;

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
    setEdicionHoja({
      visible: true,
      hojaId: hoja.id,
      hojaData: hoja
    });
  };

  // 🆕 Función para formatear moneda
  const formatearMoneda = (valor) => {
    if (!valor) return '$0';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
  };

  // 🆕 Función para calcular total de facturas en una hoja de ruta
  const calcularTotalHojaRuta = (pedidos) => {
    if (!pedidos || !Array.isArray(pedidos)) return 0;
    return pedidos.reduce((total, pedido) => {
      // Buscar la factura correspondiente para obtener el total
      const factura = facturas.find(f => f.id === pedido.id);
      return total + (factura?.total || 0);
    }, 0);
  };

  // 🆕 Función para obtener detalles completos de productos agrupados por cliente
  const obtenerDetalleProductos = (pedidos) => {
    if (!pedidos || !Array.isArray(pedidos)) return [];
    
    const productosPorCliente = {};
    
    pedidos.forEach(pedido => {
      const factura = facturas.find(f => f.id === pedido.id);
      if (factura?.items && Array.isArray(factura.items)) {
        if (!productosPorCliente[pedido.cliente]) {
          productosPorCliente[pedido.cliente] = [];
        }
        
        factura.items.forEach(item => {
          productosPorCliente[pedido.cliente].push({
            producto: item.name || 'Producto',
            cantidad: item.quantity || 1
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

  // 🆕 Función para renderizar el contenido expandido
  const renderExpandedContent = (rowData) => {
    const productosPorCliente = obtenerDetalleProductos(rowData.pedidos);
    
    if (Object.keys(productosPorCliente).length === 0) {
      return (
        <div className="p-3">
          <p className="text-gray-500">No hay productos disponibles para mostrar.</p>
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
                <Button
                  icon={pedido.entregado ? "pi pi-times" : "pi pi-check"}
                  className={`p-button-sm ${pedido.entregado ? 'p-button-danger' : 'p-button-success'}`}
                  onClick={() => marcarEntregado(rowData.id, pedido.id)}
                  tooltip={pedido.entregado ? "Marcar como no entregado" : "Marcar como entregado"}
                />
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
    <div>
      <ConfirmDialog />
      <h2>Facturas de Venta (Alegra)</h2>
      
      {/* 🆕 Filtros por estado */}
      <div className="flex align-items-center gap-3 mb-3">
        <span className="font-semibold">Filtrar por estado:</span>
        <Button
          label="Todas"
          className={`p-button-sm ${filtroEstado === 'todos' ? 'p-button-primary' : 'p-button-outlined'}`}
          onClick={() => setFiltroEstado('todos')}
        />
        <Button
          label="Pendientes"
          className={`p-button-sm ${filtroEstado === 'pendiente' ? 'p-button-primary' : 'p-button-outlined'}`}
          onClick={() => setFiltroEstado('pendiente')}
        />
        <Button
          label="En Reparto"
          className={`p-button-sm ${filtroEstado === 'en_reparto' ? 'p-button-primary' : 'p-button-outlined'}`}
          onClick={() => setFiltroEstado('en_reparto')}
        />
        <Button
          label="Entregadas"
          className={`p-button-sm ${filtroEstado === 'entregado' ? 'p-button-primary' : 'p-button-outlined'}`}
          onClick={() => setFiltroEstado('entregado')}
        />
      </div>

      <Button
        label="+ Crear hoja de ruta con seleccionadas"
        icon="pi pi-plus"
        className="p-button-success p-mb-3"
        disabled={selectedFacturas.length === 0}
        onClick={handleAbrirModal}
      />
      <DataTable
        value={facturasFiltradas}
        paginator
        rows={10}
        responsiveLayout="scroll"
        selection={selectedFacturas}
        onSelectionChange={e => {
          // 🆕 Solo permitir seleccionar facturas pendientes
          const facturasPendientes = e.value.filter(f => puedeSeleccionarFactura(f.id));
          setSelectedFacturas(facturasPendientes);
          console.log('[FacturasAlegra] onSelectionChange:', facturasPendientes);
        }}
        dataKey="id"
        selectionMode="multiple"
        emptyMessage="No hay facturas con el estado seleccionado"
      >
        <Column 
          selectionMode="multiple" 
          headerStyle={{ width: '3em' }}
          body={(rowData) => (
            <input 
              type="checkbox" 
              checked={selectedFacturas.some(f => f.id === rowData.id)}
              onChange={(e) => {
                if (e.target.checked && puedeSeleccionarFactura(rowData.id)) {
                  setSelectedFacturas(prev => [...prev, rowData]);
                } else if (!e.target.checked) {
                  setSelectedFacturas(prev => prev.filter(f => f.id !== rowData.id));
                }
              }}
              disabled={!puedeSeleccionarFactura(rowData.id)}
            />
          )}
        />
        <Column field="id" header="ID" />
        <Column field="date" header="Fecha" />
        <Column field="client.name" header="Cliente" />
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
      {/* Modal con el formulario modular para hoja de ruta */}
      {modalVisible && (
        (() => { console.log('[FacturasAlegra] Renderizando HojaDeRutaForm, modalVisible:', modalVisible, 'selectedFacturas:', selectedFacturas); return null; })() ||
        <HojaDeRutaForm
          visible={modalVisible}
          onHide={() => setModalVisible(false)}
          pedidosSeleccionados={selectedFacturas.map(f => ({
            id: f.id,
            cliente: f.client?.name || f.id,
            fecha: { toDate: () => new Date(f.date) },
            items: f.items || [],
            estadoFactura: f.status
          }))}
          onSave={() => {
            setSelectedFacturas([]);
            setModalVisible(false);
          }}
        />
      )}
      {/* Modal para editar hoja de ruta */}
      {edicionHoja.visible && (
        <HojaDeRutaForm
          visible={edicionHoja.visible}
          onHide={() => setEdicionHoja({ visible: false, hojaId: null, hojaData: null })}
          edicion={true}
          hojaId={edicionHoja.hojaId}
          hojaData={edicionHoja.hojaData}
          pedidosSeleccionados={[]}
          facturasDisponibles={facturas}
          onSave={() => {
            setEdicionHoja({ visible: false, hojaId: null, hojaData: null });
          }}
        />
      )}
      {/* Lista de hojas de ruta pendientes */}
      <div style={{ marginTop: 32 }}>
        <h3>Hojas de Ruta Pendientes</h3>
        <DataTable 
          value={hojasDeRuta} 
          dataKey="id" 
          paginator 
          rows={5} 
          responsiveLayout="stack" 
          emptyMessage="No hay hojas de ruta pendientes." 
          className="p-datatable-sm p-fluid p-mt-3"
          expandedRows={expandedRows}
          onRowToggle={(e) => setExpandedRows(e.data)}
          rowExpansionTemplate={renderExpandedContent}
        >
          <Column expander={true} style={{ width: '3rem' }} />
          <Column 
            field="fecha" 
            header="Fecha" 
            body={row => row.fecha?.toDate ? row.fecha.toDate().toLocaleDateString('es-AR') : ''} 
          />
          <Column field="responsable" header="Responsable" />
          <Column 
            field="pedidos" 
            header="Clientes y Totales" 
            body={row => mostrarClientesConTotales(row.pedidos)}
            style={{ minWidth: '300px' }}
          />
          <Column 
            field="pedidos" 
            header="Total Hoja" 
            body={row => formatearMoneda(calcularTotalHojaRuta(row.pedidos))}
            style={{ textAlign: 'right' }}
          />
          <Column 
            field="pedidos" 
            header="Seguimiento" 
            body={renderSeguimientoSimplificado}
            style={{ minWidth: '200px' }}
          />
          <Column 
            field="estado" 
            header="Acciones" 
            body={row => (
              <div className="flex gap-1">
                <Button
                  icon="pi pi-pencil"
                  className="p-button-info p-button-sm"
                  onClick={() => editarHojaRuta(row)}
                  tooltip="Editar hoja de ruta"
                />
                <Button
                  icon="pi pi-trash"
                  className="p-button-danger p-button-sm"
                  onClick={() => confirmarEliminacion(row.id)}
                  tooltip="Eliminar hoja de ruta"
                />
              </div>
            )}
            style={{ width: '120px' }}
          />
        </DataTable>
      </div>
    </div>
  );
};

export default FacturasAlegra; 
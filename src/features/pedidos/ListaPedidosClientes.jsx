import React, { useEffect, useState, useRef } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  orderBy
} from "firebase/firestore";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { confirmDialog } from "primereact/confirmdialog";
import { Tag } from "primereact/tag";
import { saveAs } from "file-saver";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { ConfirmDialog } from "primereact/confirmdialog";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog } from "primereact/dialog";
import { PedidoForm } from "./CargarPedido";
import { getClientesCatalogo, getProductosCatalogo } from '../../services/firebase';
// Elimino la importación de FacturasAlegra
// import FacturasAlegra from '../facturas/FacturasAlegra';

function ListaPedidosClientes({ user }) {
  const estados = [
    { label: "Todos", value: null },
    { label: "Pendiente", value: "pendiente" },
    { label: "Recibido", value: "recibido" },
    { label: "Enviado", value: "enviado" }
  ];
  const condiciones = [
    { label: "Todos", value: null },
    { label: "Contado", value: "contado" },
    { label: "Cuenta Corriente", value: "cuenta_corriente" }
  ];
  const cobradores = [
    { label: "Todos", value: null },
    { label: "Mariano", value: "Mariano" },
    { label: "Ruben", value: "Ruben" },
    { label: "Diego", value: "Diego" },
    { label: "Guille", value: "Guille" },
    { label: "Santi", value: "Santi" },
    { label: "German", value: "German" }
  ];
  const [pedidos, setPedidos] = useState([]);
  const [expandedPedido, setExpandedPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const toast = useRef(null);
  const [filters, setFilters] = useState({
    fecha: null,
    cliente: "",
    estado: null,
    condicion: null,
    cobrador: null
  });
  const [expandedRows, setExpandedRows] = useState(null);
  // Estado para controlar qué card está expandida en mobile
  const [expandedCardId, setExpandedCardId] = useState(null);
  // Estado para controlar la visibilidad de los filtros
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [productosCatalogo, setProductosCatalogo] = useState([]);
  const [clientesCatalogo, setClientesCatalogo] = useState([]);
  const [loadingClientesCatalogo, setLoadingClientesCatalogo] = useState(true);
  const [catalogoCargado, setCatalogoCargado] = useState(false);
  // Nuevo: estado para el filtro de cliente por id
  const [clienteFiltro, setClienteFiltro] = useState(null);
  const navigate = useNavigate();
  // Estado para el modal de edición
  const [pedidoEditando, setPedidoEditando] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  // Estado para el form del modal de edición
  const [formEdicion, setFormEdicion] = useState(null);

  // Estado y funciones para el cambio de estado con confirmación
  const [confirmarCambioPedido, setConfirmarCambioPedido] = useState({ visible: false, id: null, nuevoEstado: null });

  const cambiarEstadoPedidoAdmin = async (pedido, nuevoEstado) => {
    setConfirmarCambioPedido({ visible: true, id: pedido.id, nuevoEstado });
  };

  const confirmarCambioEstado = async () => {
    if (confirmarCambioPedido.id && confirmarCambioPedido.nuevoEstado) {
      await updateDoc(doc(db, 'pedidosClientes', confirmarCambioPedido.id), { estadoFactura: confirmarCambioPedido.nuevoEstado });
      setConfirmarCambioPedido({ visible: false, id: null, nuevoEstado: null });
    }
  };

  const location = useLocation();

  useEffect(() => {
    const q = query(collection(db, "pedidosClientes"), orderBy("fecha", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });

      // Filtrar según el rol del usuario
      if (user.role === "admin") {
        setPedidos(data);
      } else if (user.role === "Santi" || user.role === "Guille") {
        const filteredData = data.filter((p) => p.cobrador === user.role);
        setPedidos(filteredData);
      } else {
        setPedidos([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (location.state && location.state.cliente) {
      setClienteFiltro(location.state.cliente.id);
    }
  }, [location.state]);

  useEffect(() => {
    async function fetchProductosCatalogo() {
      try {
        const data = await getProductosCatalogo();
        setProductosCatalogo(data);
      } catch (error) {
        console.error('Error al obtener productos de Firestore:', error);
      }
    }
    fetchProductosCatalogo();
  }, []);

  useEffect(() => {
    async function fetchClientesCatalogo() {
      try {
        const data = await getClientesCatalogo();
        setClientesCatalogo(data);
        setCatalogoCargado(true);
      } catch (error) {
        console.error('Error al obtener clientes de Firestore:', error);
      } finally {
        setLoadingClientesCatalogo(false);
      }
    }
    fetchClientesCatalogo();
  }, []);

  const updateEstadoRecepcion = async (pedidoId, newEstado) => {
    setUpdatingId(pedidoId);
    try {
      const pedidoRef = doc(db, "pedidosClientes", pedidoId);
      await updateDoc(pedidoRef, {
        estadoRecepcion: newEstado
      });
      toast.current.show({
        severity: "success",
        summary: "Actualizado",
        detail: `Estado actualizado a: ${newEstado}`
      });
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Error al actualizar el estado"
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = (pedido) => {
    confirmDialog({
      message: `¿Seguro que deseas eliminar el pedido de ${pedido.cliente}?`,
      header: "Confirmar eliminación",
      icon: "pi pi-exclamation-triangle",
      accept: async () => {
        try {
          await deleteDoc(doc(db, "pedidosClientes", pedido.id));
          toast.current.show({
            severity: "success",
            summary: "Eliminado",
            detail: "Pedido eliminado"
          });
        } catch {
          toast.current.show({
            severity: "error",
            summary: "Error",
            detail: "No se pudo eliminar"
          });
        }
      }
    });
  };

  const exportarCSV = () => {
    const rows = pedidos.map((p) => ({
      Fecha: p.fecha && p.fecha.toDate ? p.fecha.toDate().toLocaleDateString("es-AR") : "",
      Cliente: p.cliente,
      Contenido: p.contenido,
      Condición:
        p.condicion === "contado"
          ? "Contado"
          : p.condicion === "cuenta_corriente"
            ? "Cuenta Corriente"
            : "-",
      Estado: p.estadoRecepcion,
      Observaciones: p.observaciones || "",
      Cobrador: p.cobrador
    }));
    const csv = [
      "Fecha,Cliente,Contenido,Condición,Estado,Observaciones,Cobrador",
      ...rows.map(
        (r) =>
          `"${r.Fecha}","${r.Cliente}","${r.Contenido}","${r.Condición}","${r.Estado}","${r.Observaciones}","${r.Cobrador}"`
      )
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "pedidos_clientes.csv");
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "";
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha.seconds * 1000);
    return date.toLocaleDateString("es-AR");
  };

  // Agrego la función detalleExpandido para el DataTable
  const detalleExpandido = (row) => (
    <div style={{ padding: 12 }}>
      <strong>Productos:</strong>
      <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
        {Array.isArray(row.items) && row.items.length > 0 ? row.items.map((item, idx) => (
          <li key={idx}>
            {item.nombreProducto || item.producto} x{item.cantidad} {item.descuento ? `(Bonif. ${item.descuento}%)` : ''}
          </li>
        )) : <li>Sin productos especificados</li>}
      </ul>
    </div>
  );

  // Agrego la función productosDetalle para el DataTable
  const productosDetalle = (row) => (
    <button
      style={{
        background: "#6366f1",
        color: "white",
        border: "none",
        borderRadius: "6px",
        padding: "0.3rem 0.8rem",
        cursor: "pointer",
        fontWeight: 600
      }}
      onClick={() => setExpandedPedido(expandedPedido === row.id ? null : row.id)}
    >
      {expandedPedido === row.id ? "Ocultar" : "Ver detalle"}
    </button>
  );

  // Agrego la función condicionTag para el DataTable
  const condicionTag = (row) => (
    <Tag
      value={row.condicion === 'cuenta_corriente' ? 'Cuenta Corriente' : 'Contado'}
      severity={row.condicion === 'cuenta_corriente' ? 'info' : 'success'}
    />
  );

  // Agrego la función estadoTag para el DataTable
  const estadoTag = (row) => (
    <Tag
      value={(row.estadoFactura || 'pendiente') === 'facturado' ? 'Facturado' : 'Pendiente'}
      severity={(row.estadoFactura || 'pendiente') === 'facturado' ? 'success' : 'warning'}
    />
  );

  // Agrego la función accionesPedido para el DataTable
  const accionesPedido = (row) => (
    <div className="flex gap-1">
      {user.role === 'admin' && ((row.estadoFactura || 'pendiente') === 'pendiente' ? (
        <Button icon="pi pi-check" className="p-button-text p-button-success" tooltip="Marcar como Facturado" onClick={() => cambiarEstadoPedidoAdmin(row, 'facturado')} />
      ) : (
        <Button icon="pi pi-undo" className="p-button-text p-button-warning" tooltip="Volver a Pendiente" onClick={() => cambiarEstadoPedidoAdmin(row, 'pendiente')} />
      ))}
      <Button icon="pi pi-pencil" className="p-button-text p-button-info" tooltip="Editar pedido" onClick={() => {
        setPedidoEditando(row);
        setFormEdicion(transformarPedidoAForm(row));
        setModalVisible(true);
      }} />
      {user.role === 'admin' && (
        <Button icon="pi pi-trash" className="p-button-text p-button-danger" tooltip="Eliminar pedido" onClick={() => handleDelete(row)} />
      )}
    </div>
  );

  // Filtrar pedidos por estado
  const pedidosPendientes = pedidos.filter(p => (p.estadoFactura || 'pendiente') === 'pendiente');
  const pedidosFacturados = pedidos.filter(p => p.estadoFactura === 'facturado');

  // ... (resto de la lógica igual)

  // Renderizado SOLO de las dos listas nuevas
  return (
    <div
      style={{
        maxWidth: "100%",
        margin: "0 auto",
        padding: "1.5rem",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        minHeight: "100vh"
      }}
    >
      <Toast ref={toast} />
      <ConfirmDialog />
      {/* Header y filtros igual que tu archivo original */}
      {/* ... */}
      {/* Lista de pedidos pendientes */}
      <Card className="p-mb-3">
        <h2 style={{ color: '#1f2937' }}>Pedidos Pendientes</h2>
        <DataTable value={pedidosPendientes} dataKey="id" paginator rows={10} responsiveLayout="stack" emptyMessage="No hay pedidos pendientes." className="p-datatable-sm p-fluid p-mt-3"
          expandedRows={expandedPedido ? { [expandedPedido]: true } : null}
          onRowToggle={e => setExpandedPedido(e.data ? Object.keys(e.data)[0] : null)}
          rowExpansionTemplate={detalleExpandido}
        >
          <Column expander style={{ width: '3em' }} />
          <Column field="fecha" header="Fecha" body={row => formatFecha(row.fecha)} />
          <Column field="cliente" header="Cliente" />
          <Column header="Productos" body={productosDetalle} />
          <Column field="condicion" header="Condición" body={condicionTag} />
          <Column header="Estado" body={estadoTag} />
          <Column field="observaciones" header="Observaciones" />
          <Column field="vendedor" header="Vendedor" />
          <Column header="Acciones" body={accionesPedido} />
        </DataTable>
      </Card>
      {/* Lista de pedidos facturados */}
      <Card className="p-mb-3">
        <h2 style={{ color: '#1f2937' }}>Pedidos Facturados</h2>
        <DataTable value={pedidosFacturados} dataKey="id" paginator rows={10} responsiveLayout="stack" emptyMessage="No hay pedidos facturados." className="p-datatable-sm p-fluid p-mt-3"
          expandedRows={expandedPedido ? { [expandedPedido]: true } : null}
          onRowToggle={e => setExpandedPedido(e.data ? Object.keys(e.data)[0] : null)}
          rowExpansionTemplate={detalleExpandido}
        >
          <Column expander style={{ width: '3em' }} />
          <Column field="fecha" header="Fecha" body={row => formatFecha(row.fecha)} />
          <Column field="cliente" header="Cliente" />
          <Column header="Productos" body={productosDetalle} />
          <Column field="condicion" header="Condición" body={condicionTag} />
          <Column header="Estado" body={estadoTag} />
          <Column field="observaciones" header="Observaciones" />
          <Column field="vendedor" header="Vendedor" />
          <Column header="Acciones" body={accionesPedido} />
        </DataTable>
      </Card>
      <ConfirmDialog visible={confirmarCambioPedido.visible} onHide={() => setConfirmarCambioPedido({ visible: false, id: null, nuevoEstado: null })}
        message="¿Seguro que deseas cambiar el estado de este pedido?" header="Confirmar cambio de estado" icon="pi pi-exclamation-triangle"
        accept={confirmarCambioEstado} reject={() => setConfirmarCambioPedido({ visible: false, id: null, nuevoEstado: null })} />
    </div>
  );
}

export default ListaPedidosClientes;
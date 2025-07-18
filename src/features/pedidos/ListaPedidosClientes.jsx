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

  const location = useLocation();

  useEffect(() => {
    const q = query(collection(db, "pedidosClientes"), orderBy("fecha", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });

      console.log("Todos los pedidos de clientes cargados:", data.length);
      console.log("Usuario actual:", user);
      console.log("Rol del usuario:", user?.role);

      // Filtrar según el rol del usuario
      if (user.role === "admin") {
        // Admin ve todos los pedidos
        console.log("Admin - mostrando todos los pedidos de clientes");
        setPedidos(data);
      } else if (user.role === "Santi" || user.role === "Guille") {
        // Santi y Guille solo ven sus propios pedidos
        const filteredData = data.filter((p) => p.cobrador === user.role);
        console.log("Filtrando pedidos por cobrador:", user.role);
        console.log("Pedidos filtrados:", filteredData.length);
        setPedidos(filteredData);
      } else {
        console.log("Usuario sin rol válido");
        setPedidos([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    // Si se navega desde SelectorCliente, fijar el cliente seleccionado
    if (location.state && location.state.cliente) {
      setClienteFiltro(location.state.cliente.id);
    }
  }, [location.state]);

  useEffect(() => {
    // Cargar productos del catálogo para mostrar nombres
    async function fetchProductosCatalogo() {
      try {
        const response = await fetch('http://localhost:3001/api/sheets/productos');
        if (!response.ok) throw new Error('Error al obtener productos de Sheets');
        const data = await response.json();
        setProductosCatalogo(data);
      } catch (error) {
        console.error('Error al obtener productos de Sheets:', error);
      }
    }
    fetchProductosCatalogo();
  }, []);

  // Cargar catálogo de clientes de forma independiente
  useEffect(() => {
    async function fetchClientesCatalogo() {
      try {
        const response = await fetch('http://localhost:3001/api/sheets/clientes');
        if (!response.ok) throw new Error('Error al obtener clientes de Sheets');
        const data = await response.json();
        setClientesCatalogo(data);
        setCatalogoCargado(true);
      } catch (error) {
        console.error('Error al obtener clientes de Sheets:', error);
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
      console.error("Error al actualizar estado:", error);
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

  const estadoRecepcionTemplate = (rowData) => {
    const getSeverity = (estado) => {
      switch (estado) {
        case "recibido":
          return "success";
        case "enviado":
          return "info";
        default:
          return "warning";
      }
    };

    const getLabel = (estado) => {
      switch (estado) {
        case "recibido":
          return "Recibido";
        case "enviado":
          return "Enviado";
        default:
          return "Pendiente";
      }
    };

    // Lógica para determinar el siguiente estado
    const getNextEstado = (estado) => {
      if (estado === "pendiente") return "recibido";
      if (estado === "recibido") return "enviado";
      return "pendiente";
    };

    return (
      <div className="flex align-items-center gap-2">
        <Tag
          value={getLabel(rowData.estadoRecepcion)}
          severity={getSeverity(rowData.estadoRecepcion)}
          className="text-sm font-semibold"
          style={{
            borderRadius: "20px",
            padding: "0.4rem 0.8rem",
            fontSize: "0.75rem",
            fontWeight: "600"
          }}
        />
      </div>
    );
  };

  const contenidoTemplate = (rowData) => (
    <div style={{ maxWidth: "300px", wordWrap: "break-word" }}>{rowData.contenido}</div>
  );

  const observacionesTemplate = (rowData) => (
    <div
      style={{
        maxWidth: "200px",
        wordWrap: "break-word",
        color: rowData.observaciones ? "#374151" : "#9ca3af",
        fontStyle: rowData.observaciones ? "normal" : "italic"
      }}
    >
      {rowData.observaciones || "Sin observaciones"}
    </div>
  );

  const condicionTemplate = (rowData) => (
    <Tag
      value={
        rowData.condicion === "contado"
          ? "Contado"
          : rowData.condicion === "cuenta_corriente"
            ? "Cuenta Corriente"
            : "-"
      }
      severity={
        rowData.condicion === "contado"
          ? "success"
          : rowData.condicion === "cuenta_corriente"
            ? "info"
            : "secondary"
      }
      style={{
        borderRadius: "15px",
        fontSize: "0.75rem",
        fontWeight: "500"
      }}
    />
  );

  const accionesTemplate = (rowData) => (
    <div className="flex gap-1 justify-content-center">
      {user?.role === "admin" && (
        <>
          <Button
            icon="pi pi-pencil"
            className="p-button-text p-button-sm"
            size="small"
            onClick={() => {
              setPedidoEditando(rowData);
              setFormEdicion(transformarPedidoAForm(rowData));
              setModalVisible(true);
            }}
            tooltip="Editar pedido"
            tooltipOptions={{ position: "top" }}
            style={{ color: "#6366f1", borderRadius: "50%", width: "2rem", height: "2rem" }}
          />
          <Button
            icon="pi pi-trash"
            className="p-button-text p-button-sm"
            size="small"
            onClick={() => handleDelete(rowData)}
            tooltip="Eliminar pedido"
            tooltipOptions={{ position: "top" }}
            style={{ color: "#ef4444", borderRadius: "50%", width: "2rem", height: "2rem" }}
          />
          <Button
            label={
              !rowData.estadoRecepcion || rowData.estadoRecepcion === 'pendiente'
                ? 'Marcar recibido'
                : rowData.estadoRecepcion === 'recibido'
                ? 'Marcar enviado'
                : 'Volver a pendiente'
            }
            icon={
              !rowData.estadoRecepcion || rowData.estadoRecepcion === 'pendiente'
                ? 'pi pi-check'
                : rowData.estadoRecepcion === 'recibido'
                ? 'pi pi-send'
                : 'pi pi-undo'
            }
            className={
              !rowData.estadoRecepcion || rowData.estadoRecepcion === 'pendiente'
                ? 'p-button-success p-button-sm'
                : rowData.estadoRecepcion === 'recibido'
                ? 'p-button-info p-button-sm'
                : 'p-button-warning p-button-sm'
            }
            style={{ minWidth: 40, padding: '0.4rem 0.7rem', fontWeight: 600, fontSize: '0.85rem', borderRadius: 8 }}
            onClick={() => {
              if (rowData.estadoRecepcion === 'pendiente') {
                updateEstadoRecepcion(rowData.id, 'recibido');
              } else if (rowData.estadoRecepcion === 'recibido') {
                updateEstadoRecepcion(rowData.id, 'enviado');
              } else if (rowData.estadoRecepcion === 'enviado') {
                confirmDialog({
                  message: '¿Seguro que deseas volver el estado a pendiente?',
                  header: 'Confirmar cambio de estado',
                  icon: 'pi pi-exclamation-triangle',
                  accept: () => updateEstadoRecepcion(rowData.id, 'pendiente')
                });
              } else {
                updateEstadoRecepcion(rowData.id, 'pendiente');
              }
            }}
          />
        </>
      )}
    </div>
  );

  // Renderiza la tabla interna de ítems
  const itemsTemplate = (rowData) => {
    if (Array.isArray(rowData.items) && rowData.items.length > 0) {
      // Log de catálogo y productos de pedido para depuración
      console.log('Catálogo de productos:', productosCatalogo);
      rowData.items.forEach((item, idx) => {
        console.log(`Producto en pedido [${idx}]:`, item.producto, 'nombreProducto:', item.nombreProducto);
      });
      return (
        <div style={{ padding: "1rem" }}>
          <h4
            style={{
              margin: "0 0 1rem 0",
              color: "#374151",
              fontSize: "1rem",
              fontWeight: "600"
            }}
          >
            Detalle de Productos
          </h4>
          <div
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "12px",
              padding: "1rem",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
            }}
          >
            {rowData.items.map((item, idx) => {
              let nombre = item.nombreProducto;
              if (!nombre && productosCatalogo.length > 0) {
                const prod = productosCatalogo.find(p => p.id === item.producto);
                nombre = prod ? prod.producto : item.producto;
              }
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem 1rem",
                    background: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "8px",
                    marginBottom: idx < rowData.items.length - 1 ? "0.5rem" : "0",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.9rem",
                      color: "#374151",
                      fontWeight: "500"
                    }}
                  >
                    {nombre}
                  </span>
                  <span
                    style={{
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "20px",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      minWidth: "3rem",
                      textAlign: "center"
                    }}
                  >
                    {item.cantidad}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    } else if (rowData.contenido) {
      return (
        <div
          style={{
            padding: "1rem",
            background: "#f8fafc",
            borderRadius: "8px",
            border: "1px solid #e2e8f0"
          }}
        >
          <div style={{ maxWidth: "300px", wordWrap: "break-word" }}>{rowData.contenido}</div>
        </div>
      );
    } else {
      return (
        <div
          style={{
            padding: "1rem",
            textAlign: "center",
            color: "#9ca3af",
            fontStyle: "italic"
          }}
        >
          Sin información adicional
        </div>
      );
    }
  };

  // Componente para mostrar el nombre del cliente con carga asíncrona
  const ClienteNombre = ({ clienteId }) => {
    const [nombre, setNombre] = useState(clienteId);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      const cargarNombre = async () => {
        // Si ya tenemos el catálogo cargado, buscar ahí
        if (catalogoCargado && clientesCatalogo.length > 0) {
          const cliente = clientesCatalogo.find(c => c.id === clienteId);
          if (cliente) {
            setNombre(cliente.razonSocial);
            return;
          }
        }
        
        // Si no tenemos el catálogo o no encontramos el cliente, hacer fetch directo
        setLoading(true);
        try {
          const response = await fetch('http://localhost:3001/api/sheets/clientes');
          if (!response.ok) throw new Error('Error al obtener clientes de Sheets');
          const data = await response.json();
          const cliente = data.find(c => c.id === clienteId);
          setNombre(cliente ? cliente.razonSocial : clienteId);
        } catch (error) {
          console.error('Error al obtener cliente:', error);
          setNombre(clienteId);
        } finally {
          setLoading(false);
        }
      };

      cargarNombre();
    }, [clienteId, catalogoCargado, clientesCatalogo]);

    return (
      <span
        style={{
          fontWeight: "600",
          color: "#1f2937"
        }}
      >
        {loading ? `${clienteId} (cargando...)` : nombre}
      </span>
    );
  };

  // Función para obtener la razón social del cliente (mantener para compatibilidad)
  const getRazonSocial = (clienteId) => {
    if (catalogoCargado && clientesCatalogo.length > 0) {
      const cliente = clientesCatalogo.find(c => c.id === clienteId);
      return cliente ? cliente.razonSocial : clienteId;
    }
    return clienteId;
  };

  // Opciones para el Dropdown de clientes
  const clienteOptions = clientesCatalogo.map((c) => ({ label: c.razonSocial || '(Sin nombre)', value: c.id }));

  // Filtrado local
  const pedidosFiltrados = pedidos.filter((p) => {
    // Fecha
    if (filters.fecha && p.fecha) {
      const fechaPedido = p.fecha.toDate ? p.fecha.toDate() : new Date(p.fecha.seconds * 1000);
      if (fechaPedido.toLocaleDateString("es-AR") !== filters.fecha.toLocaleDateString("es-AR"))
        return false;
    }
    // Cliente (por id)
    if (clienteFiltro && p.cliente !== clienteFiltro) return false;
    // Estado
    if (filters.estado && p.estadoRecepcion !== filters.estado) return false;
    // Condición
    if (filters.condicion && p.condicion !== filters.condicion) return false;
    // Cobrador (solo admin)
    if (user.role === "admin" && filters.cobrador && p.cobrador !== filters.cobrador) return false;
    return true;
  });

  const clearFilters = () => {
    setFilters({
      fecha: null,
      cliente: "",
      estado: null,
      condicion: null,
      cobrador: null
    });
    setClienteFiltro(null); // Limpiar el filtro de cliente
  };

  const handleRefrescarClientes = async () => {
    setLoadingClientesCatalogo(true);
    try {
      const response = await fetch('http://localhost:3001/api/sheets/clientes?refresh=true');
      if (!response.ok) throw new Error('Error al refrescar clientes de Sheets');
      const data = await response.json();
      setClientesCatalogo(data);
      setCatalogoCargado(true);
    } catch (error) {
      console.error('Error al refrescar clientes de Sheets:', error);
    } finally {
      setLoadingClientesCatalogo(false);
    }
  };

  const handleRefrescarProductos = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/sheets/productos?refresh=true');
      if (!response.ok) throw new Error('Error al refrescar productos de Sheets');
      const data = await response.json();
      setProductosCatalogo(data);
    } catch (error) {
      console.error('Error al refrescar productos de Sheets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para transformar el pedido al formato del formulario
  function transformarPedidoAForm(pedido) {
    return {
      ...pedido,
      fecha: pedido.fecha && pedido.fecha.toDate ? pedido.fecha.toDate() : (pedido.fecha instanceof Date ? pedido.fecha : new Date(pedido.fecha)),
      cliente: pedido.cliente,
      items: (pedido.items || []).map(item => ({
        producto: item.producto,
        cantidad: item.cantidad,
        descuento: item.descuento || 0
      })),
      condicion: pedido.condicion || '',
      observaciones: pedido.observaciones || '',
      vendedor: pedido.vendedor || ''
    };
  }

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

      {/* Header con título y botones para móvil */}
      <div className="pedidos-header-mobile" style={{ display: 'none' }}>
        <div
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "1.5rem",
            color: "white",
            borderRadius: "16px 16px 0 0"
          }}
        >
          <div className="flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h1
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  letterSpacing: "-0.025em"
                }}
              >
                Pedidos de Clientes
              </h1>
              <p
                style={{
                  margin: "0",
                  fontSize: "0.9rem",
                  opacity: "0.9",
                  fontWeight: "400"
                }}
              >
                Gestiona y supervisa todos los pedidos de clientes
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-content-center">
              {user.role === "admin" && (
                <Button
                  label="Exportar CSV"
                  icon="pi pi-download"
                  className="p-button-outlined"
                  onClick={exportarCSV}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    color: "white",
                    borderRadius: "12px",
                    padding: "0.5rem 1rem",
                    fontWeight: "600",
                    backdropFilter: "blur(10px)",
                    fontSize: "0.8rem"
                  }}
                />
              )}
              <Button
                label="Filtros"
                icon={filtersVisible ? "pi pi-chevron-up" : "pi pi-filter"}
                className="p-button-outlined"
                onClick={() => setFiltersVisible(!filtersVisible)}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                  color: "white",
                  borderRadius: "12px",
                  padding: "0.5rem 1rem",
                  fontWeight: "600",
                  backdropFilter: "blur(10px)",
                  fontSize: "0.8rem"
                }}
              />
            </div>
          </div>
        </div>

        {/* Filtros desplegables para móvil */}
        {filtersVisible && (
          <div
            style={{
              padding: "1.5rem",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0"
            }}
          >
            <div className="grid">
              <div className="col-12">
                <label className="block mb-2 text-sm font-semibold" style={{ color: "#374151" }}>
                  <i className="pi pi-calendar mr-2"></i>Fecha
                </label>
                <Calendar
                  value={filters.fecha}
                  onChange={(e) => setFilters({ ...filters, fecha: e.value })}
                  dateFormat="dd/mm/yy"
                  showIcon
                  placeholder="Selecciona fecha"
                  className="w-full"
                  style={{ borderRadius: "8px" }}
                />
              </div>
              <div className="col-12">
                <label className="block mb-2 text-sm font-semibold" style={{ color: "#374151" }}>
                  <i className="pi pi-user mr-2"></i>Cliente
                </label>
                <Dropdown
                  value={clienteFiltro}
                  options={[{ label: 'Todos', value: null }, ...clienteOptions]}
                  onChange={(e) => setClienteFiltro(e.value)}
                  placeholder="Filtrar por cliente"
                  className="w-full"
                  style={{ borderRadius: "8px" }}
                />
                <Button label="Refrescar clientes" icon="pi pi-refresh" onClick={handleRefrescarClientes} severity="info" outlined size="small" style={{ marginLeft: 8, marginBottom: 8 }} />
                <Button label="Refrescar productos" icon="pi pi-refresh" onClick={handleRefrescarProductos} severity="info" outlined size="small" style={{ marginLeft: 8, marginBottom: 8 }} />
              </div>
              <div className="col-12">
                <label className="block mb-2 text-sm font-semibold" style={{ color: "#374151" }}>
                  <i className="pi pi-flag mr-2"></i>Estado
                </label>
                <Dropdown
                  value={filters.estado}
                  options={estados}
                  onChange={(e) => setFilters({ ...filters, estado: e.value })}
                  placeholder="Selecciona estado"
                  className="w-full"
                  style={{ borderRadius: "8px" }}
                />
              </div>
              <div className="col-12">
                <label className="block mb-2 text-sm font-semibold" style={{ color: "#374151" }}>
                  <i className="pi pi-credit-card mr-2"></i>Condición
                </label>
                <Dropdown
                  value={filters.condicion}
                  options={condiciones}
                  onChange={(e) => setFilters({ ...filters, condicion: e.value })}
                  placeholder="Selecciona condición"
                  className="w-full"
                  style={{ borderRadius: "8px" }}
                />
              </div>
              {user.role === "admin" && (
                <div className="col-12">
                  <label className="block mb-2 text-sm font-semibold" style={{ color: "#374151" }}>
                    <i className="pi pi-users mr-2"></i>Registrado por
                  </label>
                  <Dropdown
                    value={filters.cobrador}
                    options={cobradores}
                    onChange={(e) => setFilters({ ...filters, cobrador: e.value })}
                    placeholder="Selecciona cobrador"
                    className="w-full"
                    style={{ borderRadius: "8px" }}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-content-end mt-3">
              <Button
                label="Limpiar filtros"
                icon="pi pi-times"
                className="p-button-outlined p-button-sm"
                onClick={clearFilters}
                style={{
                  borderRadius: "8px",
                  fontWeight: "500"
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          background: "white",
          borderRadius: "16px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          overflow: "hidden"
        }}
      >
        {/* Header para desktop */}
        <div className="pedidos-header-desktop"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "2rem",
            color: "white"
          }}
        >
          <div className="flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h1
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "1.875rem",
                  fontWeight: "700",
                  letterSpacing: "-0.025em"
                }}
              >
                Pedidos de Clientes
              </h1>
              <p
                style={{
                  margin: "0",
                  fontSize: "1rem",
                  opacity: "0.9",
                  fontWeight: "400"
                }}
              >
                Gestiona y supervisa todos los pedidos de clientes
              </p>
            </div>
            {user.role === "admin" && (
              <Button
                label="Exportar CSV"
                icon="pi pi-download"
                className="p-button-outlined"
                onClick={exportarCSV}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                  color: "white",
                  borderRadius: "12px",
                  padding: "0.75rem 1.5rem",
                  fontWeight: "600",
                  backdropFilter: "blur(10px)"
                }}
              />
            )}
          </div>
        </div>

        {/* Botón para mostrar/ocultar filtros - Solo desktop */}
        <div className="pedidos-filters-desktop"
          style={{
            padding: "1.5rem 2rem",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0"
          }}
        >
          <div className="flex justify-content-between align-items-center">
            <h3
              style={{
                margin: "0",
                color: "#374151",
                fontSize: "1.25rem",
                fontWeight: "600"
              }}
            >
              Filtros
            </h3>
            <Button
              label="Filtros"
              icon={filtersVisible ? "pi pi-chevron-up" : "pi pi-filter"}
              className="p-button-outlined p-button-sm"
              onClick={() => setFiltersVisible(!filtersVisible)}
              style={{
                borderRadius: "8px",
                fontWeight: "500"
              }}
            />
          </div>
        </div>

        {/* Filtros desplegables - Solo desktop */}
        {filtersVisible && (
          <div className="pedidos-filters-desktop"
            style={{
              padding: "2rem",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0"
            }}
          >
            <div className="grid">
              <div className="col-12 md:col-6 lg:col-2">
                <label className="block mb-2 text-sm font-semibold" style={{ color: "#374151" }}>
                  <i className="pi pi-calendar mr-2"></i>Fecha
                </label>
                <Calendar
                  value={filters.fecha}
                  onChange={(e) => setFilters({ ...filters, fecha: e.value })}
                  dateFormat="dd/mm/yy"
                  showIcon
                  placeholder="Selecciona fecha"
                  className="w-full"
                  style={{ borderRadius: "8px" }}
                />
              </div>
              <div className="col-12 md:col-6 lg:col-2">
                <label className="block mb-2 text-sm font-semibold" style={{ color: "#374151" }}>
                  <i className="pi pi-user mr-2"></i>Cliente
                </label>
                <Dropdown
                  value={clienteFiltro}
                  options={[{ label: 'Todos', value: null }, ...clienteOptions]}
                  onChange={(e) => setClienteFiltro(e.value)}
                  placeholder="Filtrar por cliente"
                  className="w-full"
                  style={{ borderRadius: "8px" }}
                />
                <Button label="Refrescar clientes" icon="pi pi-refresh" onClick={handleRefrescarClientes} severity="info" outlined size="small" style={{ marginLeft: 8, marginBottom: 8 }} />
                <Button label="Refrescar productos" icon="pi pi-refresh" onClick={handleRefrescarProductos} severity="info" outlined size="small" style={{ marginLeft: 8, marginBottom: 8 }} />
              </div>
              <div className="col-12 md:col-6 lg:col-2">
                <label className="block mb-2 text-sm font-semibold" style={{ color: "#374151" }}>
                  <i className="pi pi-flag mr-2"></i>Estado
                </label>
                <Dropdown
                  value={filters.estado}
                  options={estados}
                  onChange={(e) => setFilters({ ...filters, estado: e.value })}
                  placeholder="Selecciona estado"
                  className="w-full"
                  style={{ borderRadius: "8px" }}
                />
              </div>
              <div className="col-12 md:col-6 lg:col-2">
                <label className="block mb-2 text-sm font-semibold" style={{ color: "#374151" }}>
                  <i className="pi pi-credit-card mr-2"></i>Condición
                </label>
                <Dropdown
                  value={filters.condicion}
                  options={condiciones}
                  onChange={(e) => setFilters({ ...filters, condicion: e.value })}
                  placeholder="Selecciona condición"
                  className="w-full"
                  style={{ borderRadius: "8px" }}
                />
              </div>
              {user.role === "admin" && (
                <div className="col-12 md:col-6 lg:col-2">
                  <label className="block mb-2 text-sm font-semibold" style={{ color: "#374151" }}>
                    <i className="pi pi-users mr-2"></i>Registrado por
                  </label>
                  <Dropdown
                    value={filters.cobrador}
                    options={cobradores}
                    onChange={(e) => setFilters({ ...filters, cobrador: e.value })}
                    placeholder="Selecciona cobrador"
                    className="w-full"
                    style={{ borderRadius: "8px" }}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-content-end mt-3">
              <Button
                label="Limpiar filtros"
                icon="pi pi-times"
                className="p-button-outlined p-button-sm"
                onClick={clearFilters}
                style={{
                  borderRadius: "8px",
                  fontWeight: "500"
                }}
              />
            </div>
          </div>
        )}

        {/* Tabla */}
        <div style={{ padding: "2rem" }}>
          <div className="mb-3 flex justify-content-between align-items-center">
            <span
              style={{
                color: "#6b7280",
                fontSize: "0.875rem",
                fontWeight: "500"
              }}
            >
              {pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? "s" : ""} encontrado
              {pedidosFiltrados.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Vista tipo cards para mobile */}
          <div className="pedidos-cards-mobile" style={{ display: 'none' }}>
            {pedidosFiltrados.length === 0 && !loading && (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '1rem' }}>No hay pedidos de clientes registrados.</div>
            )}
            {pedidosFiltrados.map((pedido) => (
              <div key={pedido.id} className="pedido-card-mobile" style={{
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                marginBottom: 16,
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontSize: '0.98rem',
                wordBreak: 'break-word',
                position: 'relative'
              }}>
                <div><b>Fecha:</b> {formatFecha(pedido.fecha)}</div>
                <div><b>Cliente:</b> <ClienteNombre clienteId={pedido.cliente} /></div>
                <div><b>Condición:</b> {pedido.condicion === 'contado' ? 'Contado' : pedido.condicion === 'cuenta_corriente' ? 'Cuenta Corriente' : '-'}</div>
                <div><b>Estado:</b> <Tag value={pedido.estadoRecepcion} severity={pedido.estadoRecepcion === 'recibido' ? 'success' : pedido.estadoRecepcion === 'enviado' ? 'info' : 'warning'} /></div>
                <div><b>Observaciones:</b> {pedido.observaciones || '-'}</div>
                <div><b>Registrado por:</b> {pedido.cobrador}</div>
                {/* Botones mejorados */}
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <Button 
                    icon={expandedCardId === pedido.id ? "pi pi-chevron-up" : "pi pi-eye"}
                    className="p-button-rounded p-button-info p-button-sm"
                    style={{ minWidth: 40, padding: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}
                    label={expandedCardId === pedido.id ? "Ocultar" : "Ver detalle"}
                    onClick={() => setExpandedCardId(expandedCardId === pedido.id ? null : pedido.id)}
                  />
                  {user.role === 'admin' && (
                    <Button 
                      icon="pi pi-pencil" 
                      className="p-button-rounded p-button-info p-button-sm"
                      style={{ minWidth: 40, padding: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}
                      label="Editar"
                      onClick={() => navigate('/cargar-pedido', { state: { pedido: pedido, editar: true } })}
                    />
                  )}
                  {user.role === 'admin' && (
                    <Button 
                      icon="pi pi-trash" 
                      className="p-button-rounded p-button-danger p-button-sm"
                      style={{ minWidth: 40, padding: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}
                      label="Eliminar"
                      onClick={() => handleDelete(pedido)} 
                    />
                  )}
                  {/* Botón único para cambiar estado en mobile */}
                  {user.role === 'admin' && (
                    <Button
                      label={
                        pedido.estadoRecepcion === 'pendiente'
                          ? 'Marcar recibido'
                          : pedido.estadoRecepcion === 'recibido'
                          ? 'Marcar enviado'
                          : 'Volver a pendiente'
                      }
                      icon={
                        pedido.estadoRecepcion === 'pendiente'
                          ? 'pi pi-check'
                          : pedido.estadoRecepcion === 'recibido'
                          ? 'pi pi-send'
                          : 'pi pi-undo'
                      }
                      className={
                        pedido.estadoRecepcion === 'pendiente'
                          ? 'p-button-success p-button-sm'
                          : pedido.estadoRecepcion === 'recibido'
                          ? 'p-button-info p-button-sm'
                          : 'p-button-warning p-button-sm'
                      }
                      style={{ minWidth: 40, padding: '0.4rem 0.7rem', fontWeight: 600, fontSize: '0.85rem', borderRadius: 8 }}
                      onClick={() => {
                        if (pedido.estadoRecepcion === 'pendiente') {
                          updateEstadoRecepcion(pedido.id, 'recibido');
                        } else if (pedido.estadoRecepcion === 'recibido') {
                          updateEstadoRecepcion(pedido.id, 'enviado');
                        } else if (pedido.estadoRecepcion === 'enviado') {
                          confirmDialog({
                            message: '¿Seguro que deseas volver el estado a pendiente?',
                            header: 'Confirmar cambio de estado',
                            icon: 'pi pi-exclamation-triangle',
                            accept: () => updateEstadoRecepcion(pedido.id, 'pendiente')
                          });
                        }
                      }}
                    />
                  )}
                </div>
                {/* Acordeón de detalle de productos */}
                {expandedCardId === pedido.id && (
                  <div style={{
                    background: '#f1f5f9',
                    borderRadius: 8,
                    marginTop: 10,
                    padding: '0.7rem 0.8rem',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    fontSize: '0.95rem',
                    color: '#374151'
                  }}>
                    <b>Productos:</b>
                    <ul style={{ margin: '0.5rem 0 0 0.5rem', padding: 0 }}>
                      {pedido.items && Array.isArray(pedido.items) && pedido.items.length > 0 ? (
                        pedido.items.map((item, idx) => (
                          <li key={idx} style={{ marginBottom: 4 }}>
                            {item.nombreProducto ? <b>{item.nombreProducto}</b> : null} {item.producto ? `(${item.producto})` : ''} {item.cantidad ? `x${item.cantidad}` : ''} {item.observaciones ? `- ${item.observaciones}` : ''}
                          </li>
                        ))
                      ) : (
                        <li>No hay productos cargados.</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tabla tradicional para desktop */}
          <div className="pedidos-table-desktop">
            <DataTable
              value={pedidosFiltrados}
              paginator
              rows={10}
              responsiveLayout="stack"
              emptyMessage="No hay pedidos de clientes registrados."
              className="p-datatable-sm"
              loading={loading}
              rowExpansionTemplate={itemsTemplate}
              expandedRows={expandedRows}
              onRowToggle={(e) => setExpandedRows(e.data)}
              style={{
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
              }}
            >
              <Column
                expander
                style={{
                  width: "3rem",
                  background: "#f8fafc"
                }}
              />
              <Column
                field="fecha"
                header="Fecha"
                body={(row) => (
                  <span
                    style={{
                      fontWeight: "500",
                      color: "#374151"
                    }}
                  >
                    {formatFecha(row.fecha)}
                  </span>
                )}
                style={{
                  minWidth: "120px",
                  background: "#f8fafc"
                }}
              />
              <Column
                field="cliente"
                header="Cliente"
                body={(row) => (
                  <ClienteNombre clienteId={row.cliente} />
                )}
                style={{
                  minWidth: "150px"
                }}
              />
              <Column
                field="items"
                header="Productos"
                body={() => (
                  <div className="flex align-items-center gap-2">
                    <i className="pi pi-eye" style={{ color: "#6366f1" }}></i>
                    <span
                      style={{
                        color: "#6366f1",
                        fontWeight: "500",
                        fontSize: "0.875rem"
                      }}
                    >
                      Ver detalle
                    </span>
                  </div>
                )}
                style={{
                  minWidth: "120px"
                }}
              />
              <Column
                field="condicion"
                header="Condición"
                body={condicionTemplate}
                style={{
                  minWidth: "130px"
                }}
              />
              <Column
                field="estadoRecepcion"
                header="Estado"
                body={estadoRecepcionTemplate}
                style={{
                  minWidth: "150px"
                }}
              />
              <Column
                field="observaciones"
                header="Observaciones"
                body={observacionesTemplate}
                style={{
                  minWidth: "200px"
                }}
              />
              <Column
                field="cobrador"
                header="Registrado por"
                body={(row) => (
                  <div className="flex align-items-center gap-2">
                    <i className="pi pi-user" style={{ color: "#6b7280" }}></i>
                    <span
                      style={{
                        fontWeight: "500",
                        color: "#374151"
                      }}
                    >
                      {row.cobrador}
                    </span>
                  </div>
                )}
                style={{
                  minWidth: "140px"
                }}
              />
              <Column
                header="Acciones"
                body={accionesTemplate}
                style={{
                  width: "80px",
                  textAlign: "center"
                }}
              />
            </DataTable>
          </div>
          {/* Estilos para alternar entre tabla y cards según el tamaño de pantalla */}
          <style>{`
            @media (max-width: 768px) {
              .pedidos-table-desktop { display: none !important; }
              .pedidos-cards-mobile { display: block !important; }
              .pedidos-header-mobile { display: block !important; }
              .pedidos-header-desktop { display: none !important; }
              .pedidos-filters-desktop { display: none !important; }
            }
            @media (min-width: 769px) {
              .pedidos-table-desktop { display: block !important; }
              .pedidos-cards-mobile { display: none !important; }
              .pedidos-header-mobile { display: none !important; }
              .pedidos-header-desktop { display: block !important; }
              .pedidos-filters-desktop { display: block !important; }
            }
          `}</style>
        </div>
      </div>
      <Dialog header="Editar Pedido" visible={modalVisible} style={{ width: '90vw', maxWidth: 600 }} onHide={() => setModalVisible(false)}>
        {pedidoEditando && formEdicion && (
          <PedidoForm
            form={formEdicion}
            setForm={setFormEdicion}
            productosAlegra={productosCatalogo}
            clientes={clientesCatalogo}
            loading={loading}
            loadingProductosAlegra={false}
            loadingClientes={false}
            onSubmit={() => setModalVisible(false)}
            onCancel={() => setModalVisible(false)}
            user={user}
            modoEdicion={true}
          />
        )}
      </Dialog>
    </div>
  );
}

export default ListaPedidosClientes;

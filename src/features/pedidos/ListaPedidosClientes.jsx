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
        const filteredData = data.filter(p => p.cobrador === user.role);
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

  const updateEstadoRecepcion = async (pedidoId, newEstado) => {
    setUpdatingId(pedidoId);
    try {
      const pedidoRef = doc(db, "pedidosClientes", pedidoId);
      await updateDoc(pedidoRef, {
        estadoRecepcion: newEstado
      });
      toast.current.show({ 
        severity: 'success', 
        summary: 'Actualizado', 
        detail: `Estado actualizado a: ${newEstado}` 
      });
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      toast.current.show({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'Error al actualizar el estado' 
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
          toast.current.show({ severity: "success", summary: "Eliminado", detail: "Pedido eliminado" });
        } catch {
          toast.current.show({ severity: "error", summary: "Error", detail: "No se pudo eliminar" });
        }
      }
    });
  };

  const exportarCSV = () => {
    const rows = pedidos.map(p => ({
      Fecha: p.fecha && p.fecha.toDate ? p.fecha.toDate().toLocaleDateString("es-AR") : "",
      Cliente: p.cliente,
      Contenido: p.contenido,
      Condición: p.condicion === "contado" ? "Contado" : p.condicion === "cuenta_corriente" ? "Cuenta Corriente" : "-",
      Estado: p.estadoRecepcion,
      Observaciones: p.observaciones || "",
      Cobrador: p.cobrador
    }));
    const csv = [
      "Fecha,Cliente,Contenido,Condición,Estado,Observaciones,Cobrador",
      ...rows.map(r => `"${r.Fecha}","${r.Cliente}","${r.Contenido}","${r.Condición}","${r.Estado}","${r.Observaciones}","${r.Cobrador}"`)
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
        case "recibido": return "success";
        case "enviado": return "info";
        default: return "warning";
      }
    };

    const getLabel = (estado) => {
      switch (estado) {
        case "recibido": return "Recibido";
        case "enviado": return "Enviado";
        default: return "Pendiente";
      }
    };

    return (
      <div className="flex align-items-center gap-2">
        <Tag 
          value={getLabel(rowData.estadoRecepcion)} 
          severity={getSeverity(rowData.estadoRecepcion)} 
        />
        {user?.role === "admin" && (
          <Button
            icon="pi pi-edit"
            className="p-button-outlined p-button-sm"
            size="small"
            loading={updatingId === rowData.id}
            onClick={() => {
              const newEstado = rowData.estadoRecepcion === "pendiente" ? "recibido" : 
                               rowData.estadoRecepcion === "recibido" ? "enviado" : "pendiente";
              updateEstadoRecepcion(rowData.id, newEstado);
            }}
            tooltip="Cambiar estado"
            tooltipOptions={{ position: "top" }}
          />
        )}
      </div>
    );
  };

  const contenidoTemplate = (rowData) => (
    <div style={{ maxWidth: "300px", wordWrap: "break-word" }}>
      {rowData.contenido}
    </div>
  );

  const observacionesTemplate = (rowData) => (
    <div style={{ maxWidth: "200px", wordWrap: "break-word" }}>
      {rowData.observaciones || "-"}
    </div>
  );

  const condicionTemplate = (rowData) => (
    <span>
      {rowData.condicion === "contado" ? "Contado" : rowData.condicion === "cuenta_corriente" ? "Cuenta Corriente" : "-"}
    </span>
  );

  const accionesTemplate = (rowData) => (
    <div className="flex gap-1">
      {user?.role === "admin" && (
        <Button
          icon="pi pi-trash"
          className="p-button-danger p-button-outlined p-button-sm"
          size="small"
          onClick={() => handleDelete(rowData)}
          tooltip="Eliminar pedido"
          tooltipOptions={{ position: "top" }}
        />
      )}
    </div>
  );

  // Renderiza la tabla interna de ítems
  const itemsTemplate = (rowData) => {
    if (Array.isArray(rowData.items) && rowData.items.length > 0) {
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, background: '#f8fafc', borderRadius: 8, boxShadow: '0 1px 4px #e5e7eb' }}>
          <thead>
            <tr style={{ background: '#e0e7ef' }}>
              <th style={{ textAlign: 'center', padding: 6, borderBottom: '1px solid #cbd5e1', width: 80 }}>Cantidad</th>
              <th style={{ textAlign: 'left', padding: 6, borderBottom: '1px solid #cbd5e1' }}>Producto</th>
            </tr>
          </thead>
          <tbody>
            {rowData.items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: 6, textAlign: 'center', fontWeight: 600, color: '#0ea5e9', background: '#f1f5f9' }}>{item.cantidad}</td>
                <td style={{ padding: 6 }}>{item.producto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else if (rowData.contenido) {
      return <div style={{ maxWidth: "300px", wordWrap: "break-word" }}>{rowData.contenido}</div>;
    } else {
      return <span>-</span>;
    }
  };

  // Filtrado local
  const pedidosFiltrados = pedidos.filter(p => {
    // Fecha
    if (filters.fecha && p.fecha) {
      const fechaPedido = p.fecha.toDate ? p.fecha.toDate() : new Date(p.fecha.seconds * 1000);
      if (fechaPedido.toLocaleDateString("es-AR") !== filters.fecha.toLocaleDateString("es-AR")) return false;
    }
    // Cliente
    if (filters.cliente && !p.cliente.toLowerCase().includes(filters.cliente.toLowerCase())) return false;
    // Estado
    if (filters.estado && p.estadoRecepcion !== filters.estado) return false;
    // Condición
    if (filters.condicion && p.condicion !== filters.condicion) return false;
    // Cobrador (solo admin)
    if (user.role === "admin" && filters.cobrador && p.cobrador !== filters.cobrador) return false;
    return true;
  });

  return (
    <div className="p-p-2 p-p-md-3 p-p-lg-4" style={{ maxWidth: "100%", margin: "0 auto", overflow: "hidden" }}>
      <Toast ref={toast} />
      <ConfirmDialog />
      <Card>
        <div className="p-d-flex p-jc-between p-ai-center p-mb-3 p-flex-column p-flex-md-row">
          <h3 className="p-m-0 p-text-lg p-text-md-xl" style={{ color: "#1f2937" }}>Listado de Pedidos de Clientes</h3>
          {user.role === "admin" && (
            <Button 
              label="Exportar CSV" 
              icon="pi pi-file" 
              className="p-button-success p-button-sm"
              onClick={exportarCSV} 
            />
          )}
        </div>
        {/* Filtros */}
        <div className="p-mb-3 p-p-2 surface-100 border-round border-1" style={{ borderColor: "#e5e7eb" }}>
          <div className="grid">
            <div className="col-12 md:col-6 lg:col-2">
              <label className="block mb-1 text-sm font-medium" style={{ color: "#374151" }}>
                Fecha
              </label>
              <Calendar 
                value={filters.fecha} 
                onChange={e => setFilters({ ...filters, fecha: e.value })}
                dateFormat="dd/mm/yy" 
                showIcon 
                placeholder="Selecciona fecha"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6 lg:col-2">
              <label className="block mb-1 text-sm font-medium" style={{ color: "#374151" }}>
                Cliente
              </label>
              <InputText 
                value={filters.cliente} 
                onChange={e => setFilters({ ...filters, cliente: e.target.value })}
                placeholder="Buscar por cliente"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6 lg:col-2">
              <label className="block mb-1 text-sm font-medium" style={{ color: "#374151" }}>
                Estado
              </label>
              <Dropdown 
                value={filters.estado} 
                options={estados} 
                onChange={e => setFilters({ ...filters, estado: e.value })}
                placeholder="Selecciona estado"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6 lg:col-2">
              <label className="block mb-1 text-sm font-medium" style={{ color: "#374151" }}>
                Condición
              </label>
              <Dropdown 
                value={filters.condicion} 
                options={condiciones} 
                onChange={e => setFilters({ ...filters, condicion: e.value })}
                placeholder="Selecciona condición"
                className="w-full"
              />
            </div>
            {user.role === "admin" && (
              <div className="col-12 md:col-6 lg:col-2">
                <label className="block mb-1 text-sm font-medium" style={{ color: "#374151" }}>
                  Registrado por
                </label>
                <Dropdown 
                  value={filters.cobrador} 
                  options={cobradores} 
                  onChange={e => setFilters({ ...filters, cobrador: e.value })}
                  placeholder="Selecciona cobrador"
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
        <DataTable 
          value={pedidosFiltrados}
          paginator 
          rows={8} 
          responsiveLayout="stack"
          emptyMessage="No hay pedidos de clientes registrados."
          className="p-datatable-sm p-fluid"
          style={{ width: '100%' }}
          loading={loading}
          rowExpansionTemplate={itemsTemplate}
          expandedRows={expandedRows}
          onRowToggle={e => setExpandedRows(e.data)}
        >
          <Column expander style={{ width: '3em' }} />
          <Column 
            field="fecha" 
            header="Fecha" 
            body={row => formatFecha(row.fecha)} 
            style={{ wordWrap: "break-word", whiteSpace: "normal" }} 
          />
          <Column 
            field="cliente" 
            header="Cliente" 
            style={{ wordWrap: "break-word", whiteSpace: "normal" }} 
          />
          <Column 
            field="items" 
            header="Ítems" 
            body={() => <span style={{ color: '#6b7280' }}>Ver detalle</span>}
            style={{ wordWrap: "break-word", whiteSpace: "normal" }} 
          />
          <Column 
            field="condicion" 
            header="Condición" 
            body={condicionTemplate}
            style={{ wordWrap: "break-word", whiteSpace: "normal" }} 
          />
          <Column 
            field="estadoRecepcion" 
            header="Estado" 
            body={estadoRecepcionTemplate}
            style={{ wordWrap: "break-word", whiteSpace: "normal" }} 
          />
          <Column 
            field="observaciones" 
            header="Observaciones" 
            body={observacionesTemplate}
            style={{ wordWrap: "break-word", whiteSpace: "normal" }} 
          />
          <Column 
            field="cobrador" 
            header="Registrado por" 
            style={{ wordWrap: "break-word", whiteSpace: "normal" }} 
          />
          <Column 
            header="Acciones" 
            body={accionesTemplate}
            style={{ width: "80px" }}
          />
        </DataTable>
      </Card>
    </div>
  );
}

export default ListaPedidosClientes; 
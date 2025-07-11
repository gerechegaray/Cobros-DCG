import React, { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  orderBy
} from "firebase/firestore";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { confirmDialog } from "primereact/confirmdialog";
import { saveAs } from "file-saver";

const COBRADORES = [
  { label: "Mariano", value: "Mariano" },
  { label: "Ruben", value: "Ruben" },
  { label: "Diego", value: "Diego" },
  { label: "Guille", value: "Guille" },
  { label: "Santi", value: "Santi" },
  { label: "German", value: "German" }
];

function PedidosEnviados({ user }) {
  const [form, setForm] = useState({
    fecha: null,
    cliente: "",
    comprobante: "",
    cobrador: user.role === "admin" ? null : user.name
  });
  const [pedidos, setPedidos] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "pedidosEnviados"), orderBy("fecha", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      console.log("Todos los pedidos cargados:", data.length);
      console.log("Usuario actual:", user);
      console.log("Rol del usuario:", user?.role);
      console.log("Nombre del usuario:", user?.name);
      
      // Filtrar según el rol del usuario
      if (user.role === "admin") {
        // Admin ve todos los pedidos
        console.log("Admin - mostrando todos los pedidos");
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
    });
    return () => unsubscribe();
  }, [user]);

  const validar = () => {
    if (!form.fecha) return "La fecha es obligatoria";
    if (!form.cliente.trim()) return "El nombre del cliente es obligatorio";
    if (user.role === "admin" && !form.cobrador) return "Debes seleccionar el cobrador";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validar();
    if (error) {
      toast.current.show({ severity: "error", summary: "Error", detail: error });
      return;
    }
    
    console.log("Enviando pedido con datos:", {
      fecha: form.fecha,
      cliente: form.cliente,
      comprobante: form.comprobante,
      cobrador: user.role === "admin" ? form.cobrador : user.role
    });
    
    setLoading(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "pedidosEnviados", editing), {
          fecha: form.fecha,
          cliente: form.cliente,
          comprobante: form.comprobante,
          cobrador: user.role === "admin" ? form.cobrador : user.role
        });
        toast.current.show({ severity: "success", summary: "Editado", detail: "Pedido actualizado" });
        setEditing(null);
      } else {
        await addDoc(collection(db, "pedidosEnviados"), {
          fecha: form.fecha,
          cliente: form.cliente,
          comprobante: form.comprobante,
          cobrador: user.role === "admin" ? form.cobrador : user.role
        });
        toast.current.show({ severity: "success", summary: "Guardado", detail: "Pedido registrado" });
      }
      setForm({ fecha: null, cliente: "", comprobante: "", cobrador: user.role === "admin" ? null : user.name });
    } catch (err) {
      console.error("Error al guardar pedido:", err);
      toast.current.show({ severity: "error", summary: "Error", detail: "No se pudo guardar" });
    }
    setLoading(false);
  };

  const handleDelete = (pedido) => {
    confirmDialog({
      message: `¿Seguro que deseas eliminar el pedido de ${pedido.cliente}?`,
      header: "Confirmar eliminación",
      icon: "pi pi-exclamation-triangle",
      accept: async () => {
        try {
          await deleteDoc(doc(db, "pedidosEnviados", pedido.id));
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
      Comprobante: p.comprobante || "",
      Cobrador: p.cobrador
    }));
    const csv = [
      "Fecha,Cliente,Comprobante,Cobrador",
      ...rows.map(r => `${r.Fecha},${r.Cliente},${r.Comprobante},${r.Cobrador}`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "pedidos_enviados.csv");
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "";
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha.seconds * 1000);
    return date.toLocaleDateString("es-AR");
  };

  return (
    <div className="p-p-2 p-p-md-3 p-p-lg-4" style={{ maxWidth: "100%", margin: "0 auto", overflow: "hidden" }}>
      <Toast ref={toast} />
      <Card className="p-mb-3">
        <h2 className="p-m-0 p-text-lg p-text-md-xl p-text-lg-2xl" style={{ color: "#1f2937", wordWrap: "break-word" }}>Pedidos Enviados</h2>
        <form onSubmit={handleSubmit} className="p-mt-3">
          <div className="p-grid p-fluid">
            <div className="p-col-12 p-md-6 p-lg-3">
              <label className="p-block p-mb-1 p-text-xs p-text-md-sm" style={{ fontWeight: "500", color: "#374151" }}>Fecha *</label>
              <Calendar 
                value={form.fecha} 
                onChange={e => setForm({ ...form, fecha: e.value })} 
                dateFormat="dd/mm/yy" 
                showIcon 
                className="p-fluid"
                required 
              />
            </div>
            <div className="p-col-12 p-md-6 p-lg-3">
              <label className="p-block p-mb-1 p-text-xs p-text-md-sm" style={{ fontWeight: "500", color: "#374151" }}>Cliente *</label>
              <InputText 
                value={form.cliente} 
                onChange={e => setForm({ ...form, cliente: e.target.value })} 
                className="p-fluid"
                required 
              />
            </div>
            <div className="p-col-12 p-md-6 p-lg-3">
              <label className="p-block p-mb-1 p-text-xs p-text-md-sm" style={{ fontWeight: "500", color: "#374151" }}>N° Comprobante</label>
              <InputText 
                value={form.comprobante} 
                onChange={e => setForm({ ...form, comprobante: e.target.value })} 
                className="p-fluid"
              />
            </div>
            {user.role === "admin" && (
              <div className="p-col-12 p-md-6 p-lg-3">
                <label className="p-block p-mb-1 p-text-xs p-text-md-sm" style={{ fontWeight: "500", color: "#374151" }}>Cobrador *</label>
                <Dropdown 
                  value={form.cobrador} 
                  options={COBRADORES} 
                  onChange={e => setForm({ ...form, cobrador: e.value })} 
                  placeholder="Selecciona cobrador" 
                  className="p-fluid"
                  required 
                />
              </div>
            )}
            <div className="p-col-12 p-md-6 p-lg-3 p-d-flex p-ai-end">
              <div className="p-d-flex p-gap-1 p-w-100">
                <Button 
                  type="submit" 
                  label={editing ? "Actualizar" : "Registrar"} 
                  icon={editing ? "pi pi-save" : "pi pi-plus"} 
                  loading={loading}
                  className="p-button-primary p-button-sm"
                />
                {editing && (
                  <Button 
                    type="button" 
                    label="Cancelar" 
                    className="p-button-text p-button-sm" 
                    onClick={() => { 
                      setEditing(null);
                      setForm({ fecha: null, cliente: "", comprobante: "", cobrador: user.role === "admin" ? null : user.name });
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </form>
      </Card>

      <Card>
        <div className="p-d-flex p-jc-between p-ai-center p-mb-3 p-flex-column p-flex-md-row">
          <h3 className="p-m-0 p-text-lg p-text-md-xl" style={{ color: "#1f2937" }}>Listado de Pedidos Enviados</h3>
          {user.role === "admin" && (
            <Button 
              label="Exportar CSV" 
              icon="pi pi-file" 
              className="p-button-success p-button-sm"
              onClick={exportarCSV} 
            />
          )}
        </div>
        <DataTable 
  value={pedidos}
  paginator 
  rows={8} 
  responsiveLayout="stack"
  emptyMessage="No hay pedidos registrados."
  className="p-datatable-sm p-fluid"
  style={{ width: '100%' }}
>
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
    field="comprobante" 
    header="N° Comprobante" 
    style={{ wordWrap: "break-word", whiteSpace: "normal" }} 
  />
  <Column 
    field="cobrador" 
    header="Cobrador" 
    style={{ wordWrap: "break-word", whiteSpace: "normal" }} 
  />
  {user.role === "admin" && (
    <Column 
      header="Acciones" 
      body={row => (
        <div className="p-d-flex p-jc-start p-ai-center p-flex-wrap" style={{ gap: "0.5rem" }}>
          <Button 
            icon="pi pi-pencil" 
            className="p-button-text p-button-sm" 
            onClick={() => { 
              setEditing(row.id); 
              setForm({ 
                fecha: row.fecha, 
                cliente: row.cliente, 
                comprobante: row.comprobante, 
                cobrador: row.cobrador 
              }); 
            }} 
          />
          <Button 
            icon="pi pi-trash" 
            className="p-button-text p-button-danger p-button-sm" 
            onClick={() => handleDelete(row)} 
          />
        </div>
      )}
      style={{ wordWrap: "break-word", whiteSpace: "normal" }}
    />
  )}
</DataTable>

      </Card>
    </div>
  );
}

export default PedidosEnviados;

import React, { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import { collection, addDoc, query, onSnapshot, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
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
  { label: "German", value: "German" },
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

  // Cargar pedidos desde Firestore
  useEffect(() => {
    const q = query(collection(db, "pedidosEnviados"), orderBy("fecha", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      // Filtrar por cobrador si no es admin
      if (user.role !== "admin") {
        data = data.filter(p => p.cobrador === user.name);
      }
      setPedidos(data);
    });
    return () => unsubscribe();
  }, [user]);

  // Validar formulario
  const validar = () => {
    if (!form.fecha) return "La fecha es obligatoria";
    if (!form.cliente.trim()) return "El nombre del cliente es obligatorio";
    if (user.role === "admin" && !form.cobrador) return "Debes seleccionar el cobrador";
    return null;
  };

  // Guardar pedido (nuevo o edición)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validar();
    if (error) {
      toast.current.show({ severity: "error", summary: "Error", detail: error });
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        // Editar
        await updateDoc(doc(db, "pedidosEnviados", editing), {
          fecha: form.fecha,
          cliente: form.cliente,
          comprobante: form.comprobante,
          cobrador: user.role === "admin" ? form.cobrador : user.name
        });
        toast.current.show({ severity: "success", summary: "Editado", detail: "Pedido actualizado" });
        setEditing(null);
      } else {
        // Nuevo
        await addDoc(collection(db, "pedidosEnviados"), {
          fecha: form.fecha,
          cliente: form.cliente,
          comprobante: form.comprobante,
          cobrador: user.role === "admin" ? form.cobrador : user.name
        });
        toast.current.show({ severity: "success", summary: "Guardado", detail: "Pedido registrado" });
      }
      setForm({ fecha: null, cliente: "", comprobante: "", cobrador: user.role === "admin" ? null : user.name });
    } catch (err) {
      toast.current.show({ severity: "error", summary: "Error", detail: "No se pudo guardar" });
    }
    setLoading(false);
  };

  // Eliminar pedido (solo admin)
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

  // Exportar a CSV (solo admin)
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

  // Formatear fecha para mostrar
  const formatFecha = (fecha) => {
    if (!fecha) return "";
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha.seconds * 1000);
    return date.toLocaleDateString("es-AR");
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem" }}>
      <Toast ref={toast} />
      <Card style={{ marginBottom: "2rem" }}>
        <h2 style={{ margin: 0, color: "#1f2937" }}>Pedidos Enviados</h2>
        <form onSubmit={handleSubmit} style={{ marginTop: "1.5rem", display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div>
            <label style={{ fontWeight: 500 }}>Fecha *</label>
            <Calendar value={form.fecha} onChange={e => setForm({ ...form, fecha: e.value })} dateFormat="dd/mm/yy" showIcon style={{ width: "100%" }} required />
          </div>
          <div>
            <label style={{ fontWeight: 500 }}>Cliente *</label>
            <InputText value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} style={{ width: "100%" }} required />
          </div>
          <div>
            <label style={{ fontWeight: 500 }}>N° Comprobante</label>
            <InputText value={form.comprobante} onChange={e => setForm({ ...form, comprobante: e.target.value })} style={{ width: "100%" }} />
          </div>
          {user.role === "admin" && (
            <div>
              <label style={{ fontWeight: 500 }}>Cobrador *</label>
              <Dropdown value={form.cobrador} options={COBRADORES} onChange={e => setForm({ ...form, cobrador: e.value })} placeholder="Selecciona cobrador" style={{ width: "100%" }} required />
            </div>
          )}
          <div style={{ alignSelf: "end" }}>
            <Button type="submit" label={editing ? "Actualizar" : "Registrar"} icon={editing ? "pi pi-save" : "pi pi-plus"} loading={loading} />
            {editing && (
              <Button type="button" label="Cancelar" className="p-button-text" style={{ marginLeft: 8 }} onClick={() => { setEditing(null); setForm({ fecha: null, cliente: "", comprobante: "", cobrador: user.role === "admin" ? null : user.name }); }} />
            )}
          </div>
        </form>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, color: "#1f2937" }}>Listado de Pedidos Enviados</h3>
          {user.role === "admin" && (
            <Button label="Exportar CSV" icon="pi pi-file" className="p-button-success" onClick={exportarCSV} />
          )}
        </div>
        <DataTable value={pedidos} paginator rows={8} responsiveLayout="scroll" emptyMessage="No hay pedidos registrados." style={{ minHeight: 300 }}>
          <Column field="fecha" header="Fecha" body={row => formatFecha(row.fecha)} style={{ minWidth: 100 }} />
          <Column field="cliente" header="Cliente" style={{ minWidth: 150 }} />
          <Column field="comprobante" header="N° Comprobante" style={{ minWidth: 120 }} />
          <Column field="cobrador" header="Cobrador" style={{ minWidth: 120 }} />
          {user.role === "admin" && (
            <Column header="Acciones" body={row => (
              <div style={{ display: "flex", gap: 8 }}>
                <Button icon="pi pi-pencil" className="p-button-text p-button-sm" onClick={() => { setEditing(row.id); setForm({ fecha: row.fecha, cliente: row.cliente, comprobante: row.comprobante, cobrador: row.cobrador }); }} />
                <Button icon="pi pi-trash" className="p-button-text p-button-danger p-button-sm" onClick={() => handleDelete(row)} />
              </div>
            )} style={{ minWidth: 100 }} />
          )}
        </DataTable>
      </Card>
    </div>
  );
}

export default PedidosEnviados; 
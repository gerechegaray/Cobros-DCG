import React, { useState, useEffect, useRef } from "react";
import { db } from "../../services/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { InputTextarea } from "primereact/inputtextarea";

const ESTADO_RECEPCION = [
  { label: "Pendiente", value: "pendiente" },
  { label: "Recibido", value: "recibido" },
  { label: "Enviado", value: "enviado" }
];

const CONDICIONES = [
  { label: "Contado", value: "contado" },
  { label: "Cuenta Corriente", value: "cuenta_corriente" }
];

function CargarPedido({ user }) {
  const [form, setForm] = useState({
    fecha: null,
    cliente: "",
    items: [{ producto: null, cantidad: 1 }],
    estadoRecepcion: "pendiente",
    condicion: "contado",
    observaciones: ""
  });

  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const toast = useRef(null);

  // ✅ Previene errores si el usuario aún no está definido
  if (!user) return <p>Cargando usuario...</p>;
  console.log("Rol del usuario:", user.role);
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const response = await fetch(`https://cobros-dcg.onrender.com/api/items?role=${user.role}`);

        if (!response.ok) throw new Error("Error al obtener productos");
        const data = await response.json();
        const options = data.map((item) => ({
          label: item.nombre,
          value: item.nombre
        }));
        setProductos(options);
      } catch (error) {
        console.error("Error al cargar productos:", error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: "No se pudieron cargar los productos"
        });
      } finally {
        setLoadingProductos(false);
      }
    };

    fetchProductos();
  }, [user.role]);

  const validar = () => {
    if (!form.fecha) return "La fecha es obligatoria";
    if (!form.cliente.trim()) return "El nombre del cliente es obligatorio";
    if (!form.items.length || form.items.some((i) => !i.producto || !i.cantidad || i.cantidad < 1))
      return "Debes agregar al menos un producto y cantidad válida";
    if (!form.condicion) return "La condición es obligatoria";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validar();
    if (error) {
      toast.current.show({ severity: "error", summary: "Error", detail: error });
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "pedidosClientes"), {
        fecha: form.fecha,
        cliente: form.cliente.trim(),
        items: form.items,
        estadoRecepcion: user.role === "admin" ? form.estadoRecepcion : "pendiente",
        condicion: form.condicion,
        observaciones: form.observaciones.trim(),
        cobrador: user.role === "admin" ? "admin" : user.role,
        fechaCreacion: new Date()
      });

      toast.current.show({
        severity: "success",
        summary: "Guardado",
        detail: "Pedido del cliente registrado exitosamente"
      });

      setForm({
        fecha: null,
        cliente: "",
        items: [{ producto: null, cantidad: 1 }],
        estadoRecepcion: "pendiente",
        condicion: "contado",
        observaciones: ""
      });
    } catch (err) {
      console.error("Error al guardar pedido:", err);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo guardar el pedido"
      });
    }
    setLoading(false);
  };

  return (
    <div className="p-p-3 p-p-md-4 p-p-lg-5" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <Toast ref={toast} />

      <Card className="p-fluid">
        <div className="p-text-center p-mb-4">
          <i
            className="pi pi-shopping-cart p-text-4xl p-text-primary"
            style={{ marginBottom: "1rem" }}
          ></i>
          <h2 className="p-m-0 p-text-xl p-text-md-2xl" style={{ color: "#1f2937" }}>
            Cargar Pedido de Cliente
          </h2>
          <p className="p-mt-2 p-mb-0 p-text-sm" style={{ color: "#6b7280" }}>
            Registra los pedidos que realizan los clientes
          </p>
          {user.role === "cobrador" && (
            <div
              className="p-mt-3 p-p-2 p-surface-200 p-border-round p-text-sm"
              style={{ color: "#92400e" }}
            >
              <i className="pi pi-user p-mr-2"></i>
              Cargando como: <strong>{user.name}</strong>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-grid p-fluid">
            <div className="p-col-12 p-md-6">
              <label
                className="p-block p-mb-2 p-text-sm"
                style={{ fontWeight: "500", color: "#374151" }}
              >
                Nombre del Cliente *
              </label>
              <InputText
                value={form.cliente}
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                placeholder="Ingresa el nombre del cliente"
                className="p-fluid"
                required
              />
            </div>

            <div className="p-col-12 p-md-6">
              <label
                className="p-block p-mb-2 p-text-sm"
                style={{ fontWeight: "500", color: "#374151" }}
              >
                Fecha del Pedido *
              </label>
              <Calendar
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.value })}
                dateFormat="dd/mm/yy"
                showIcon
                placeholder="Selecciona la fecha"
                className="p-fluid"
                required
              />
            </div>

            <div className="p-col-12">
              <label
                className="p-block p-mb-2 p-text-sm"
                style={{ fontWeight: "500", color: "#374151" }}
              >
                Ítems del Pedido *
              </label>
              {form.items.map((item, idx) => (
                <div key={idx} className="p-d-flex p-ai-center p-mb-2" style={{ gap: 8 }}>
                  <Dropdown
                    value={item.producto}
                    options={productos}
                    onChange={(e) => {
                      const items = [...form.items];
                      items[idx].producto = e.value;
                      setForm({ ...form, items });
                    }}
                    placeholder={
                      loadingProductos ? "Cargando productos..." : "Seleccionar producto"
                    }
                    className="p-mr-2"
                    style={{ minWidth: 200 }}
                    disabled={loadingProductos}
                    filter
                  />
                  <InputText
                    type="number"
                    min={1}
                    value={item.cantidad}
                    onChange={(e) => {
                      const items = [...form.items];
                      items[idx].cantidad = parseInt(e.target.value) || 1;
                      setForm({ ...form, items });
                    }}
                    placeholder="Cantidad"
                    style={{ width: 90 }}
                  />
                  {form.items.length > 1 && (
                    <Button
                      icon="pi pi-trash"
                      className="p-button-danger p-button-sm"
                      type="button"
                      onClick={() => {
                        const items = form.items.filter((_, i) => i !== idx);
                        setForm({ ...form, items });
                      }}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </div>
              ))}
              <Button
                icon="pi pi-plus"
                label="Agregar ítem"
                type="button"
                className="p-button-sm p-button-outlined"
                onClick={() =>
                  setForm({ ...form, items: [...form.items, { producto: null, cantidad: 1 }] })
                }
                style={{ marginTop: 4 }}
              />
            </div>

            <div className="p-col-12 p-md-6">
              <label
                className="p-block p-mb-2 p-text-sm"
                style={{ fontWeight: "500", color: "#374151" }}
              >
                Condición *
              </label>
              <Dropdown
                value={form.condicion}
                options={CONDICIONES}
                onChange={(e) => setForm({ ...form, condicion: e.value })}
                placeholder="Selecciona la condición"
                className="p-fluid"
                required
              />
            </div>

            {user.role === "admin" && (
              <div className="p-col-12 p-md-6">
                <label
                  className="p-block p-mb-2 p-text-sm"
                  style={{ fontWeight: "500", color: "#374151" }}
                >
                  Estado de Recepción
                </label>
                <Dropdown
                  value={form.estadoRecepcion}
                  options={ESTADO_RECEPCION}
                  onChange={(e) => setForm({ ...form, estadoRecepcion: e.value })}
                  placeholder="Selecciona el estado"
                  className="p-fluid"
                />
              </div>
            )}

            <div className="p-col-12">
              <label
                className="p-block p-mb-2 p-text-sm"
                style={{ fontWeight: "500", color: "#374151" }}
              >
                Observaciones
              </label>
              <InputTextarea
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                placeholder="Agrega observaciones adicionales..."
                rows={3}
                className="p-fluid"
              />
            </div>

            <div className="p-col-12">
              <Button
                type="submit"
                label={loading ? "Guardando..." : "Guardar Pedido"}
                icon={loading ? "pi pi-spin pi-spinner" : "pi pi-save"}
                className="p-fluid"
                style={{ height: "3rem" }}
                disabled={loading}
              />
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default CargarPedido;

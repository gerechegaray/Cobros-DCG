import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../services/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { InputTextarea } from "primereact/inputtextarea";
import { Divider } from "primereact/divider";
import { getAlegraContacts } from "../../services/alegra";
import { ProgressSpinner } from "primereact/progressspinner";
import { getClientesCatalogo, getProductosCatalogo } from '../../services/firebase';

// Servicio para traer productos de Alegra
async function getAlegraItems() {
  const response = await fetch('/api/alegra/items');
  if (!response.ok) {
    throw new Error('Error al obtener los productos de Alegra');
  }
  return response.json();
}

const ESTADO_RECEPCION = [
  { label: "Pendiente", value: "pendiente" },
  { label: "Recibido", value: "recibido" },
  { label: "Enviado", value: "enviado" }
];

const CONDICIONES = [
  { label: "Contado", value: "contado" },
  { label: "Cuenta Corriente", value: "cuenta_corriente" }
];

// Definir PedidoForm fuera de cualquier función principal
function PedidoForm({ form, setForm, productosAlegra, clientes, loading, loadingProductosAlegra, loadingClientes, onSubmit, onCancel, user, modoEdicion }) {
  // Lista de vendedores
  const VENDEDORES = [
    { label: "Mariano", value: "Mariano" },
    { label: "Ruben", value: "Ruben" },
    { label: "Diego", value: "Diego" },
    { label: "Guille", value: "Guille" },
    { label: "Santi", value: "Santi" },
    { label: "German", value: "German" }
  ];
  const esVendedorFijo = user.role === "Santi" || user.role === "Guille";
  return (
    <form onSubmit={onSubmit} style={{ padding: "0 0.5rem" }}>
      {/* Información Básica */}
      <div className="p-mb-5">
        <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem", padding: "0.8rem", background: "#fff", borderRadius: "8px", color: "#212121" }}>
          <i className="pi pi-info-circle" style={{ fontSize: "1.2rem", marginRight: "0.5rem", flexShrink: 0 }}></i>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "600" }}>Información Básica</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Cliente */}
          <div className="p-col-12" style={{ marginBottom: '1.2rem' }}>
            <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
              Cliente *
            </label>
            <Dropdown
              value={form.cliente}
              options={clientes}
              onChange={(e) => setForm({ ...form, cliente: e.value })}
              placeholder="Selecciona un cliente"
              className="p-fluid"
              filter
              disabled={loadingClientes}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#374151", fontSize: "0.9rem" }}>
              Fecha del Pedido *
            </label>
            <Calendar
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.value })}
              dateFormat="dd/mm/yy"
              showIcon
              placeholder="Selecciona la fecha"
              style={{ height: "3rem", borderRadius: "8px" }}
              inputStyle={{ borderRadius: "8px", border: "2px solid #e5e7eb", fontSize: "0.95rem" }}
              required
            />
          </div>
        </div>
      </div>
      {/* Productos del Pedido */}
      <div className="p-mb-5">
        <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem", padding: "0.8rem", background: "#fff", borderRadius: "8px", color: "#212121" }}>
          <i className="pi pi-shopping-bag" style={{ fontSize: "1.2rem", marginRight: "0.5rem", flexShrink: 0 }}></i>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "600" }}>Productos del Pedido *</h3>
        </div>
        <div className="p-mb-4">
          {form.items.map((item, idx) => (
            <div key={idx} style={{ marginBottom: "1.5rem", padding: "1rem", background: "#fff", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.3)", boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#8b5a3c", fontSize: "0.9rem" }}>
                    Producto
                  </label>
                  <Dropdown
                    value={item.producto}
                    options={productosAlegra}
                    onChange={(e) => {
                      const items = [...form.items];
                      items[idx].producto = e.value;
                      setForm({ ...form, items });
                    }}
                    placeholder={loadingProductosAlegra ? "Cargando productos..." : "Seleccionar producto"}
                    style={{ height: "3rem", borderRadius: "8px" }}
                    disabled={loadingProductosAlegra}
                    filter
                    className="p-dropdown-lg"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#8b5a3c", fontSize: "0.9rem" }}>
                    Cantidad
                  </label>
                  <InputText
                    type="number"
                    min={1}
                    value={item.cantidad}
                    onChange={(e) => {
                      const items = [...form.items];
                      items[idx].cantidad = Number.parseInt(e.target.value) || 1;
                      setForm({ ...form, items });
                    }}
                    placeholder="Cantidad"
                    style={{ height: "3rem", borderRadius: "8px", border: "2px solid rgba(139, 90, 60, 0.2)", fontSize: "0.95rem" }}
                    className="p-inputtext-lg"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#8b5a3c", fontSize: "0.9rem" }}>
                    % Bonificación
                  </label>
                  <InputText
                    type="number"
                    min={0}
                    max={100}
                    value={item.descuento || 0}
                    onChange={(e) => {
                      const items = [...form.items];
                      items[idx].descuento = Number.parseFloat(e.target.value) || 0;
                      setForm({ ...form, items });
                    }}
                    placeholder="%"
                    style={{ height: "3rem", borderRadius: "8px", border: "2px solid rgba(139, 90, 60, 0.2)", fontSize: "0.95rem" }}
                    className="p-inputtext-lg"
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                  {form.items.length > 1 && (
                    <Button
                      icon="pi pi-trash"
                      className="p-button-danger p-button-outlined"
                      type="button"
                      onClick={() => {
                        const items = form.items.filter((_, i) => i !== idx);
                        setForm({ ...form, items });
                      }}
                      style={{ height: "3rem", width: "3rem", borderRadius: "8px" }}
                      tooltip="Eliminar producto"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <Button
              icon="pi pi-plus"
              label="Agregar Producto"
              type="button"
              className="p-button-outlined"
              onClick={() => setForm({ ...form, items: [...form.items, { producto: null, cantidad: 1, descuento: 0 }] })}
              style={{ height: "3rem", borderRadius: "20px", fontSize: "0.95rem", fontWeight: "600", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none", color: "white", boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)", padding: "0 1.5rem" }}
            />
          </div>
        </div>
      </div>
      {/* Condiciones y Estado */}
      <div className="p-mb-5">
        <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem", padding: "0.8rem", background: "#fff", borderRadius: "8px", color: "#212121" }}>
          <i className="pi pi-cog" style={{ fontSize: "1.2rem", marginRight: "0.5rem", flexShrink: 0 }}></i>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "600" }}>Condiciones</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#374151", fontSize: "0.9rem" }}>
              Condición de Pago *
            </label>
            <Dropdown
              value={form.condicion}
              options={CONDICIONES}
              onChange={(e) => setForm({ ...form, condicion: e.value })}
              placeholder="Selecciona la condición"
              style={{ height: "3rem", borderRadius: "8px" }}
              className="p-dropdown-lg"
              required
            />
          </div>
          {/* Vendedor */}
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#374151", fontSize: "0.9rem" }}>
              Vendedor {user.role === "admin" ? "(opcional)" : ""}
            </label>
            <Dropdown
              value={esVendedorFijo ? user.name : form.vendedor}
              options={VENDEDORES}
              onChange={e => setForm({ ...form, vendedor: e.value })}
              placeholder="Selecciona vendedor"
              style={{ height: "3rem", borderRadius: "8px" }}
              className="p-dropdown-lg"
              disabled={esVendedorFijo}
              required={user.role === "admin" ? false : true}
            />
          </div>
        </div>
      </div>
      {/* Observaciones */}
      <div className="p-mb-5">
        <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem", padding: "0.8rem", background: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)", borderRadius: "8px", color: "#8b5a3c" }}>
          <i className="pi pi-comment" style={{ fontSize: "1.2rem", marginRight: "0.5rem", flexShrink: 0 }}></i>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "600" }}>Observaciones Adicionales</h3>
        </div>
        <InputTextarea
          value={form.observaciones}
          onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
          placeholder="Agrega observaciones adicionales sobre el pedido..."
          rows={4}
          style={{ borderRadius: "8px", border: "2px solid #e5e7eb", fontSize: "0.95rem", resize: "vertical" }}
          className="p-inputtextarea-lg"
        />
      </div>
      {/* Botones */}
      <div style={{ textAlign: "center", marginTop: "2rem", paddingBottom: "1rem" }}>
        <Button
          type="submit"
          label={loading ? "Guardando Pedido..." : "Guardar Pedido"}
          icon={loading ? "pi pi-spin pi-spinner" : "pi pi-save"}
          style={{ height: "3.5rem", minWidth: "200px", fontSize: "1rem", fontWeight: "700", borderRadius: "20px", background: loading ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)", border: "none", color: "white", boxShadow: "0 8px 25px rgba(17, 153, 142, 0.3)", transition: "all 0.3s ease", textTransform: "uppercase", letterSpacing: "0.5px" }}
          disabled={loading}
        />
        <Button
          type="button"
          label="Cancelar"
          icon="pi pi-times"
          className="p-button-secondary"
          style={{ marginLeft: 16, height: "3.5rem", minWidth: "120px", fontSize: "1rem", fontWeight: "700", borderRadius: "20px" }}
          onClick={onCancel}
        />
      </div>
    </form>
  );
}

function CargarPedido({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const clienteNavegacion = location.state?.cliente;

  useEffect(() => {
    if (!clienteNavegacion) {
      navigate('/clientes');
    }
  }, [clienteNavegacion, navigate]);

  const [form, setForm] = useState({
    fecha: null,
    cliente: clienteNavegacion ? clienteNavegacion.id : "",
    items: [{ producto: null, cantidad: 1, descuento: 0 }],
    condicion: "contado",
    observaciones: "",
    vendedor: ""
  });
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const toast = useRef(null);
  const [productosAlegra, setProductosAlegra] = useState([]);
  const [loadingProductosAlegra, setLoadingProductosAlegra] = useState(true);

  useEffect(() => {
    async function fetchClientes() {
      try {
        const data = await getClientesCatalogo();
        const options = data
          .slice()
          .sort((a, b) => (a['Razón Social'] || '').localeCompare(b['Razón Social'] || ''))
          .map((c) => ({ label: c['Razón Social'] || '(Sin nombre)', value: c.id }));
        setClientes(options);
      } catch (error) {
        console.error('Error al obtener clientes de Firestore:', error);
      } finally {
        setLoadingClientes(false);
      }
    }
    async function fetchProductosAlegra() {
      try {
        const data = await getProductosCatalogo();
        const options = data
          .slice()
          .sort((a, b) => (a.Producto || '').localeCompare(b.Producto || ''))
          .map((item) => ({ label: item.Producto || '(Sin nombre)', value: item.id }));
        setProductosAlegra(options);
      } catch (error) {
        console.error('Error al obtener productos de Firestore:', error);
      } finally {
        setLoadingProductosAlegra(false);
      }
    }
    if (user) {
      fetchClientes();
      fetchProductosAlegra();
    }
  }, [user]);

  // ✅ Previene errores si el usuario aún no está definido
  if (!user) return <p>Cargando usuario...</p>;

  console.log("Rol del usuario:", user.role);

  const validar = () => {
    if (!form.fecha) return "La fecha es obligatoria";
    if (!form.cliente) return "El cliente es obligatorio";
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
      // Guardar en Firebase
      // Mapear los productos seleccionados para guardar id y nombre
      const itemsConNombre = form.items.map((item) => {
        const productoObj = productosAlegra.find((p) => p.value === item.producto);
        return {
          producto: item.producto, // id
          nombreProducto: productoObj ? productoObj.label : '',
          cantidad: item.cantidad,
          descuento: item.descuento
        };
      });
      // Buscar el nombre del cliente seleccionado
      const clienteSeleccionado = clientes.find(c => c.value === form.cliente);
      const nombreCliente = clienteSeleccionado ? clienteSeleccionado.label : '';
      await addDoc(collection(db, "pedidosClientes"), {
        fecha: form.fecha,
        cliente: nombreCliente, // Guardar el nombre
        codigoCliente: form.cliente, // Guardar el id/código
        items: itemsConNombre,
        condicion: form.condicion,
        observaciones: form.observaciones.trim(),
        vendedor: form.vendedor.trim(),
        cobrador: user.role === "admin" ? "admin" : user.role,
        fechaCreacion: new Date()
      });

      toast.current.show({
        severity: "success",
        summary: "Guardado",
        detail: "Pedido registrado correctamente"
      });

      setForm({
        fecha: null,
        cliente: clienteNavegacion ? clienteNavegacion.id : "",
        items: [{ producto: null, cantidad: 1, descuento: 0 }],
        condicion: "contado",
        observaciones: "",
        vendedor: ""
      });
    } catch (err) {
      console.error("Error al guardar pedido:", err);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: err.message || "No se pudo guardar el pedido"
      });
    }
    setLoading(false);
  };

  // Lista de cobradores/vendedores
  const COBRADORES = [
    { label: "Mariano", value: "Mariano" },
    { label: "Ruben", value: "Ruben" },
    { label: "Diego", value: "Diego" },
    { label: "Guille", value: "Guille" },
    { label: "Santi", value: "Santi" },
    { label: "German", value: "German" }
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        padding: "1rem",
        "@media (min-width: 768px)": {
          padding: "2rem 1rem"
        }
      }}
    >
      <Toast ref={toast} />

      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          width: "100%"
        }}
      >
        <Card
          className="p-fluid"
          style={{
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            border: "none",
            overflow: "hidden",
            "@media (min-width: 768px)": {
              borderRadius: "20px",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.15)"
            }
          }}
        >
          {/* Header Section con gradiente */}
          <div
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "2rem 1rem",
              textAlign: "center",
              margin: "-1.5rem -1.5rem 2rem -1.5rem",
              "@media (min-width: 768px)": {
                padding: "3rem 2rem"
              }
            }}
          >
            <div
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                borderRadius: "50%",
                width: "60px",
                height: "60px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
                backdropFilter: "blur(10px)",
                "@media (min-width: 768px)": {
                  width: "80px",
                  height: "80px"
                }
              }}
            >
              <i
                className="pi pi-shopping-cart"
                style={{
                  fontSize: "1.5rem",
                  "@media (min-width: 768px)": {
                    fontSize: "2rem"
                  }
                }}
              ></i>
            </div>

            <h1
              style={{
                margin: "0 0 1rem 0",
                fontSize: "1.8rem",
                fontWeight: "700",
                letterSpacing: "-0.5px",
                lineHeight: "1.2",
                "@media (min-width: 768px)": {
                  fontSize: "2.2rem"
                },
                "@media (min-width: 1024px)": {
                  fontSize: "2.5rem"
                }
              }}
            >
              Cargar Pedido de Cliente
            </h1>

            <p
              style={{
                margin: "0",
                fontSize: "1rem",
                opacity: "0.9",
                fontWeight: "300",
                "@media (min-width: 768px)": {
                  fontSize: "1.1rem"
                }
              }}
            >
              Registra los pedidos que realizan los clientes
            </p>

            {user.role === "cobrador" && (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  borderRadius: "25px",
                  padding: "0.8rem 1rem",
                  margin: "1.5rem auto 0",
                  display: "inline-flex",
                  alignItems: "center",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  maxWidth: "100%",
                  "@media (min-width: 768px)": {
                    padding: "0.8rem 1.5rem"
                  }
                }}
              >
                <i
                  className="pi pi-user"
                  style={{
                    marginRight: "0.5rem",
                    fontSize: "0.9rem",
                    flexShrink: 0
                  }}
                ></i>
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "500",
                    wordBreak: "break-word",
                    "@media (min-width: 768px)": {
                      fontSize: "0.95rem"
                    }
                  }}
                >
                  Cargando como: <strong>{user.name}</strong>
                </span>
              </div>
            )}
          </div>

          <PedidoForm
            form={form}
            setForm={setForm}
            productosAlegra={productosAlegra}
            clientes={clientes}
            loading={loading}
            loadingProductosAlegra={loadingProductosAlegra}
            loadingClientes={loadingClientes}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/clientes')}
            user={user}
            modoEdicion={false}
          />
        </Card>
      </div>
    </div>
  );
}

export default CargarPedido;
export { PedidoForm };

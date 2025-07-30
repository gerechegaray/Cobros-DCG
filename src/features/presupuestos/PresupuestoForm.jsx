import React, { useEffect, useState } from "react";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Toast } from "primereact/toast";
import { useRef } from "react";
import { Calendar } from "primereact/calendar";
import { useLocation } from "react-router-dom";
import { api } from "../../services/api";

function PresupuestoForm({ user, onPresupuestoCreado }) {
  const location = useLocation();
  const clienteInicial = location.state?.cliente || null;
  const [clienteSeleccionado, setClienteSeleccionado] = useState(clienteInicial);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [items, setItems] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [error, setError] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [enviando, setEnviando] = useState(false);
  const toast = useRef(null);
  const [bonificacion, setBonificacion] = useState(0);
  const [editIndex, setEditIndex] = useState(null);
  const [fechaCreacion, setFechaCreacion] = useState(new Date());
  const vendedores = [
    { label: "Guille", value: 1 },
    { label: "Santi", value: 2 }
  ];
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState(() => {
    if (user?.role === "admin") return null;
    if (user?.role === "Guille") return 1;
    if (user?.role === "Santi") return 2;
    return null;
  });
  const [condicion, setCondicion] = useState("Contado");
  // Calcular fecha de vencimiento
  const calcularFechaVencimiento = () => {
    if (!fechaCreacion) return null;
    const base = new Date(fechaCreacion);
    if (condicion === "Contado") return base;
    if (condicion === "Cuenta Corriente") {
      const venc = new Date(base);
      venc.setDate(venc.getDate() + 30);
      return venc;
    }
    return base;
  };
  const fechaVencimiento = calcularFechaVencimiento();

  // Utilidad para mostrar fecha en formato DD/MM/YYYY
  const formatFecha = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear());
    return `${day}/${month}/${year}`;
  };

  // Utilidad para obtener el precio de la lista General
  const getPrecioGeneral = (prod) => {
    if (!prod || !Array.isArray(prod.price)) return 0;
    const general = prod.price.find(p => p.name === "General");
    return general?.price || 0;
  };

  // Obtener el sellerId según el rol del usuario
  const getSellerId = () => {
    if (user?.role === 'Guille') return 1;
    if (user?.role === 'Santi') return 2;
    if (user?.role === 'admin') return null; // Admin ve todos
    return null;
  };

  // Función para actualizar clientes desde Alegra
  const [actualizando, setActualizando] = useState(false);
  const actualizarClientes = async () => {
    setActualizando(true);
    setError("");
    try {
      const data = await api.syncClientesAlegra();
      if (data.success) {
        toast.current?.show({ severity: 'success', summary: 'Clientes actualizados', detail: `Se actualizaron ${data.total} clientes.` });
        // Refrescar lista de clientes
        const clientesData = await api.getClientesFirebase();
        
        // Filtrar clientes según el rol del usuario
        const sellerId = getSellerId();
        let clientesFiltrados = clientesData;
        
        if (sellerId !== null) {
          // Filtrar por sellerId específico - el seller es un objeto con id
          clientesFiltrados = clientesData.filter(cliente => {
            if (cliente.seller && cliente.seller.id) {
              return cliente.seller.id === sellerId.toString();
            }
            return false;
          });
        } else if (user?.role === 'admin') {
          clientesFiltrados = clientesData;
        } else {
          clientesFiltrados = [];
        }
        
        setClientes(clientesFiltrados);
      } else {
        setError(data.error || "Error al actualizar clientes");
        toast.current?.show({ severity: 'error', summary: 'Error', detail: data.error || 'Error al actualizar clientes' });
      }
    } catch (err) {
      setError("Error de red al actualizar clientes");
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Error de red al actualizar clientes' });
    } finally {
      setActualizando(false);
    }
  };

  // Función para actualizar productos desde Alegra
  const [actualizandoProductos, setActualizandoProductos] = useState(false);
  const actualizarProductos = async () => {
    setActualizandoProductos(true);
    setError("");
    try {
      const data = await api.syncProductosAlegra();
      if (data.success) {
        toast.current?.show({ severity: 'success', summary: 'Productos actualizados', detail: `Se actualizaron ${data.total} productos.` });
        // Refrescar lista de productos
        const productosData = await api.getProductosFirebase();
        setProductos(productosData);
      } else {
        setError(data.error || "Error al actualizar productos");
        toast.current?.show({ severity: 'error', summary: 'Error', detail: data.error || 'Error al actualizar productos' });
      }
    } catch (err) {
      setError("Error de red al actualizar productos");
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Error de red al actualizar productos' });
    } finally {
      setActualizandoProductos(false);
    }
  };

  // Calcular total parcial
  const calcularTotal = () => {
    return items.reduce((acc, item) => {
      const prod = productos.find(p => p.id === item.producto);
      const precio = getPrecioGeneral(prod);
      const bonif = item.bonificacion || 0;
      return acc + (item.cantidad * precio * (1 - bonif / 100));
    }, 0);
  };
  const totalParcial = calcularTotal();

  // Cargar clientes y productos al montar
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const clientesData = await api.getClientesFirebase();
        
        // Filtrar clientes según el rol del usuario
        const sellerId = getSellerId();
        let clientesFiltrados = clientesData;
        
        if (sellerId !== null) {
          // Filtrar por sellerId específico - el seller es un objeto con id
          clientesFiltrados = clientesData.filter(cliente => {
            if (cliente.seller && cliente.seller.id) {
              return cliente.seller.id === sellerId.toString();
            }
            return false;
          });
        } else if (user?.role === 'admin') {
          clientesFiltrados = clientesData;
        } else {
          clientesFiltrados = [];
        }
        
        setClientes(clientesFiltrados);
        setLoading(false);
      } catch (err) {
        setError("Error al cargar clientes");
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    async function fetchProductos() {
      if (!clienteSeleccionado) return;
      setLoadingProductos(true);
      try {
        const productosData = await api.getProductosFirebase();
        setProductos(productosData);
        setLoadingProductos(false);
      } catch (err) {
        setError("Error al cargar productos");
        setLoadingProductos(false);
      }
    }
    fetchProductos();
  }, [clienteSeleccionado]);

  const handleAgregarItem = () => {
    if (!productoSeleccionado || !cantidad) return;
    const prod = productos.find(p => p.id === productoSeleccionado);
    const stock = prod?.inventory?.availableQuantity ?? 0;
    if (cantidad > stock) {
      setError(`No hay suficiente stock para ${prod.name}. Stock disponible: ${stock}`);
      return;
    }
    const precio = getPrecioGeneral(prod);
    if (editIndex !== null) {
      // Editar producto existente
      const nuevosItems = [...items];
      nuevosItems[editIndex] = { producto: productoSeleccionado, cantidad, bonificacion, price: precio };
      setItems(nuevosItems);
      setEditIndex(null);
    } else {
      // Agregar nuevo producto
      setItems([...items, { producto: productoSeleccionado, cantidad, bonificacion, price: precio }]);
    }
    setProductoSeleccionado(null);
    setCantidad(1);
    setBonificacion(0);
    setError("");
  };

  const handleEliminarItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
    setEditIndex(null);
  };

  const handleEditarItem = (idx) => {
    const item = items[idx];
    setProductoSeleccionado(item.producto);
    setCantidad(item.cantidad);
    setBonificacion(item.bonificacion);
    setEditIndex(idx);
  };

  const handleCrearPresupuesto = async () => {
    if (!clienteSeleccionado || items.length === 0) {
      setError("Selecciona un cliente y agrega al menos un producto");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const data = await api.createAlegraQuote({
        clienteId: clienteSeleccionado,
        items: items.map(item => ({ ...item, price: item.price })),
        observaciones,
        usuario: user?.email || "",
        fechaCreacion: fechaCreacion ? fechaCreacion.toISOString().slice(0, 10) : null,
        vendedor: vendedorSeleccionado,
        condicion,
        dueDate: fechaVencimiento ? fechaVencimiento.toISOString().slice(0, 10) : null
      });
      
      toast.current?.show({ severity: 'success', summary: 'Presupuesto creado', detail: 'El presupuesto fue creado correctamente.' });
      setItems([]);
      setClienteSeleccionado(null);
      setObservaciones("");
      if (onPresupuestoCreado) onPresupuestoCreado(data.alegraQuote);
    } catch (err) {
      setError("Error de red al crear presupuesto");
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Error de red al crear presupuesto' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card title="Crear Presupuesto" style={{ maxWidth: 600, margin: "2rem auto" }}>
      <Toast ref={toast} />
      {user?.role === 'admin' && (
        <Button
          label={actualizando ? "Actualizando..." : "Actualizar clientes"}
          icon="pi pi-refresh"
          className="p-button-info"
          style={{ marginBottom: 10, width: "100%" }}
          onClick={actualizando ? undefined : actualizarClientes}
          disabled={actualizando}
        />
      )}
      {user?.role === 'admin' && (
        <Button
          label={actualizandoProductos ? "Actualizando..." : "Actualizar productos"}
          icon="pi pi-refresh"
          className="p-button-help"
          style={{ marginBottom: 20, width: "100%" }}
          onClick={actualizandoProductos ? undefined : actualizarProductos}
          disabled={actualizandoProductos}
        />
      )}
      {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}
      <div className="p-field">
        <label>Cliente</label>
        <Dropdown
          value={clienteSeleccionado}
          options={[...clientes].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(c => ({ label: c.name, value: c.id }))}
          onChange={e => setClienteSeleccionado(e.value)}
          placeholder="Selecciona un cliente"
          filter
          disabled={loading}
        />
      </div>
      <div className="p-field" style={{ marginTop: 20 }}>
        <label>Producto</label>
        <Dropdown
          value={productoSeleccionado}
          options={productos
            .slice()
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .map(p => ({
              label: `${p.name} (Stock: ${
                p.inventory && typeof p.inventory.availableQuantity === 'number'
                  ? p.inventory.availableQuantity
                  : 0
              })`,
              value: p.id
            }))}
          onChange={e => setProductoSeleccionado(e.value)}
          placeholder="Selecciona un producto"
          filter
          disabled={loadingProductos || !clienteSeleccionado}
        />
      </div>
      {productoSeleccionado && (
        <div className="p-field" style={{ marginTop: 5 }}>
          <label>Precio</label>
          <InputNumber value={getPrecioGeneral(productos.find(p => p.id === productoSeleccionado))} mode="currency" currency="ARS" locale="es-AR" disabled style={{ width: 200 }} />
        </div>
      )}
      <div className="p-field" style={{ marginTop: 10 }}>
        <label>Cantidad</label>
        <InputNumber
          value={cantidad}
          min={1}
          onValueChange={e => setCantidad(e.value)}
          disabled={!productoSeleccionado}
        />
      </div>
      <div className="p-field" style={{ marginTop: 10 }}>
        <label>Bonificación (%)</label>
        <InputNumber
          value={bonificacion}
          min={0}
          max={100}
          onValueChange={e => setBonificacion(e.value)}
          disabled={!productoSeleccionado}
          mode="decimal"
          showButtons
          style={{ width: 120 }}
        />
      </div>
      <div className="p-field" style={{ marginTop: 10 }}>
        <label>Fecha de creación</label>
                    <Calendar value={fechaCreacion} onChange={e => setFechaCreacion(e.value)} dateFormat="dd/mm/yyyy" showIcon showButtonBar />
        <small>({formatFecha(fechaCreacion)})</small>
      </div>
      <div className="p-field" style={{ marginTop: 10 }}>
        <label>Condición</label>
        <Dropdown value={condicion} options={[{ label: "Contado", value: "Contado" }, { label: "Cuenta Corriente", value: "Cuenta Corriente" }]} onChange={e => setCondicion(e.value)} style={{ width: 200 }} />
      </div>
      <div className="p-field" style={{ marginTop: 10 }}>
        <label>Fecha de vencimiento</label>
                    <Calendar value={fechaVencimiento} dateFormat="dd/mm/yyyy" showIcon disabled style={{ width: 200 }} />
        <small>({formatFecha(fechaVencimiento)})</small>
      </div>
      <div className="p-field" style={{ marginTop: 10 }}>
        <label>Vendedor</label>
        {user?.role === "admin" ? (
          <Dropdown value={vendedorSeleccionado} options={vendedores} onChange={e => setVendedorSeleccionado(e.value)} placeholder="Selecciona vendedor" style={{ width: 200 }} />
        ) : (
          <Dropdown value={vendedorSeleccionado} options={vendedores} disabled style={{ width: 200 }} />
        )}
      </div>
      <div className="p-field" style={{ marginTop: 10 }}>
        <Button
          label="Agregar"
          icon="pi pi-plus"
          className="p-button-sm"
          onClick={handleAgregarItem}
          disabled={!productoSeleccionado || !cantidad}
          style={{ width: 150 }}
        />
      </div>
      <div style={{ marginTop: 20 }}>
        <h4>Productos agregados</h4>
        <ul>
          {items.map((item, idx) => {
            const prod = productos.find(p => p.id === item.producto);
            return (
              <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {prod?.name} - Cantidad: {item.cantidad} - Bonificación: {item.bonificacion || 0}% - Precio: {getPrecioGeneral(prod).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                <Button icon="pi pi-pencil" className="p-button-text p-button-sm" style={{ marginLeft: 8 }} onClick={() => handleEditarItem(idx)} tooltip="Editar" />
                <Button icon="pi pi-trash" className="p-button-text p-button-danger p-button-sm" onClick={() => handleEliminarItem(idx)} tooltip="Eliminar" />
              </li>
            );
          })}
        </ul>
        <div style={{ marginTop: 10, fontWeight: 'bold', fontSize: 18 }}>
          Total parcial: {totalParcial.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
        </div>
      </div>
      <div className="p-field" style={{ marginTop: 20 }}>
        <label>Observaciones</label>
        <textarea
          value={observaciones}
          onChange={e => setObservaciones(e.target.value)}
          rows={3}
          style={{ width: "100%", borderRadius: 6, border: '1px solid #ccc', padding: 8 }}
          placeholder="Observaciones para el presupuesto (opcional)"
        />
      </div>
      <Button
        label={enviando ? "Creando..." : "Crear Presupuesto"}
        icon="pi pi-check"
        className="p-button-success"
        style={{ marginTop: 20, width: "100%" }}
        onClick={handleCrearPresupuesto}
        disabled={enviando || !clienteSeleccionado || items.length === 0}
      />
    </Card>
  );
}

export default PresupuestoForm; 
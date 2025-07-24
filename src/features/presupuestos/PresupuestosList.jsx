import React, { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { useNavigate } from "react-router-dom";
import { Card } from "primereact/card";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";

function PresupuestosList({ user }) {
  const [presupuestos, setPresupuestos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("pendiente");
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [presupuestoDetalle, setPresupuestoDetalle] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const estados = [
    { label: "Pendiente", value: "pendiente" },
    { label: "Facturado", value: "facturado" }
  ];
  const navigate = useNavigate();

  // Cargar clientes y productos de Firestore para mostrar nombres
  useEffect(() => {
    async function fetchCatalogos() {
      try {
        const resClientes = await fetch("/api/clientes-firebase");
        const clientesData = await resClientes.json();
        setClientes(clientesData);
        const resProductos = await fetch("/api/productos-firebase");
        const productosData = await resProductos.json();
        setProductos(productosData);
      } catch {}
    }
    fetchCatalogos();
  }, []);

  // Cargar presupuestos desde Firestore (sin consultar Alegra)
  useEffect(() => {
    async function fetchPresupuestos() {
      setLoading(true);
      try {
        const res = await fetch(`/api/presupuestos?email=${encodeURIComponent(user.email)}&role=${encodeURIComponent(user.role)}`);
        let data = await res.json();
        setPresupuestos(data);
      } catch (err) {
        setPresupuestos([]);
      } finally {
        setLoading(false);
      }
    }
    if (user?.email && user?.role) fetchPresupuestos();
  }, [user]);

  const filtered = filtroEstado
    ? presupuestos.filter(p => p.estado === filtroEstado)
    : presupuestos;

  // Obtener nombre de cliente
  const getClienteNombre = (id) => {
    const c = clientes.find(c => c.id == id);
    return c ? c.name : id;
  };
  // Obtener nombre de producto
  const getProductoNombre = (id) => {
    const p = productos.find(p => p.id == id);
    return p ? p.name : id;
  };
  // Obtener nombre de vendedor
  const getVendedorNombre = (v) => v === 1 ? "Guille" : v === 2 ? "Santi" : v;
  const getPrecioGeneral = (prod) => {
    if (!prod || !Array.isArray(prod.price)) return 0;
    const general = prod.price.find(p => p.name === "General");
    return general?.price || 0;
  };

  // Mostrar detalle en modal
  const handleVerDetalle = (row) => {
    setDetalle(row);
    setModalVisible(true);
  };

  const abrirDetalle = (presupuesto) => {
    setPresupuestoDetalle(presupuesto);
    setNuevoEstado(presupuesto.estado);
    setModalVisible(true);
  };

  const cambiarEstado = async () => {
    if (!presupuestoDetalle) return;
    await fetch(`/api/presupuestos/${presupuestoDetalle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado })
    });
    setPresupuestos(prev => prev.map(p => p.id === presupuestoDetalle.id ? { ...p, estado: nuevoEstado } : p));
    setModalVisible(false);
  };

  // Eliminar presupuesto
  const eliminarPresupuesto = async (id) => {
    await fetch(`/api/presupuestos/${id}`, { method: 'DELETE' });
    setPresupuestos(prev => prev.filter(p => p.id !== id));
  };

  // Sincronizar estados manualmente
  const sincronizarEstados = async () => {
    await fetch('/api/sync-estados-presupuestos', { method: 'POST' });
    // Refrescar lista
    if (user?.email && user?.role) {
      setLoading(true);
      const res = await fetch(`/api/presupuestos?email=${encodeURIComponent(user.email)}&role=${encodeURIComponent(user.role)}`);
      setPresupuestos(await res.json());
      setLoading(false);
    }
  };

  // Utilidad para formatear fecha
  const formatFecha = (fecha) => {
    if (!fecha) return '';
    if (typeof fecha === 'string' || typeof fecha === 'number') {
      const d = new Date(fecha);
      return isNaN(d) ? '' : d.toLocaleDateString();
    }
    if (fecha.seconds) {
      const d = new Date(fecha.seconds * 1000);
      return d.toLocaleDateString();
    }
    if (fecha._seconds) {
      const d = new Date(fecha._seconds * 1000);
      return d.toLocaleDateString();
    }
    return '';
  };

  return (
    <Card title="Listado de Presupuestos" style={{ maxWidth: 1000, margin: "2rem auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <Button label="Nuevo Presupuesto" icon="pi pi-plus" onClick={() => navigate("/presupuestos/nuevo")} />
          {user.role === 'admin' && (
            <Button label="Sincronizar estados" icon="pi pi-refresh" className="p-button-help" style={{ marginLeft: 10 }} onClick={sincronizarEstados} />
          )}
        </div>
        <div>
          <Button label="Pendientes" className={filtroEstado === "pendiente" ? "p-button-info" : "p-button-text"} onClick={() => setFiltroEstado("pendiente")} style={{ marginRight: 8 }} />
          <Button label="Facturados" className={filtroEstado === "facturado" ? "p-button-success" : "p-button-text"} onClick={() => setFiltroEstado("facturado")} />
        </div>
      </div>
      <DataTable value={filtered} loading={loading} paginator rows={10} emptyMessage="No hay presupuestos.">
        <Column field="fechaCreacion" header="Fecha" body={row => new Date(row.fechaCreacion._seconds ? row.fechaCreacion._seconds * 1000 : row.fechaCreacion).toLocaleDateString()} />
        <Column field="clienteId" header="Cliente" body={row => getClienteNombre(row.clienteId)} />
        <Column field="estado" header="Estado" body={row => {
           let label = row.estado === 'facturado' ? 'Facturada' : 'Sin facturar';
           let severity = row.estado === 'facturado' ? 'success' : (row.estado === 'pendiente-alegra' ? 'warning' : 'info');
           return <Tag value={label} severity={severity} />;
          }} />
        <Column field="vendedor" header="Usuario" body={row => getVendedorNombre(row.vendedor)} />
        <Column header="Acciones" body={row => <Button label="Ver" icon="pi pi-eye" className="p-button-text" onClick={() => abrirDetalle(row)} />} />
        {user.role === 'admin' && (
          <Column header="Eliminar" body={row => <Button icon="pi pi-trash" className="p-button-danger p-button-text" onClick={() => eliminarPresupuesto(row.id)} />} />
        )}
      </DataTable>
      <Dialog header="Detalle de Presupuesto" visible={modalVisible} style={{ width: '500px' }} onHide={() => setModalVisible(false)}>
        {detalle && (
          <div>
            <p><b>Cliente:</b> {getClienteNombre(detalle.clienteId)}</p>
            <p><b>Estado:</b> {detalle.estado}</p>
            <p><b>Fecha:</b> {new Date(detalle.fechaCreacion._seconds * 1000).toLocaleDateString()}</p>
            <p><b>Observaciones:</b> {detalle.observaciones || '-'}</p>
            <p><b>Productos:</b></p>
            <ul>
              {detalle.items.map((item, idx) => (
                <li key={idx}>{getProductoNombre(item.producto)} - Cantidad: {item.cantidad}</li>
              ))}
            </ul>
          </div>
        )}
      </Dialog>
      <Dialog header="Detalle de Presupuesto" visible={modalVisible} style={{ width: 600 }} onHide={() => setModalVisible(false)}>
        {presupuestoDetalle && (
          <div>
            <div><b>Cliente:</b> {getClienteNombre(presupuestoDetalle.clienteId)}</div>
            <div><b>Vendedor:</b> {getVendedorNombre(presupuestoDetalle.vendedor)}</div>
            <div><b>Fecha:</b> {formatFecha(presupuestoDetalle.fechaCreacion)}</div>
            <div><b>Estado:</b> {presupuestoDetalle.estado}</div>
            {/* Mostrar factura asociada si está facturado */}
            {presupuestoDetalle.estado === 'facturado' && Array.isArray(presupuestoDetalle.facturaAlegra) && presupuestoDetalle.facturaAlegra.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <b>Factura asociada:</b>
                <ul>
                  {presupuestoDetalle.facturaAlegra.map((fact, idx) => (
                    <li key={idx}>
                      N°: {fact.number || fact.id || '-'}
                      {fact.date ? ` - Fecha: ${new Date(fact.date).toLocaleDateString()}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <b>Productos:</b>
              <ul>
                {presupuestoDetalle.items.map((item, idx) => {
                  const prod = productos.find(p => p.id == item.producto);
                  const precio = getPrecioGeneral(prod);
                  const subtotal = item.cantidad * precio * (1 - (item.bonificacion || 0) / 100);
                  return (
                    <li key={idx}>
                      {getProductoNombre(item.producto)} - Cantidad: {item.cantidad} - Bonificación: {item.bonificacion || 0}% - Precio: {precio.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })} - Subtotal: {subtotal.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div style={{ marginTop: 10 }}><b>Observaciones:</b> {presupuestoDetalle.observaciones}</div>
            {/* Eliminar opción de cambiar estado manualmente */}
          </div>
        )}
      </Dialog>
    </Card>
  );
}

export default PresupuestosList; 
import React, { useEffect, useState, useRef } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  updateDoc,
  doc,
  orderBy,
  where,
  getDocs,
  query as fsQuery,
  deleteDoc
} from "firebase/firestore";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { ConfirmDialog } from "primereact/confirmdialog";
import { Tag } from "primereact/tag";
import { Divider } from "primereact/divider";

const COBRADORES = [
  { label: "Mariano", value: "Mariano" },
  { label: "Ruben", value: "Ruben" },
  { label: "Diego", value: "Diego" },
  { label: "Guille", value: "Guille" },
  { label: "Santi", value: "Santi" },
  { label: "German", value: "German" }
];

function PedidosEnviados({ user }) {
  const [pedidos, setPedidos] = useState([]);
  const [selectedPedidos, setSelectedPedidos] = useState([]);
  const [hojasDeRuta, setHojasDeRuta] = useState([]);
  const [hojasDeRutaCompletas, setHojasDeRutaCompletas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    fecha: null,
    cobrador: user.role === "admin" ? null : user.name
  });
  const [loading, setLoading] = useState(false);
  const toast = useRef(null);
  const [expandedHoja, setExpandedHoja] = useState(null);
  const [showAgregarPedido, setShowAgregarPedido] = useState(false);
  const [pedidosDisponibles, setPedidosDisponibles] = useState([]);
  const [editandoHoja, setEditandoHoja] = useState(null);
  const [editForm, setEditForm] = useState({ nombre: '', fecha: null, cobrador: '' });
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [hojaAEliminar, setHojaAEliminar] = useState(null);
  const [detallesPedidosHoja, setDetallesPedidosHoja] = useState({}); // { hojaId: [pedidos] }
  const [activeTab, setActiveTab] = useState('pendientes'); // 'pendientes' o 'completas'
  const [expandedPedidos, setExpandedPedidos] = useState(null);

  // 1. Estados para catálogos
  const [clientesCatalogo, setClientesCatalogo] = useState([]);
  const [productosCatalogo, setProductosCatalogo] = useState([]);
  const [loadingClientesCatalogo, setLoadingClientesCatalogo] = useState(true);
  const [catalogoCargado, setCatalogoCargado] = useState(false);

  // Cargar pedidos con estado 'recibido' y filtrar en frontend los que no tengan hoja de ruta asignada
  useEffect(() => {
    const q = query(
      collection(db, "pedidosClientes"),
      where("estadoRecepcion", "==", "recibido"),
      orderBy("fecha", "desc")
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      // Filtrar en frontend los que no tengan hojaDeRutaId
      setPedidos(data.filter(p => !p.hojaDeRutaId));
    });
    return () => unsubscribe();
  }, []);

  // Cargar hojas de ruta existentes y separarlas por estado
  useEffect(() => {
    const q = query(collection(db, "hojasDeRuta"), orderBy("fecha", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      console.log("Todas las hojas de ruta:", data);
      
      // Separar hojas de ruta por estado
      const pendientes = data.filter(hoja => !hoja.estado || hoja.estado === 'pendiente' || hoja.estado === 'en_curso');
      const completas = data.filter(hoja => hoja.estado === 'completa');
      
      console.log("Hojas pendientes:", pendientes);
      console.log("Hojas completas:", completas);
      
      setHojasDeRuta(pendientes);
      setHojasDeRutaCompletas(completas);
    });
    return () => unsubscribe();
  }, []);

  // Traer pedidos disponibles para agregar (recibidos y sin hoja)
  useEffect(() => {
    if (showAgregarPedido) {
      const q = query(
        collection(db, "pedidosClientes"),
        where("estadoRecepcion", "==", "recibido"),
        orderBy("fecha", "desc")
      );
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        let data = [];
        querySnapshot.forEach((doc) => {
          const pedido = { id: doc.id, ...doc.data() };
          if (!pedido.hojaDeRutaId) data.push(pedido);
        });
        setPedidosDisponibles(data);
      });
      return () => unsubscribe();
    }
  }, [showAgregarPedido]);

  // Cargar catálogos de forma independiente
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
    fetchClientesCatalogo();
    fetchProductosCatalogo();
  }, []);

  // Cambiar orden de pedidos en hoja de ruta
  const moverPedido = async (hoja, idx, direccion) => {
    const nuevosPedidos = [...hoja.pedidos];
    const nuevoIdx = idx + direccion;
    if (nuevoIdx < 0 || nuevoIdx >= nuevosPedidos.length) return;
    // Intercambiar
    [nuevosPedidos[idx], nuevosPedidos[nuevoIdx]] = [nuevosPedidos[nuevoIdx], nuevosPedidos[idx]];
    await updateDoc(doc(db, "hojasDeRuta", hoja.id), { pedidos: nuevosPedidos });
    // Reordenar localmente los detalles
    if (detallesPedidosHoja[hoja.id]) {
      const detalles = [...detallesPedidosHoja[hoja.id]];
      [detalles[idx], detalles[nuevoIdx]] = [detalles[nuevoIdx], detalles[idx]];
      setDetallesPedidosHoja(prev => ({ ...prev, [hoja.id]: detalles }));
    }
  };

  // Al expandir una hoja de ruta, traer detalles de todos los pedidos agrupados
  const onRowExpand = async (event) => {
    const hoja = event.data;
    if (!hoja.pedidos || hoja.pedidos.length === 0) {
      setDetallesPedidosHoja(prev => ({ ...prev, [hoja.id]: [] }));
      return;
    }
    // Traer detalles de los pedidos por sus IDs
    const pedidosRef = collection(db, "pedidosClientes");
    const q = fsQuery(pedidosRef, where("__name__", "in", hoja.pedidos));
    const snapshot = await getDocs(q);
    let pedidosDetallados = [];
    snapshot.forEach(docSnap => {
      pedidosDetallados.push({ id: docSnap.id, ...docSnap.data() });
    });
    // Ordenar según el array de IDs de la hoja de ruta
    pedidosDetallados = hoja.pedidos.map(id => pedidosDetallados.find(p => p.id === id)).filter(Boolean);
    setDetallesPedidosHoja(prev => ({ ...prev, [hoja.id]: pedidosDetallados }));
  };

  // Cambiar estado del pedido (recibido <-> enviado) y actualizar estado de la hoja de ruta
  const cambiarEstadoPedido = async (pedido, hojaId) => {
    let nuevoEstado = "recibido";
    if (pedido.estadoRecepcion === "recibido") {
      nuevoEstado = "enviado";
    } else if (pedido.estadoRecepcion === "enviado") {
      nuevoEstado = "recibido";
    }
    
    console.log("Cambiando estado del pedido:", pedido.id, "de", pedido.estadoRecepcion, "a", nuevoEstado);
    
    await updateDoc(doc(db, "pedidosClientes", pedido.id), { estadoRecepcion: nuevoEstado });
    
    // Refrescar detalles
    await onRowExpand({ data: { id: hojaId, pedidos: (detallesPedidosHoja[hojaId] || []).map(p => p.id) } });
    
    // Verificar si todos los pedidos están enviados
    const pedidosActualizados = detallesPedidosHoja[hojaId]?.map(p => 
      p.id === pedido.id ? { ...p, estadoRecepcion: nuevoEstado } : p
    ) || [];
    
    console.log("Pedidos actualizados:", pedidosActualizados);
    
    const todosEnviados = pedidosActualizados.length > 0 && pedidosActualizados.every(p => p.estadoRecepcion === 'enviado');
    console.log("Todos enviados:", todosEnviados);
    
    const nuevoEstadoHoja = todosEnviados ? 'completa' : 'pendiente';
    console.log("Nuevo estado de la hoja:", nuevoEstadoHoja);
    
    await updateDoc(doc(db, "hojasDeRuta", hojaId), { estado: nuevoEstadoHoja });
    
    // Actualizar estado local inmediatamente
    setHojasDeRuta(prev => {
      const hoja = prev.find(h => h.id === hojaId);
      if (hoja) {
        if (nuevoEstadoHoja === 'completa') {
          // Mover a completas
          setHojasDeRutaCompletas(prevCompletas => [...prevCompletas, { ...hoja, estado: 'completa' }]);
          return prev.filter(h => h.id !== hojaId);
        } else {
          // Mantener en pendientes
          return prev.map(h => h.id === hojaId ? { ...h, estado: 'pendiente' } : h);
        }
      }
      return prev;
    });
  };

  // Quitar pedido de hoja de ruta
  const quitarPedido = async (hoja, pedidoId) => {
    const nuevosPedidos = hoja.pedidos.filter(id => id !== pedidoId);
    await updateDoc(doc(db, "hojasDeRuta", hoja.id), { pedidos: nuevosPedidos });
    await updateDoc(doc(db, "pedidosClientes", pedidoId), { hojaDeRutaId: null });
  };

  // Agregar pedido a hoja de ruta
  const agregarPedidoAHoja = async (hoja, pedidoId) => {
    const nuevosPedidos = [...hoja.pedidos, pedidoId];
    await updateDoc(doc(db, "hojasDeRuta", hoja.id), { pedidos: nuevosPedidos });
    await updateDoc(doc(db, "pedidosClientes", pedidoId), { hojaDeRutaId: hoja.id });
    setShowAgregarPedido(false);
  };

  // Editar hoja de ruta (nombre, fecha, cobrador)
  const guardarEdicionHoja = async () => {
    await updateDoc(doc(db, "hojasDeRuta", editandoHoja.id), {
      nombre: editForm.nombre,
      fecha: editForm.fecha,
      cobrador: editForm.cobrador
    });
    setEditandoHoja(null);
  };

  // Eliminar hoja de ruta y desasociar pedidos
  const eliminarHojaDeRuta = async (hoja) => {
    // Desasociar pedidos (ignorar los que no existen)
    await Promise.all(
      hoja.pedidos.map(async pid => {
        try {
          await updateDoc(doc(db, "pedidosClientes", pid), { hojaDeRutaId: null });
        } catch (err) {
          // Si el documento no existe, ignorar el error
          if (err.code !== 'not-found') {
            console.error('Error al desasociar pedido:', pid, err);
          }
        }
      })
    );
    // Eliminar hoja
    await deleteDoc(doc(db, "hojasDeRuta", hoja.id));
    setConfirmDialogVisible(false);
    setHojaAEliminar(null);
  };

  // Marcar hoja de ruta como completa
  const marcarHojaComoCompleta = async (hoja) => {
    await updateDoc(doc(db, "hojasDeRuta", hoja.id), { estado: 'completa' });
    toast.current.show({ severity: "success", summary: "Éxito", detail: "Hoja de ruta marcada como completa" });
  };

  // Marcar hoja de ruta como pendiente
  const marcarHojaComoPendiente = async (hoja) => {
    await updateDoc(doc(db, "hojasDeRuta", hoja.id), { estado: 'pendiente' });
    toast.current.show({ severity: "success", summary: "Éxito", detail: "Hoja de ruta marcada como pendiente" });
  };

  // Verificar si una hoja de ruta está completa (todos los pedidos enviados)
  const esHojaCompleta = (hoja) => {
    const pedidosHoja = detallesPedidosHoja[hoja.id] || [];
    return pedidosHoja.length > 0 && pedidosHoja.every(p => p.estadoRecepcion === 'enviado');
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
      <span>
        {loading ? `${clienteId} (cargando...)` : nombre}
      </span>
    );
  };

  // 3. Función para obtener razón social (mantener para compatibilidad)
  const getRazonSocial = (clienteId) => {
    if (catalogoCargado && clientesCatalogo.length > 0) {
      const cliente = clientesCatalogo.find(c => c.id === clienteId);
      return cliente ? cliente.razonSocial : clienteId;
    }
    return clienteId;
  };
  // 4. Función para obtener nombre de producto
  const getNombreProducto = (productoId) => {
    const prod = productosCatalogo.find(p => p.id === productoId);
    return prod ? prod.producto : productoId;
  };

  // Render detalle expandido de hoja de ruta
  const detalleHojaTemplate = (hoja) => {
    const pedidosHoja = detallesPedidosHoja[hoja.id] || [];
    const esCompleta = esHojaCompleta(hoja);
    
    return (
      <Card className="p-mt-2 p-shadow-2" style={{ borderRadius: 12, background: '#f9fafb', padding: 12 }}>
        <div className="p-d-flex p-jc-between p-ai-center p-flex-column p-flex-md-row p-mb-2">
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#374151' }}>
            <span style={{ display: 'block', marginBottom: 2 }}><b>Nombre:</b> {hoja.nombre}</span>
            <span style={{ display: 'block', marginBottom: 2 }}><b>Fecha:</b> {formatFecha(hoja.fecha)}</span>
            <span style={{ display: 'block', marginBottom: 2 }}><b>Cargado por:</b> {hoja.cobrador}</span>
            {hoja.ubicacion && (
              <span style={{ display: 'block', marginBottom: 2 }}><b>Ubicación:</b> {hoja.ubicacion}</span>
            )}
          </div>
          <div className="p-d-flex p-gap-2 p-mt-2 p-mt-md-0">
            <Button icon="pi pi-map" className="p-button-rounded p-button-info p-button-text" tooltip="Ver en mapa (futuro)" />
            <Button icon="pi pi-pencil" className="p-button-rounded p-button-text" onClick={() => { setEditandoHoja(hoja); setEditForm({ nombre: hoja.nombre, fecha: hoja.fecha, cobrador: hoja.cobrador }); }} tooltip="Editar hoja de ruta" />
            <Button icon="pi pi-plus" className="p-button-rounded p-button-success p-button-text" onClick={() => setShowAgregarPedido(true)} tooltip="Agregar pedido" />
            {esCompleta ? (
              <Button icon="pi pi-undo" className="p-button-rounded p-button-warning p-button-text" onClick={() => marcarHojaComoPendiente(hoja)} tooltip="Marcar como pendiente" />
            ) : (
              <Button icon="pi pi-check" className="p-button-rounded p-button-success p-button-text" onClick={() => marcarHojaComoCompleta(hoja)} tooltip="Marcar como completa" />
            )}
            <Button icon="pi pi-trash" className="p-button-rounded p-button-danger p-button-text" onClick={() => { setConfirmDialogVisible(true); setHojaAEliminar(hoja); }} tooltip="Eliminar hoja de ruta" />
          </div>
        </div>
        <Divider className="p-mb-2" />
        <div>
          <h4 style={{ color: '#374151', fontWeight: 700, marginBottom: 8, fontSize: 16 }}>
            Pedidos agrupados {esCompleta && <Tag value="Completa" severity="success" style={{ marginLeft: 8 }} />}
          </h4>
          {pedidosHoja.length === 0 ? (
            <div style={{ color: '#888', fontStyle: 'italic', padding: 8 }}>No hay pedidos en esta hoja de ruta.</div>
          ) : (
            <div className="p-grid p-nogutter">
              {pedidosHoja.map((row, idx) => (
                <div key={row.id} className="p-col-12 p-md-6 p-lg-4">
                  <Card className="p-mb-1 p-shadow-1" style={{ borderRadius: 6, background: '#fff', padding: 8, minHeight: 'unset', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div className="p-d-flex p-ai-center p-jc-between" style={{ marginBottom: 1 }}>
                      <div style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}><ClienteNombre clienteId={row.cliente} /></div>
                      <div className="p-d-flex p-ai-center" style={{ gap: 3 }}>
                        <Tag value={row.condicion === 'cuenta_corriente' ? 'Cuenta Corriente' : row.condicion === 'contado' ? 'Contado' : '-'} severity={row.condicion === 'cuenta_corriente' ? 'info' : 'success'} style={{ borderRadius: 6, fontSize: 11, padding: '1px 6px' }} />
                        <Tag value={row.estadoRecepcion === 'recibido' ? 'Recibido' : row.estadoRecepcion === 'enviado' ? 'Enviado' : '-'} severity={row.estadoRecepcion === 'recibido' ? 'success' : row.estadoRecepcion === 'enviado' ? 'info' : 'warning'} style={{ borderRadius: 6, fontSize: 11, padding: '1px 6px' }} />
                      </div>
                    </div>
                    {row.ubicacion && (
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 1 }}>
                        📍 {row.ubicacion}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: '#374151', margin: '1px 0 2px 0' }}>
                      <ul style={{ margin: '1px 0 0 12px', padding: 0 }}>
                        {Array.isArray(row.items) && row.items.length > 0 ? row.items.map((item, i) => (
                          <li key={i} style={{ marginBottom: 1, lineHeight: 1.3 }}>
                            <span style={{ fontWeight: 500, color: '#1f2937' }}>{getNombreProducto(item.producto)}</span>
                            <span style={{ color: '#6366f1', fontWeight: 600, marginLeft: 4 }}>×{item.cantidad}</span>
                          </li>
                        )) : <li>-</li>}
                      </ul>
                    </div>
                    <div className="p-d-flex p-jc-end p-ai-center" style={{ gap: 3, marginTop: 1 }}>
                      <Button 
                        icon={row.estadoRecepcion === 'recibido' ? 'pi pi-send' : 'pi pi-undo'} 
                        className={row.estadoRecepcion === 'recibido' ? 'p-button-rounded p-button-success p-button-text' : 'p-button-rounded p-button-warning p-button-text'} 
                        style={{ fontSize: 12, width: 26, height: 26 }}
                        onClick={() => cambiarEstadoPedido(row, hoja.id)} 
                        tooltip={row.estadoRecepcion === 'recibido' ? 'Marcar enviado' : 'Volver a recibido'} 
                      />
                      <Button icon="pi pi-times" className="p-button-rounded p-button-danger p-button-text" style={{ fontSize: 12, width: 26, height: 26 }} onClick={() => quitarPedido(hoja, row.id)} tooltip="Quitar" />
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    );
  };

  // Template para mostrar el detalle de productos de cada pedido
  const detallePedidoTemplate = (pedido) => {
    return (
      <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, margin: 8 }}>
        <div className="p-d-flex p-jc-between p-ai-center p-mb-2">
          <div>
            <strong>Cliente:</strong> <ClienteNombre clienteId={pedido.cliente} />
          </div>
          <div className="p-d-flex p-gap-2">
            <Tag 
              value={pedido.condicion === 'cuenta_corriente' ? 'Cuenta Corriente' : pedido.condicion === 'contado' ? 'Contado' : '-'} 
              severity={pedido.condicion === 'cuenta_corriente' ? 'info' : 'success'} 
              style={{ fontSize: 12 }}
            />
            <Tag 
              value={pedido.estadoRecepcion === 'recibido' ? 'Recibido' : pedido.estadoRecepcion === 'enviado' ? 'Enviado' : '-'} 
              severity={pedido.estadoRecepcion === 'recibido' ? 'success' : 'info'} 
              style={{ fontSize: 12 }}
            />
          </div>
        </div>
        <div>
          <strong>Productos:</strong>
          <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
            {Array.isArray(pedido.items) && pedido.items.length > 0 ? pedido.items.map((item, idx) => (
              <li key={idx} style={{ marginBottom: 4, lineHeight: 1.4 }}>
                <span style={{ fontWeight: 500, color: '#1f2937' }}>{getNombreProducto(item.producto)}</span>
                <span style={{ color: '#6366f1', fontWeight: 600, marginLeft: 6 }}>×{item.cantidad}</span>
              </li>
            )) : <li>Sin productos especificados</li>}
          </ul>
        </div>
        {pedido.observaciones && (
          <div style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
            <strong>Observaciones:</strong> {pedido.observaciones}
          </div>
        )}
      </div>
    );
  };

  const validar = () => {
    if (!form.nombre.trim()) return "El nombre es obligatorio";
    if (!form.fecha) return "La fecha es obligatoria";
    if (user.role === "admin" && !form.cobrador) return "Debes seleccionar el cobrador";
    if (selectedPedidos.length === 0) return "Debes seleccionar al menos un pedido";
    return null;
  };

  const handleCrearHojaDeRuta = async (e) => {
    e.preventDefault();
    const error = validar();
    if (error) {
      toast.current.show({ severity: "error", summary: "Error", detail: error });
      return;
    }
    setLoading(true);
    try {
      // Crear hoja de ruta
      const hojaRef = await addDoc(collection(db, "hojasDeRuta"), {
        nombre: form.nombre,
        fecha: form.fecha,
        cobrador: user.role === "admin" ? form.cobrador : user.name,
        pedidos: selectedPedidos.map(p => p.id)
      });
      // Actualizar pedidos seleccionados
      await Promise.all(
        selectedPedidos.map(p =>
          updateDoc(doc(db, "pedidosClientes", p.id), {
            hojaDeRutaId: hojaRef.id
          })
        )
      );
      toast.current.show({ severity: "success", summary: "Éxito", detail: "Hoja de ruta creada" });
      setModalVisible(false);
      setSelectedPedidos([]);
      setForm({ nombre: "", fecha: null, cobrador: user.role === "admin" ? null : user.name });
    } catch (err) {
      console.error("Error al crear hoja de ruta:", err);
      toast.current.show({ severity: "error", summary: "Error", detail: "No se pudo crear la hoja de ruta" });
    }
    setLoading(false);
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "";
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha.seconds * 1000);
    return date.toLocaleDateString("es-AR");
  };

  // Al abrir el modal de edición, inicializar el orden de pedidos
  useEffect(() => {
    if (editandoHoja && detallesPedidosHoja[editandoHoja.id]) {
      setEditForm(f => ({
        ...f,
        pedidosOrder: detallesPedidosHoja[editandoHoja.id]
      }));
    }
    // eslint-disable-next-line
  }, [editandoHoja, detallesPedidosHoja]);

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

  return (
    <div className="p-p-2 p-p-md-3 p-p-lg-4" style={{ maxWidth: "100%", margin: "0 auto", overflow: "hidden" }}>
      <Toast ref={toast} />
      <Card className="p-mb-3">
        <h2 className="p-m-0 p-text-lg p-text-md-xl p-text-lg-2xl" style={{ color: "#1f2937", wordWrap: "break-word" }}>Agrupar Pedidos en Hojas de Ruta</h2>
        <div className="p-mt-3">
          <Button 
            label="Crear hoja de ruta con seleccionados" 
            icon="pi pi-plus" 
            className="p-button-primary p-button-sm"
            disabled={selectedPedidos.length === 0}
            onClick={() => setModalVisible(true)}
          />
        </div>
        <DataTable
          value={pedidos}
          selection={selectedPedidos}
          onSelectionChange={e => setSelectedPedidos(e.value)}
          dataKey="id"
          paginator
          rows={8}
          responsiveLayout="stack"
          emptyMessage="No hay pedidos recibidos disponibles."
          className="p-datatable-sm p-fluid p-mt-3"
          style={{ width: '100%' }}
          expandedRows={expandedPedidos}
          onRowToggle={e => setExpandedPedidos(e.data)}
          rowExpansionTemplate={detallePedidoTemplate}
        >
          <Column selectionMode="multiple" headerStyle={{ width: '3em' }} />
          <Column expander style={{ width: '3em' }} />
          <Column field="fecha" header="Fecha" body={row => formatFecha(row.fecha)} />
          <Column
            field="cliente"
            header="Cliente"
            body={(row) => <ClienteNombre clienteId={row.cliente} />}
            style={{ minWidth: "150px" }}
          />
          <Column field="cobrador" header="Cargado por" />
        </DataTable>
      </Card>

      {/* Modal para crear hoja de ruta */}
      {modalVisible && (
        <div className="p-dialog-mask" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 1000 }}>
          <div className="p-dialog" style={{ maxWidth: 400, margin: '10vh auto', background: '#fff', borderRadius: 8, padding: 24, position: 'relative' }}>
            <h3>Crear Hoja de Ruta</h3>
            <form onSubmit={handleCrearHojaDeRuta}>
              <div className="p-field">
                <label>Nombre *</label>
                <InputText value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="p-fluid" required />
              </div>
              <div className="p-field">
                <label>Fecha *</label>
                <Calendar value={form.fecha} onChange={e => setForm({ ...form, fecha: e.value })} dateFormat="dd/mm/yy" showIcon className="p-fluid" required />
              </div>
              <div className="p-field">
                <label>Cobrador *</label>
                <Dropdown value={form.cobrador} options={COBRADORES} onChange={e => setForm({ ...form, cobrador: e.value })} placeholder="Selecciona cobrador" className="p-fluid" required />
              </div>
              <div className="p-field">
                <label>Pedidos seleccionados</label>
                <ul style={{ paddingLeft: 18 }}>
                  {selectedPedidos.map(p => (
                    <li key={p.id}>{p.cliente} ({formatFecha(p.fecha)})</li>
                  ))}
                </ul>
              </div>
              <div className="p-d-flex p-jc-end p-mt-3" style={{ gap: 8 }}>
                <Button type="button" label="Cancelar" className="p-button-text" onClick={() => setModalVisible(false)} />
                <Button type="submit" label="Crear" icon="pi pi-save" loading={loading} className="p-button-primary" />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Listado de hojas de ruta */}
      <Card className="p-mt-4">
        <div className="p-d-flex p-jc-between p-ai-center p-mb-3">
          <h3 className="p-m-0 p-text-lg p-text-md-xl">Hojas de Ruta</h3>
          <div className="p-d-flex p-gap-2">
            <Button 
              label="Pendientes" 
              className={activeTab === 'pendientes' ? 'p-button-primary' : 'p-button-text'} 
              onClick={() => setActiveTab('pendientes')}
            />
            <Button 
              label="Completas" 
              className={activeTab === 'completas' ? 'p-button-primary' : 'p-button-text'} 
              onClick={() => setActiveTab('completas')}
            />
          </div>
        </div>
        <div style={{ margin: '16px 0' }}>
          <Button label="Refrescar clientes" icon="pi pi-refresh" onClick={handleRefrescarClientes} severity="info" outlined size="small" />
          <Button label="Refrescar productos" icon="pi pi-refresh" onClick={handleRefrescarProductos} severity="info" outlined size="small" style={{ marginLeft: 8, marginBottom: 8 }} />
        </div>
        <DataTable
          value={activeTab === 'pendientes' ? hojasDeRuta : hojasDeRutaCompletas}
          paginator
          rows={8}
          responsiveLayout="stack"
          emptyMessage={`No hay hojas de ruta ${activeTab === 'pendientes' ? 'pendientes' : 'completas'}.`}
          className="p-datatable-sm p-fluid p-mt-3"
          style={{ width: '100%' }}
          expandedRows={expandedHoja}
          onRowToggle={e => setExpandedHoja(e.data)}
          rowExpansionTemplate={detalleHojaTemplate}
          onRowExpand={onRowExpand}
        >
          <Column expander style={{ width: '3em' }} />
          <Column field="nombre" header="Nombre" />
          <Column field="fecha" header="Fecha" body={row => formatFecha(row.fecha)} />
          <Column field="cobrador" header="Cargado por" />
          <Column field="pedidos" header="Pedidos agrupados" body={row => row.pedidos?.length || 0} />
          <Column header="Estado" body={row => {
            const esCompleta = esHojaCompleta(row);
            return <Tag value={esCompleta ? 'Completa' : 'Pendiente'} severity={esCompleta ? 'success' : 'warning'} />;
          }} />
        </DataTable>
      </Card>

      {/* Modal para agregar pedido */}
      {showAgregarPedido && expandedHoja && (
        <div className="p-dialog-mask" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 1000 }}>
          <div className="p-dialog" style={{ maxWidth: 400, margin: '10vh auto', background: '#fff', borderRadius: 8, padding: 24, position: 'relative' }}>
            <h3>Agregar Pedido</h3>
            <ul style={{ paddingLeft: 18 }}>
              {pedidosDisponibles.map(p => (
                <li key={p.id} style={{ marginBottom: 8 }}>
                  <ClienteNombre clienteId={p.cliente} /> ({formatFecha(p.fecha)})
                  <Button label="Agregar" className="p-button-text p-button-success p-ml-2" onClick={() => agregarPedidoAHoja(expandedHoja, p.id)} />
                </li>
              ))}
            </ul>
            <Button label="Cerrar" className="p-button-text" onClick={() => setShowAgregarPedido(false)} />
          </div>
        </div>
      )}

      {/* Modal para editar hoja de ruta */}
      {editandoHoja && (
        <div className="p-dialog-mask" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 1000 }}>
          <div className="p-dialog" style={{ maxWidth: 400, margin: '10vh auto', background: '#fff', borderRadius: 8, padding: 24, position: 'relative' }}>
            <h3>Editar Hoja de Ruta</h3>
            <form onSubmit={async e => {
              e.preventDefault();
              if (editandoHoja && editandoHoja.pedidos && editForm.pedidosOrder) {
                await updateDoc(doc(db, "hojasDeRuta", editandoHoja.id), {
                  pedidos: editForm.pedidosOrder.map(p => p.id),
                  nombre: editForm.nombre,
                  fecha: editForm.fecha,
                  cobrador: editForm.cobrador
                });
                // Actualizar el estado local para reflejar el nuevo orden
                setDetallesPedidosHoja(prev => ({
                  ...prev,
                  [editandoHoja.id]: editForm.pedidosOrder
                }));
                setEditandoHoja(null);
                return;
              }
              await guardarEdicionHoja();
            }}>
              <div className="p-field">
                <label>Nombre *</label>
                <InputText value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} className="p-fluid" required />
              </div>
              <div className="p-field">
                <label>Fecha *</label>
                <Calendar value={editForm.fecha} onChange={e => setEditForm({ ...editForm, fecha: e.value })} dateFormat="dd/mm/yy" showIcon className="p-fluid" required />
              </div>
              <div className="p-field">
                <label>Cargado por *</label>
                <Dropdown value={editForm.cobrador} options={COBRADORES} onChange={e => setEditForm({ ...editForm, cobrador: e.value })} placeholder="Selecciona cobrador" className="p-fluid" required />
              </div>
              {/* Reordenamiento de pedidos agrupados */}
              {editandoHoja && detallesPedidosHoja[editandoHoja.id] && detallesPedidosHoja[editandoHoja.id].length > 0 && (
                <div className="p-field">
                  <label>Reordenar pedidos agrupados</label>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {editForm.pedidosOrder && editForm.pedidosOrder.map((pedido, idx) => (
                      <li key={pedido.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 4, background: '#f3f4f6', borderRadius: 6, padding: '4px 8px' }}>
                        <span style={{ flex: 1 }}>
                          <b>{pedido.cliente}</b> {pedido.items && Array.isArray(pedido.items) && pedido.items.length > 0 && (
                            <span style={{ color: '#6366f1', fontSize: 13 }}>({pedido.items.map(i => `${getNombreProducto(i.producto)} x${i.cantidad}`).join(', ')})</span>
                          )}
                        </span>
                        <Button icon="pi pi-arrow-up" className="p-button-rounded p-button-text" style={{ fontSize: 13, width: 28, height: 28 }} onClick={e => { e.preventDefault(); if (idx > 0) { const arr = [...editForm.pedidosOrder]; [arr[idx], arr[idx-1]] = [arr[idx-1], arr[idx]]; setEditForm(f => ({ ...f, pedidosOrder: arr })); } }} disabled={idx === 0} tooltip="Subir" />
                        <Button icon="pi pi-arrow-down" className="p-button-rounded p-button-text" style={{ fontSize: 13, width: 28, height: 28 }} onClick={e => { e.preventDefault(); if (idx < editForm.pedidosOrder.length - 1) { const arr = [...editForm.pedidosOrder]; [arr[idx], arr[idx+1]] = [arr[idx+1], arr[idx]]; setEditForm(f => ({ ...f, pedidosOrder: arr })); } }} disabled={idx === editForm.pedidosOrder.length - 1} tooltip="Bajar" />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="p-d-flex p-jc-end p-mt-3" style={{ gap: 8 }}>
                <Button type="button" label="Cancelar" className="p-button-text" onClick={() => setEditandoHoja(null)} />
                <Button type="submit" label="Guardar" icon="pi pi-save" className="p-button-primary" />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm dialog para eliminar hoja de ruta */}
      <ConfirmDialog visible={confirmDialogVisible} onHide={() => setConfirmDialogVisible(false)} message="¿Seguro que deseas eliminar la hoja de ruta?" header="Confirmar eliminación" icon="pi pi-exclamation-triangle" accept={() => eliminarHojaDeRuta(hojaAEliminar)} reject={() => setConfirmDialogVisible(false)} />
    </div>
  );
}

export default PedidosEnviados;

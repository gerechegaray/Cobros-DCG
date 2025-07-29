import React, { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { useNavigate } from "react-router-dom";
import { Card } from "primereact/card";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Toast } from "primereact/toast";
import { ProgressSpinner } from "primereact/progressspinner";
import { useRef } from "react";
import PresupuestoForm from "./PresupuestoForm";
import { getClientesCatalogo } from "../../services/firebase.js";

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
  const [filtroCliente, setFiltroCliente] = useState(null);
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(null);
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(null);
  const [presupuestosFiltrados, setPresupuestosFiltrados] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPresupuesto, setEditingPresupuesto] = useState(null);
  const [activeTab, setActiveTab] = useState('todos'); // Estado para pestañas
  const [showFiltros, setShowFiltros] = useState(false); // Estado para mostrar/ocultar filtros
  const toast = useRef(null);

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
        
        // Limpiar datos antes de establecer el estado
        const datosLimpios = limpiarDatosParaRender(data);
        setPresupuestos(datosLimpios);
      } catch (err) {
        setPresupuestos([]);
      } finally {
        setLoading(false);
      }
    }
    if (user?.email && user?.role) fetchPresupuestos();
  }, [user]);

  // Función para aplicar filtros
  const aplicarFiltros = () => {
    let filtradas = [...presupuestos];

    // Filtro por pestaña (estado)
    if (activeTab !== 'todos') {
      if (activeTab === 'facturados') {
        filtradas = filtradas.filter(presupuesto => presupuesto.estado === 'facturado');
      } else if (activeTab === 'sin-facturar') {
        filtradas = filtradas.filter(presupuesto => presupuesto.estado !== 'facturado');
      }
    }

    // Filtro por cliente
    if (filtroCliente) {
      filtradas = filtradas.filter(presupuesto => {
        const nombreCliente = getClienteNombre(presupuesto.clienteId);
        return nombreCliente.toLowerCase().includes(filtroCliente.toLowerCase());
      });
    }

    // Filtro por fecha desde
    if (filtroFechaDesde) {
      filtradas = filtradas.filter(presupuesto => {
        // Convertir la fecha del presupuesto a Date para comparación
        let fechaPresupuesto = null;
        if (presupuesto.fechaCreacion) {
          if (typeof presupuesto.fechaCreacion === 'object' && presupuesto.fechaCreacion.toDate) {
            fechaPresupuesto = presupuesto.fechaCreacion.toDate();
          } else if (typeof presupuesto.fechaCreacion === 'string') {
            // Si ya es string, intentar parsearlo
            const partes = presupuesto.fechaCreacion.split('/');
            if (partes.length === 3) {
              // Formato DD/MM/YY
              const dia = parseInt(partes[0]);
              const mes = parseInt(partes[1]) - 1; // Meses van de 0-11
              const año = 2000 + parseInt(partes[2]); // Asumir siglo 21
              fechaPresupuesto = new Date(año, mes, dia);
            } else {
              fechaPresupuesto = new Date(presupuesto.fechaCreacion);
            }
          } else {
            fechaPresupuesto = new Date(presupuesto.fechaCreacion);
          }
        }
        
        return fechaPresupuesto && !isNaN(fechaPresupuesto.getTime()) && fechaPresupuesto >= filtroFechaDesde;
      });
    }

    // Filtro por fecha hasta
    if (filtroFechaHasta) {
      filtradas = filtradas.filter(presupuesto => {
        // Convertir la fecha del presupuesto a Date para comparación
        let fechaPresupuesto = null;
        if (presupuesto.fechaCreacion) {
          if (typeof presupuesto.fechaCreacion === 'object' && presupuesto.fechaCreacion.toDate) {
            fechaPresupuesto = presupuesto.fechaCreacion.toDate();
          } else if (typeof presupuesto.fechaCreacion === 'string') {
            // Si ya es string, intentar parsearlo
            const partes = presupuesto.fechaCreacion.split('/');
            if (partes.length === 3) {
              // Formato DD/MM/YY
              const dia = parseInt(partes[0]);
              const mes = parseInt(partes[1]) - 1; // Meses van de 0-11
              const año = 2000 + parseInt(partes[2]); // Asumir siglo 21
              fechaPresupuesto = new Date(año, mes, dia);
            } else {
              fechaPresupuesto = new Date(presupuesto.fechaCreacion);
            }
          } else {
            fechaPresupuesto = new Date(presupuesto.fechaCreacion);
          }
        }
        
        const fechaHasta = new Date(filtroFechaHasta);
        fechaHasta.setHours(23, 59, 59, 999); // Incluir todo el día
        return fechaPresupuesto && !isNaN(fechaPresupuesto.getTime()) && fechaPresupuesto <= fechaHasta;
      });
    }

    setPresupuestosFiltrados(filtradas);
  };

  // 🆕 Función para limpiar filtros
  const limpiarFiltros = () => {
    setFiltroCliente(null);
    setFiltroFechaDesde(null);
    setFiltroFechaHasta(null);
    setPresupuestosFiltrados(presupuestos);
  };

  // Aplicar filtros cuando cambien
  useEffect(() => {
    aplicarFiltros();
  }, [presupuestos, filtroCliente, filtroFechaDesde, filtroFechaHasta, activeTab]);

  // 🆕 Cargar clientes para el filtro
  const cargarClientes = async () => {
    try {
      const data = await getClientesCatalogo(); // Usar caché como en otros componentes
      
      // Filtrar clientes según el rol del usuario
      let clientesFiltrados = data;
      if (user.role !== 'admin') {
        const sellerId = user.role === 'Guille' ? "1" : "2"; // Asegurar string comparison
        clientesFiltrados = data.filter(cliente => {
          if (cliente.seller && cliente.seller.id) {
            return cliente.seller.id === sellerId;
          }
          return false;
        });
      }
      
      // Ordenar alfabéticamente por nombre
      const clientesOrdenados = clientesFiltrados.sort((a, b) => {
        const nombreA = (a.name || a.nombre || a['Razón Social'] || '').toLowerCase();
        const nombreB = (b.name || b.nombre || b['Razón Social'] || '').toLowerCase();
        return nombreA.localeCompare(nombreB);
      });
      
      setClientes(clientesOrdenados);
    } catch (error) {
      // Error cargando clientes
    }
  };

  useEffect(() => {
    if (user?.role) {
      cargarClientes();
    }
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

  // Utilidad para formatear fecha en formato DD/MM/YY
  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    
    try {
      let fechaObj = null;
      
      // Si es un string en formato DD/MM/YY (formato de Alegra)
      if (typeof fecha === 'string' && fecha.includes('/')) {
        const partes = fecha.split('/');
        if (partes.length === 3) {
          const dia = parseInt(partes[0]);
          const mes = parseInt(partes[1]) - 1; // Meses en JS van de 0-11
          const año = parseInt(partes[2]);
          // Asumir siglo 20xx si el año tiene 2 dígitos
          const añoCompleto = año < 100 ? 2000 + año : año;
          fechaObj = new Date(añoCompleto, mes, dia);
        }
      }
      // Si es un objeto de Firestore Timestamp con _seconds
      else if (fecha && typeof fecha === 'object' && fecha._seconds !== undefined) {
        fechaObj = new Date(fecha._seconds * 1000);
      }
      // Si es un objeto de Firestore Timestamp con seconds
      else if (fecha && typeof fecha === 'object' && fecha.seconds !== undefined) {
        fechaObj = new Date(fecha.seconds * 1000);
      }
      // Si es un objeto de Firestore con toDate()
      else if (fecha && typeof fecha === 'object' && typeof fecha.toDate === 'function') {
        fechaObj = fecha.toDate();
      }
      // Si es una fecha normal
      else if (fecha instanceof Date) {
        fechaObj = fecha;
      }
      // Si es un string o número (formato estándar)
      else if (typeof fecha === 'string' || typeof fecha === 'number') {
        fechaObj = new Date(fecha);
      }
      
      if (fechaObj && !isNaN(fechaObj.getTime())) {
        // Formato DD/MM/YY
        const dia = fechaObj.getDate().toString().padStart(2, '0');
        const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
        const año = fechaObj.getFullYear().toString().slice(-2); // Solo los últimos 2 dígitos
        const resultado = `${dia}/${mes}/${año}`;
        return resultado;
      }
      
      return '-';
    } catch (error) {
      return '-';
    }
  };

  // 🆕 Función para limpiar datos antes de renderizar
  const limpiarDatosParaRender = (datos) => {
    return datos.map(presupuesto => {
      const presupuestoLimpio = { ...presupuesto };
      
      // Asegurarse de que todos los campos sean strings o números
      Object.keys(presupuestoLimpio).forEach(key => {
        const valor = presupuestoLimpio[key];
        
        // Si es null o undefined, convertirlo a string
        if (valor === null || valor === undefined) {
          presupuestoLimpio[key] = '-';
          return;
        }
        
        // Si ya es string o número, dejarlo como está
        if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') {
          return;
        }
        
        // Si es un objeto, convertirlo
        if (typeof valor === 'object') {
          
          // Si es un timestamp de Firestore, convertirlo a string con formato unificado
          if (valor._seconds !== undefined || valor.seconds !== undefined || typeof valor.toDate === 'function') {
            presupuestoLimpio[key] = formatFecha(valor);
          } else {
            // Para cualquier otro objeto, convertirlo a string
            presupuestoLimpio[key] = JSON.stringify(valor);
          }
        }
      });
      
      return presupuestoLimpio;
    });
  };

  return (
    <div className="p-4">
      <Toast ref={toast} />
      
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Lista de Pedidos</h1>
        <Button 
          label="+ Nuevo Pedido" 
          icon="pi pi-plus" 
          onClick={() => setShowForm(true)}
          className="p-button-success"
        />
      </div>

      {/* PESTAÑAS */}
      <div className="flex mb-4 border-b border-gray-200">
        <Button
          label="Todos"
          className={`p-button-text ${activeTab === 'todos' ? 'p-button-primary border-bottom-2 border-primary' : ''}`}
          onClick={() => setActiveTab('todos')}
        />
        <Button
          label="Sin Facturar"
          className={`p-button-text ${activeTab === 'sin-facturar' ? 'p-button-primary border-bottom-2 border-primary' : ''}`}
          onClick={() => setActiveTab('sin-facturar')}
        />
        <Button
          label="Facturados"
          className={`p-button-text ${activeTab === 'facturados' ? 'p-button-primary border-bottom-2 border-primary' : ''}`}
          onClick={() => setActiveTab('facturados')}
        />
      </div>

      {/* BOTONES DE FILTROS */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Button
            label={showFiltros ? "Ocultar Filtros" : "Mostrar Filtros"}
            icon={showFiltros ? "pi pi-eye-slash" : "pi pi-filter"}
            onClick={() => setShowFiltros(!showFiltros)}
            className="p-button-outlined p-button-sm"
          />
          {(filtroCliente || filtroFechaDesde || filtroFechaHasta) && (
            <Button
              label="Limpiar Filtros"
              icon="pi pi-times"
              onClick={limpiarFiltros}
              className="p-button-secondary p-button-sm"
            />
          )}
        </div>
      </div>

      {/* SECCIÓN DE FILTROS (DESPLEGABLE) */}
      {showFiltros && (
        <Card className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro por Cliente */}
            <div className="flex flex-col">
              <label className="mb-2 font-semibold">Cliente</label>
              <Dropdown
                value={filtroCliente}
                options={clientes.map(c => ({ 
                  label: c.name || c.nombre || c['Razón Social'] || c.id || '(Sin nombre)', 
                  value: c.name || c.nombre || c['Razón Social'] || c.id 
                }))}
                onChange={(e) => setFiltroCliente(e.value)}
                placeholder="Seleccionar cliente"
                showClear
                filter
                filterPlaceholder="Buscar cliente..."
                className="w-full"
              />
            </div>

            {/* Filtro por Fecha Desde */}
            <div className="flex flex-col">
              <label className="mb-2 font-semibold">Fecha Desde</label>
              <Calendar
                value={filtroFechaDesde}
                onChange={(e) => setFiltroFechaDesde(e.value)}
                showIcon
                placeholder="Seleccionar fecha"
                className="w-full"
              />
            </div>

            {/* Filtro por Fecha Hasta */}
            <div className="flex flex-col">
              <label className="mb-2 font-semibold">Fecha Hasta</label>
              <Calendar
                value={filtroFechaHasta}
                onChange={(e) => setFiltroFechaHasta(e.value)}
                showIcon
                placeholder="Seleccionar fecha"
                className="w-full"
              />
            </div>
          </div>

          {/* RESUMEN DE FILTROS */}
          <div className="mt-3 text-sm text-gray-600">
            Mostrando {presupuestosFiltrados.length} de {presupuestos.length} pedidos
            {(filtroCliente || filtroFechaDesde || filtroFechaHasta) && (
              <span className="ml-2 text-blue-600">
                (filtros activos)
              </span>
            )}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <ProgressSpinner />
        </div>
      ) : (
        <>
          <DataTable 
            value={presupuestosFiltrados} // 🆕 Usar datos filtrados
            paginator 
            rows={10}
            rowsPerPageOptions={[10, 20, 50]}
            className="p-datatable-sm"
            emptyMessage="No hay pedidos para mostrar"
          >
            <Column field="fechaCreacion" header="Fecha" body={row => {
              // Buscar fecha en múltiples campos posibles
              const camposFecha = ['fechaCreacion', 'fecha', 'timestamp', 'date', 'createdAt', 'fechaCreacionTimestamp'];
              let fecha = null;
              
              for (const campo of camposFecha) {
                if (row[campo]) {
                  fecha = row[campo];
                  break;
                }
              }
              
              return formatFecha(fecha);
            }} />
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
                <p><b>Fecha:</b> {formatFecha(detalle.fechaCreacion)}</p>
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
        </>
      )}

      {/* Formulario de Presupuesto */}
      <Dialog 
        visible={showForm} 
        onHide={() => {
          setShowForm(false);
          setEditingPresupuesto(null);
        }}
        header={editingPresupuesto ? "Editar Pedido" : "Nuevo Pedido"}
        style={{ width: '90vw', maxWidth: '800px' }}
        modal
      >
        <PresupuestoForm 
          presupuesto={editingPresupuesto}
          onSave={(presupuesto) => {
            setShowForm(false);
            setEditingPresupuesto(null);
            // Recargar la lista
            fetchPresupuestos();
            toast.current?.show({
              severity: 'success',
              summary: 'Éxito',
              detail: editingPresupuesto ? 'Pedido actualizado' : 'Pedido creado'
            });
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingPresupuesto(null);
          }}
          user={user}
        />
      </Dialog>
    </div>
  );
}

export default PresupuestosList; 
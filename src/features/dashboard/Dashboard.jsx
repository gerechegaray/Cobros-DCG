import React, { useEffect, useState } from "react";
import { Card } from "primereact/card";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import BackendStatus from "../../components/BackendStatus";
import { ALEGRA_CONFIG } from "../../config/alegra.js";
import { getCobros, getCobrosByVendedor } from "../../features/cobros/cobrosService";
import { getPedidos, getPedidosByVendedor } from "../../features/pedidos/pedidosService";
import { formatearMoneda } from "../../features/pedidos/utils";

function Dashboard({ user }) {
  const navigate = useNavigate();
  // Eliminamos las estadísticas de cobros y pedidos que ya no se usan

  const [facturasStats, setFacturasStats] = useState({
    total: 0,
    pendientes: 0,
    enReparto: 0,
    entregadas: 0
  });

  // Estado para estadísticas de cobros
  const [cobrosStats, setCobrosStats] = useState({
    totalMes: 0,
    totalMonto: 0,
    pendientesPorCargar: 0,
    cargadosEnSistema: 0
  });

  // Estado para estadísticas de pedidos
  const [pedidosStats, setPedidosStats] = useState({
    totalMes: 0,
    totalMonto: 0,
    pendientes: 0,
    facturados: 0
  });

  // Estado para Top Productos
  const [topProductos, setTopProductos] = useState([]);

  // Estado para Top Clientes
  const [topClientes, setTopClientes] = useState([]);

  // Eliminamos las funciones de cobros que ya no se usan

  // Eliminamos las funciones de cobros que ya no se usan

  // 🆕 Obtener facturas de Alegra para mostrar en el dashboard
  const cargarFacturasAlegra = async () => {
    try {
      setLoadingFacturas(true);
      // 🆕 Obtener facturas usando configuración de Alegra con paginación múltiple
      const facturas = await api.getAlegraInvoices(
        ALEGRA_CONFIG.INVOICES.DEFAULT_DAYS,
        ALEGRA_CONFIG.INVOICES.MAX_PER_REQUEST,
        ALEGRA_CONFIG.INVOICES.DEFAULT_TOTAL
      );
      setFacturasAlegra(facturas);
      console.log(`✅ Facturas de Alegra cargadas: ${facturas.length} (configuración: ${ALEGRA_CONFIG.INVOICES.DEFAULT_TOTAL} total, ${ALEGRA_CONFIG.INVOICES.MAX_PER_REQUEST} por petición)`);
    } catch (error) {
      console.error('❌ Error cargando facturas de Alegra:', error);
      setFacturasAlegra([]);
    } finally {
      setLoadingFacturas(false);
    }
  };

  // Cargar estadísticas de facturas/envíos (solo para admin)
  useEffect(() => {
    const fetchFacturas = async () => {
      if (user.role !== 'admin') return;
      
      try {
        // 🆕 Obtener facturas usando configuración de Alegra con paginación múltiple
        const facturas = await api.getAlegraInvoices(
          ALEGRA_CONFIG.INVOICES.DEFAULT_DAYS,
          ALEGRA_CONFIG.INVOICES.MAX_PER_REQUEST,
          ALEGRA_CONFIG.INVOICES.DEFAULT_TOTAL
        );
        
        // 🆕 Obtener hojas de ruta para calcular estados
        const hojasDeRuta = await api.getHojasDeRuta();
        
        // 🆕 Calcular estados según la lógica de la pantalla de Envíos
        let pendientes = 0;
        let enReparto = 0;
        let entregadas = 0;
        
        facturas.forEach(factura => {
          // Buscar si la factura está en alguna hoja de ruta
          let estado = 'pendiente'; // Por defecto
          
          for (const hoja of hojasDeRuta) {
            const pedido = hoja.pedidos?.find(p => p.id === factura.id);
            if (pedido) {
              if (pedido.entregado) {
                estado = 'entregado';
              } else {
                estado = 'en_reparto';
              }
              break;
            }
          }
          
          // Contar según el estado
          switch (estado) {
            case 'pendiente':
              pendientes++;
              break;
            case 'en_reparto':
              enReparto++;
              break;
            case 'entregado':
              entregadas++;
              break;
          }
        });
        
        setFacturasStats({
          total: facturas.length,
          pendientes,
          enReparto,
          entregadas
        });
      } catch (error) {
        console.error('Error cargando facturas:', error);
        setFacturasStats({
          total: 0,
          pendientes: 0,
          enReparto: 0,
          entregadas: 0
        });
      }
    };
    
    fetchFacturas();
  }, [user]);

  // Cargar estadísticas de cobros
  useEffect(() => {
    const fetchCobros = async () => {
      try {
        // Obtener cobros del mes actual
        const mesActual = new Date();
        const primerDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
        const ultimoDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);
        
        // Determinar si es admin o vendedor
        const esAdmin = user.role === 'admin';
        const vendedorEmail = esAdmin ? null : user.email;
        
        // Obtener cobros según el rol
        const cobros = esAdmin 
          ? await getCobros() 
          : await getCobrosByVendedor(vendedorEmail);
        
        // Filtrar cobros del mes actual
        const cobrosDelMes = cobros.filter(cobro => {
          const fechaCobro = cobro.fechaCobro?.toDate ? cobro.fechaCobro.toDate() : new Date(cobro.fechaCobro);
          return fechaCobro >= primerDiaMes && fechaCobro <= ultimoDiaMes;
        });
        
        // Calcular estadísticas
        const totalMes = cobrosDelMes.length;
        const totalMonto = cobrosDelMes.reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
        const pendientesPorCargar = cobrosDelMes.filter(cobro => cobro.estado === 'pendiente').length;
        const cargadosEnSistema = cobrosDelMes.filter(cobro => cobro.estado === 'cargado').length;
        
        setCobrosStats({
          totalMes,
          totalMonto,
          pendientesPorCargar,
          cargadosEnSistema
        });
      } catch (error) {
        console.error('Error cargando estadísticas de cobros:', error);
        setCobrosStats({
          totalMes: 0,
          totalMonto: 0,
          pendientesPorCargar: 0,
          cargadosEnSistema: 0
        });
      }
    };
    
    fetchCobros();
  }, [user]);

  // Cargar estadísticas de pedidos
  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        // Obtener pedidos del mes actual
        const mesActual = new Date();
        const primerDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
        const ultimoDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);
        
        // Determinar si es admin o vendedor
        const esAdmin = user.role === 'admin';
        
        // Obtener pedidos según el rol
        const pedidos = esAdmin 
          ? await getPedidos() 
          : await getPedidosByVendedor(user.email);
        
        // Filtrar pedidos del mes actual
        const pedidosDelMes = pedidos.filter(pedido => {
          const fechaPedido = pedido.fechaPedido?.toDate ? pedido.fechaPedido.toDate() : new Date(pedido.fechaPedido);
          return fechaPedido >= primerDiaMes && fechaPedido <= ultimoDiaMes;
        });
        
        // Calcular estadísticas
        const totalMes = pedidosDelMes.length;
        const totalMonto = pedidosDelMes.reduce((sum, pedido) => sum + (pedido.total || 0), 0);
        const pendientes = pedidosDelMes.filter(pedido => pedido.estado === 'pendiente').length;
        const facturados = pedidosDelMes.filter(pedido => pedido.estado === 'facturado').length;
        
        setPedidosStats({
          totalMes,
          totalMonto,
          pendientes,
          facturados
        });
      } catch (error) {
        console.error('Error cargando estadísticas de pedidos:', error);
        setPedidosStats({
          totalMes: 0,
          totalMonto: 0,
          pendientes: 0,
          facturados: 0
        });
      }
    };
    
    fetchPedidos();
  }, [user]);

  // Eliminamos las funciones de presupuestos y pedidos que ya no se usan

  // Eliminamos las funciones de filtrado que ya no se usan


  // Cargar Top Productos (por cantidad vendida en pedidos del mes actual, top 5)
  useEffect(() => {
    const fetchTopProductos = async () => {
      try {
        // Obtener pedidos del mes actual
        const mesActual = new Date();
        const primerDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
        const ultimoDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);
        
        // Determinar si es admin o vendedor
        const esAdmin = user.role === 'admin';
        
        // Obtener pedidos según el rol
        const pedidos = esAdmin 
          ? await getPedidos() 
          : await getPedidosByVendedor(user.email);
        
        // Filtrar pedidos del mes actual
        const pedidosDelMes = pedidos.filter(pedido => {
          const fechaPedido = pedido.fechaPedido?.toDate ? pedido.fechaPedido.toDate() : new Date(pedido.fechaPedido);
          return fechaPedido >= primerDiaMes && fechaPedido <= ultimoDiaMes;
        });
        
        // Agrupar productos por ID/nombre y sumar cantidades vendidas
        const productosMap = new Map();
        
        pedidosDelMes.forEach(pedido => {
          if (pedido.productos && Array.isArray(pedido.productos)) {
            pedido.productos.forEach(prod => {
              const productoId = prod.id || prod.productoId || prod.nombre;
              const productoNombre = prod.nombre || prod.productoNombre || 'Producto sin nombre';
              const cantidad = prod.cantidad || prod.quantity || 1;
              
              if (productosMap.has(productoId)) {
                const existente = productosMap.get(productoId);
                existente.cantidad += cantidad;
              } else {
                productosMap.set(productoId, {
                  id: productoId,
                  nombre: productoNombre,
                  cantidad: cantidad
                });
              }
            });
          }
        });
        
        // Ordenar por cantidad descendente y tomar top 5
        const productosOrdenados = Array.from(productosMap.values())
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 5)
          .map(p => ({ ...p, maxCantidad: 0 }));
        
        // Calcular cantidad máxima para barras proporcionales
        const maxCantidad = Math.max(...productosOrdenados.map(p => p.cantidad), 1);
        const productosConMax = productosOrdenados.map(p => ({
          ...p,
          maxCantidad: maxCantidad
        }));
        
        setTopProductos(productosConMax);
      } catch (error) {
        console.error('Error cargando top productos:', error);
        setTopProductos([]);
      }
    };
    
    fetchTopProductos();
  }, [user]);

  // Cargar Top Clientes (por monto cobrado en el mes actual, top 5)
  useEffect(() => {
    const fetchTopClientes = async () => {
      try {
        // Obtener cobros del mes actual
        const mesActual = new Date();
        const primerDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
        const ultimoDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);
        
        const esAdmin = user.role === 'admin';
        const vendedorEmail = esAdmin ? null : user.email;
        
        // Obtener cobros según el rol
        const cobros = esAdmin 
          ? await getCobros() 
          : await getCobrosByVendedor(vendedorEmail);
        
        // Filtrar cobros del mes actual
        const cobrosDelMes = cobros.filter(cobro => {
          const fechaCobro = cobro.fechaCobro?.toDate ? cobro.fechaCobro.toDate() : new Date(cobro.fechaCobro);
          return fechaCobro >= primerDiaMes && fechaCobro <= ultimoDiaMes;
        });
        
        // Agrupar por cliente y sumar montos
        const clientesMap = new Map();
        cobrosDelMes.forEach(cobro => {
          const clienteId = cobro.clienteId || cobro.cliente;
          const clienteNombre = cobro.cliente || 'Sin nombre';
          const monto = cobro.monto || 0;
          
          if (clientesMap.has(clienteId)) {
            const existente = clientesMap.get(clienteId);
            existente.monto += monto;
          } else {
            clientesMap.set(clienteId, {
              id: clienteId,
              nombre: clienteNombre,
              monto: monto
            });
          }
        });
        
        // Ordenar por monto descendente y tomar top 5
        const topClientesData = Array.from(clientesMap.values())
          .sort((a, b) => b.monto - a.monto)
          .slice(0, 5)
          .map(c => ({ ...c, maxMonto: 0 }));
        
        // Calcular monto máximo para barras proporcionales
        const maxMonto = Math.max(...topClientesData.map(c => c.monto), 1);
        const clientesConMax = topClientesData.map(c => ({
          ...c,
          maxMonto: maxMonto
        }));
        
        setTopClientes(clientesConMax);
      } catch (error) {
        console.error('Error cargando top clientes:', error);
        setTopClientes([]);
      }
    };
    
    fetchTopClientes();
  }, [user]);

  const getDashboardTitle = () => {
    if (user.role === "admin") {
      return "Dashboard General";
    } else if (user.role === "Santi" || user.role === "Guille") {
      return `Dashboard de ${user.name}`;
    } else {
      return "Dashboard";
    }
  };

  return (
    <div className="p-p-1 p-p-md-2 p-p-lg-3 dashboard-main-container" style={{ maxWidth: "100%", margin: "0 auto", overflow: "hidden" }}>
      <div className="p-text-center p-mb-2">
        <h2 className="p-text-md p-text-lg" style={{ color: "var(--dcg-azul-oscuro)", wordWrap: "break-word", marginBottom: "0.5rem" }}>
          {getDashboardTitle()}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: '#10b981', 
            animation: 'pulse 2s infinite' 
          }}></div>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Actualización en tiempo real
          </span>
        </div>
      </div>

      {/* Estado del Backend */}
      <div className="dashboard-backend-status" style={{ maxWidth: 480, margin: '0 auto', marginBottom: 16, width: '100%' }}>
        <BackendStatus />
      </div>

      {/* KPIs Principales - Cards Individuales en Fila */}
      <div className="dashboard-kpis-grid">
        {(user.role === "Santi" || user.role === "Guille" || user.role === "admin") && (
          <>
            <Card className="dashboard-kpi-card">
              <div className="dashboard-kpi-content">
                <i className="pi pi-dollar dashboard-kpi-icon" style={{ color: 'var(--dcg-success)' }}></i>
                <div className="dashboard-kpi-value">{formatearMoneda(cobrosStats.totalMonto)}</div>
                <div className="dashboard-kpi-label">Total Cobrado</div>
              </div>
            </Card>
            <Card className="dashboard-kpi-card">
              <div className="dashboard-kpi-content">
                <i className="pi pi-shopping-cart dashboard-kpi-icon" style={{ color: 'var(--dcg-naranja)' }}></i>
                <div className="dashboard-kpi-value">{formatearMoneda(pedidosStats.totalMonto)}</div>
                <div className="dashboard-kpi-label">Total Pedidos</div>
              </div>
            </Card>
            <Card className="dashboard-kpi-card">
              <div className="dashboard-kpi-content">
                <i className="pi pi-check-circle dashboard-kpi-icon" style={{ color: 'var(--dcg-success)' }}></i>
                <div className="dashboard-kpi-value">{cobrosStats.totalMes}</div>
                <div className="dashboard-kpi-label">Cobros del Mes</div>
              </div>
            </Card>
            <Card className="dashboard-kpi-card">
              <div className="dashboard-kpi-content">
                <i className="pi pi-shopping-bag dashboard-kpi-icon" style={{ color: 'var(--dcg-azul-claro)' }}></i>
                <div className="dashboard-kpi-value">{pedidosStats.totalMes}</div>
                <div className="dashboard-kpi-label">Pedidos del Mes</div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Sección de Métricas Detalladas */}
      <div className="dashboard-metrics-grid">
        {/* Grupo de Cobros */}
        {(user.role === "Santi" || user.role === "Guille" || user.role === "admin") && (
          <div className="dashboard-cobros-container dashboard-metric-card">
            <h3 className="dashboard-card-title">
              {user.role === 'admin' ? 'Cobros del Mes' : 'Mis Cobros del Mes'}
            </h3>
            <Card className="dashboard-card">
              <div className="dashboard-metric-row">
                <div className="dashboard-metric-item">
                  <i className="pi pi-dollar dashboard-metric-icon" style={{ color: 'var(--dcg-success)' }}></i>
                  <div className="dashboard-metric-content">
                    <span className="dashboard-metric-label">Total Cobros del Mes</span>
                    <span className="dashboard-metric-value" style={{ color: 'var(--dcg-success)' }}>{cobrosStats.totalMes}</span>
                  </div>
                </div>
                <div className="dashboard-metric-item">
                  <i className="pi pi-money-bill dashboard-metric-icon" style={{ color: 'var(--dcg-azul-claro)' }}></i>
                  <div className="dashboard-metric-content">
                    <span className="dashboard-metric-label">Total Monto</span>
                    <span className="dashboard-metric-value" style={{ color: 'var(--dcg-azul-claro)' }}>{formatearMoneda(cobrosStats.totalMonto)}</span>
                  </div>
                </div>
                <div className="dashboard-metric-item">
                  <i className="pi pi-clock dashboard-metric-icon" style={{ color: 'var(--dcg-warning)' }}></i>
                  <div className="dashboard-metric-content">
                    <span className="dashboard-metric-label">Pendientes por Cargar</span>
                    <span className="dashboard-metric-value" style={{ color: 'var(--dcg-warning)' }}>{cobrosStats.pendientesPorCargar}</span>
                  </div>
                </div>
                <div className="dashboard-metric-item">
                  <i className="pi pi-check-circle dashboard-metric-icon" style={{ color: 'var(--dcg-success)' }}></i>
                  <div className="dashboard-metric-content">
                    <span className="dashboard-metric-label">Cargados en Sistema</span>
                    <span className="dashboard-metric-value" style={{ color: 'var(--dcg-success)' }}>{cobrosStats.cargadosEnSistema}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Grupo de Pedidos */}
        {(user.role === "Santi" || user.role === "Guille" || user.role === "admin") && (
          <div className="dashboard-pedidos-container dashboard-metric-card">
            <h3 className="dashboard-card-title">
              {user.role === 'admin' ? 'Pedidos del Mes' : 'Mis Pedidos del Mes'}
            </h3>
            <Card className="dashboard-card">
              <div className="dashboard-metric-row">
                <div className="dashboard-metric-item">
                  <i className="pi pi-shopping-cart dashboard-metric-icon" style={{ color: 'var(--dcg-naranja)' }}></i>
                  <div className="dashboard-metric-content">
                    <span className="dashboard-metric-label">Total Pedidos del Mes</span>
                    <span className="dashboard-metric-value" style={{ color: 'var(--dcg-naranja)' }}>{pedidosStats.totalMes}</span>
                  </div>
                </div>
                <div className="dashboard-metric-item">
                  <i className="pi pi-money-bill dashboard-metric-icon" style={{ color: 'var(--dcg-success)' }}></i>
                  <div className="dashboard-metric-content">
                    <span className="dashboard-metric-label">Total Monto</span>
                    <span className="dashboard-metric-value" style={{ color: 'var(--dcg-success)' }}>{formatearMoneda(pedidosStats.totalMonto)}</span>
                  </div>
                </div>
                <div className="dashboard-metric-item">
                  <i className="pi pi-clock dashboard-metric-icon" style={{ color: 'var(--dcg-warning)' }}></i>
                  <div className="dashboard-metric-content">
                    <span className="dashboard-metric-label">Pendientes</span>
                    <span className="dashboard-metric-value" style={{ color: 'var(--dcg-warning)' }}>{pedidosStats.pendientes}</span>
                  </div>
                </div>
                <div className="dashboard-metric-item">
                  <i className="pi pi-check-circle dashboard-metric-icon" style={{ color: 'var(--dcg-azul-claro)' }}></i>
                  <div className="dashboard-metric-content">
                    <span className="dashboard-metric-label">Facturados</span>
                    <span className="dashboard-metric-value" style={{ color: 'var(--dcg-azul-claro)' }}>{pedidosStats.facturados}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Grupo de Envíos (solo para admin) */}
        {user.role === "admin" && (
          <div className="dashboard-envios-container dashboard-metric-card">
            <h3 className="dashboard-card-title">Envíos</h3>
            <Card className="dashboard-card">
              <div className="dashboard-metric-row">
                <div className="dashboard-metric-item">
                  <i className="pi pi-truck dashboard-metric-icon" style={{ color: 'var(--dcg-azul-claro)' }}></i>
                  <div className="dashboard-metric-content">
                    <span className="dashboard-metric-label">Total Facturas</span>
                    <span className="dashboard-metric-value" style={{ color: 'var(--dcg-azul-claro)' }}>{facturasStats.total}</span>
                  </div>
                </div>
                <div className="dashboard-metric-item">
                  <i className="pi pi-clock dashboard-metric-icon" style={{ color: 'var(--dcg-warning)' }}></i>
                  <div className="dashboard-metric-content">
                    <span className="dashboard-metric-label">Pendientes</span>
                    <span className="dashboard-metric-value" style={{ color: 'var(--dcg-warning)' }}>{facturasStats.pendientes}</span>
                  </div>
                </div>
                <div className="dashboard-metric-item">
                  <i className="pi pi-map-marker dashboard-metric-icon" style={{ color: 'var(--dcg-azul-claro)' }}></i>
                  <div className="dashboard-metric-content">
                    <span className="dashboard-metric-label">En Reparto</span>
                    <span className="dashboard-metric-value" style={{ color: 'var(--dcg-azul-claro)' }}>{facturasStats.enReparto}</span>
                  </div>
                </div>
                <div className="dashboard-metric-item">
                  <i className="pi pi-check-circle dashboard-metric-icon" style={{ color: 'var(--dcg-success)' }}></i>
                  <div className="dashboard-metric-content">
                    <span className="dashboard-metric-label">Entregadas</span>
                    <span className="dashboard-metric-value" style={{ color: 'var(--dcg-success)' }}>{facturasStats.entregadas}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Sección de Análisis - Top Productos y Top Clientes */}
      <div className="dashboard-analysis-grid">
        {/* Top Productos */}
        <div className="dashboard-top-productos-container dashboard-analysis-card">
          <h3 className="dashboard-card-title">Top Productos (del mes)</h3>
          <Card className="dashboard-card">
            {topProductos.length > 0 ? (
              <div className="dashboard-top-list">
                {topProductos.map((producto, index) => {
                  const porcentaje = (producto.cantidad / producto.maxCantidad) * 100;
                  return (
                    <div key={producto.id || index} className="dashboard-top-item">
                      <div className="dashboard-top-item-header">
                        <span className="dashboard-top-item-name">{producto.nombre}</span>
                        <span className="dashboard-top-item-value">{producto.cantidad} unidades</span>
                      </div>
                      <div className="dashboard-top-item-bar-container">
                        <div 
                          className="dashboard-top-item-bar" 
                          style={{ 
                            width: `${porcentaje}%`,
                            backgroundColor: 'var(--dcg-azul-claro)',
                            opacity: 0.8
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="dashboard-placeholder">
                <i className="pi pi-box" style={{ fontSize: '2rem', color: 'var(--dcg-text-muted)', opacity: 0.3 }}></i>
                <p style={{ color: 'var(--dcg-text-muted)', marginTop: '1rem', fontSize: 'var(--font-size-sm)' }}>Sin datos disponibles</p>
              </div>
            )}
          </Card>
        </div>

        {/* Top Clientes */}
        <div className="dashboard-top-clientes-container dashboard-analysis-card">
          <h3 className="dashboard-card-title">Top Clientes (del mes)</h3>
          <Card className="dashboard-card">
            {topClientes.length > 0 ? (
              <div className="dashboard-top-list">
                {topClientes.map((cliente, index) => {
                  const porcentaje = (cliente.monto / cliente.maxMonto) * 100;
                  return (
                    <div key={cliente.id || index} className="dashboard-top-item">
                      <div className="dashboard-top-item-header">
                        <span className="dashboard-top-item-name">{cliente.nombre}</span>
                        <span className="dashboard-top-item-value">{formatearMoneda(cliente.monto)}</span>
                      </div>
                      <div className="dashboard-top-item-bar-container">
                        <div 
                          className="dashboard-top-item-bar" 
                          style={{ 
                            width: `${porcentaje}%`,
                            backgroundColor: 'var(--dcg-success)',
                            opacity: 0.8
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="dashboard-placeholder">
                <i className="pi pi-users" style={{ fontSize: '2rem', color: 'var(--dcg-text-muted)', opacity: 0.3 }}></i>
                <p style={{ color: 'var(--dcg-text-muted)', marginTop: '1rem', fontSize: 'var(--font-size-sm)' }}>Sin datos disponibles</p>
              </div>
            )}
          </Card>
        </div>
      </div>


      {/* Eliminamos el botón de actualizar que ya no se usa */}

    </div>
  );
}

export default Dashboard; 
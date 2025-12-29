import React, { useState, useEffect, useMemo } from 'react';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { getPedidosRealtime, getPedidosByVendedorRealtime } from './pedidosService';
import { formatearMoneda } from './utils';
import moment from 'moment';

const PedidosDashboard = ({ user }) => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mes'); // dia, semana, mes, año, todo

  const esAdmin = user?.role === 'admin';

  // Cargar pedidos en tiempo real
  useEffect(() => {
    let unsubscribe;
    
    if (esAdmin) {
      unsubscribe = getPedidosRealtime((pedidosData) => {
        setPedidos(pedidosData);
        setLoading(false);
      });
    } else {
      unsubscribe = getPedidosByVendedorRealtime(user.email, (pedidosData) => {
        setPedidos(pedidosData);
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, esAdmin]);

  // Filtrar pedidos por período
  const getPedidosPorPeriodo = () => {
    const ahora = moment();
    let fechaInicio;

    switch (periodo) {
      case 'dia':
        fechaInicio = ahora.clone().startOf('day').toDate();
        break;
      case 'semana':
        fechaInicio = ahora.clone().startOf('week').toDate();
        break;
      case 'mes':
        fechaInicio = ahora.clone().startOf('month').toDate();
        break;
      case 'año':
        fechaInicio = ahora.clone().startOf('year').toDate();
        break;
      default:
        return pedidos;
    }

    return pedidos.filter(p => {
      if (!p.fechaPedido) return false;
      const fechaPedido = p.fechaPedido?.toDate ? p.fechaPedido.toDate() : new Date(p.fechaPedido);
      return fechaPedido >= fechaInicio;
    });
  };

  const pedidosFiltrados = getPedidosPorPeriodo();

  // Calcular estadísticas (con manejo de pedidos legacy)
  const stats = useMemo(() => {
    const pedidosPendientes = pedidosFiltrados.filter(p => (p.estado === 'pendiente' || !p.estado));
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    return {
      total: pedidosFiltrados.length,
      pendiente: pedidosPendientes.length,
      facturado: pedidosFiltrados.filter(p => p.estado === 'facturado').length,
      
      contado: pedidosFiltrados.filter(p => (p.condicionPago === 'contado' || !p.condicionPago)).length,
      cuentaCorriente: pedidosFiltrados.filter(p => p.condicionPago === 'cuenta_corriente').length,
      
      montoTotal: pedidosFiltrados.reduce((sum, p) => sum + (p.total || 0), 0),
      montoFacturado: pedidosFiltrados.filter(p => p.estado === 'facturado').reduce((sum, p) => sum + (p.total || 0), 0),
      montoPendiente: pedidosPendientes.reduce((sum, p) => sum + (p.total || 0), 0),
      
      pedidosHoy: pedidosFiltrados.filter(p => {
        const fechaPedido = p.fechaPedido?.toDate ? p.fechaPedido.toDate() : new Date(p.fechaPedido);
        fechaPedido.setHours(0, 0, 0, 0);
        return fechaPedido.getTime() === hoy.getTime();
      }).length,
      
      montoMes: pedidosFiltrados.filter(p => {
        const fechaPedido = p.fechaPedido?.toDate ? p.fechaPedido.toDate() : new Date(p.fechaPedido);
        return fechaPedido >= inicioMes;
      }).reduce((sum, p) => sum + (p.total || 0), 0),
      
      pedidosSinStock: pedidosFiltrados.filter(p => {
        return p.productos && p.productos.some(prod => prod.sinStock === true);
      }).length
    };
  }, [pedidosFiltrados]);

  // Calcular top 5 productos más vendidos
  const top5Productos = useMemo(() => {
    const productosMap = new Map();
    
    pedidosFiltrados.forEach(pedido => {
      if (pedido.productos && Array.isArray(pedido.productos)) {
        pedido.productos.forEach(prod => {
          const productoId = prod.id || prod.productoId || prod.nombre;
          const productoNombre = prod.nombre || prod.productoNombre || 'Producto sin nombre';
          const cantidad = prod.cantidad || prod.quantity || 1;
          
          if (productosMap.has(productoId)) {
            productosMap.set(productoId, {
              id: productoId,
              nombre: productoNombre,
              cantidad: productosMap.get(productoId).cantidad + cantidad
            });
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
    
    if (productosMap.size === 0) return [];
    
    return Array.from(productosMap.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [pedidosFiltrados]);

  // Calcular top 5 clientes por monto
  const top5Clientes = useMemo(() => {
    const clientesMap = new Map();
    
    pedidosFiltrados.forEach(pedido => {
      const clienteNombre = pedido.cliente || 'Cliente sin nombre';
      const monto = pedido.total || 0;
      
      if (clientesMap.has(clienteNombre)) {
        clientesMap.set(clienteNombre, clientesMap.get(clienteNombre) + monto);
      } else {
        clientesMap.set(clienteNombre, monto);
      }
    });
    
    return Array.from(clientesMap.entries())
      .map(([nombre, monto]) => ({ nombre, monto }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);
  }, [pedidosFiltrados]);

  const periodos = [
    { label: 'Hoy', value: 'dia' },
    { label: 'Esta Semana', value: 'semana' },
    { label: 'Este Mes', value: 'mes' },
    { label: 'Este Año', value: 'año' },
    { label: 'Todo', value: 'todo' }
  ];

  if (loading) {
    return <div className="flex justify-content-center p-4">Cargando estadísticas...</div>;
  }

  return (
    <div className="pedidos-dashboard">
      {/* Selector de período */}
      <div className="pedidos-dashboard-periodo">
        <label>Período</label>
        <Dropdown
          value={periodo}
          options={periodos}
          onChange={(e) => setPeriodo(e.value)}
          placeholder="Selecciona período"
          className="w-full md:w-20rem"
        />
      </div>

      {/* KPIs PRINCIPALES */}
      <div className="pedidos-kpis-grid">
        <Card className="pedidos-kpi-card">
          <div className="pedidos-kpi-content">
            <i className="pi pi-exclamation-triangle pedidos-kpi-icon" style={{ color: 'var(--dcg-warning)' }}></i>
            <div className="pedidos-kpi-value warning">{stats.pendiente}</div>
            <div className="pedidos-kpi-label">Pedidos Pendientes</div>
            <div className="pedidos-kpi-sublabel">{formatearMoneda(stats.montoPendiente)}</div>
          </div>
        </Card>

        <Card className="pedidos-kpi-card">
          <div className="pedidos-kpi-content">
            <i className="pi pi-dollar pedidos-kpi-icon" style={{ color: 'var(--dcg-warning)' }}></i>
            <div className="pedidos-kpi-value warning">{formatearMoneda(stats.montoPendiente)}</div>
            <div className="pedidos-kpi-label">Monto Total Pendiente</div>
          </div>
        </Card>

        <Card className="pedidos-kpi-card">
          <div className="pedidos-kpi-content">
            <i className="pi pi-calendar pedidos-kpi-icon" style={{ color: 'var(--dcg-azul-claro)' }}></i>
            <div className="pedidos-kpi-value info">{stats.pedidosHoy}</div>
            <div className="pedidos-kpi-label">Pedidos de Hoy</div>
          </div>
        </Card>

        <Card className="pedidos-kpi-card">
          <div className="pedidos-kpi-content">
            <i className="pi pi-chart-line pedidos-kpi-icon" style={{ color: 'var(--dcg-success)' }}></i>
            <div className="pedidos-kpi-value success">{formatearMoneda(stats.montoMes)}</div>
            <div className="pedidos-kpi-label">Total del Mes</div>
          </div>
        </Card>
      </div>

      {/* MÉTRICAS SECUNDARIAS */}
      <div className="pedidos-metrics-grid">
        {/* Top 5 Productos más vendidos */}
        {top5Productos.length > 0 && (
          <Card className="pedidos-metric-card">
            <div className="pedidos-metric-title">Top 5 Productos Más Vendidos</div>
            <div className="pedidos-top-clientes">
              {top5Productos.map((producto, index) => (
                <div key={producto.id || index} className="pedidos-top-cliente-item">
                  <span className="pedidos-top-cliente-nombre">{producto.nombre}</span>
                  <span className="pedidos-top-cliente-monto">{producto.cantidad} unidades</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Pedidos por Condición de Pago */}
        <Card className="pedidos-metric-card">
          <div className="pedidos-metric-title">Por Condición de Pago</div>
          <div className="pedidos-metric-item">
            <span className="pedidos-metric-item-label">Contado</span>
            <span className="pedidos-metric-item-value">{stats.contado}</span>
          </div>
          <div className="pedidos-metric-item">
            <span className="pedidos-metric-item-label">Cuenta Corriente</span>
            <span className="pedidos-metric-item-value">{stats.cuentaCorriente}</span>
          </div>
        </Card>

        {/* Top 5 Clientes */}
        {top5Clientes.length > 0 && (
          <Card className="pedidos-metric-card">
            <div className="pedidos-metric-title">Top 5 Clientes</div>
            <div className="pedidos-top-clientes">
              {top5Clientes.map((cliente, index) => (
                <div key={index} className="pedidos-top-cliente-item">
                  <span className="pedidos-top-cliente-nombre">{cliente.nombre}</span>
                  <span className="pedidos-top-cliente-monto">{formatearMoneda(cliente.monto)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Pedidos sin Stock */}
        {stats.pedidosSinStock > 0 && (
          <Card className="pedidos-metric-card">
            <div className="pedidos-metric-title">Pedidos sin Stock</div>
            <div className="pedidos-producto-mas-vendido">
              <div className="pedidos-producto-cantidad" style={{ color: 'var(--dcg-warning)' }}>
                {stats.pedidosSinStock}
              </div>
              <div className="pedidos-producto-label">pedidos con productos sin stock</div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PedidosDashboard;


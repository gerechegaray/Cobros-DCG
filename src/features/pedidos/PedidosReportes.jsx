import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { Chart } from 'primereact/chart';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { getPedidosRealtime, getPedidosByVendedorRealtime } from './pedidosService';
import { formatearMoneda, formatearFecha } from './utils';

const PedidosReportes = ({ user }) => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date());
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState(null);
  
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

  // Filtrar pedidos por mes y vendedor
  const pedidosFiltrados = pedidos.filter(pedido => {
    // Solo pedidos facturados
    if (pedido.estado !== 'facturado') return false;
    
    // Filtrar por mes
    const fechaPedido = pedido.fechaPedido?.toDate ? pedido.fechaPedido.toDate() : new Date(pedido.fechaPedido);
    const mesInicio = new Date(mesSeleccionado.getFullYear(), mesSeleccionado.getMonth(), 1);
    const mesFin = new Date(mesSeleccionado.getFullYear(), mesSeleccionado.getMonth() + 1, 0);
    
    if (fechaPedido < mesInicio || fechaPedido > mesFin) return false;
    
    // Filtrar por vendedor (solo si es admin y seleccionó un vendedor)
    if (esAdmin && vendedorSeleccionado) {
      return pedido.vendedor === vendedorSeleccionado;
    }
    
    return true;
  });

  // Calcular productos más vendidos
  const productosVendidos = {};
  pedidosFiltrados.forEach(pedido => {
    // Verificar si tiene productos en la nueva estructura
    if (pedido.productos && Array.isArray(pedido.productos) && pedido.productos.length > 0) {
      pedido.productos.forEach(producto => {
        const key = producto.id || producto.codigo || producto.nombre;
        if (!productosVendidos[key]) {
          productosVendidos[key] = {
            id: key,
            nombre: producto.nombre || 'Sin nombre',
            codigo: producto.codigo || '-',
            cantidadTotal: 0,
            montoTotal: 0,
            numeroVentas: 0
          };
        }
        productosVendidos[key].cantidadTotal += producto.cantidad || 0;
        productosVendidos[key].montoTotal += producto.total || (producto.cantidad * producto.precioUnitario) || 0;
        productosVendidos[key].numeroVentas += 1;
      });
    }
    // Si no tiene productos detallados, crear un producto genérico con el total del pedido
    else if (pedido.total > 0) {
      const key = `pedido_${pedido.id || 'sin_id'}`;
      if (!productosVendidos[key]) {
        productosVendidos[key] = {
          id: key,
          nombre: `Pedido ${pedido.cliente}`,
          codigo: pedido.id || '-',
          cantidadTotal: 1,
          montoTotal: 0,
          numeroVentas: 0
        };
      }
      productosVendidos[key].montoTotal += pedido.total || 0;
      productosVendidos[key].numeroVentas += 1;
    }
  });

  const topProductos = Object.values(productosVendidos)
    .sort((a, b) => b.cantidadTotal - a.cantidadTotal)
    .slice(0, 10);

  // Calcular clientes que más pidieron
  const clientesStats = {};
  pedidosFiltrados.forEach(pedido => {
    const clienteKey = pedido.clienteId || pedido.cliente;
    if (!clientesStats[clienteKey]) {
      clientesStats[clienteKey] = {
        cliente: pedido.cliente,
        clienteId: pedido.clienteId,
        numeroPedidos: 0,
        montoTotal: 0,
        productosComprados: 0
      };
    }
    clientesStats[clienteKey].numeroPedidos += 1;
    clientesStats[clienteKey].montoTotal += pedido.total || 0;
    clientesStats[clienteKey].productosComprados += pedido.productos?.length || 0;
  });

  const topClientes = Object.values(clientesStats)
    .sort((a, b) => b.montoTotal - a.montoTotal)
    .slice(0, 10);

  // Verificar si hay datos para mostrar
  const hayDatos = pedidosFiltrados.length > 0 && (topProductos.length > 0 || topClientes.length > 0);

  // Opciones de vendedores (solo para admin)
  const vendedoresOptions = esAdmin ? [
    { label: 'Todos los vendedores', value: null },
    { label: 'Guille', value: 'guille@dcg.com' },
    { label: 'Santi', value: 'santi@dcg.com' }
  ] : [];

  // Datos para gráfico de productos
  const chartProductosData = {
    labels: topProductos.slice(0, 5).map(p => p.nombre),
    datasets: [
      {
        label: 'Cantidad Vendida',
        data: topProductos.slice(0, 5).map(p => p.cantidadTotal),
        backgroundColor: '#3b82f6'
      }
    ]
  };

  const chartProductosOptions = {
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false
      }
    },
    maintainAspectRatio: false,
    scales: {
      x: {
        beginAtZero: true
      }
    }
  };

  // Datos para gráfico de clientes
  const chartClientesData = {
    labels: topClientes.slice(0, 5).map(c => c.cliente),
    datasets: [
      {
        label: 'Monto Total',
        data: topClientes.slice(0, 5).map(c => c.montoTotal),
        backgroundColor: '#10b981'
      }
    ]
  };

  const chartClientesOptions = {
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false
      }
    },
    maintainAspectRatio: false,
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString('es-AR');
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-content-center align-items-center p-5">
        <ProgressSpinner />
      </div>
    );
  }

  return (
    <div className="pedidos-reportes">
      {/* Filtros */}
      <Card className="mb-4">
        <div className="grid">
          <div className="col-12 md:col-6">
            <div className="field">
              <label htmlFor="mes">Mes</label>
              <Calendar
                id="mes"
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(e.value)}
                view="month"
                dateFormat="mm/yy"
                showIcon
              />
            </div>
          </div>
          
          {esAdmin && (
            <div className="col-12 md:col-6">
              <div className="field">
                <label htmlFor="vendedor">Vendedor</label>
                <Dropdown
                  id="vendedor"
                  value={vendedorSeleccionado}
                  options={vendedoresOptions}
                  onChange={(e) => setVendedorSeleccionado(e.value)}
                  placeholder="Seleccionar vendedor"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Resumen del período */}
      <div className="grid mb-4">
        <div className="col-12 md:col-4">
          <Card className="bg-blue-50">
            <div className="flex justify-content-between align-items-center">
              <div>
                <div className="text-500 font-medium mb-2">Pedidos Facturados</div>
                <div className="text-3xl font-bold text-blue-600">{pedidosFiltrados.length}</div>
              </div>
              <div className="bg-blue-100 p-3 border-round">
                <i className="pi pi-check-circle text-blue-600 text-2xl"></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 md:col-4">
          <Card className="bg-green-50">
            <div className="flex justify-content-between align-items-center">
              <div>
                <div className="text-500 font-medium mb-2">Monto Total</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatearMoneda(pedidosFiltrados.reduce((sum, p) => sum + (p.total || 0), 0))}
                </div>
              </div>
              <div className="bg-green-100 p-3 border-round">
                <i className="pi pi-dollar text-green-600 text-2xl"></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 md:col-4">
          <Card className="bg-purple-50">
            <div className="flex justify-content-between align-items-center">
              <div>
                <div className="text-500 font-medium mb-2">Clientes Únicos</div>
                <div className="text-3xl font-bold text-purple-600">{Object.keys(clientesStats).length}</div>
              </div>
              <div className="bg-purple-100 p-3 border-round">
                <i className="pi pi-users text-purple-600 text-2xl"></i>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Mensaje cuando no hay datos */}
      {!hayDatos && (
        <div className="col-12">
          <Card>
            <div className="text-center p-4">
              <i className="pi pi-chart-line text-6xl text-300 mb-3"></i>
              <h3 className="text-900 mb-2">Sin datos para mostrar</h3>
              <p className="text-600 mb-0">
                {pedidosFiltrados.length === 0 
                  ? 'No hay pedidos que coincidan con los filtros seleccionados.'
                  : 'Los pedidos existentes no tienen información detallada de productos para generar reportes.'
                }
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Productos más vendidos */}
      <div className="grid">
        <div className="col-12 lg:col-6">
          <Card title="Top 5 Productos Más Vendidos" className="mb-4">
            <div style={{ height: '300px' }}>
              <Chart type="bar" data={chartProductosData} options={chartProductosOptions} />
            </div>
          </Card>

          <Card title="Detalle de Productos" className="mb-4">
            <DataTable 
              value={topProductos} 
              paginator 
              rows={5}
              emptyMessage="No hay datos para el período seleccionado"
              responsiveLayout="scroll"
            >
              <Column field="nombre" header="Producto" sortable />
              <Column field="codigo" header="Código" sortable />
              <Column 
                field="cantidadTotal" 
                header="Cant. Vendida" 
                sortable
                body={(rowData) => rowData.cantidadTotal.toLocaleString('es-AR')}
              />
              <Column 
                field="numeroVentas" 
                header="N° Ventas" 
                sortable 
              />
              <Column 
                field="montoTotal" 
                header="Monto Total" 
                sortable
                body={(rowData) => formatearMoneda(rowData.montoTotal)}
              />
            </DataTable>
          </Card>
        </div>

        {/* Clientes que más pidieron */}
        <div className="col-12 lg:col-6">
          <Card title="Top 5 Clientes" className="mb-4">
            <div style={{ height: '300px' }}>
              <Chart type="bar" data={chartClientesData} options={chartClientesOptions} />
            </div>
          </Card>

          <Card title="Detalle de Clientes" className="mb-4">
            <DataTable 
              value={topClientes} 
              paginator 
              rows={5}
              emptyMessage="No hay datos para el período seleccionado"
              responsiveLayout="scroll"
            >
              <Column field="cliente" header="Cliente" sortable />
              <Column 
                field="numeroPedidos" 
                header="N° Pedidos" 
                sortable 
              />
              <Column 
                field="productosComprados" 
                header="Productos" 
                sortable 
              />
              <Column 
                field="montoTotal" 
                header="Monto Total" 
                sortable
                body={(rowData) => formatearMoneda(rowData.montoTotal)}
              />
            </DataTable>
          </Card>
        </div>
      </div>

      {/* Análisis detallado */}
      <Card title="Análisis Detallado" className="mb-4">
        <div className="grid">
          <div className="col-12 md:col-6">
            <h4 className="text-lg mb-3">Estadísticas Generales</h4>
            <div className="flex flex-column gap-3">
              <div className="flex justify-content-between">
                <span className="text-gray-600">Promedio por pedido:</span>
                <span className="font-bold">
                  {formatearMoneda(
                    pedidosFiltrados.length > 0 
                      ? pedidosFiltrados.reduce((sum, p) => sum + (p.total || 0), 0) / pedidosFiltrados.length 
                      : 0
                  )}
                </span>
              </div>
              <div className="flex justify-content-between">
                <span className="text-gray-600">Productos únicos vendidos:</span>
                <span className="font-bold">{Object.keys(productosVendidos).length}</span>
              </div>
              <div className="flex justify-content-between">
                <span className="text-gray-600">Total unidades vendidas:</span>
                <span className="font-bold">
                  {Object.values(productosVendidos).reduce((sum, p) => sum + p.cantidadTotal, 0).toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </div>

          <div className="col-12 md:col-6">
            <h4 className="text-lg mb-3">Condiciones de Pago</h4>
            <div className="flex flex-column gap-3">
              <div className="flex justify-content-between">
                <span className="text-gray-600">Contado:</span>
                <span className="font-bold">
                  {pedidosFiltrados.filter(p => p.condicionPago === 'contado').length} pedidos
                </span>
              </div>
              <div className="flex justify-content-between">
                <span className="text-gray-600">Cuenta Corriente:</span>
                <span className="font-bold">
                  {pedidosFiltrados.filter(p => p.condicionPago === 'cuenta_corriente').length} pedidos
                </span>
              </div>
              <div className="flex justify-content-between">
                <span className="text-gray-600">Monto en Contado:</span>
                <span className="font-bold">
                  {formatearMoneda(
                    pedidosFiltrados
                      .filter(p => p.condicionPago === 'contado')
                      .reduce((sum, p) => sum + (p.total || 0), 0)
                  )}
                </span>
              </div>
              <div className="flex justify-content-between">
                <span className="text-gray-600">Monto en Cuenta Corriente:</span>
                <span className="font-bold">
                  {formatearMoneda(
                    pedidosFiltrados
                      .filter(p => p.condicionPago === 'cuenta_corriente')
                      .reduce((sum, p) => sum + (p.total || 0), 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PedidosReportes;


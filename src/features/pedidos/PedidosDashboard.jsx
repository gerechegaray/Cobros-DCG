import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Chart } from 'primereact/chart';
import { Tag } from 'primereact/tag';
import { ProgressBar } from 'primereact/progressbar';
import { getPedidosRealtime, getPedidosByVendedorRealtime } from './pedidosService';
import { formatearMoneda } from './utils';
import { getLabelEstado, getColorEstado } from './constants';

const PedidosDashboard = ({ user }) => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Calcular estadísticas (con manejo de pedidos legacy)
  const stats = {
    total: pedidos.length,
    pendiente: pedidos.filter(p => (p.estado === 'pendiente' || !p.estado)).length,
    facturado: pedidos.filter(p => p.estado === 'facturado').length,
    
    contado: pedidos.filter(p => (p.condicionPago === 'contado' || !p.condicionPago)).length,
    cuentaCorriente: pedidos.filter(p => p.condicionPago === 'cuenta_corriente').length,
    
    montoTotal: pedidos.reduce((sum, p) => sum + (p.total || 0), 0),
    montoFacturado: pedidos.filter(p => p.estado === 'facturado').reduce((sum, p) => sum + (p.total || 0), 0),
    montoPendiente: pedidos.filter(p => (p.estado === 'pendiente' || !p.estado)).reduce((sum, p) => sum + (p.total || 0), 0)
  };

  // Datos para gráfico de estados
  const chartEstadosData = {
    labels: ['Pendiente', 'Facturado'],
    datasets: [
      {
        data: [stats.pendiente, stats.facturado],
        backgroundColor: ['#ffc107', '#28a745']
      }
    ]
  };

  const chartEstadosOptions = {
    plugins: {
      legend: {
        position: 'bottom'
      }
    },
    maintainAspectRatio: false
  };

  // Datos para gráfico de condiciones de pago
  const chartCondicionesData = {
    labels: ['Contado', 'Cuenta Corriente'],
    datasets: [
      {
        label: 'Pedidos por Condición de Pago',
        data: [stats.contado, stats.cuentaCorriente],
        backgroundColor: ['#0dcaf0', '#8b5cf6']
      }
    ]
  };

  const chartCondicionesOptions = {
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false
      }
    },
    maintainAspectRatio: false
  };

  if (loading) {
    return <div className="flex justify-content-center p-4">Cargando estadísticas...</div>;
  }

  return (
    <div className="pedidos-dashboard">
      <div className="grid">
        {/* Tarjetas de resumen */}
        <div className="col-12 md:col-6 lg:col-3">
          <Card className="bg-blue-50">
            <div className="flex justify-content-between align-items-center">
              <div>
                <div className="text-500 font-medium mb-2">Total Pedidos</div>
                <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
              </div>
              <div className="bg-blue-100 p-3 border-round">
                <i className="pi pi-shopping-cart text-blue-600 text-3xl"></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 md:col-6 lg:col-3">
          <Card className="bg-green-50">
            <div className="flex justify-content-between align-items-center">
              <div>
                <div className="text-500 font-medium mb-2">Monto Total</div>
                <div className="text-2xl font-bold text-green-600">{formatearMoneda(stats.montoTotal)}</div>
              </div>
              <div className="bg-green-100 p-3 border-round">
                <i className="pi pi-dollar text-green-600 text-3xl"></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 md:col-6 lg:col-3">
          <Card className="bg-orange-50">
            <div className="flex justify-content-between align-items-center">
              <div>
                <div className="text-500 font-medium mb-2">Pendientes</div>
                <div className="text-3xl font-bold text-orange-600">{stats.pendiente}</div>
              </div>
              <div className="bg-orange-100 p-3 border-round">
                <i className="pi pi-clock text-orange-600 text-3xl"></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 md:col-6 lg:col-3">
          <Card className="bg-teal-50">
            <div className="flex justify-content-between align-items-center">
              <div>
                <div className="text-500 font-medium mb-2">Facturados</div>
                <div className="text-3xl font-bold text-teal-600">{stats.facturado}</div>
              </div>
              <div className="bg-teal-100 p-3 border-round">
                <i className="pi pi-check-circle text-teal-600 text-3xl"></i>
              </div>
            </div>
          </Card>
        </div>

        {/* Gráfico de estados */}
        <div className="col-12 md:col-6">
          <Card title="Pedidos por Estado">
            <div style={{ height: '300px' }}>
              <Chart type="doughnut" data={chartEstadosData} options={chartEstadosOptions} />
            </div>
          </Card>
        </div>

        {/* Gráfico de condiciones de pago */}
        <div className="col-12 md:col-6">
          <Card title="Pedidos por Condición de Pago">
            <div style={{ height: '300px' }}>
              <Chart type="bar" data={chartCondicionesData} options={chartCondicionesOptions} />
            </div>
          </Card>
        </div>

        {/* Desglose de estados */}
        <div className="col-12 md:col-6">
          <Card title="Desglose por Estado">
            <div className="flex flex-column gap-3">
              <div className="flex justify-content-between align-items-center">
                <span>Pendiente</span>
                <Tag value={stats.pendiente} severity="warning" />
              </div>
              <div className="flex justify-content-between align-items-center">
                <span>Facturado</span>
                <Tag value={stats.facturado} severity="success" />
              </div>
            </div>
            <div className="mt-4">
              <h4 className="text-base mb-3">Por Condición de Pago</h4>
              <div className="flex flex-column gap-3">
                <div className="flex justify-content-between align-items-center">
                  <span>Contado</span>
                  <Tag value={stats.contado} severity="info" />
                </div>
                <div className="flex justify-content-between align-items-center">
                  <span>Cuenta Corriente</span>
                  <Tag value={stats.cuentaCorriente} severity="help" />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Montos */}
        <div className="col-12 md:col-6">
          <Card title="Análisis de Montos">
            <div className="flex flex-column gap-3">
              <div>
                <div className="flex justify-content-between mb-2">
                  <span className="font-medium">Monto Total</span>
                  <span className="font-bold text-primary">{formatearMoneda(stats.montoTotal)}</span>
                </div>
                <ProgressBar value={100} showValue={false} />
              </div>
              
              <div>
                <div className="flex justify-content-between mb-2">
                  <span className="font-medium">Monto Facturado</span>
                  <span className="font-bold text-green-600">{formatearMoneda(stats.montoFacturado)}</span>
                </div>
                <ProgressBar 
                  value={stats.montoTotal > 0 ? (stats.montoFacturado / stats.montoTotal) * 100 : 0} 
                  showValue={false}
                  color="#22c55e"
                />
              </div>
              
              <div>
                <div className="flex justify-content-between mb-2">
                  <span className="font-medium">Monto Pendiente</span>
                  <span className="font-bold text-orange-600">{formatearMoneda(stats.montoPendiente)}</span>
                </div>
                <ProgressBar 
                  value={stats.montoTotal > 0 ? (stats.montoPendiente / stats.montoTotal) * 100 : 0} 
                  showValue={false}
                  color="#f59e0b"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PedidosDashboard;


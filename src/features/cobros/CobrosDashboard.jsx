import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Chart } from 'primereact/chart';
import { ProgressBar } from 'primereact/progressbar';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { getCobrosRealtime, getCobrosByVendedorRealtime } from './cobrosService';
import { 
  formatearMonto, 
  calcularTotalesPorEstado,
  calcularTotalesPorVendedor,
  calcularTotalesPorFormaPago,
  filtrarPorRangoFechas
} from './utils';
import moment from 'moment';

const CobrosDashboard = ({ user }) => {
  const [cobros, setCobros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mes'); // dia, semana, mes, año, todo
  
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    let unsubscribe;

    if (isAdmin) {
      unsubscribe = getCobrosRealtime((data) => {
        setCobros(data);
        setLoading(false);
      });
    } else {
      unsubscribe = getCobrosByVendedorRealtime(user.email, (data) => {
        setCobros(data);
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, isAdmin]);

  const getCobrosPorPeriodo = () => {
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
        return cobros;
    }

    return filtrarPorRangoFechas(cobros, fechaInicio, null);
  };

  const cobrosFiltrados = getCobrosPorPeriodo();
  const totalesPorEstado = calcularTotalesPorEstado(cobrosFiltrados);
  const totalesPorVendedor = calcularTotalesPorVendedor(cobrosFiltrados);
  const totalesPorFormaPago = calcularTotalesPorFormaPago(cobrosFiltrados);

  // Calcular porcentaje de cobros cargados
  const porcentajeCargados = totalesPorEstado.total > 0 
    ? Math.round((totalesPorEstado.cargado / totalesPorEstado.total) * 100)
    : 0;

  // Datos para gráfico de estados
  const chartEstadosData = {
    labels: ['Pendiente', 'Cargado'],
    datasets: [
      {
        data: [totalesPorEstado.pendiente, totalesPorEstado.cargado],
        backgroundColor: ['#FFA726', '#66BB6A'],
        hoverBackgroundColor: ['#FB8C00', '#4CAF50']
      }
    ]
  };

  const chartEstadosOptions = {
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  // Datos para gráfico de formas de pago
  const formasPagoLabels = Object.keys(totalesPorFormaPago);
  const formasPagoData = Object.values(totalesPorFormaPago);
  
  const chartFormasPagoData = {
    labels: formasPagoLabels.map(fp => fp.charAt(0).toUpperCase() + fp.slice(1)),
    datasets: [
      {
        label: 'Monto',
        data: formasPagoData,
        backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726'],
        borderWidth: 1
      }
    ]
  };

  const chartFormasPagoOptions = {
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString('es-AR');
          }
        }
      }
    }
  };

  // Datos para gráfico de vendedores (solo admin)
  const vendedoresLabels = Object.keys(totalesPorVendedor);
  const vendedoresData = vendedoresLabels.map(v => totalesPorVendedor[v].total);
  
  const chartVendedoresData = {
    labels: vendedoresLabels,
    datasets: [
      {
        label: 'Total Cobrado',
        data: vendedoresData,
        backgroundColor: '#42A5F5',
        borderColor: '#1E88E5',
        borderWidth: 2
      }
    ]
  };

  const chartVendedoresOptions = {
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false
      }
    },
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

  const periodos = [
    { label: 'Hoy', value: 'dia' },
    { label: 'Esta Semana', value: 'semana' },
    { label: 'Este Mes', value: 'mes' },
    { label: 'Este Año', value: 'año' },
    { label: 'Todo', value: 'todo' }
  ];

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="cobros-dashboard">
      {/* Selector de período */}
      <div className="mb-3">
        <label className="block mb-2 text-sm font-medium">Período</label>
        <Dropdown
          value={periodo}
          options={periodos}
          onChange={(e) => setPeriodo(e.value)}
          placeholder="Selecciona período"
          className="w-full md:w-20rem"
        />
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid">
        <div className="col-12 md:col-6 lg:col-3">
          <Card className="bg-blue-50">
            <div className="flex justify-content-between align-items-center">
              <div>
                <div className="text-500 font-medium mb-2 text-sm md:text-base">Total Cobrado</div>
                <div className="text-900 font-bold text-xl md:text-3xl">
                  {formatearMonto(totalesPorEstado.total)}
                </div>
              </div>
              <div className="bg-blue-500 text-white border-round p-2 md:p-3">
                <i className="pi pi-dollar text-2xl md:text-3xl"></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 md:col-6 lg:col-3">
          <Card className="bg-orange-50">
            <div className="flex justify-content-between align-items-center">
              <div>
                <div className="text-500 font-medium mb-2 text-sm md:text-base">Pendiente</div>
                <div className="text-900 font-bold text-xl md:text-3xl">
                  {formatearMonto(totalesPorEstado.pendiente)}
                </div>
              </div>
              <div className="bg-orange-500 text-white border-round p-2 md:p-3">
                <i className="pi pi-clock text-2xl md:text-3xl"></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 md:col-6 lg:col-3">
          <Card className="bg-green-50">
            <div className="flex justify-content-between align-items-center">
              <div>
                <div className="text-500 font-medium mb-2 text-sm md:text-base">Cargado</div>
                <div className="text-900 font-bold text-xl md:text-3xl">
                  {formatearMonto(totalesPorEstado.cargado)}
                </div>
              </div>
              <div className="bg-green-500 text-white border-round p-2 md:p-3">
                <i className="pi pi-check-circle text-2xl md:text-3xl"></i>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 md:col-6 lg:col-3">
          <Card className="bg-purple-50">
            <div className="flex justify-content-between align-items-center">
              <div>
                <div className="text-500 font-medium mb-2 text-sm md:text-base">Total Cobros</div>
                <div className="text-900 font-bold text-xl md:text-3xl">
                  {cobrosFiltrados.length}
                </div>
              </div>
              <div className="bg-purple-500 text-white border-round p-2 md:p-3">
                <i className="pi pi-list text-2xl md:text-3xl"></i>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Progreso de carga */}
      <div className="grid mt-3 md:mt-4">
        <div className="col-12">
          <Card>
            <h3 className="mt-0 mb-3 text-lg md:text-xl">Progreso de Carga en Sistema</h3>
            <div className="flex align-items-center gap-3">
              <ProgressBar 
                value={porcentajeCargados} 
                className="flex-1"
                displayValueTemplate={() => `${porcentajeCargados}% Cargado`}
              />
              <Tag 
                value={`${porcentajeCargados}%`} 
                severity={porcentajeCargados === 100 ? 'success' : 'warning'}
                className="text-lg"
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid mt-3 md:mt-4">
        <div className="col-12 md:col-6">
          <Card>
            <h3 className="mt-0 mb-3 text-lg md:text-xl">Distribución por Estado</h3>
            <div style={{ maxHeight: '300px', height: '250px' }}>
              <Chart 
                type="doughnut" 
                data={chartEstadosData} 
                options={chartEstadosOptions}
                className="w-full h-full"
              />
            </div>
          </Card>
        </div>

        <div className="col-12 md:col-6">
          <Card>
            <h3 className="mt-0 mb-3 text-lg md:text-xl">Por Forma de Pago</h3>
            <div style={{ maxHeight: '300px', height: '250px' }}>
              <Chart 
                type="bar" 
                data={chartFormasPagoData} 
                options={chartFormasPagoOptions}
                className="w-full h-full"
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Gráfico de vendedores (solo admin) */}
      {isAdmin && vendedoresLabels.length > 0 && (
        <div className="grid mt-3 md:mt-4">
          <div className="col-12">
            <Card>
              <h3 className="mt-0 mb-3 text-lg md:text-xl">Cobros por Vendedor</h3>
              <div style={{ minHeight: '250px' }}>
                <Chart 
                  type="bar" 
                  data={chartVendedoresData} 
                  options={chartVendedoresOptions}
                  className="w-full"
                />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tabla resumen por vendedor (solo admin) */}
      {isAdmin && (
        <div className="grid mt-3 md:mt-4">
          <div className="col-12">
            <Card>
              <h3 className="mt-0 mb-3 text-lg md:text-xl">Resumen por Vendedor</h3>
              <div className="grid">
                {Object.entries(totalesPorVendedor).map(([vendedor, datos]) => (
                  <div key={vendedor} className="col-12 md:col-6 lg:col-4">
                    <Card className="bg-gray-50">
                      <h4 className="mt-0 mb-3 text-primary text-base md:text-lg">{vendedor}</h4>
                      <div className="flex flex-column gap-2">
                        <div className="flex justify-content-between">
                          <span className="text-600">Total:</span>
                          <span className="font-bold">{formatearMonto(datos.total)}</span>
                        </div>
                        <div className="flex justify-content-between">
                          <span className="text-600">Pendiente:</span>
                          <span className="text-orange-600">{formatearMonto(datos.pendiente)}</span>
                        </div>
                        <div className="flex justify-content-between">
                          <span className="text-600">Cargado:</span>
                          <span className="text-green-600">{formatearMonto(datos.cargado)}</span>
                        </div>
                        <div className="flex justify-content-between">
                          <span className="text-600">Cantidad:</span>
                          <span className="font-bold">{datos.cantidad} cobros</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default CobrosDashboard;


import React, { useState, useMemo, useEffect } from 'react';
import { 
  Card, 
  Button, 
  DataTable, 
  Column, 
  Dialog, 
  Toast, 
  ProgressSpinner,
  Chart,
  Dropdown,
  Calendar,
  Divider,
  Panel
} from 'primereact';
import { formatMonto, formatFecha, calcularMetricas, generarFlujoCaja } from './utils';
import { categoriasGastos } from './constants';
import { obtenerResumenPagos, formatearResumenPagos } from './pagosUtils';
import { getGastosRealtime } from './gastosService';

const ReportesGastos = ({ user }) => {
  const [toast, setToast] = useState(null);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes');
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date());
  const [mostrarGrafico, setMostrarGrafico] = useState(false);

  // Cargar gastos
  useEffect(() => {
    if (!user) return;

    const unsubscribe = getGastosRealtime((gastosData) => {
      setGastos(gastosData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Filtrar gastos por período
  const gastosFiltrados = useMemo(() => {
    // Validar que gastos no sea undefined o null
    if (!gastos || !Array.isArray(gastos)) {
      return [];
    }
    
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    return gastos.filter(gasto => {
      const fechaGasto = new Date(gasto.fechaVencimiento);
      return fechaGasto >= inicio && fechaGasto <= fin;
    });
  }, [gastos, fechaInicio, fechaFin]);

  // Calcular métricas
  const metricas = useMemo(() => {
    return calcularMetricas(gastosFiltrados);
  }, [gastosFiltrados]);

  // Generar flujo de caja
  const flujoCaja = useMemo(() => {
    return generarFlujoCaja(gastosFiltrados);
  }, [gastosFiltrados]);

  // Datos para gráficos
  const datosGraficos = useMemo(() => {
    const datos = {
      gastosPorCategoria: (metricas.gastosPorCategoria || []).map(item => ({
        name: item.categoria,
        value: item.monto
      })),
      gastosPorEstado: (metricas.gastosPorEstado || []).map(item => ({
        name: item.estado,
        value: item.monto
      })),
      flujoMensual: (flujoCaja || []).map(item => ({
        mes: item.mes,
        ingresos: item.ingresos,
        gastos: item.gastos,
        saldo: item.saldo
      }))
    };
    
    return datos;
  }, [metricas, flujoCaja]);

  // Mostrar loading mientras se cargan los datos
  if (loading) {
    return (
      <div className="text-center p-4">
        <ProgressSpinner />
        <p className="mt-3">Cargando datos...</p>
      </div>
    );
  }

  // Opciones de período
  const opcionesPeriodo = [
    { label: 'Último mes', value: 'mes' },
    { label: 'Últimos 3 meses', value: 'trimestre' },
    { label: 'Último año', value: 'año' },
    { label: 'Personalizado', value: 'personalizado' }
  ];

  // Aplicar filtro de período
  const aplicarFiltroPeriodo = (periodo) => {
    const hoy = new Date();
    const inicio = new Date();
    
    switch (periodo) {
      case 'mes':
        inicio.setMonth(hoy.getMonth() - 1);
        break;
      case 'trimestre':
        inicio.setMonth(hoy.getMonth() - 3);
        break;
      case 'año':
        inicio.setFullYear(hoy.getFullYear() - 1);
        break;
      case 'personalizado':
        // Mantener fechas actuales
        break;
    }
    
    setFechaInicio(inicio);
    setFechaFin(hoy);
  };

  // Template para montos
  const montoTemplate = (rowData) => {
    return formatMonto(rowData.monto);
  };

  // Template para fechas
  const fechaTemplate = (rowData) => {
    return formatFecha(rowData.fechaVencimiento);
  };

  // Template para estado
  const estadoTemplate = (rowData) => {
    const colores = {
      pagado: 'success',
      pendiente: 'warning',
      vencido: 'danger'
    };
    
    return (
      <span className={`p-tag p-tag-${colores[rowData.estado] || 'info'}`}>
        {rowData.estado}
      </span>
    );
  };

  // Template para pagos parciales
  const pagosTemplate = (rowData) => {
    if (rowData.pagosParciales && rowData.pagosParciales.length > 0) {
      const resumen = formatearResumenPagos(rowData);
      return (
        <div className="text-sm">
          <div>{resumen.texto}</div>
          <div className="text-gray-600">{resumen.porcentaje}</div>
        </div>
      );
    }
    return '-';
  };

  return (
    <>
      <Toast ref={setToast} />
      
      <div className="reportes-gastos">
        <div className="flex justify-content-between align-items-center mb-4">
          <h2>📊 Reportes y Análisis de Gastos</h2>
        </div>
        <div className="grid">
          {/* Filtros */}
          <div className="col-12">
            <Card>
              <h4 className="mt-0 mb-3">Filtros de Período</h4>
              <div className="grid">
                <div className="col-12 md:col-3">
                  <label className="block mb-2">Período</label>
                  <Dropdown
                    value={filtroPeriodo}
                    onChange={(e) => {
                      setFiltroPeriodo(e.value);
                      aplicarFiltroPeriodo(e.value);
                    }}
                    options={opcionesPeriodo}
                    optionLabel="label"
                    optionValue="value"
                    className="w-full"
                  />
                </div>
                <div className="col-12 md:col-3">
                  <label className="block mb-2">Fecha Inicio</label>
                  <Calendar
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.value)}
                    dateFormat="dd/mm/yy"
                    showIcon
                    className="w-full"
                  />
                </div>
                <div className="col-12 md:col-3">
                  <label className="block mb-2">Fecha Fin</label>
                  <Calendar
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.value)}
                    dateFormat="dd/mm/yy"
                    showIcon
                    className="w-full"
                  />
                </div>
                <div className="col-12 md:col-3">
                  <label className="block mb-2">Acciones</label>
                  <div className="flex gap-2">
                    <Button
                      label="Aplicar"
                      icon="pi pi-filter"
                      onClick={() => setToast({ severity: 'success', summary: 'Filtros aplicados' })}
                      className="p-button-sm"
                    />
                    <Button
                      label="Exportar"
                      icon="pi pi-download"
                      onClick={() => setToast({ severity: 'info', summary: 'Exportación en desarrollo' })}
                      className="p-button-outlined p-button-sm"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Métricas principales */}
          <div className="col-12">
            <div className="grid">
              <div className="col-12 md:col-3">
                <Card className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {formatMonto(metricas.totalGastos)}
                  </div>
                  <div className="text-sm text-gray-600">Total Gastos</div>
                </Card>
              </div>
              <div className="col-12 md:col-3">
                <Card className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {formatMonto(metricas.gastosPagados)}
                  </div>
                  <div className="text-sm text-gray-600">Gastos Pagados</div>
                </Card>
              </div>
              <div className="col-12 md:col-3">
                <Card className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {formatMonto(metricas.gastosPendientes)}
                  </div>
                  <div className="text-sm text-gray-600">Gastos Pendientes</div>
                </Card>
              </div>
              <div className="col-12 md:col-3">
                <Card className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {formatMonto(metricas.gastosVencidos)}
                  </div>
                  <div className="text-sm text-gray-600">Gastos Vencidos</div>
                </Card>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="col-12">
            <div className="grid">
              <div className="col-12 md:col-6">
                <Card>
                  <h5 className="mt-0 mb-3">Gastos por Categoría</h5>
                  <Chart
                    type="doughnut"
                    data={datosGraficos.gastosPorCategoria}
                    options={{
                      plugins: {
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }}
                    style={{ height: '300px' }}
                  />
                </Card>
              </div>
              <div className="col-12 md:col-6">
                <Card>
                  <h5 className="mt-0 mb-3">Gastos por Estado</h5>
                  <Chart
                    type="pie"
                    data={datosGraficos.gastosPorEstado}
                    options={{
                      plugins: {
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }}
                    style={{ height: '300px' }}
                  />
                </Card>
              </div>
            </div>
          </div>

          {/* Flujo de caja */}
          <div className="col-12">
            <Card>
              <h5 className="mt-0 mb-3">Flujo de Caja Mensual</h5>
              <Chart
                type="line"
                data={{
                  labels: datosGraficos.flujoMensual.map(item => item.mes),
                  datasets: [
                    {
                      label: 'Ingresos',
                      data: datosGraficos.flujoMensual.map(item => item.ingresos),
                      borderColor: '#10b981',
                      backgroundColor: '#10b98120'
                    },
                    {
                      label: 'Gastos',
                      data: datosGraficos.flujoMensual.map(item => item.gastos),
                      borderColor: '#ef4444',
                      backgroundColor: '#ef444420'
                    },
                    {
                      label: 'Saldo',
                      data: datosGraficos.flujoMensual.map(item => item.saldo),
                      borderColor: '#3b82f6',
                      backgroundColor: '#3b82f620'
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }}
                style={{ height: '400px' }}
              />
            </Card>
          </div>

          {/* Tabla detallada */}
          <div className="col-12">
            <Card>
              <h5 className="mt-0 mb-3">Detalle de Gastos</h5>
              <DataTable
                value={gastosFiltrados}
                paginator
                rows={10}
                responsiveLayout="scroll"
                emptyMessage="No hay gastos en el período seleccionado"
              >
                <Column field="titulo" header="Gasto" />
                <Column field="categoria" header="Categoría" />
                <Column field="subcategoria" header="Subcategoría" />
                <Column field="monto" header="Monto" body={montoTemplate} />
                <Column field="estado" header="Estado" body={estadoTemplate} />
                <Column field="fechaVencimiento" header="Vencimiento" body={fechaTemplate} />
                <Column field="pagosParciales" header="Pagos Parciales" body={pagosTemplate} />
              </DataTable>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportesGastos;

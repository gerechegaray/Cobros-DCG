import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  Button, 
  Dropdown, 
  DataTable, 
  Column, 
  Tag, 
  ProgressSpinner,
  Divider,
  Toast
} from 'primereact';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { getGastosRealtime } from './gastosService';
import { calcularMetricas, generarFlujoCaja, formatMonto, formatFecha } from './utils';
import { categoriasGastos, estadosGastos, getSubcategoriasByCategoria } from './constants';

const GastosDashboard = ({ user }) => {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes');
  const [toast, setToast] = useState(null);

  // Obtener gastos en tiempo real
  useEffect(() => {
    const unsubscribe = getGastosRealtime((gastosData) => {
      setGastos(gastosData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Calcular métricas
  const metricas = useMemo(() => {
    return calcularMetricas(gastos);
  }, [gastos]);

  // Generar flujo de caja
  const flujoCaja = useMemo(() => {
    return generarFlujoCaja(gastos, 12);
  }, [gastos]);

  // Gastos próximos a vencer (7 días)
  const gastosProximosVencer = useMemo(() => {
    const hoy = new Date();
    const proximos7Dias = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return gastos.filter(gasto => {
      const fechaVenc = new Date(gasto.fechaVencimiento);
      return fechaVenc >= hoy && fechaVenc <= proximos7Dias && gasto.estado !== 'pagado';
    }).sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));
  }, [gastos]);

  // Gastos vencidos
  const gastosVencidos = useMemo(() => {
    const hoy = new Date();
    return gastos.filter(gasto => {
      const fechaVenc = new Date(gasto.fechaVencimiento);
      return fechaVenc < hoy && gasto.estado !== 'pagado';
    }).sort((a, b) => new Date(b.fechaVencimiento) - new Date(a.fechaVencimiento));
  }, [gastos]);

  // Gastos por categoría para gráfico
  const datosCategoria = useMemo(() => {
    return metricas.gastosPorCategoria
      .filter(item => item.monto > 0)
      .sort((a, b) => b.monto - a.monto);
  }, [metricas.gastosPorCategoria]);

  // Colores para gráficos
  const colores = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#6b7280'];

  // Formatear monto en tabla
  const montoTemplate = (rowData) => {
    return formatMonto(rowData.monto || rowData.montoTotal);
  };

  // Formatear fecha en tabla
  const fechaTemplate = (rowData) => {
    return formatFecha(rowData.fechaVencimiento);
  };

  // Template de estado
  const estadoTemplate = (rowData) => {
    const estado = estadosGastos.find(e => e.id === rowData.estado);
    return (
      <Tag 
        value={estado?.nombre || rowData.estado} 
        severity={rowData.estado === 'vencido' ? 'danger' : 
                 rowData.estado === 'proximo_vencer' ? 'warning' :
                 rowData.estado === 'pagado' ? 'success' : 'info'}
      />
    );
  };

  // Template de categoría
  const categoriaTemplate = (rowData) => {
    const categoria = categoriasGastos.find(c => c.id === rowData.categoria);
    const subcategorias = getSubcategoriasByCategoria(rowData.categoria);
    const subcategoria = subcategorias.find(s => s.id === rowData.subcategoria);
    
    return (
      <div className="flex align-items-center gap-2">
        <i className={`pi ${categoria?.icono || 'pi-circle'}`} style={{ color: categoria?.color }} />
        <div>
          <div className="font-semibold">{categoria?.nombre || rowData.categoria}</div>
          {subcategoria && (
            <div className="text-sm text-gray-600">{subcategoria.nombre}</div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <ProgressSpinner />
      </div>
    );
  }

  return (
    <>
      <Toast ref={setToast} />
      
      <div className="grid">
        {/* Métricas Principales */}
        <div className="col-12">
          <div className="grid">
            <div className="col-12 md:col-3">
              <Card className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {formatMonto(metricas.totalPendiente)}
                </div>
                <div className="text-sm text-gray-600">Total Pendiente</div>
              </Card>
            </div>
            
            <div className="col-12 md:col-3">
              <Card className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {formatMonto(metricas.totalVencido)}
                </div>
                <div className="text-sm text-gray-600">Total Vencido</div>
              </Card>
            </div>
            
            <div className="col-12 md:col-3">
              <Card className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {formatMonto(metricas.totalPagado)}
                </div>
                <div className="text-sm text-gray-600">Total Pagado</div>
              </Card>
            </div>
            
            <div className="col-12 md:col-3">
              <Card className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {formatMonto(metricas.proximosVencer)}
                </div>
                <div className="text-sm text-gray-600">Próximos a Vencer</div>
              </Card>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="col-12 lg:col-8">
          <Card title="Gastos por Categoría">
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosCategoria}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" />
                  <YAxis tickFormatter={(value) => formatMonto(value)} />
                  <Tooltip formatter={(value) => [formatMonto(value), 'Monto']} />
                  <Bar dataKey="monto" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="col-12 lg:col-4">
          <Card title="Distribución de Gastos">
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={datosCategoria}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ categoria, percent }) => `${categoria} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="monto"
                  >
                    {datosCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colores[index % colores.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatMonto(value), 'Monto']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Flujo de Caja */}
        <div className="col-12">
          <Card title="Flujo de Caja Proyectado (12 meses)">
            <div style={{ height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={flujoCaja}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(value) => formatMonto(value)} />
                  <Tooltip formatter={(value) => [formatMonto(value), 'Monto']} />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Gastos Próximos a Vencer */}
        <div className="col-12 lg:col-6">
          <Card title="Gastos Próximos a Vencer (7 días)">
            <DataTable
              value={gastosProximosVencer}
              paginator
              rows={5}
              responsiveLayout="scroll"
              emptyMessage="No hay gastos próximos a vencer"
            >
              <Column field="titulo" header="Título" />
              <Column field="categoria" header="Categoría" body={categoriaTemplate} />
              <Column field="monto" header="Monto" body={montoTemplate} />
              <Column field="fechaVencimiento" header="Fecha" body={fechaTemplate} />
              <Column field="estado" header="Estado" body={estadoTemplate} />
            </DataTable>
          </Card>
        </div>

        {/* Gastos Vencidos */}
        <div className="col-12 lg:col-6">
          <Card title="Gastos Vencidos">
            <DataTable
              value={gastosVencidos}
              paginator
              rows={5}
              responsiveLayout="scroll"
              emptyMessage="No hay gastos vencidos"
            >
              <Column field="titulo" header="Título" />
              <Column field="categoria" header="Categoría" body={categoriaTemplate} />
              <Column field="monto" header="Monto" body={montoTemplate} />
              <Column field="fechaVencimiento" header="Fecha" body={fechaTemplate} />
              <Column field="estado" header="Estado" body={estadoTemplate} />
            </DataTable>
          </Card>
        </div>

        {/* Resumen por Mes */}
        <div className="col-12">
          <Card title="Resumen Mensual">
            <DataTable
              value={flujoCaja}
              paginator
              rows={6}
              responsiveLayout="scroll"
              emptyMessage="No hay datos para mostrar"
            >
              <Column field="mes" header="Mes" />
              <Column field="total" header="Total" body={(rowData) => formatMonto(rowData.total)} />
              <Column field="cantidad" header="Cantidad de Gastos" />
              <Column 
                field="total" 
                header="Promedio por Gasto" 
                body={(rowData) => formatMonto(rowData.cantidad > 0 ? rowData.total / rowData.cantidad : 0)} 
              />
            </DataTable>
          </Card>
        </div>
      </div>
    </>
  );
};

export default GastosDashboard;

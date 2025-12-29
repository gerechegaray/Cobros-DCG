import React, { useState, useEffect, useMemo } from 'react';
import { Card } from 'primereact/card';
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

  // Calcular cobros de hoy y del mes
  const stats = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    const cobrosHoy = cobrosFiltrados.filter(c => {
      const fechaCobro = c.fechaCobro?.toDate ? c.fechaCobro.toDate() : new Date(c.fechaCobro);
      fechaCobro.setHours(0, 0, 0, 0);
      return fechaCobro.getTime() === hoy.getTime();
    });
    
    const cobrosMes = cobrosFiltrados.filter(c => {
      const fechaCobro = c.fechaCobro?.toDate ? c.fechaCobro.toDate() : new Date(c.fechaCobro);
      return fechaCobro >= inicioMes;
    });
    
    return {
      cobrosHoy: cobrosHoy.length,
      montoHoy: cobrosHoy.reduce((sum, c) => sum + (c.monto || 0), 0),
      montoMes: cobrosMes.reduce((sum, c) => sum + (c.monto || 0), 0)
    };
  }, [cobrosFiltrados]);

  // Calcular top 5 clientes por monto cobrado
  const top5Clientes = useMemo(() => {
    const clientesMap = new Map();
    
    cobrosFiltrados.forEach(cobro => {
      const clienteNombre = cobro.cliente || 'Cliente sin nombre';
      const monto = cobro.monto || 0;
      
      if (clientesMap.has(clienteNombre)) {
        clientesMap.set(clienteNombre, clientesMap.get(clienteNombre) + monto);
      } else {
        clientesMap.set(clienteNombre, monto);
      }
    });
    
    if (clientesMap.size === 0) return [];
    
    return Array.from(clientesMap.entries())
      .map(([nombre, monto]) => ({ nombre, monto }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);
  }, [cobrosFiltrados]);

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
      <div className="cobros-dashboard-periodo">
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
      <div className="cobros-kpis-grid">
        <Card className="cobros-kpi-card">
          <div className="cobros-kpi-content">
            <i className="pi pi-exclamation-triangle cobros-kpi-icon" style={{ color: 'var(--dcg-warning)' }}></i>
            <div className="cobros-kpi-value warning">{totalesPorEstado.pendiente}</div>
            <div className="cobros-kpi-label">Cobros Pendientes</div>
            <div className="cobros-kpi-sublabel">{formatearMonto(totalesPorEstado.pendiente)}</div>
          </div>
        </Card>

        <Card className="cobros-kpi-card">
          <div className="cobros-kpi-content">
            <i className="pi pi-dollar cobros-kpi-icon" style={{ color: 'var(--dcg-warning)' }}></i>
            <div className="cobros-kpi-value warning">{formatearMonto(totalesPorEstado.pendiente)}</div>
            <div className="cobros-kpi-label">Monto Total Pendiente</div>
          </div>
        </Card>

        <Card className="cobros-kpi-card">
          <div className="cobros-kpi-content">
            <i className="pi pi-calendar cobros-kpi-icon" style={{ color: 'var(--dcg-azul-claro)' }}></i>
            <div className="cobros-kpi-value info">{stats.cobrosHoy}</div>
            <div className="cobros-kpi-label">Cobros de Hoy</div>
            <div className="cobros-kpi-sublabel">{formatearMonto(stats.montoHoy)}</div>
          </div>
        </Card>

        <Card className="cobros-kpi-card">
          <div className="cobros-kpi-content">
            <i className="pi pi-chart-line cobros-kpi-icon" style={{ color: 'var(--dcg-success)' }}></i>
            <div className="cobros-kpi-value success">{formatearMonto(stats.montoMes)}</div>
            <div className="cobros-kpi-label">Total del Mes</div>
          </div>
        </Card>
      </div>

      {/* Progreso de carga */}
      <Card className="cobros-progress-card">
        <div className="cobros-progress-title">Progreso de Carga en Sistema</div>
        <div className="cobros-progress-container">
          <div className="cobros-progress-bar-wrapper">
            <ProgressBar 
              value={porcentajeCargados} 
              className="cobros-progress-bar"
              displayValueTemplate={() => `${porcentajeCargados}% Cargado`}
            />
          </div>
          <Tag 
            value={`${porcentajeCargados}%`} 
            severity={porcentajeCargados === 100 ? 'success' : 'warning'}
            className="cobros-progress-tag"
          />
        </div>
      </Card>

      {/* MÉTRICAS SECUNDARIAS */}
      <div className="cobros-metrics-grid">
        {/* Forma de Pago */}
        <Card className="cobros-metric-card">
          <div className="cobros-metric-title">Por Forma de Pago</div>
          <div className="cobros-metric-item">
            <span className="cobros-metric-item-label">Efectivo</span>
            <span className="cobros-metric-item-value">{totalesPorFormaPago.efectivo || 0}</span>
          </div>
          <div className="cobros-metric-item">
            <span className="cobros-metric-item-label">Transferencia</span>
            <span className="cobros-metric-item-value">{totalesPorFormaPago.transferencia || 0}</span>
          </div>
          <div className="cobros-metric-item">
            <span className="cobros-metric-item-label">Cheque</span>
            <span className="cobros-metric-item-value">{totalesPorFormaPago.cheque || 0}</span>
          </div>
        </Card>

        {/* Top 5 Clientes */}
        {top5Clientes.length > 0 && (
          <Card className="cobros-metric-card">
            <div className="cobros-metric-title">Top 5 Clientes</div>
            <div className="cobros-top-clientes">
              {top5Clientes.map((cliente, index) => (
                <div key={index} className="cobros-top-cliente-item">
                  <span className="cobros-top-cliente-nombre">{cliente.nombre}</span>
                  <span className="cobros-top-cliente-monto">{formatearMonto(cliente.monto)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Cobros por Vendedor (solo admin) */}
        {isAdmin && Object.keys(totalesPorVendedor).length > 0 && (
          <Card className="cobros-metric-card">
            <div className="cobros-metric-title">Cobros por Vendedor</div>
            <div className="cobros-vendedores-grid">
              {Object.entries(totalesPorVendedor).map(([vendedor, datos]) => (
                <div key={vendedor} className="cobros-vendedor-card">
                  <div className="cobros-vendedor-nombre">{vendedor}</div>
                  <div className="cobros-vendedor-item">
                    <span className="cobros-vendedor-item-label">Cantidad:</span>
                    <span className="cobros-vendedor-item-value">{datos.cantidad}</span>
                  </div>
                  <div className="cobros-vendedor-item">
                    <span className="cobros-vendedor-item-label">Total:</span>
                    <span className="cobros-vendedor-item-value">{formatearMonto(datos.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CobrosDashboard;


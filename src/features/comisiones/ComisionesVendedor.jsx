import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import { ProgressSpinner } from 'primereact/progressspinner';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { getComisiones, calcularComisiones, getComisionFlete, calcularComisionFlete } from './comisionesService';

// Generar lista de últimos N períodos (YYYY-MM)
function generarOpcionesPeriodos(cantidad = 12) {
  const opciones = [];
  const now = new Date();
  for (let i = 0; i < cantidad; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const valor = `${anio}-${mes}`;
    const label = d.toLocaleDateString('es-AR', { year: 'numeric', month: 'long' });
    opciones.push({ label, value: valor });
  }
  return opciones;
}

function ComisionesVendedor({ user }) {
  const toast = useRef(null);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [comisiones, setComisiones] = useState(null);
  const [comisionFlete, setComisionFlete] = useState(null);
  const [periodo, setPeriodo] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const opcionesPeriodo = generarOpcionesPeriodos(12);
  
  // Obtener nombre del vendedor desde el rol
  const vendedorNombre = user?.role === 'Guille' ? 'Guille' : 
                         user?.role === 'Santi' ? 'Santi' : null;
  
  // Cargar comisiones cuando cambian vendedor o período
  useEffect(() => {
    if (vendedorNombre && periodo) {
      cargarComisiones(periodo);
    }
  }, [vendedorNombre, periodo]);
  
  const cargarComisiones = async (periodoParam) => {
    const p = periodoParam || periodo;
    if (!vendedorNombre || !p) return;
    
    setLoading(true);
    try {
      const [data, flete] = await Promise.all([
        getComisiones(vendedorNombre, p),
        getComisionFlete(vendedorNombre, p)
      ]);
      setComisiones(data);
      setComisionFlete(flete);
    } catch (error) {
      console.error('Error cargando comisiones:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar las comisiones'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCalcular = async () => {
    if (!vendedorNombre || !periodo) return;
    
    setCalculando(true);
    try {
      await Promise.all([
        calcularComisiones(periodo),
        calcularComisionFlete(periodo)
      ]);
      toast.current?.show({
        severity: 'success',
        summary: 'Comisiones calculadas',
        detail: `Las comisiones de ${periodo} han sido calculadas`
      });
      await cargarComisiones(periodo);
    } catch (error) {
      console.error('Error calculando comisiones:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudieron calcular las comisiones'
      });
    } finally {
      setCalculando(false);
    }
  };
  
  const formatMonto = (monto) => {
    const valor = parseFloat(monto) || 0;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  };
  
  // Agrupar detalle por categoría
  const agruparPorCategoria = (detalle) => {
    if (!detalle || !Array.isArray(detalle) || detalle.length === 0) {
      return [];
    }
    
    const agrupado = {};
    
    detalle.forEach(item => {
      const categoria = item.categoria || 'Sin categoría';
      
      if (!agrupado[categoria]) {
        agrupado[categoria] = {
          categoria: categoria,
          porcentaje: item.porcentaje || 0,
          subtotal: 0,
          comision: 0
        };
      }
      
      agrupado[categoria].subtotal += parseFloat(item.subtotal) || 0;
      agrupado[categoria].comision += parseFloat(item.comision) || 0;
    });
    
    // Convertir a array y ordenar por comisión descendente
    return Object.values(agrupado).sort((a, b) => b.comision - a.comision);
  };
  
  // Agrupar detalle por producto (valor/incidencia - ordenado por monto cobrado)
  const agruparPorProducto = (detalle, totalCobrado) => {
    if (!detalle || !Array.isArray(detalle) || detalle.length === 0) return [];
    
    const agrupado = {};
    detalle.forEach(item => {
      const producto = (item.producto || 'Sin nombre').trim() || 'Sin nombre';
      if (!agrupado[producto]) {
        agrupado[producto] = { producto, subtotal: 0 };
      }
      agrupado[producto].subtotal += parseFloat(item.subtotal) || 0;
    });
    
    const total = totalCobrado > 0 ? totalCobrado : Object.values(agrupado).reduce((s, x) => s + x.subtotal, 0);
    return Object.values(agrupado)
      .map(x => ({ ...x, pctTotal: total > 0 ? (x.subtotal / total) * 100 : 0 }))
      .sort((a, b) => b.subtotal - a.subtotal)
      .slice(0, 10);
  };
  
  // Agrupar detalle por cliente (requiere clientName/clientId en el detalle desde backend)
  const agruparPorCliente = (detalle) => {
    if (!detalle || !Array.isArray(detalle) || detalle.length === 0) return [];
    
    const agrupado = {};
    detalle.forEach(item => {
      const clave = item.clientId || item.clientName;
      if (!clave) return; // Solo agrupar si hay datos de cliente
      
      const nombre = item.clientName || item.clientId;
      if (!agrupado[clave]) {
        agrupado[clave] = { clientName: nombre, clientId: item.clientId, subtotal: 0 };
      }
      agrupado[clave].subtotal += parseFloat(item.subtotal) || 0;
    });
    
    return Object.values(agrupado)
      .sort((a, b) => b.subtotal - a.subtotal)
      .slice(0, 10);
  };
  
  // Generar label del período desde periodo (YYYY-MM)
  const periodoLabel = periodo ? (() => {
    const [anio, mes] = periodo.split('-').map(Number);
    // Crear fecha en UTC para evitar problemas de zona horaria
    const fecha = new Date(Date.UTC(anio, mes - 1, 1));
    return fecha.toLocaleDateString('es-AR', { 
      year: 'numeric', 
      month: 'long',
      timeZone: 'UTC'
    });
  })() : '';
  
  // Obtener resumen por categoría
  const resumenPorCategoria = comisiones?.detalle 
    ? agruparPorCategoria(comisiones.detalle)
    : [];
  
  // Top productos por valor (incidencia) y top clientes
  const topProductos = comisiones?.detalle
    ? agruparPorProducto(comisiones.detalle, comisiones.totalCobrado)
    : [];
  const topClientes = comisiones?.detalle
    ? agruparPorCliente(comisiones.detalle)
    : [];
  
  if (loading && !comisiones) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <ProgressSpinner />
        <p>Cargando comisiones...</p>
      </div>
    );
  }
  
  return (
    <div className="comisiones-container">
      <Toast ref={toast} />
      
      <Card className="comisiones-header-card">
        <div className="comisiones-header">
          <div>
            <h1 className="comisiones-title">Mis Comisiones</h1>
            <div className="comisiones-periodo-selector">
              <label htmlFor="periodo-vendedor">Período:</label>
              <Dropdown
                id="periodo-vendedor"
                value={periodo}
                options={opcionesPeriodo}
                onChange={(e) => setPeriodo(e.value)}
                placeholder="Seleccionar período"
                className="comisiones-periodo-dropdown"
              />
            </div>
          </div>
          <Button
            label="Recalcular Comisiones"
            icon="pi pi-refresh"
            onClick={handleCalcular}
            loading={calculando}
            className="p-button-outlined"
            disabled={comisiones?.estado === 'cerrado' || comisiones?.estado === 'pagado'}
            tooltip={comisiones?.estado === 'cerrado' || comisiones?.estado === 'pagado' ? 'El período está cerrado o pagado, no se puede recalcular' : ''}
          />
        </div>
      </Card>
      
      {comisiones && (
        <>
          <div className="comisiones-kpis-grid">
            <Card className="comisiones-kpi-card">
              <div className="comisiones-kpi-content">
                <i className="pi pi-wallet comisiones-kpi-icon primary"></i>
                <div className="comisiones-kpi-value primary">
                  {formatMonto(comisiones.totalCobrado)}
                </div>
                <div className="comisiones-kpi-label">Total Cobrado</div>
              </div>
            </Card>
            
            <Card className="comisiones-kpi-card">
              <div className="comisiones-kpi-content">
                <i className="pi pi-money-bill comisiones-kpi-icon success"></i>
                <div className="comisiones-kpi-value success">
                  {formatMonto(comisiones.totalComision)}
                </div>
                <div className="comisiones-kpi-label">Comisión por Cobranza</div>
              </div>
            </Card>
          </div>
          
          {/* 🆕 FASE 3: Badge de estado */}
          {comisiones?.estado && (
            <Card className="comisiones-detail-card" style={{ marginTop: 'var(--spacing-4)' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--spacing-3)',
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--border-radius-md)',
                background: comisiones.estado === 'calculado' ? 'var(--dcg-warning-alpha)' :
                           comisiones.estado === 'cerrado' ? 'var(--dcg-info-alpha)' :
                           'var(--dcg-success-alpha)',
                border: `1px solid ${
                  comisiones.estado === 'calculado' ? 'var(--dcg-warning)' :
                  comisiones.estado === 'cerrado' ? 'var(--dcg-info)' :
                  'var(--dcg-success)'
                }`
              }}>
                <i className={`pi ${
                  comisiones.estado === 'calculado' ? 'pi-clock' :
                  comisiones.estado === 'cerrado' ? 'pi-lock' :
                  'pi-check-circle'
                }`} style={{ 
                  fontSize: 'var(--font-size-xl)',
                  color: comisiones.estado === 'calculado' ? 'var(--dcg-warning)' :
                         comisiones.estado === 'cerrado' ? 'var(--dcg-info)' :
                         'var(--dcg-success)'
                }}></i>
                <div>
                  <div style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--dcg-text-primary)' }}>
                    Estado: {comisiones.estado === 'calculado' ? 'Calculado' :
                            comisiones.estado === 'cerrado' ? 'Cerrado – pendiente de pago' :
                            'Pagado'}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--dcg-text-secondary)' }}>
                    {comisiones.estado === 'calculado' ? 'Monto estimado – sujeto a validación administrativa' :
                     comisiones.estado === 'cerrado' ? 'El período ha sido cerrado y está pendiente de pago' :
                     'Comisión pagada'}
                  </div>
                </div>
              </div>
            </Card>
          )}
          
          {comisionFlete && (
            <Card className="comisiones-detail-card" style={{ marginTop: 'var(--spacing-4)' }}>
              <h2 style={{ marginBottom: 'var(--spacing-4)' }}>Comisión por Flete</h2>
              <div className="comisiones-kpis-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div>
                  <div style={{ color: 'var(--dcg-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-1)' }}>
                    Total Transportado
                  </div>
                  <div style={{ color: 'var(--dcg-text-primary)', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
                    {formatMonto(comisionFlete.totalFlete || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--dcg-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-1)' }}>
                    Comisión por Flete ({comisionFlete.porcentaje || 4}%)
                  </div>
                  <div style={{ color: 'var(--dcg-success)', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
                    {formatMonto(comisionFlete.comisionFlete || 0)}
                  </div>
                </div>
              </div>
            </Card>
          )}
          
          {/* Top clientes y productos por valor (incidencia) */}
          <div className="comisiones-tops-grid">
            {topClientes.length > 0 && (
              <Card className="comisiones-detail-card comisiones-top-card">
                <h2 className="comisiones-top-title">
                  <i className="pi pi-users" style={{ marginRight: 'var(--spacing-2)' }}></i>
                  Top clientes por cobranza
                </h2>
                <p className="comisiones-top-subtitle">Clientes a los que más les cobraste este período</p>
                <DataTable value={topClientes} size="small" className="comisiones-top-table">
                  <Column field="clientName" header="Cliente" />
                  <Column
                    field="subtotal"
                    header="Monto cobrado"
                    body={(row) => formatMonto(row.subtotal)}
                    style={{ textAlign: 'right' }}
                  />
                </DataTable>
              </Card>
            )}
            {topProductos.length > 0 && (
              <Card className="comisiones-detail-card comisiones-top-card">
                <h2 className="comisiones-top-title">
                  <i className="pi pi-box" style={{ marginRight: 'var(--spacing-2)' }}></i>
                  Top productos por valor (incidencia)
                </h2>
                <p className="comisiones-top-subtitle">Productos que más aportaron al total cobrado</p>
                <DataTable value={topProductos} size="small" className="comisiones-top-table">
                  <Column field="producto" header="Producto" body={(row) => (
                    <span title={row.producto} className="comisiones-top-producto">
                      {row.producto.length > 40 ? row.producto.slice(0, 40) + '…' : row.producto}
                    </span>
                  )} />
                  <Column
                    field="subtotal"
                    header="Monto"
                    body={(row) => formatMonto(row.subtotal)}
                    style={{ textAlign: 'right' }}
                  />
                  <Column
                    field="pctTotal"
                    header="% del total"
                    body={(row) => `${row.pctTotal.toFixed(1)}%`}
                    style={{ textAlign: 'right' }}
                  />
                </DataTable>
              </Card>
            )}
          </div>
          
          {/* FASE 3: Mostrar ajustes si existen */}
          {comisiones?.ajustes && comisiones.ajustes.length > 0 && (
            <Card className="comisiones-detail-card" style={{ marginTop: 'var(--spacing-4)' }}>
              <h2>Ajustes Manuales</h2>
              <div style={{ marginTop: 'var(--spacing-3)' }}>
                {comisiones.ajustes.map((ajuste, index) => (
                  <div key={index} style={{
                    padding: 'var(--spacing-3)',
                    marginBottom: 'var(--spacing-2)',
                    background: 'var(--dcg-bg-secondary)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--dcg-border)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--dcg-text-primary)' }}>
                          {ajuste.tipo === 'positivo' ? '+' : '-'} {formatMonto(ajuste.monto)}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--dcg-text-secondary)', marginTop: 'var(--spacing-1)' }}>
                          {ajuste.motivo}
                        </div>
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--dcg-text-secondary)' }}>
                        {ajuste.createdAt?.toDate ? new Date(ajuste.createdAt.toDate()).toLocaleDateString('es-AR') : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          
          <Card className="comisiones-detail-card" style={{ marginTop: 'var(--spacing-4)' }}>
            {comisiones?.estado === 'calculado' && (
              <div className="comisiones-warning">
                <i className="pi pi-info-circle"></i>
                <span>Monto estimado – sujeto a validación administrativa</span>
              </div>
            )}
            
            <h2 style={{ marginTop: comisiones?.estado === 'calculado' ? 'var(--spacing-4)' : '0' }}>
              Resumen por Categoría
            </h2>
            
            {resumenPorCategoria.length > 0 ? (
              <DataTable
                value={resumenPorCategoria}
                className="comisiones-table"
              >
                <Column 
                  field="categoria" 
                  header="Categoría"
                  body={(rowData) => (
                    <span className="comisiones-categoria-badge">
                      {rowData.categoria}
                    </span>
                  )}
                />
                <Column 
                  field="porcentaje" 
                  header="% Comisión"
                  body={(rowData) => `${rowData.porcentaje}%`}
                  align="right"
                />
                <Column 
                  field="subtotal" 
                  header="Base"
                  body={(rowData) => formatMonto(rowData.subtotal)}
                  align="right"
                />
                <Column 
                  field="comision" 
                  header="Comisión"
                  body={(rowData) => (
                    <strong className="comisiones-comision-value">
                      {formatMonto(rowData.comision)}
                    </strong>
                  )}
                  align="right"
                />
              </DataTable>
            ) : (
              <div className="comisiones-empty">
                <p>No hay comisiones calculadas para este período.</p>
                <p>Haz clic en "Recalcular Comisiones" para calcularlas.</p>
              </div>
            )}
            
            <div style={{ marginTop: 'var(--spacing-6)', paddingTop: 'var(--spacing-4)', borderTop: '1px solid var(--dcg-border)' }}>
              <h2 style={{ marginBottom: 'var(--spacing-4)' }}>
                {comisiones?.estado === 'pagado' ? 'Total Pagado del Período' : 'Total Estimado del Período'}
              </h2>
              <div style={{ 
                fontSize: 'var(--font-size-3xl)', 
                fontWeight: 'var(--font-weight-bold)', 
                color: 'var(--dcg-success)',
                marginTop: 'var(--spacing-4)'
              }}>
                {formatMonto(
                  (comisiones?.totalFinal || comisiones?.totalComision || 0) + (comisionFlete?.comisionFlete || 0)
                )}
              </div>
              <div style={{ 
                color: 'var(--dcg-text-secondary)', 
                fontSize: 'var(--font-size-sm)',
                marginTop: 'var(--spacing-2)'
              }}>
                = Comisión por Cobranza {comisiones?.ajustes && comisiones.ajustes.length > 0 ? '+ Ajustes' : ''} + Comisión por Flete
              </div>
              {comisiones?.ajustes && comisiones.ajustes.length > 0 && (
                <div style={{ 
                  color: 'var(--dcg-text-secondary)', 
                  fontSize: 'var(--font-size-xs)',
                  marginTop: 'var(--spacing-1)',
                  fontStyle: 'italic'
                }}>
                  Comisión base: {formatMonto(comisiones.totalComision || 0)} | 
                  Ajustes: {formatMonto(
                    comisiones.ajustes.reduce((sum, a) => sum + (a.tipo === 'positivo' ? a.monto : -a.monto), 0)
                  )} | 
                  Total: {formatMonto(comisiones.totalFinal || comisiones.totalComision || 0)}
                </div>
              )}
            </div>
          </Card>
        </>
      )}
      
      {!comisiones && !loading && (
        <Card>
          <div className="comisiones-empty">
            <p>No hay comisiones disponibles para este período.</p>
            <Button
              label="Calcular Comisiones"
              icon="pi pi-calculator"
              onClick={handleCalcular}
              loading={calculando}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

export default ComisionesVendedor;


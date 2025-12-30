import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import { ProgressSpinner } from 'primereact/progressspinner';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { getComisiones, calcularComisiones, getComisionFlete, calcularComisionFlete } from './comisionesService';
// Formatter de monto (mismo formato que EstadoCuenta)

function ComisionesVendedor({ user }) {
  const toast = useRef(null);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [comisiones, setComisiones] = useState(null);
  const [comisionFlete, setComisionFlete] = useState(null);
  
  // Obtener nombre del vendedor desde el rol
  const vendedorNombre = user?.role === 'Guille' ? 'Guille' : 
                         user?.role === 'Santi' ? 'Santi' : null;
  
  // Obtener período actual (YYYY-MM)
  const getPeriodoActual = () => {
    const now = new Date();
    const anio = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    return `${anio}-${mes}`;
  };
  
  const periodoActual = getPeriodoActual();
  
  // Cargar comisiones del mes actual
  useEffect(() => {
    if (vendedorNombre) {
      cargarComisiones();
    }
  }, [vendedorNombre]);
  
  const cargarComisiones = async () => {
    if (!vendedorNombre) return;
    
    setLoading(true);
    try {
      const [data, flete] = await Promise.all([
        getComisiones(vendedorNombre, periodoActual),
        getComisionFlete(vendedorNombre, periodoActual)
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
    if (!vendedorNombre) return;
    
    setCalculando(true);
    try {
      await Promise.all([
        calcularComisiones(periodoActual),
        calcularComisionFlete(periodoActual)
      ]);
      toast.current?.show({
        severity: 'success',
        summary: 'Comisiones calculadas',
        detail: 'Las comisiones del mes actual han sido calculadas'
      });
      // Recargar comisiones
      await cargarComisiones();
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
  
  const periodoLabel = new Date().toLocaleDateString('es-AR', { 
    year: 'numeric', 
    month: 'long' 
  });
  
  // Obtener resumen por categoría
  const resumenPorCategoria = comisiones?.detalle 
    ? agruparPorCategoria(comisiones.detalle)
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
            <p className="comisiones-subtitle">
              Período: {periodoLabel}
            </p>
          </div>
          <Button
            label="Recalcular Comisiones"
            icon="pi pi-refresh"
            onClick={handleCalcular}
            loading={calculando}
            className="p-button-outlined"
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
          
          <Card className="comisiones-detail-card" style={{ marginTop: 'var(--spacing-4)' }}>
            <div className="comisiones-warning">
              <i className="pi pi-info-circle"></i>
              <span>Monto estimado – sujeto a validación administrativa</span>
            </div>
            
            <h2 style={{ marginTop: 'var(--spacing-4)' }}>Resumen por Categoría</h2>
            
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
              <h2 style={{ marginBottom: 'var(--spacing-4)' }}>Total Estimado del Período</h2>
              <div style={{ 
                fontSize: 'var(--font-size-3xl)', 
                fontWeight: 'var(--font-weight-bold)', 
                color: 'var(--dcg-success)',
                marginTop: 'var(--spacing-4)'
              }}>
                {formatMonto(
                  (comisiones?.totalComision || 0) + (comisionFlete?.comisionFlete || 0)
                )}
              </div>
              <div style={{ 
                color: 'var(--dcg-text-secondary)', 
                fontSize: 'var(--font-size-sm)',
                marginTop: 'var(--spacing-2)'
              }}>
                = Comisión por Cobranza + Comisión por Flete
              </div>
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


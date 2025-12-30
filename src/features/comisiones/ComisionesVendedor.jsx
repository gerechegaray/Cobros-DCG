import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import { ProgressSpinner } from 'primereact/progressspinner';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { getComisiones, calcularComisiones } from './comisionesService';
// Formatter de monto (mismo formato que EstadoCuenta)

function ComisionesVendedor({ user }) {
  const toast = useRef(null);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [comisiones, setComisiones] = useState(null);
  
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
      const data = await getComisiones(vendedorNombre, periodoActual);
      setComisiones(data);
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
      await calcularComisiones(periodoActual);
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
  
  const periodoLabel = new Date().toLocaleDateString('es-AR', { 
    year: 'numeric', 
    month: 'long' 
  });
  
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
                <div className="comisiones-kpi-label">Comisión Estimada</div>
              </div>
            </Card>
          </div>
          
          <Card className="comisiones-detail-card">
            <div className="comisiones-warning">
              <i className="pi pi-info-circle"></i>
              <span>Monto estimado – sujeto a validación administrativa</span>
            </div>
            
            <h2>Detalle por Factura</h2>
            
            {comisiones.detalle && comisiones.detalle.length > 0 ? (
              <DataTable
                value={comisiones.detalle}
                paginator
                rows={10}
                className="comisiones-table"
              >
                <Column field="facturaId" header="Factura ID" />
                <Column field="producto" header="Producto" />
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
                  field="subtotal" 
                  header="Subtotal"
                  body={(rowData) => formatMonto(rowData.subtotal)}
                  align="right"
                />
                <Column 
                  field="porcentaje" 
                  header="%"
                  body={(rowData) => `${rowData.porcentaje}%`}
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


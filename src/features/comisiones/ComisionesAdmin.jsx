import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import { ProgressSpinner } from 'primereact/progressspinner';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { getComisiones, calcularComisiones, getComisionesVendedor, seedReglas, syncFacturas, syncFacturasCompleta, getComisionFlete, calcularComisionFlete, cerrarPeriodo, agregarAjuste, pagarComision } from './comisionesService';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { formatearMoneda } from '../pedidos/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

function ComisionesAdmin({ user }) {
  const toast = useRef(null);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [sincronizandoCompleta, setSincronizandoCompleta] = useState(false);
  const [comisiones, setComisiones] = useState(null);
  const [comisionesPrevias, setComisionesPrevias] = useState(null);
  const [comisionFlete, setComisionFlete] = useState(null);
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState('Guille');
  const [periodo, setPeriodo] = useState('');
  const [cerrando, setCerrando] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [mostrarDialogAjuste, setMostrarDialogAjuste] = useState(false);
  const [ajusteForm, setAjusteForm] = useState({ tipo: 'positivo', monto: 0, motivo: '' });
  
  const vendedores = [
    { label: 'Guille', value: 'Guille' },
    { label: 'Santi', value: 'Santi' },
    { label: 'Victor', value: 'Victor' }
  ];
  
  // Obtener período actual por defecto
  useEffect(() => {
    const now = new Date();
    const anio = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    setPeriodo(`${anio}-${mes}`);
  }, []);
  
  // Cargar comisiones cuando cambian vendedor o período
  useEffect(() => {
    if (vendedorSeleccionado && periodo) {
      cargarComisiones();
    }
  }, [vendedorSeleccionado, periodo]);
  
  const cargarComisiones = async () => {
    if (!vendedorSeleccionado || !periodo) return;
    
    setLoading(true);
    try {
      const [data, flete] = await Promise.all([
        getComisiones(vendedorSeleccionado, periodo),
        getComisionFlete(vendedorSeleccionado, periodo)
      ]);
      setComisiones(data);
      setComisionFlete(flete);
      
      // Cargar mes anterior para comparación (opcional, no bloquea)
      const [anio, mes] = periodo.split('-').map(Number);
      const prevAnio = mes === 1 ? anio - 1 : anio;
      const prevMes = mes === 1 ? 12 : mes - 1;
      const prevPeriodo = `${prevAnio}-${String(prevMes).padStart(2, '0')}`;
      getComisiones(vendedorSeleccionado, prevPeriodo)
        .then(prevData => setComisionesPrevias(prevData))
        .catch(() => setComisionesPrevias(null));

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

  // 📈 Lógica de KPIs y Auditoría
  const totalComisionBruta = comisiones?.totalComision || 0;
  const totalAjustes = (comisiones?.ajustes || []).reduce((sum, a) => sum + (a.tipo === 'positivo' ? a.monto : -a.monto), 0);
  const totalFinal = comisiones?.totalFinal || (totalComisionBruta + totalAjustes);
  const itemsSinCategoria = (comisiones?.detalle || []).filter(item => (item.porcentaje || 0) === 0);

  // Formateadores para la tabla
  const comisionBody = (rowData) => {
    const isZero = (rowData.porcentaje || 0) === 0;
    return (
      <span style={{ color: isZero ? 'var(--dcg-error)' : 'inherit', fontWeight: isZero ? 'bold' : 'normal' }}>
        {formatearMoneda(rowData.comision)}
        {isZero && <i className="pi pi-exclamation-triangle p-ml-2" title="Producto sin categoría detectada"></i>}
      </span>
    );
  };

  const porcentajeBody = (rowData) => {
    const isZero = (rowData.porcentaje || 0) === 0;
    return (
      <span style={{ color: isZero ? 'var(--dcg-error)' : 'inherit', fontWeight: isZero ? 'bold' : 'normal' }}>
        {rowData.porcentaje}%
      </span>
    );
  };

  const rowClassName = (data) => {
    return {
      'bg-red-50': (data.porcentaje || 0) === 0
    };
  };
  
  const handleCalcular = async () => {
    if (!periodo) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Período requerido',
        detail: 'Selecciona un período para calcular'
      });
      return;
    }
    
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
  
  const handleSyncFacturas = async () => {
    setSincronizando(true);
    try {
      const resultado = await syncFacturas();
      toast.current?.show({
        severity: 'success',
        summary: 'Sincronización completada',
        detail: `${resultado.nuevas} nuevas, ${resultado.actualizadas} actualizadas`
      });
    } catch (error) {
      console.error('Error sincronizando facturas:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudieron sincronizar las facturas'
      });
    } finally {
      setSincronizando(false);
    }
  };
  
  const handleSyncFacturasCompleta = async () => {
    // Confirmar antes de ejecutar sincronización completa
    if (!window.confirm('La sincronización histórica se realizará en varios pasos automáticos para evitar errores. Puede tardar unos minutos. ¿Continuar?')) {
      return;
    }
    
    setSincronizandoCompleta(true);
    let currentOffset = 0;
    let totalNuevas = 0;
    let totalErrores = 0;
    let continueSync = true;
    
    try {
      while (continueSync) {
        toast.current?.show({
          severity: 'info',
          summary: 'Sincronizando...',
          detail: `Procesando lote histórico desde ${currentOffset}...`,
          life: 3000
        });
        
        const resultado = await syncFacturasCompleta(currentOffset, 20);
        
        totalNuevas += resultado.nuevas || 0;
        totalErrores += resultado.errores || 0;
        currentOffset = resultado.nextOffset;
        continueSync = resultado.hasMore;
        
        if (!continueSync) {
          toast.current?.show({
            severity: 'success',
            summary: 'Historial Completo',
            detail: `Se sincronizaron ${totalNuevas} movimientos exitosamenteota.`
          });
        }
      }
    } catch (error) {
      console.error('Error en loop de sincronización:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error en sincronización',
        detail: 'El proceso se interrumpió, pero puedes continuarlo pulsando el botón otra vez.'
      });
    } finally {
      setSincronizandoCompleta(false);
    }
  };
  
  const handleSeedReglas = async () => {
    try {
      const resultado = await seedReglas();
      toast.current?.show({
        severity: 'success',
        summary: 'Reglas cargadas',
        detail: `${resultado.creadas} creadas, ${resultado.actualizadas} actualizadas`
      });
    } catch (error) {
      console.error('Error en seed de reglas:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudieron cargar las reglas'
      });
    }
  };
  
  // 🆕 FASE 3: Cerrar período
  const handleCerrarPeriodo = async () => {
    if (!periodo) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Período requerido',
        detail: 'Selecciona un período para cerrar'
      });
      return;
    }
    
    confirmDialog({
      message: `¿Estás seguro de cerrar el período ${periodo}? Este período quedará cerrado y no podrá recalcularse.`,
      header: 'Confirmar Cierre de Período',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, cerrar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-warning',
      accept: async () => {
        setCerrando(true);
        try {
          const resultado = await cerrarPeriodo(periodo);
          toast.current?.show({
            severity: 'success',
            summary: 'Período cerrado',
            detail: `El período ${periodo} ha sido cerrado correctamente`
          });
          await cargarComisiones();
        } catch (error) {
          console.error('Error cerrando período:', error);
          toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo cerrar el período'
          });
        } finally {
          setCerrando(false);
        }
      }
    });
  };
  
  // 🆕 FASE 3: Agregar ajuste
  const handleAgregarAjuste = async () => {
    if (!ajusteForm.monto || ajusteForm.monto <= 0) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Monto inválido',
        detail: 'El monto debe ser mayor a 0'
      });
      return;
    }
    
    if (!ajusteForm.motivo || ajusteForm.motivo.trim() === '') {
      toast.current?.show({
        severity: 'warn',
        summary: 'Motivo requerido',
        detail: 'Debes ingresar un motivo para el ajuste'
      });
      return;
    }
    
    try {
      await agregarAjuste(
        vendedorSeleccionado,
        periodo,
        ajusteForm.tipo,
        ajusteForm.monto,
        ajusteForm.motivo
      );
      toast.current?.show({
        severity: 'success',
        summary: 'Ajuste agregado',
        detail: `Ajuste ${ajusteForm.tipo === 'positivo' ? 'sumado' : 'restado'} correctamente`
      });
      setMostrarDialogAjuste(false);
      setAjusteForm({ tipo: 'positivo', monto: 0, motivo: '' });
      await cargarComisiones();
    } catch (error) {
      console.error('Error agregando ajuste:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo agregar el ajuste'
      });
    }
  };
  
  // 🆕 FASE 3: Pagar comisión
  const handlePagarComision = async () => {
    if (!vendedorSeleccionado || !periodo) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Datos requeridos',
        detail: 'Selecciona vendedor y período'
      });
      return;
    }
    
    confirmDialog({
      message: `¿Marcar como pagada la comisión de ${vendedorSeleccionado} para ${periodo}?`,
      header: 'Confirmar Pago',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Sí, marcar como pagado',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-success',
      accept: async () => {
        setPagando(true);
        try {
          await pagarComision(vendedorSeleccionado, periodo);
          toast.current?.show({
            severity: 'success',
            summary: 'Comisión pagada',
            detail: `La comisión de ${vendedorSeleccionado} para ${periodo} ha sido marcada como pagada`
          });
          await cargarComisiones();
        } catch (error) {
          console.error('Error pagando comisión:', error);
          toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'No se pudo marcar como pagado'
          });
        } finally {
          setPagando(false);
        }
      }
    });
  };
  
  const handleExportPDF = () => {
    try {
      const { jsPDF } = window.jspdf ? window : { jsPDF: null };
      if (!jsPDF) {
        // Fallback si no está en el window
        import('jspdf').then(module => {
          const doc = new module.jsPDF();
          generarPDFContent(doc);
        });
      } else {
        const doc = new jsPDF();
        generarPDFContent(doc);
      }
    } catch (error) {
      console.error('Error exportando PDF:', error);
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el PDF' });
    }
  };

  const generarPDFContent = (doc) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Colores corporativos (basados en el logo)
    const AZUL_OSCURO = [30, 41, 75]; // #1e294b
    const AZUL_CLARO = [14, 165, 233]; // #0ea5e9
    
    // Encabezado
    doc.setFillColor(...AZUL_OSCURO);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('LIQUIDACIÓN DE COMISIONES', 15, 25);
    
    doc.setFontSize(10);
    doc.text(`Período: ${periodoLabel.toUpperCase()}`, 15, 33);
    
    // Datos Empresa/Vendedor
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Distribuidora DCG', 15, 55);
    doc.setFont(undefined, 'normal');
    doc.text('Liquidación generada automáticamente', 15, 60);
    
    doc.setFont(undefined, 'bold');
    doc.text('Vendedor:', pageWidth - 80, 55);
    doc.setFont(undefined, 'normal');
    const nameVendedor = vendedores.find(v => v.value === vendedorSeleccionado)?.label || vendedorSeleccionado;
    doc.text(nameVendedor, pageWidth - 80, 60);
    
    // Línea divisoria
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 70, pageWidth - 15, 70);
    
    // Cuadro de Resumen
    doc.setFillColor(245, 247, 250);
    doc.rect(15, 80, pageWidth - 30, 45, 'F');
    
    doc.setFontSize(11);
    doc.setTextColor(...AZUL_OSCURO);
    doc.text('RESUMEN DE LIQUIDACIÓN', 20, 90);
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(vendedorSeleccionado === 'Victor' ? 'Base de Ventas:' : 'Base de Cobranza:', 25, 100);
    doc.text(formatearMoneda(comisiones.totalCobrado), pageWidth - 60, 100, { align: 'right' });
    
    doc.text('Comisión Bruta:', 25, 107);
    doc.text(formatearMoneda(totalComisionBruta), pageWidth - 60, 107, { align: 'right' });
    
    if (comisionFlete?.comisionFlete > 0) {
      doc.text(`Comisión Flete (${comisionFlete.porcentaje}%):`, 25, 114);
      doc.text(formatearMoneda(comisionFlete.comisionFlete), pageWidth - 60, 114, { align: 'right' });
    }
    
    doc.text('Ajustes Manuales:', 25, 121);
    doc.text(formatearMoneda(totalAjustes), pageWidth - 60, 121, { align: 'right' });
    
    // Total Final resaltado
    doc.setFillColor(...AZUL_CLARO);
    doc.rect(pageWidth - 85, 135, 70, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL A PAGAR:', pageWidth - 80, 143);
    doc.text(formatearMoneda(totalFinal + (comisionFlete?.comisionFlete || 0)), pageWidth - 20, 143, { align: 'right' });
    
    // Tabla de Categorías
    doc.setTextColor(...AZUL_OSCURO);
    doc.setFontSize(12);
    doc.text('DESGLOSE POR CATEGORÍAS', 15, 165);
    
    // Dibujar tabla manualmente
    let currentY = 175;
    doc.setFillColor(230, 230, 230);
    doc.rect(15, currentY, pageWidth - 30, 8, 'F');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Categoría', 20, currentY + 5);
    doc.text('%', 80, currentY + 5);
    doc.text('Subtotal', pageWidth - 80, currentY + 5);
    doc.text('Comisión', pageWidth - 25, currentY + 5, { align: 'right' });
    
    currentY += 8;
    resumenPorCategoria.forEach((cat, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(15, currentY, pageWidth - 30, 7, 'F');
      }
      doc.text(cat.categoria, 20, currentY + 5);
      doc.text(`${cat.porcentaje}%`, 80, currentY + 5);
      doc.text(formatearMoneda(cat.subtotal), pageWidth - 80, currentY + 5);
      doc.text(formatearMoneda(cat.comision), pageWidth - 25, currentY + 5, { align: 'right' });
      currentY += 7;

      // Nueva página si es necesario
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }
    });

    // Pie de página
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const dateStr = new Date().toLocaleString();
    doc.text(`Documento generado el ${dateStr} - Cobranzas App`, pageWidth / 2, 285, { align: 'center' });
    
    doc.save(`Liquidacion_${vendedorSeleccionado}_${periodo}.pdf`);
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
  
  // Agrupar por producto (top por valor/incidencia)
  const agruparPorProducto = (detalle, totalCobrado) => {
    if (!detalle || !Array.isArray(detalle) || detalle.length === 0) return [];
    const agrupado = {};
    detalle.forEach(item => {
      const producto = (item.producto || 'Sin nombre').trim() || 'Sin nombre';
      if (!agrupado[producto]) agrupado[producto] = { producto, subtotal: 0 };
      agrupado[producto].subtotal += parseFloat(item.subtotal) || 0;
    });
    const total = totalCobrado > 0 ? totalCobrado : Object.values(agrupado).reduce((s, x) => s + x.subtotal, 0);
    return Object.values(agrupado)
      .map(x => ({ ...x, pctTotal: total > 0 ? (x.subtotal / total) * 100 : 0 }))
      .sort((a, b) => b.subtotal - a.subtotal)
      .slice(0, 10);
  };
  
  // Agrupar por cliente
  const agruparPorCliente = (detalle) => {
    if (!detalle || !Array.isArray(detalle) || detalle.length === 0) return [];
    const agrupado = {};
    detalle.forEach(item => {
      const clave = item.clientId || item.clientName;
      if (!clave) return;
      const nombre = item.clientName || item.clientId;
      if (!agrupado[clave]) agrupado[clave] = { clientName: nombre, clientId: item.clientId, subtotal: 0 };
      agrupado[clave].subtotal += parseFloat(item.subtotal) || 0;
    });
    return Object.values(agrupado).sort((a, b) => b.subtotal - a.subtotal).slice(0, 10);
  };
  
  // Generar label del período desde periodo (YYYY-MM)
  // Asegurar que el formato sea correcto para evitar problemas de zona horaria
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
  const topProductos = comisiones?.detalle ? agruparPorProducto(comisiones.detalle, comisiones.totalCobrado) : [];
  const topClientes = comisiones?.detalle ? agruparPorCliente(comisiones.detalle) : [];
  
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
            <h1 className="comisiones-title">Comisiones de Vendedores</h1>
            <p className="comisiones-subtitle">Administración y cálculo de comisiones</p>
          </div>
          <div className="comisiones-admin-actions">
            <Button
              label="Sincronizar Facturas"
              icon="pi pi-sync"
              onClick={handleSyncFacturas}
              loading={sincronizando}
              className="p-button-outlined p-button-secondary"
              tooltip="Sincronización incremental (solo nuevos payments)"
            />
            <Button
              label="Sincronización Completa"
              icon="pi pi-refresh"
              onClick={handleSyncFacturasCompleta}
              loading={sincronizandoCompleta}
              className="p-button-outlined p-button-warning"
              tooltip="Sincroniza todos los payments históricos (puede tardar varios minutos)"
            />
            <Button
              label="Cargar Reglas"
              icon="pi pi-database"
              onClick={handleSeedReglas}
              className="p-button-outlined p-button-secondary"
            />
            <Button
              label="Calcular Comisiones"
              icon="pi pi-calculator"
              onClick={handleCalcular}
              loading={calculando}
              className="p-button-outlined"
              disabled={comisiones?.estado === 'cerrado' || comisiones?.estado === 'pagado'}
            />
            {comisiones && user.role === 'admin' && (
              <Button
                label="Exportar PDF"
                icon="pi pi-file-pdf"
                onClick={handleExportPDF}
                className="p-button-danger"
                tooltip="Exportar liquidación mensual"
              />
            )}
            {comisiones?.estado === 'calculado' && (
              <Button
                label="Cerrar Período"
                icon="pi pi-lock"
                onClick={handleCerrarPeriodo}
                loading={cerrando}
                className="p-button-warning"
                tooltip="Cierra el período y bloquea recálculos"
              />
            )}
            {comisiones?.estado === 'cerrado' && (
              <>
                <Button
                  label="Agregar Ajuste"
                  icon="pi pi-plus-circle"
                  onClick={() => setMostrarDialogAjuste(true)}
                  className="p-button-outlined p-button-info"
                />
                <Button
                  label="Marcar como Pagado"
                  icon="pi pi-check"
                  onClick={handlePagarComision}
                  loading={pagando}
                  className="p-button-success"
                />
              </>
            )}
          </div>
        </div>
      </Card>
      
      <ConfirmDialog />
      
      <Card className="comisiones-filters-card">
        <div className="comisiones-filters">
          <div className="comisiones-filter-item">
            <label>Vendedor:</label>
            <Dropdown
              value={vendedorSeleccionado}
              options={vendedores}
              onChange={(e) => setVendedorSeleccionado(e.value)}
              placeholder="Seleccionar vendedor"
            />
          </div>
          <div className="comisiones-filter-item">
            <label>Período (YYYY-MM):</label>
            <InputText
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              placeholder="2025-01"
            />
          </div>
        </div>
      </Card>
      
      {comisiones && (
        <>
          <div className="comisiones-kpis-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 'var(--spacing-4)',
            marginBottom: 'var(--spacing-4)'
          }}>
            <Card className="comisiones-kpi-card shadow-1">
              <div className="comisiones-kpi-content">
                <i className="pi pi-briefcase comisiones-kpi-icon" style={{ color: 'var(--dcg-azul-claro)' }}></i>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: 'var(--dcg-azul-oscuro)' }}>
                  {formatearMoneda(comisiones.totalCobrado)}
                </div>
                <div className="comisiones-kpi-label">{vendedorSeleccionado === 'Victor' ? 'Total Ventas' : 'Total Cobrado'}</div>
              </div>
            </Card>
            
            <Card className="comisiones-kpi-card shadow-1">
              <div className="comisiones-kpi-content">
                <i className="pi pi-plus-circle comisiones-kpi-icon" style={{ color: 'var(--dcg-success)' }}></i>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: 'var(--dcg-success)' }}>
                  {formatearMoneda(totalComisionBruta)}
                </div>
                <div className="comisiones-kpi-label">Comisión Bruta</div>
              </div>
            </Card>

            <Card className="comisiones-kpi-card shadow-1">
              <div className="comisiones-kpi-content">
                <i className="pi pi-sliders-h comisiones-kpi-icon" style={{ color: 'var(--dcg-naranja)' }}></i>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: totalAjustes < 0 ? 'var(--dcg-error)' : 'var(--dcg-success)' }}>
                  {totalAjustes > 0 ? '+' : ''}{formatearMoneda(totalAjustes)}
                </div>
                <div className="comisiones-kpi-label">Ajustes Netos</div>
              </div>
            </Card>

            <Card className={`comisiones-kpi-card shadow-1 ${itemsSinCategoria.length > 0 ? 'border-red-500' : ''}`}>
              <div className="comisiones-kpi-content">
                <i className="pi pi-search comisiones-kpi-icon" style={{ color: itemsSinCategoria.length > 0 ? 'var(--dcg-error)' : 'var(--dcg-azul-claro)' }}></i>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: itemsSinCategoria.length > 0 ? 'var(--dcg-error)' : 'inherit' }}>
                  {itemsSinCategoria.length}
                </div>
                <div className="comisiones-kpi-label">Sin Categoría</div>
              </div>
            </Card>

            <Card className="comisiones-kpi-card shadow-1 bg-blue-50 relative overflow-hidden">
              <div className="comisiones-kpi-content">
                <i className="pi pi-dollar comisiones-kpi-icon" style={{ color: 'var(--dcg-azul-oscuro)' }}></i>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--dcg-azul-oscuro)' }}>
                  {formatearMoneda(totalFinal + (comisionFlete?.comisionFlete || 0))}
                </div>
                <div className="comisiones-kpi-label" style={{ fontWeight: 'bold' }}>Total a Liquidar</div>
                
                {comisionesPrevias && (
                  <div style={{ 
                    fontSize: 'var(--font-size-xs)', 
                    marginTop: '4px',
                    color: (totalFinal + (comisionFlete?.comisionFlete || 0)) >= comisionesPrevias.totalFinal ? 'var(--dcg-success)' : 'var(--dcg-error)',
                    fontWeight: 'bold'
                  }}>
                    <i className={`pi pi-arrow-${(totalFinal + (comisionFlete?.comisionFlete || 0)) >= (comisionesPrevias.totalFinal || 0) ? 'up' : 'down'}`} style={{ fontSize: '10px' }}></i>
                    {' '}{Math.abs(((totalFinal - (comisionesPrevias.totalFinal || 0)) / (comisionesPrevias.totalFinal || 1)) * 100).toFixed(1)}% vs anterior
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Gráfico Comparativo de Desempeño */}
          {comisionesPrevias && (
            <Card className="shadow-1" style={{ marginBottom: 'var(--spacing-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-4)' }}>
                <h3 style={{ margin: 0 }}>Tendencia de Desempeño</h3>
                <span style={{ fontSize: 'var(--font-size-sm)', opacity: 0.7 }}>Periodo actual vs anterior</span>
              </div>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { label: 'Anterior', value: comisionesPrevias.totalFinal || 0, fill: '#cbd5e1' },
                    { label: 'Actual', value: totalFinal, fill: 'var(--dcg-azul-claro)' }
                  ]} barSize={50} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey="label" axisLine={false} tickLine={false} />
                    <RechartsTooltip formatter={(val) => formatearMoneda(val)} />
                    <Bar dataKey="value">
                      { [0, 1].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#cbd5e1' : 'var(--dcg-azul-claro)'} radius={[4, 4, 0, 0]} />
                      )) }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
          
          {/* Top clientes y productos por valor */}
          <div className="comisiones-tops-grid">
            {topClientes.length > 0 && (
              <Card className="comisiones-detail-card comisiones-top-card">
                <h2 className="comisiones-top-title">
                  <i className="pi pi-users" style={{ marginRight: 'var(--spacing-2)' }}></i>
                  Top clientes por cobranza
                </h2>
                <p className="comisiones-top-subtitle">Clientes a los que más se les cobró este período</p>
                <DataTable value={topClientes} size="small" className="comisiones-top-table">
                  <Column field="clientName" header="Cliente" />
                  <Column field="subtotal" header="Monto cobrado" body={(row) => formatMonto(row.subtotal)} style={{ textAlign: 'right' }} />
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
                  <Column field="subtotal" header="Monto" body={(row) => formatMonto(row.subtotal)} style={{ textAlign: 'right' }} />
                  <Column field="pctTotal" header="% del total" body={(row) => `${row.pctTotal.toFixed(1)}%`} style={{ textAlign: 'right' }} />
                </DataTable>
              </Card>
            )}
          </div>
          
          <Card className="comisiones-detail-card" style={{ marginTop: 'var(--spacing-4)' }}>
            {comisiones?.estado === 'calculado' && (
              <div className="comisiones-warning">
                <i className="pi pi-info-circle"></i>
                <span>Monto estimado – sujeto a validación administrativa</span>
              </div>
            )}
            
            <h2 style={{ marginTop: comisiones?.estado === 'calculado' ? 'var(--spacing-4)' : '0' }}>
              Resumen por Categoría - {vendedorSeleccionado} - {periodoLabel}
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
                <p>Haz clic en "Calcular Comisiones" para calcularlas.</p>
              </div>
            )}

            {comisiones?.detalle && comisiones.detalle.length > 0 && (
              <div style={{ marginTop: 'var(--spacing-6)' }}>
                <h2 style={{ marginBottom: 'var(--spacing-4)' }}>Detalle de Movimientos</h2>
                <DataTable 
                  value={comisiones.detalle} 
                  paginator 
                  rows={10} 
                  rowsPerPageOptions={[10, 20, 50]}
                  className="comisiones-table shadow-1"
                  size="small"
                  rowClassName={rowClassName}
                  responsiveLayout="scroll"
                >
                  <Column field="clientName" header="Cliente" sortable style={{ minWidth: '150px' }} />
                  <Column field="producto" header="Producto" sortable style={{ minWidth: '200px' }} />
                  <Column field="categoria" header="Categoría" sortable />
                  <Column field="porcentaje" header="%" body={porcentajeBody} align="right" />
                  <Column field="subtotal" header="Monto" body={(r) => formatearMoneda(r.subtotal)} align="right" />
                  <Column field="comision" header="Comisión" body={comisionBody} align="right" />
                </DataTable>
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
      
      {/* 🆕 FASE 3: Dialog para agregar ajuste */}
      <Dialog
        header="Agregar Ajuste Manual"
        visible={mostrarDialogAjuste}
        style={{ width: '500px' }}
        onHide={() => {
          setMostrarDialogAjuste(false);
          setAjusteForm({ tipo: 'positivo', monto: 0, motivo: '' });
        }}
        footer={
          <div>
            <Button
              label="Cancelar"
              icon="pi pi-times"
              onClick={() => {
                setMostrarDialogAjuste(false);
                setAjusteForm({ tipo: 'positivo', monto: 0, motivo: '' });
              }}
              className="p-button-text"
            />
            <Button
              label="Agregar Ajuste"
              icon="pi pi-check"
              onClick={handleAgregarAjuste}
              className="p-button-primary"
            />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <div>
            <label>Tipo de Ajuste:</label>
            <Dropdown
              value={ajusteForm.tipo}
              options={[
                { label: 'Suma (+)', value: 'positivo' },
                { label: 'Resta (-)', value: 'negativo' }
              ]}
              onChange={(e) => setAjusteForm({ ...ajusteForm, tipo: e.value })}
              style={{ width: '100%', marginTop: 'var(--spacing-2)' }}
            />
          </div>
          <div>
            <label>Monto:</label>
            <InputNumber
              value={ajusteForm.monto}
              onValueChange={(e) => setAjusteForm({ ...ajusteForm, monto: e.value || 0 })}
              mode="currency"
              currency="ARS"
              locale="es-AR"
              style={{ width: '100%', marginTop: 'var(--spacing-2)' }}
            />
          </div>
          <div>
            <label>Motivo (obligatorio):</label>
            <InputTextarea
              value={ajusteForm.motivo}
              onChange={(e) => setAjusteForm({ ...ajusteForm, motivo: e.target.value })}
              rows={4}
              style={{ width: '100%', marginTop: 'var(--spacing-2)' }}
              placeholder="Describe el motivo del ajuste..."
            />
          </div>
        </div>
      </Dialog>
      
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

export default ComisionesAdmin;


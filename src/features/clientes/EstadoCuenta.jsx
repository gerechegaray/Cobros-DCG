import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "primereact/card";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { useRef } from "react";
import { ProgressSpinner } from "primereact/progressspinner";
import { Dropdown } from "primereact/dropdown";
import { getEstadoCuenta } from "../../services/alegra";
import { api } from "../../services/api";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './EstadoCuenta.css';
import '../../styles/estado-cuenta.css';

function EstadoCuenta({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useRef(null);
  
  const [cliente, setCliente] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [boletas, setBoletas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [refreshingCache, setRefreshingCache] = useState(false); // 🆕 Estado para refresh de caché
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null); // 🆕 Timestamp de última actualización
  const [cacheExists, setCacheExists] = useState(false); // 🆕 Indica si existe caché
  const [expandedProductos, setExpandedProductos] = useState({}); // 🆕 Estado para productos expandidos
  const [expandedRows, setExpandedRows] = useState({}); // 🆕 Estado combinado para expansión
  const [totales, setTotales] = useState({
    totalAdeudado: 0,
    totalPagado: 0,
    totalGeneral: 0
  });

  // Obtener el sellerId según el rol del usuario
  const getSellerId = () => {
    if (user?.role === 'Guille') return 1;
    if (user?.role === 'Santi') return 2;
    if (user?.role === 'admin') return null; // Admin ve todos
    return null;
  };

  // 🆕 Función para alternar la expansión de productos
  const toggleProductos = (numero) => {
    setExpandedProductos(prev => ({
      ...prev,
      [numero]: !prev[numero]
    }));

    // También actualizar el estado combinado de expansión
    setExpandedRows(prev => ({
      ...prev,
      [numero]: !prev[numero]
    }));
  };

  // 🆕 Inicializar estado de expansión cuando se cargan las boletas
  useEffect(() => {
    if (boletas.length > 0) {
      const estadoInicial = {};
      boletas.forEach(boleta => {
        // Expandir automáticamente si tiene pagos
        if (boleta.pagos && boleta.pagos.length > 0) {
          estadoInicial[boleta.numero] = true;
        }
      });
      setExpandedRows(estadoInicial);
    }
  }, [boletas]);

  // Cargar clientes al montar el componente
  useEffect(() => {
    const fetchClientes = async () => {
      setLoadingClientes(true);
      try {
        const data = await api.getClientesFirebase();
        
        // Filtrar clientes según el rol del usuario
        const sellerId = getSellerId();
        let clientesFiltrados = data;
        
        if (sellerId !== null) {
          // Filtrar por sellerId específico - el seller es un objeto con id
          clientesFiltrados = data.filter(cliente => {
            if (cliente.seller && cliente.seller.id) {
              return cliente.seller.id === sellerId.toString();
            }
            return false;
          });
        } else if (user?.role === 'admin') {
          clientesFiltrados = data;
        } else {
          clientesFiltrados = [];
        }
        
        // Ordenar clientes alfabéticamente
        const clientesOrdenados = clientesFiltrados
          .sort((a, b) => {
            const nombreA = a.name || a.nombre || a['Razón Social'] || '';
            const nombreB = b.name || b.nombre || b['Razón Social'] || '';
            return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
          });
        
        setClientes(clientesOrdenados);
        
        // Si hay un cliente desde navegación o parámetros URL, seleccionarlo automáticamente
        let clienteAPreseleccionar = null;
        
        // Verificar si viene desde location.state (navegación programática)
        if (location.state?.cliente && clientesOrdenados.length > 0) {
          clienteAPreseleccionar = clientesOrdenados.find(c => 
            c.id === location.state.cliente.id || 
            c.name === location.state.cliente.name ||
            c.nombre === location.state.cliente.nombre ||
            c['Razón Social'] === location.state.cliente['Razón Social']
          );
        }
        
        // Verificar si viene desde parámetros URL (navegación desde MenuClientes)
        const clienteParam = searchParams.get('cliente');
        // console.log('[EstadoCuenta] Parámetro cliente de URL:', clienteParam, 'tipo:', typeof clienteParam);
        // console.log('[EstadoCuenta] Primeros 5 clientes con sus tipos de ID:', clientesOrdenados.slice(0, 5).map(c => ({ id: c.id, idType: typeof c.id, name: c.name })));
        
        if (clienteParam && clientesOrdenados.length > 0 && !clienteAPreseleccionar) {
          // Convertir el parámetro a número para comparar con el ID
          const clienteParamNum = Number(clienteParam);
          
          clienteAPreseleccionar = clientesOrdenados.find(c => 
            c.id === clienteParamNum ||  // Comparar como número
            c.id === clienteParam ||     // También comparar como string por si acaso
            c.name === clienteParam ||
            c.nombre === clienteParam ||
            c['Razón Social'] === clienteParam
          );
          // console.log('[EstadoCuenta] Cliente encontrado para preseleccionar:', clienteAPreseleccionar);
        }
        
        if (clienteAPreseleccionar) {
          setCliente(clienteAPreseleccionar);
          cargarEstadoCuenta(clienteAPreseleccionar);
        }
      } catch (error) {
        console.error('Error al cargar clientes:', error);
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar la lista de clientes'
        });
      } finally {
        setLoadingClientes(false);
      }
    };
    
    fetchClientes();
  }, [user, location.state, searchParams]);

  const handleClienteChange = (clienteSeleccionado) => {
    setCliente(clienteSeleccionado);
    if (clienteSeleccionado) {
      cargarEstadoCuenta(clienteSeleccionado);
    } else {
      // Limpiar datos si no hay cliente seleccionado
      setBoletas([]);
      setTotales({
        totalAdeudado: 0,
        totalPagado: 0,
        totalGeneral: 0
      });
    }
  };

  // 🆕 Función para calcular tiempo relativo
  const calcularTiempoRelativo = (timestamp) => {
    if (!timestamp) return 'Nunca';
    
    const ahora = new Date();
    const fecha = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const diferenciaMs = ahora - fecha;
    const diferenciaMinutos = Math.floor(diferenciaMs / (1000 * 60));
    const diferenciaHoras = Math.floor(diferenciaMs / (1000 * 60 * 60));
    const diferenciaDias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
    
    if (diferenciaMinutos < 1) return 'Hace menos de un minuto';
    if (diferenciaMinutos < 60) return `Hace ${diferenciaMinutos} minuto${diferenciaMinutos > 1 ? 's' : ''}`;
    if (diferenciaHoras < 24) return `Hace ${diferenciaHoras} hora${diferenciaHoras > 1 ? 's' : ''}`;
    return `Hace ${diferenciaDias} día${diferenciaDias > 1 ? 's' : ''}`;
  };

  const cargarEstadoCuenta = async (clienteData) => {
    setLoading(true);
    try {
      // 🆕 Primero consultar caché
      console.log('[ESTADO CUENTA] Consultando caché para cliente:', clienteData.id);
      const cacheData = await api.getEstadoCuentaCache(clienteData.id);
      
      if (cacheData.exists && cacheData.facturas && cacheData.facturas.length > 0) {
        // Mostrar datos del caché inmediatamente
        console.log('[ESTADO CUENTA] Datos encontrados en caché:', cacheData.facturas.length, 'facturas');
        setBoletas(cacheData.facturas);
        setTotales({
          totalAdeudado: cacheData.totalAdeudado || 0,
          totalPagado: cacheData.totalPagado || 0,
          totalGeneral: cacheData.totalFacturado || 0
        });
        setUltimaActualizacion(cacheData.ultimaActualizacion);
        setCacheExists(true);
        
        // No mostrar toast, los datos ya están visibles
      } else {
        // No hay caché, mostrar mensaje pero no consultar Alegra automáticamente
        console.log('[ESTADO CUENTA] No hay caché disponible');
        setBoletas([]);
        setTotales({
          totalAdeudado: 0,
          totalPagado: 0,
          totalGeneral: 0
        });
        setUltimaActualizacion(null);
        setCacheExists(false);
        
        toast.current.show({
          severity: 'info',
          summary: 'Sin datos en caché',
          detail: 'Presiona "Actualizar ahora" para cargar el estado de cuenta desde Alegra',
          life: 5000
        });
      }

    } catch (error) {
      console.error('Error al cargar estado de cuenta desde caché:', error);
      
      // En caso de error, mostrar tabla vacía
      setBoletas([]);
      setTotales({
        totalAdeudado: 0,
        totalPagado: 0,
        totalGeneral: 0
      });
      setUltimaActualizacion(null);
      setCacheExists(false);

      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo cargar el estado de cuenta desde caché'
      });
    } finally {
      setLoading(false);
    }
  };

  const actualizarDesdeAlegra = async () => {
    if (!cliente) return;
    
    setRefreshingCache(true);
    try {
      // 🆕 Llamar al endpoint de refresh que consulta Alegra y actualiza caché
      console.log('[ESTADO CUENTA] Refrescando desde Alegra para cliente:', cliente.id);
      const resultado = await api.refreshEstadoCuentaCache(cliente.id, true); // forzar = true
      
      if (resultado.fresh) {
        // Caché estaba fresco, usar datos existentes
        console.log('[ESTADO CUENTA] Caché estaba fresco, usando datos existentes');
        toast.current.show({
          severity: 'info',
          summary: 'Caché actualizado',
          detail: 'Los datos ya estaban actualizados'
        });
      } else {
        // Caché fue actualizado, recargar datos
        console.log('[ESTADO CUENTA] Caché actualizado, recargando datos');
      await cargarEstadoCuenta(cliente);
      
      toast.current.show({
        severity: 'success',
        summary: 'Actualizado',
        detail: 'Estado de cuenta actualizado desde Alegra'
      });
      }

    } catch (error) {
      console.error('Error al actualizar desde Alegra:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar desde Alegra'
      });
    } finally {
      setRefreshingCache(false);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "";
    const date = new Date(fecha);
    // Ajustar a zona horaria de Argentina (UTC-3)
    const fechaArgentina = new Date(date.getTime() + (3 * 60 * 60 * 1000));
    return fechaArgentina.toLocaleDateString("es-AR", {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatMonto = (monto) => {
    // Convertir a número y validar
    const numMonto = Number(monto);
    if (isNaN(numMonto) || numMonto === null || numMonto === undefined) {
      return '$0,00';
    }
    
    try {
      const formatted = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
      }).format(numMonto);
      
      // Asegurar que devuelva string
      const result = String(formatted);
      return result;
    } catch (error) {
      console.error('Error formateando monto:', error, monto);
      return '$0,00';
    }
  };

  const estadoTemplate = (rowData) => {
    const getSeverity = (estado) => {
      switch (estado) {
        case "PAGADO":
          return "success";
        case "PENDIENTE":
          return "warning";
        case "VENCIDO":
          return "danger";
        default:
          return "info";
      }
    };

    return (
      <div>
        <span className="p-hidden md:inline">
          <Tag
            value={rowData.estado}
            severity={getSeverity(rowData.estado)}
            style={{
              borderRadius: "15px",
              fontSize: "0.75rem",
              fontWeight: "500"
            }}
          />
        </span>
        <div className="md:hidden">
          <span style={{ fontWeight: "bold", display: "block", marginBottom: "0.25rem" }}>
            Estado:
          </span>
          <Tag
            value={rowData.estado}
            severity={getSeverity(rowData.estado)}
            style={{
              borderRadius: "15px",
              fontSize: "0.75rem",
              fontWeight: "500"
            }}
          />
        </div>
      </div>
    );
  };

  const montoTemplate = (field) => (rowData) => (
    <span>
      {formatMonto(rowData[field])}
    </span>
  );

  // Template para celdas con label en responsive
  const cellWithLabelTemplate = (field, label) => (rowData) => (
    <div>
        <span className="p-hidden md:inline">
        {rowData[field]}
      </span>
      <div className="md:hidden">
          <span style={{ fontWeight: "bold", display: "block", marginBottom: "0.25rem" }}>
          {label}:
        </span>
          <span>
          {rowData[field]}
        </span>
      </div>
    </div>
  );

  const fechaWithLabelTemplate = (field, label) => (rowData) => (
    <div>
        <span className="p-hidden md:inline">
        {formatFecha(rowData[field])}
      </span>
      <div className="md:hidden">
          <span style={{ fontWeight: "bold", display: "block", marginBottom: "0.25rem" }}>
          {label}:
        </span>
          <span>
          {formatFecha(rowData[field])}
        </span>
      </div>
    </div>
  );

  const montoWithLabelTemplate = (field, label) => (rowData) => (
    <div>
        <span className="p-hidden md:inline">
        {formatMonto(rowData[field])}
      </span>
      <div className="md:hidden">
          <span style={{ fontWeight: "bold", display: "block", marginBottom: "0.25rem" }}>
          {label}:
        </span>
          <span>
          {formatMonto(rowData[field])}
        </span>
      </div>
    </div>
  );

  const exportarPDF = () => {
    if (!cliente || boletas.length === 0) {
      toast.current.show({
        severity: 'warn',
        summary: 'Sin datos',
        detail: 'No hay datos para exportar'
      });
      return;
    }

    try {
      // Crear un elemento temporal para el PDF
      const pdfContainer = document.createElement('div');
      pdfContainer.id = 'pdf-export-container';
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.top = '0';
      pdfContainer.style.width = '794px'; // A4 width in pixels (210mm * 3.78)
      pdfContainer.style.backgroundColor = '#ffffff';
      pdfContainer.style.color = '#1a1a1a'; // Color de texto oscuro por defecto
      pdfContainer.style.padding = '20px 30px'; // Márgenes más conservadores
      pdfContainer.style.fontFamily = 'Arial, sans-serif';
      pdfContainer.style.fontSize = '12px';
      pdfContainer.style.lineHeight = '1.4';
      pdfContainer.style.boxSizing = 'border-box';
      
      // Crear el contenido del PDF
      pdfContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin: 0; font-size: 24px; font-weight: bold;">ESTADO DE CUENTA</h1>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p style="margin: 5px 0; color: #1a1a1a;"><strong style="color: #1a1a1a;">Cliente:</strong> ${boletas.length > 0 && boletas[0].clienteNombre ? boletas[0].clienteNombre : (cliente.razonSocial || cliente.id || 'N/A')}</p>
          <p style="margin: 5px 0; color: #4a4a4a;"><strong style="color: #1a1a1a;">Generado el:</strong> ${new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1a1a1a; margin-bottom: 15px; font-size: 18px; font-weight: bold;">RESUMEN DE TOTALES</h2>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #c53030; font-weight: 600;"><strong style="color: #1a1a1a;">Total Adeudado:</strong> ${formatMonto(totales.totalAdeudado)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #22543d; font-weight: 600;"><strong style="color: #1a1a1a;">Total Pagado:</strong> ${formatMonto(totales.totalPagado)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #1a1a1a; font-weight: 600;"><strong style="color: #1a1a1a;">Total General:</strong> ${formatMonto(totales.totalGeneral)}</span>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 15px; font-size: 18px; font-weight: bold;">DETALLE DE BOLETAS</h2>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; font-size: 11px;">
            <thead>
              <tr style="background-color: #2d3748; color: #ffffff;">
                <th style="padding: 8px 6px; text-align: left; border: 1px solid #ddd; font-size: 10px; color: #ffffff; font-weight: bold;">Número</th>
                <th style="padding: 8px 6px; text-align: left; border: 1px solid #ddd; font-size: 10px; color: #ffffff; font-weight: bold;">Fecha Emisión</th>
                <th style="padding: 8px 6px; text-align: left; border: 1px solid #ddd; font-size: 10px; color: #ffffff; font-weight: bold;">Fecha Vencimiento</th>
                <th style="padding: 8px 6px; text-align: right; border: 1px solid #ddd; font-size: 10px; color: #ffffff; font-weight: bold;">Monto Total</th>
                <th style="padding: 8px 6px; text-align: right; border: 1px solid #ddd; font-size: 10px; color: #ffffff; font-weight: bold;">Monto Pagado</th>
                <th style="padding: 8px 6px; text-align: right; border: 1px solid #ddd; font-size: 10px; color: #ffffff; font-weight: bold;">Monto Adeudado</th>
                <th style="padding: 8px 6px; text-align: center; border: 1px solid #ddd; font-size: 10px; color: #ffffff; font-weight: bold;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${boletas.map(boleta => {
                const estadoColor = boleta.estado === 'PAGADO' ? '#22543d' : (boleta.estado === 'PENDIENTE' ? '#c53030' : '#1a1a1a');
                return `
                <tr style="background-color: ${boletas.indexOf(boleta) % 2 === 0 ? '#f8f9fa' : '#ffffff'};">
                  <td style="padding: 8px 6px; border: 1px solid #ddd; font-size: 10px; color: #1a1a1a;">${boleta.numero || 'N/A'}</td>
                  <td style="padding: 8px 6px; border: 1px solid #ddd; font-size: 10px; color: #1a1a1a;">${formatFecha(boleta.fechaEmision)}</td>
                  <td style="padding: 8px 6px; border: 1px solid #ddd; font-size: 10px; color: #1a1a1a;">${formatFecha(boleta.fechaVencimiento)}</td>
                  <td style="padding: 8px 6px; border: 1px solid #ddd; font-size: 10px; text-align: right; color: #1a1a1a;">${formatMonto(boleta.montoTotal || 0)}</td>
                  <td style="padding: 8px 6px; border: 1px solid #ddd; font-size: 10px; text-align: right; color: #1a1a1a;">${formatMonto(boleta.montoPagado || 0)}</td>
                  <td style="padding: 8px 6px; border: 1px solid #ddd; font-size: 10px; text-align: right; color: #1a1a1a;">${formatMonto((boleta.montoTotal || 0) - (boleta.montoPagado || 0))}</td>
                  <td style="padding: 8px 6px; border: 1px solid #ddd; font-size: 10px; text-align: center; color: ${estadoColor}; font-weight: 600;">${boleta.estado || 'N/A'}</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
      
      // Agregar el contenedor al DOM
      document.body.appendChild(pdfContainer);
      
      // Capturar la imagen
      html2canvas(pdfContainer, {
        scale: 1.5, // Reducir escala para mejor ajuste
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794, // Ancho fijo para A4
        height: pdfContainer.scrollHeight
      }).then(canvas => {
        // Remover el contenedor temporal
        document.body.removeChild(pdfContainer);
        
                 // Convertir a PDF usando jsPDF
         const imgData = canvas.toDataURL('image/png');
         const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        
                 // Guardar el PDF
         const clienteNombre = boletas.length > 0 && boletas[0].clienteNombre ? boletas[0].clienteNombre : (cliente.razonSocial || cliente.id || 'Cliente');
         const fechaArgentina = new Date(new Date().getTime() + (3 * 60 * 60 * 1000));
         const fileName = `estado_cuenta_${clienteNombre.replace(/[^a-zA-Z0-9]/g, '_')}_${fechaArgentina.toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        
        toast.current.show({
          severity: 'success',
          summary: 'PDF Exportado',
          detail: 'Estado de cuenta exportado correctamente'
        });
      });
      
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo exportar el PDF'
      });
    }
  };

  if (loadingClientes) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <ProgressSpinner />
        <p>Cargando clientes...</p>
      </div>
    );
  }

  return (
    <div className="estado-cuenta-container">
      <Toast ref={toast} />

      <Card className="estado-cuenta-card">
        {/* Header */}
        <div className="estado-cuenta-header">
          <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center flex-wrap gap-3">
            <div style={{ flex: "1", minWidth: "0" }}>
              <h1>Estado de Cuenta</h1>
              {cliente ? (
                <div>
                  <p className="estado-cuenta-subtitle">
                  Cliente: <strong>{cliente.name || cliente.nombre || cliente['Razón Social'] || cliente.id}</strong>
                </p>
                  {ultimaActualizacion && (
                    <p className="estado-cuenta-update-time">
                      {calcularTiempoRelativo(ultimaActualizacion)}
                    </p>
                  )}
                  {!cacheExists && (
                    <p className="estado-cuenta-warning">
                      ⚠️ Sin datos en caché. Presiona "Actualizar ahora" para cargar.
                    </p>
                  )}
                </div>
              ) : (
                <p className="estado-cuenta-subtitle">
                  Selecciona un cliente para ver su estado de cuenta
                </p>
              )}
            </div>
            <div className="estado-cuenta-header-buttons">
              <Button
                label="Volver"
                icon="pi pi-arrow-left"
                className="p-button-outlined"
                onClick={() => navigate('/dashboard')}
              />
              {cliente && (
                <>
                  <Button
                    label={refreshingCache ? "Actualizando..." : "Actualizar ahora"}
                    icon={refreshingCache ? "pi pi-spin pi-spinner" : "pi pi-refresh"}
                    className="p-button-outlined"
                    onClick={actualizarDesdeAlegra}
                    disabled={refreshingCache}
                  />
                  <Button
                    label="Exportar PDF"
                    icon="pi pi-file-pdf"
                    className="p-button-outlined"
                    onClick={exportarPDF}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Selector de Cliente */}
        <div className="estado-cuenta-selector">
          <div className="p-field">
            <label className="p-block p-mb-2">
              Seleccionar Cliente
            </label>
            <Dropdown
              value={cliente}
              options={clientes}
              onChange={(e) => handleClienteChange(e.value)}
              optionLabel="name"
              placeholder="Selecciona un cliente"
              filter
              filterPlaceholder="Buscar cliente..."
              showClear
              className="p-fluid"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* Resumen de Totales - Solo mostrar si hay cliente seleccionado */}
        {cliente && (
          <div className="estado-cuenta-kpis">
            <Card className="estado-cuenta-kpi-card">
              <div className="estado-cuenta-kpi-content">
                <i className="pi pi-exclamation-triangle estado-cuenta-kpi-icon" style={{ color: 'var(--dcg-error)' }}></i>
                <div className="estado-cuenta-kpi-value adeudado">
                  {formatMonto(totales.totalAdeudado)}
              </div>
                <div className="estado-cuenta-kpi-label">Total Adeudado</div>
          </div>
            </Card>
            <Card className="estado-cuenta-kpi-card">
              <div className="estado-cuenta-kpi-content">
                <i className="pi pi-check-circle estado-cuenta-kpi-icon" style={{ color: 'var(--dcg-success)' }}></i>
                <div className="estado-cuenta-kpi-value pagado">
                  {formatMonto(totales.totalPagado)}
              </div>
                <div className="estado-cuenta-kpi-label">Total Pagado</div>
          </div>
            </Card>
            <Card className="estado-cuenta-kpi-card">
              <div className="estado-cuenta-kpi-content">
                <i className="pi pi-dollar estado-cuenta-kpi-icon" style={{ color: 'var(--dcg-text-primary)' }}></i>
                <div className="estado-cuenta-kpi-value general">
                  {formatMonto(totales.totalGeneral)}
                </div>
                <div className="estado-cuenta-kpi-label">Total General</div>
              </div>
            </Card>
        </div>
        )}

        {/* Tabla de Boletas con filas expandibles para pagos - Solo mostrar si hay cliente seleccionado */}
        {cliente && (
          <div className="estado-cuenta-tabla-container">
            <h3 className="estado-cuenta-tabla-title">
              Detalle de Boletas
            </h3>
            {loading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <ProgressSpinner />
                <p style={{ marginTop: "1rem" }}>
                  Cargando estado de cuenta...
                </p>
              </div>
            ) : (
              <>
                {/* Vista Desktop - DataTable */}
                <div className="vista-desktop estado-cuenta-table">
                  <DataTable
                   value={boletas}
                   paginator
                   rows={10}
                   emptyMessage="No hay boletas para mostrar."
                   className="p-datatable-sm"
                  rowExpansionTemplate={(rowData) => (
                <div className="estado-cuenta-expanded-details">
                  {/* Sección de Pagos */}
                  <div style={{ marginBottom: expandedProductos[rowData.numero] ? 20 : 0 }}>
                    <strong>Pagos asociados:</strong>
                    {rowData.pagos && rowData.pagos.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {rowData.pagos.map((pago, idx) => (
                          <li key={idx} style={{ marginBottom: 4 }}>
                            <span>Fecha: {formatFecha(pago.date)}</span> | <span>Monto: {formatMonto(pago.amount)}</span> {pago.notes ? `| Nota: ${pago.notes}` : ''}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ color: '#6b7280', marginLeft: 20 }}>
                        Sin pagos registrados para esta factura.
                      </div>
                    )}
                  </div>

                  {/* Sección de Productos */}
                  {expandedProductos[rowData.numero] && (
                    <div>
                      <strong>Productos:</strong>
                      {rowData.productos && rowData.productos.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {rowData.productos.map((producto, idx) => (
                            <li key={idx} style={{ marginBottom: 4 }}>
                              <span><strong>{producto.quantity || 1}x</strong> {producto.name || producto.description || 'Producto'}</span>
                              {producto.total && (
                                <span style={{ color: '#6b7280' }}> - {formatMonto(producto.total)}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ color: '#6b7280', marginLeft: 20 }}>
                          Sin productos registrados para esta factura.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              expandedRows={expandedRows}
              dataKey="numero"
            >
              <Column 
                expander 
                style={{ width: '5%' }}
                body={(rowData) => (
                  <div>
                    <span className="p-hidden md:inline">
                      <i className="pi pi-chevron-right" style={{ fontSize: '0.8rem' }}></i>
                    </span>
                    <div className="md:hidden">
                      <span style={{ fontWeight: "bold", display: "block", marginBottom: "0.25rem" }}>
                        Expandir:
                      </span>
                      <i className="pi pi-chevron-down" style={{ fontSize: '1rem', color: '#3b82f6' }}></i>
                    </div>
                  </div>
                )}
              />
              <Column 
                header="Productos" 
                body={(rowData) => (
                  <div>
                    <span className="p-hidden md:inline">
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleProductos(rowData.numero);
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#e5e7eb';
                          e.target.style.cursor = 'pointer';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                        }}
                        className="estado-cuenta-productos-button"
                        style={{
                          color: (!rowData.productos || rowData.productos.length === 0) ? 'var(--dcg-text-muted)' : 'var(--dcg-azul-claro)',
                          opacity: (!rowData.productos || rowData.productos.length === 0) ? 0.5 : 1,
                          cursor: (!rowData.productos || rowData.productos.length === 0) ? 'not-allowed' : 'pointer'
                        }}
                        title={expandedProductos[rowData.numero] ? "Ocultar productos" : "Ver productos"}
                      >
                        {expandedProductos[rowData.numero] ? "👁️‍🗨️" : "👁️"}
                      </span>
                    </span>
                    <div className="md:hidden">
                      <span style={{ fontWeight: "bold", display: "block", marginBottom: "0.25rem" }}>
                        Productos:
                      </span>
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleProductos(rowData.numero);
                        }}
                        className="estado-cuenta-productos-button"
                        style={{
                          color: (!rowData.productos || rowData.productos.length === 0) ? 'var(--dcg-text-muted)' : 'var(--dcg-azul-claro)',
                          opacity: (!rowData.productos || rowData.productos.length === 0) ? 0.5 : 1,
                          cursor: (!rowData.productos || rowData.productos.length === 0) ? 'not-allowed' : 'pointer',
                          padding: 'var(--spacing-2) var(--spacing-3)',
                          minWidth: '40px',
                          minHeight: '40px'
                        }}
                        title={expandedProductos[rowData.numero] ? "Ocultar productos" : "Ver productos"}
                      >
                        {expandedProductos[rowData.numero] ? "👁️‍🗨️" : "👁️"} {(!rowData.productos || rowData.productos.length === 0) ? "Sin productos" : "Ver productos"}
                      </span>
                    </div>
                  </div>
                )}
                style={{ 
                  width: "8%",
                  textAlign: "center"
                }}
              />
              <Column
                 field="numero"
                 header="Número"
                 body={cellWithLabelTemplate('numero', 'Número')}
                 style={{ 
                   width: "12%"
                 }}
               />
               <Column
                 field="clienteNombre"
                 header="Cliente"
                 body={cellWithLabelTemplate('clienteNombre', 'Cliente')}
                 style={{ 
                   width: "20%"
                 }}
               />
               <Column
                 field="fechaEmision"
                 header="Fecha Emisión"
                 body={fechaWithLabelTemplate('fechaEmision', 'Fecha Emisión')}
                 style={{ 
                   width: "15%"
                 }}
               />
               <Column
                 field="fechaVencimiento"
                 header="Fecha Vencimiento"
                 body={fechaWithLabelTemplate('fechaVencimiento', 'Fecha Vencimiento')}
                 style={{ 
                   width: "15%"
                 }}
               />
               <Column
                 field="montoTotal"
                 header="Monto Total"
                 body={montoWithLabelTemplate('montoTotal', 'Monto Total')}
                 style={{ 
                   width: "15%"
                 }}
               />
               <Column
                 field="montoPagado"
                 header="Monto Pagado"
                 body={montoWithLabelTemplate('montoPagado', 'Monto Pagado')}
                 style={{ 
                   width: "15%"
                 }}
               />
               <Column
                 field="montoAdeudado"
                 header="Monto Adeudado"
                 body={rowData => (
                   <div>
                     <span className="p-hidden md:inline">
                       {formatMonto((rowData.montoTotal || 0) - (rowData.montoPagado || 0))}
                     </span>
                     <div className="md:hidden">
                       <span style={{ fontWeight: "bold", display: "block", marginBottom: "0.25rem" }}>
                         Monto Adeudado:
                       </span>
                       <span>
                         {formatMonto((rowData.montoTotal || 0) - (rowData.montoPagado || 0))}
                       </span>
                     </div>
                   </div>
                 )}
                 style={{ 
                   width: "15%"
                 }}
               />
               <Column
                 field="estado"
                 header="Estado"
                 body={estadoTemplate}
                 style={{ 
                   width: "10%"
                 }}
               />
                  </DataTable>
                </div>

                {/* Vista Móvil - Cards personalizados */}
                <div className="vista-movil">
                  {boletas.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "2rem" }}>
                      No hay boletas para mostrar.
                    </div>
                  ) : (
                    <div>
                      {boletas.map((boleta, index) => (
                        <Card key={boleta.numero || index} className="mb-3" style={{ borderRadius: "12px" }}>
                          <div style={{ padding: "1rem" }}>
                            <div className="grid">
                              <div className="col-12">
                                <div style={{ 
                                  display: "flex", 
                                  justifyContent: "space-between", 
                                  alignItems: "center",
                                  marginBottom: "0.75rem"
                                }}>
                                  <h4 style={{ margin: 0 }}>
                                    Factura #{boleta.numero}
                                  </h4>
                                  <Tag
                                    value={boleta.estado}
                                    severity={boleta.estado === "PAGADO" ? "success" : boleta.estado === "PENDIENTE" ? "warning" : "danger"}
                                    style={{
                                      borderRadius: "15px",
                                      fontSize: "0.75rem",
                                      fontWeight: "500"
                                    }}
                                  />
                                </div>
                              </div>
                              
                              <div className="col-12">
                                <div style={{ marginBottom: "0.5rem" }}>
                                  <span style={{ fontWeight: "bold" }}>Cliente:</span>
                                  <span style={{ marginLeft: "0.5rem" }}>
                                    {boleta.clienteNombre}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="col-6">
                                <div style={{ marginBottom: "0.5rem" }}>
                                  <span style={{ fontWeight: "bold" }}>Emisión:</span>
                                  <div>
                                    {formatFecha(boleta.fechaEmision)}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="col-6">
                                <div style={{ marginBottom: "0.5rem" }}>
                                  <span style={{ fontWeight: "bold" }}>Vencimiento:</span>
                                  <div>
                                    {formatFecha(boleta.fechaVencimiento)}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="col-12">
                                <div style={{ marginBottom: "0.5rem" }}>
                                  <span style={{ fontWeight: "bold" }}>Monto Total:</span>
                                  <span style={{ 
                                    marginLeft: "0.5rem", 
                                    fontWeight: "600",
                                    fontSize: "1.1rem"
                                  }}>
                                    {formatMonto(boleta.montoTotal)}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="col-6">
                                <div style={{ marginBottom: "0.5rem" }}>
                                  <span style={{ fontWeight: "bold" }}>Pagado:</span>
                                  <div style={{ color: "var(--dcg-success)", fontWeight: "600" }}>
                                    {formatMonto(boleta.montoPagado)}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="col-6">
                                <div style={{ marginBottom: "0.5rem" }}>
                                  <span style={{ fontWeight: "bold" }}>Adeudado:</span>
                                  <div style={{ color: "var(--dcg-error)", fontWeight: "600" }}>
                                    {formatMonto((boleta.montoTotal || 0) - (boleta.montoPagado || 0))}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Botones de acción */}
                              <div className="col-12">
                                <div style={{ 
                                  display: "flex", 
                                  gap: "0.5rem", 
                                  marginTop: "0.75rem",
                                  flexWrap: "wrap"
                                }}>
                                  <Button
                                    icon="pi pi-eye"
                                    className="p-button-sm p-button-outlined"
                                    onClick={() => {
                                      const newExpanded = { ...expandedRows };
                                      newExpanded[boleta.numero] = !newExpanded[boleta.numero];
                                      setExpandedRows(newExpanded);
                                    }}
                                    label={expandedRows[boleta.numero] ? "Ocultar detalles" : "Ver detalles"}
                                  />
                                  
                                  {(boleta.productos && boleta.productos.length > 0) && (
                                    <Button
                                      icon={expandedProductos[boleta.numero] ? "pi pi-eye-slash" : "pi pi-eye"}
                                      className="p-button-sm p-button-outlined"
                                      onClick={() => toggleProductos(boleta.numero)}
                                      label={expandedProductos[boleta.numero] ? "Ocultar productos" : "Ver productos"}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Detalles expandibles */}
                            {expandedRows[boleta.numero] && (
                              <div className="estado-cuenta-expanded-details">
                                <strong>Pagos asociados:</strong>
                                {boleta.pagos && boleta.pagos.length > 0 ? (
                                  <ul style={{ margin: "0.5rem 0 0 1rem", padding: 0 }}>
                                    {boleta.pagos.map((pago, idx) => (
                                      <li key={idx} style={{ marginBottom: "0.25rem" }}>
                                        <span>Fecha: {formatFecha(pago.date)}</span> | 
                                        <span> Monto: {formatMonto(pago.amount)}</span>
                                        {pago.notes && <span> | Nota: {pago.notes}</span>}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div style={{ marginTop: "0.5rem" }}>
                                    Sin pagos registrados para esta factura.
                                  </div>
                                )}
                                
                                {expandedProductos[boleta.numero] && (
                                  <div style={{ marginTop: "1rem" }}>
                                    <strong>Productos:</strong>
                                    {boleta.productos && boleta.productos.length > 0 ? (
                                      <ul style={{ margin: "0.5rem 0 0 1rem", padding: 0 }}>
                                        {boleta.productos.map((producto, idx) => (
                                          <li key={idx} style={{ marginBottom: "0.25rem" }}>
                                            <span><strong>{producto.quantity || 1}x</strong> {producto.name || producto.description || 'Producto'}</span>
                                            {producto.total && (
                                              <span style={{ color: '#6b7280' }}> - {formatMonto(producto.total)}</span>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <div style={{ marginTop: "0.5rem" }}>
                                        Sin productos registrados para esta factura.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

export default EstadoCuenta; 

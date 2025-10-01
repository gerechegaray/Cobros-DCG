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

  const cargarEstadoCuenta = async (clienteData) => {
    setLoading(true);
    try {
      // Obtener datos reales de Alegra
      const datosAlegra = await getEstadoCuenta(clienteData.id);
      
      if (datosAlegra && datosAlegra.length > 0) {
        setBoletas(datosAlegra);
        
        // Calcular totales
        const totalAdeudado = datosAlegra.reduce((sum, b) => sum + ((b.montoTotal || 0) - (b.montoPagado || 0)), 0);
        const totalPagado = datosAlegra.reduce((sum, b) => sum + (b.montoPagado || 0), 0);
        const totalGeneral = datosAlegra.reduce((sum, b) => sum + (b.montoTotal || 0), 0);
        
        setTotales({
          totalAdeudado,
          totalPagado,
          totalGeneral
        });
        
        // 🆕 Mostrar información sobre facturas excluidas
        toast.current.show({
          severity: 'info',
          summary: 'Estado de cuenta cargado',
          detail: `Se muestran ${datosAlegra.length} facturas válidas.`
        });
      } else {
        // Si no hay datos, mostrar tabla vacía
        setBoletas([]);
        setTotales({
          totalAdeudado: 0,
          totalPagado: 0,
          totalGeneral: 0
        });
        
        toast.current.show({
          severity: 'info',
          summary: 'Sin datos',
          detail: 'No se encontraron movimientos válidos para este cliente'
        });
      }

    } catch (error) {
      console.error('Error al cargar estado de cuenta:', error);
      
      // En caso de error, mostrar tabla vacía
      setBoletas([]);
      setTotales({
        totalAdeudado: 0,
        totalPagado: 0,
        totalGeneral: 0
      });

      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo conectar con Alegra'
      });
    } finally {
      setLoading(false);
    }
  };

  const actualizarDesdeAlegra = async () => {
    setUpdating(true);
    try {
      // Llamar a la API de Alegra para obtener datos actualizados
      await cargarEstadoCuenta(cliente);
      
      toast.current.show({
        severity: 'success',
        summary: 'Actualizado',
        detail: 'Estado de cuenta actualizado desde Alegra'
      });

    } catch (error) {
      console.error('Error al actualizar desde Alegra:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar desde Alegra'
      });
    } finally {
      setUpdating(false);
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
      <Tag
        value={rowData.estado}
        severity={getSeverity(rowData.estado)}
        style={{
          borderRadius: "15px",
          fontSize: "0.75rem",
          fontWeight: "500"
        }}
      />
    );
  };

  const montoTemplate = (field) => (rowData) => (
    <span style={{ fontWeight: "600", color: "#1f2937" }}>
      {formatMonto(rowData[field])}
    </span>
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
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.top = '0';
      pdfContainer.style.width = '794px'; // A4 width in pixels (210mm * 3.78)
      pdfContainer.style.backgroundColor = 'white';
      pdfContainer.style.padding = '20px 30px'; // Márgenes más conservadores
      pdfContainer.style.fontFamily = 'Arial, sans-serif';
      pdfContainer.style.fontSize = '12px';
      pdfContainer.style.lineHeight = '1.4';
      
      // Crear el contenido del PDF
      pdfContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin: 0; font-size: 24px;">ESTADO DE CUENTA</h1>
        </div>
        
                 <div style="margin-bottom: 20px;">
           <p style="margin: 5px 0;"><strong>Cliente:</strong> ${boletas.length > 0 && boletas[0].clienteNombre ? boletas[0].clienteNombre : (cliente.razonSocial || cliente.id || 'N/A')}</p>
           <p style="margin: 5px 0; color: #7f8c8d;"><strong>Generado el:</strong> ${new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</p>
         </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #2c3e50; margin-bottom: 15px;">RESUMEN DE TOTALES</h2>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #e74c3c;"><strong>Total Adeudado:</strong> ${formatMonto(totales.totalAdeudado)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #27ae60;"><strong>Total Pagado:</strong> ${formatMonto(totales.totalPagado)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #2c3e50;"><strong>Total General:</strong> ${formatMonto(totales.totalGeneral)}</span>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h2 style="color: #2c3e50; margin-bottom: 15px;">DETALLE DE BOLETAS</h2>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; font-size: 11px;">
            <thead>
              <tr style="background-color: #34495e; color: white;">
                <th style="padding: 8px 6px; text-align: left; border: 1px solid #ddd; font-size: 10px;">Número</th>
                <th style="padding: 8px 6px; text-align: left; border: 1px solid #ddd; font-size: 10px;">Fecha Emisión</th>
                <th style="padding: 8px 6px; text-align: left; border: 1px solid #ddd; font-size: 10px;">Fecha Vencimiento</th>
                <th style="padding: 8px 6px; text-align: right; border: 1px solid #ddd; font-size: 10px;">Monto Total</th>
                <th style="padding: 8px 6px; text-align: right; border: 1px solid #ddd; font-size: 10px;">Monto Pagado</th>
                <th style="padding: 8px 6px; text-align: right; border: 1px solid #ddd; font-size: 10px;">Monto Adeudado</th>
                <th style="padding: 8px 6px; text-align: center; border: 1px solid #ddd; font-size: 10px;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${boletas.map(boleta => `
                <tr style="background-color: ${boletas.indexOf(boleta) % 2 === 0 ? '#f8f9fa' : 'white'};">
                  <td style="padding: 8px 6px; border: 1px solid #ddd; font-size: 10px;">${boleta.numero || 'N/A'}</td>
                  <td style="padding: 8px 6px; border: 1px solid #ddd; font-size: 10px;">${formatFecha(boleta.fechaEmision)}</td>
                  <td style="padding: 8px 6px; border: 1px solid #ddd; font-size: 10px;">${formatFecha(boleta.fechaVencimiento)}</td>
                  <td style="padding: 8px 6px; border: 1px solid #ddd; font-size: 10px; text-align: right;">${formatMonto(boleta.montoTotal || 0)}</td>
                  <td style="padding: 8px 6px; border: 1px solid #ddd; font-size: 10px; text-align: right;">${formatMonto(boleta.montoPagado || 0)}</td>
                  <td style="padding: 8px 6px; border: 1px solid #ddd; font-size: 10px; text-align: right;">${formatMonto((boleta.montoTotal || 0) - (boleta.montoPagado || 0))}</td>
                  <td style="padding: 8px 6px; border: 1px solid #ddd; font-size: 10px; text-align: center;">${boleta.estado || 'N/A'}</td>
                </tr>
              `).join('')}
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
    <div
      style={{
        maxWidth: "100%",
        margin: "0 auto",
        padding: "1rem",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        minHeight: "100vh"
      }}
    >
      <Toast ref={toast} />

      <Card
        style={{
          borderRadius: "16px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "2rem",
            color: "white",
            margin: "-1.5rem -1.5rem 2rem -1.5rem",
          }}
        >
          <div className="flex justify-content-between align-items-center flex-wrap gap-3">
            <div style={{ flex: "1", minWidth: "0" }}>
              <h1
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "1.875rem",
                  fontWeight: "700",
                  letterSpacing: "-0.025em"
                }}
              >
                Estado de Cuenta
              </h1>
              {cliente ? (
                <p
                  style={{
                    margin: "0",
                    fontSize: "1rem",
                    opacity: "0.9",
                    fontWeight: "400"
                  }}
                >
                  Cliente: <strong>{cliente.name || cliente.nombre || cliente['Razón Social'] || cliente.id}</strong>
                </p>
              ) : (
                <p
                  style={{
                    margin: "0",
                    fontSize: "1rem",
                    opacity: "0.9",
                    fontWeight: "400"
                  }}
                >
                  Selecciona un cliente para ver su estado de cuenta
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                label="Volver"
                icon="pi pi-arrow-left"
                className="p-button-outlined"
                onClick={() => navigate('/dashboard')}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                  color: "white",
                  borderRadius: "12px",
                  padding: "0.75rem 1.5rem",
                  fontWeight: "600",
                  backdropFilter: "blur(10px)"
                }}
              />
              {cliente && (
                <>
                  <Button
                    label={updating ? "Actualizando..." : "Actualizar"}
                    icon={updating ? "pi pi-spin pi-spinner" : "pi pi-refresh"}
                    className="p-button-outlined"
                    onClick={actualizarDesdeAlegra}
                    disabled={updating}
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "2px solid rgba(255, 255, 255, 0.3)",
                      color: "white",
                      borderRadius: "12px",
                      padding: "0.75rem 1.5rem",
                      fontWeight: "600",
                      backdropFilter: "blur(10px)"
                    }}
                  />
                  <Button
                    label="Exportar PDF"
                    icon="pi pi-file-pdf"
                    className="p-button-outlined"
                    onClick={exportarPDF}
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "2px solid rgba(255, 255, 255, 0.3)",
                      color: "white",
                      borderRadius: "12px",
                      padding: "0.75rem 1.5rem",
                      fontWeight: "600",
                      backdropFilter: "blur(10px)"
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Selector de Cliente */}
        <div className="p-mb-4">
          <div className="p-field">
            <label className="p-block p-mb-2" style={{ fontWeight: "500", color: "#374151" }}>
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
          <div className="grid mb-4">
          <div className="col-12 md:col-4">
            <Card className="p-mb-2">
              <div className="text-center">
                <h3 style={{ 
                  color: "#dc2626", 
                  margin: "0 0 0.5rem 0"
                }}>
                  {formatMonto(totales.totalAdeudado)}
                </h3>
                <p style={{ 
                  margin: "0", 
                  color: "#6b7280", 
                  fontWeight: "500",
                }}>
                  Total Adeudado
                </p>
              </div>
            </Card>
          </div>
          <div className="col-12 md:col-4">
            <Card className="p-mb-2">
              <div className="text-center">
                <h3 style={{ 
                  color: "#059669", 
                  margin: "0 0 0.5rem 0"
                }}>
                  {formatMonto(totales.totalPagado)}
                </h3>
                <p style={{ 
                  margin: "0", 
                  color: "#6b7280", 
                  fontWeight: "500",
                }}>
                  Total Pagado
                </p>
              </div>
            </Card>
          </div>
          <div className="col-12 md:col-4">
            <Card className="p-mb-2">
              <div className="text-center">
                <h3 style={{ 
                  color: "#1f2937", 
                  margin: "0 0 0.5rem 0"
                }}>
                  {formatMonto(totales.totalGeneral)}
                </h3>
                <p style={{ 
                  margin: "0", 
                  color: "#6b7280", 
                  fontWeight: "500",
                }}>
                  Total General
                </p>
              </div>
            </Card>
          </div>
        </div>
        )}

        {/* Tabla de Boletas con filas expandibles para pagos - Solo mostrar si hay cliente seleccionado */}
        {cliente && (
          <div style={{ 
            padding: "0 0.5rem"
          }}>
            <h3 style={{ 
              color: "#374151", 
              marginBottom: "1rem"
            }}>
              Detalle de Boletas
            </h3>
            {loading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <ProgressSpinner />
                <p style={{ marginTop: "1rem", color: "#6b7280" }}>
                  Cargando estado de cuenta...
                </p>
              </div>
            ) : (
              <DataTable
               value={boletas}
               paginator
               rows={10}
               responsiveLayout="stack"
               emptyMessage="No hay boletas para mostrar."
               className="p-datatable-sm"
               style={{
                 borderRadius: "12px",
                 overflow: "hidden",
                 boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
               }}
              rowExpansionTemplate={(rowData) => (
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
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
              <Column expander style={{ width: '3em' }} />
              <Column 
                header="Productos" 
                body={(rowData) => (
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
                    style={{
                      display: 'inline-block',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      color: (!rowData.productos || rowData.productos.length === 0) ? '#9ca3af' : '#3b82f6',
                      backgroundColor: 'transparent',
                      border: '1px solid #d1d5db',
                      minWidth: '40px',
                      minHeight: '40px',
                      textAlign: 'center',
                      lineHeight: '24px',
                      opacity: (!rowData.productos || rowData.productos.length === 0) ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                      userSelect: 'none'
                    }}
                    title={expandedProductos[rowData.numero] ? "Ocultar productos" : "Ver productos"}
                  >
                    {expandedProductos[rowData.numero] ? "👁️‍🗨️" : "👁️"}
                  </span>
                )}
                style={{ 
                  minWidth: "100px",
                  textAlign: "center"
                }}
              />
                             <Column
                 field="numero"
                 header="Número"
                 style={{ 
                   minWidth: "120px"
                 }}
               />
               <Column
                 field="clienteNombre"
                 header="Cliente"
                 style={{ 
                   minWidth: "150px"
                 }}
               />
               <Column
                 field="fechaEmision"
                 header="Fecha Emisión"
                 body={(row) => formatFecha(row.fechaEmision)}
                 style={{ 
                   minWidth: "110px"
                 }}
               />
               <Column
                 field="fechaVencimiento"
                 header="Fecha Vencimiento"
                 body={(row) => formatFecha(row.fechaVencimiento)}
                 style={{ 
                   minWidth: "110px"
                 }}
               />
               <Column
                 field="montoTotal"
                 header="Monto Total"
                 body={montoTemplate('montoTotal')}
                 style={{ 
                   minWidth: "110px"
                 }}
               />
               <Column
                 field="montoPagado"
                 header="Monto Pagado"
                 body={montoTemplate('montoPagado')}
                 style={{ 
                   minWidth: "110px"
                 }}
               />
               <Column
                 field="montoAdeudado"
                 header="Monto Adeudado"
                 body={rowData => formatMonto((rowData.montoTotal || 0) - (rowData.montoPagado || 0))}
                 style={{ 
                   minWidth: "110px"
                 }}
               />
               <Column
                 field="estado"
                 header="Estado"
                 body={estadoTemplate}
                 style={{ 
                   minWidth: "90px"
                 }}
               />
            </DataTable>
          )}
          </div>
        )}
      </Card>
    </div>
  );
}

export default EstadoCuenta; 

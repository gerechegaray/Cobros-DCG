import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "primereact/card";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { useRef } from "react";
import { ProgressSpinner } from "primereact/progressspinner";
import { getEstadoCuenta } from "../../services/alegra";

function EstadoCuenta({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useRef(null);
  
  const [cliente, setCliente] = useState(null);
  const [boletas, setBoletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [totales, setTotales] = useState({
    totalAdeudado: 0,
    totalPagado: 0,
    totalGeneral: 0
  });

  useEffect(() => {
    // Obtener cliente desde navegación
    if (location.state?.cliente) {
      setCliente(location.state.cliente);
      cargarEstadoCuenta(location.state.cliente);
    } else {
      // Si no hay cliente, redirigir
      navigate('/clientes');
    }
  }, [location.state, navigate]);

  const cargarEstadoCuenta = async (clienteData) => {
    setLoading(true);
    try {
      console.log('[ESTADO CUENTA FRONTEND] Cliente recibido:', clienteData);
      console.log('[ESTADO CUENTA FRONTEND] Cliente ID:', clienteData.id);
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
          detail: 'No se encontraron movimientos para este cliente en Alegra'
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
        detail: 'No se pudo conectar con Alegra. Verifica que el cliente exista y tenga movimientos.'
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
    return date.toLocaleDateString("es-AR");
  };

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(monto);
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

  if (!cliente) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <ProgressSpinner />
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "100%",
        margin: "0 auto",
        padding: "1.5rem",
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
            margin: "-1.5rem -1.5rem 2rem -1.5rem"
          }}
        >
          <div className="flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
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
              <p
                style={{
                  margin: "0",
                  fontSize: "1rem",
                  opacity: "0.9",
                  fontWeight: "400"
                }}
              >
                Cliente: <strong>{cliente.razonSocial || cliente.id}</strong>
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                label="Volver"
                icon="pi pi-arrow-left"
                className="p-button-outlined"
                onClick={() => navigate('/clientes')}
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
            </div>
          </div>
        </div>

        {/* Resumen de Totales */}
        <div className="grid mb-4">
          <div className="col-12 md:col-4">
            <Card className="p-mb-2">
              <div className="text-center">
                <h3 style={{ color: "#dc2626", margin: "0 0 0.5rem 0" }}>
                  {formatMonto(totales.totalAdeudado)}
                </h3>
                <p style={{ margin: "0", color: "#6b7280", fontWeight: "500" }}>
                  Total Adeudado
                </p>
              </div>
            </Card>
          </div>
          <div className="col-12 md:col-4">
            <Card className="p-mb-2">
              <div className="text-center">
                <h3 style={{ color: "#059669", margin: "0 0 0.5rem 0" }}>
                  {formatMonto(totales.totalPagado)}
                </h3>
                <p style={{ margin: "0", color: "#6b7280", fontWeight: "500" }}>
                  Total Pagado
                </p>
              </div>
            </Card>
          </div>
          <div className="col-12 md:col-4">
            <Card className="p-mb-2">
              <div className="text-center">
                <h3 style={{ color: "#1f2937", margin: "0 0 0.5rem 0" }}>
                  {formatMonto(totales.totalGeneral)}
                </h3>
                <p style={{ margin: "0", color: "#6b7280", fontWeight: "500" }}>
                  Total General
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Tabla de Boletas con filas expandibles para pagos */}
        <div style={{ padding: "0 0.5rem" }}>
          <h3 style={{ color: "#374151", marginBottom: "1rem" }}>
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
              rowExpansionTemplate={(rowData) =>
                rowData.pagos && rowData.pagos.length > 0 ? (
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
                    <strong>Pagos asociados:</strong>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {rowData.pagos.map((pago, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>
                          <span>Fecha: {formatFecha(pago.date)}</span> | <span>Monto: {formatMonto(pago.amount)}</span> {pago.notes ? `| Nota: ${pago.notes}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, color: '#6b7280' }}>
                    Sin pagos registrados para esta factura.
                  </div>
                )
              }
              expandedRows={boletas.reduce((acc, b) => {
                if (b.pagos && b.pagos.length > 0) acc[b.numero] = true;
                return acc;
              }, {})}
              dataKey="numero"
            >
              <Column expander style={{ width: '3em' }} />
              <Column
                field="numero"
                header="Número"
                style={{ minWidth: "120px" }}
              />
              <Column
                field="clienteNombre"
                header="Cliente"
                style={{ minWidth: "150px" }}
              />
              <Column
                field="fechaEmision"
                header="Fecha Emisión"
                body={(row) => formatFecha(row.fechaEmision)}
                style={{ minWidth: "110px" }}
              />
              <Column
                field="fechaVencimiento"
                header="Fecha Vencimiento"
                body={(row) => formatFecha(row.fechaVencimiento)}
                style={{ minWidth: "110px" }}
              />
              <Column
                field="montoTotal"
                header="Monto Total"
                body={montoTemplate('montoTotal')}
                style={{ minWidth: "110px" }}
              />
              <Column
                field="montoPagado"
                header="Monto Pagado"
                body={montoTemplate('montoPagado')}
                style={{ minWidth: "110px" }}
              />
              <Column
                field="montoAdeudado"
                header="Monto Adeudado"
                body={rowData => formatMonto((rowData.montoTotal || 0) - (rowData.montoPagado || 0))}
                style={{ minWidth: "110px" }}
              />
              <Column
                field="estado"
                header="Estado"
                body={estadoTemplate}
                style={{ minWidth: "90px" }}
              />
            </DataTable>
          )}
        </div>
      </Card>
    </div>
  );
}

export default EstadoCuenta; 
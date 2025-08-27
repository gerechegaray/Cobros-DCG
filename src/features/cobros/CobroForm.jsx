import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Toast } from "primereact/toast";
import { useRef } from "react";
import { ProgressSpinner } from "primereact/progressspinner";
import { InputTextarea } from "primereact/inputtextarea";
import { getClientesCatalogo, limpiarCacheClientes } from '../../services/firebase';
import { api } from '../../services/api';

function CobroForm({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const clienteNavegacion = location.state?.cliente || null;

  // 🆕 Removido redirección automática - permitir acceso directo al formulario
  // useEffect(() => {
  //   if (!clienteNavegacion) {
  //     navigate('/clientes');
  //   }
  // }, [clienteNavegacion, navigate]);

  const [fecha, setFecha] = useState(null);
  const [cliente, setCliente] = useState(clienteNavegacion || "");
  const [monto, setMonto] = useState("");
  const [cobrador, setCobrador] = useState(user.role === "Santi" || user.role === "Guille" ? user.role : "");
  const [forma, setForma] = useState("");
  const [nota, setNota] = useState("");
  const [cargado, setCargado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const toast = useRef(null);
  const [loadingClientes, setLoadingClientes] = useState(true);

  const formasDeCobro = [
    { label: "Efectivo", value: "Efectivo" },
    { label: "Transferencia Santander DCG", value: "Transferencia Santander DCG" },
    { label: "Transferencia Galicia DCG", value: "Transferencia Galicia DCG" },
    { label: "Transferencia Santander ROE", value: "Transferencia Santander ROE" },
    { label: "Mercado Pago", value: "Mercado Pago" },
    { label: "Alleata/Getnet", value: "Alleata/Getnet" },
    { label: "Cheque", value: "Cheque" },
    { label: "Otro", value: "Otro" },
  ];

  const cobradores = [
    { label: "Santi", value: "Santi" },
    { label: "Guille", value: "Guille" }
  ];

  const showToast = (severity, summary, detail) => {
    toast.current.show({ severity, summary, detail });
  };

  // Obtener el sellerId según el rol del usuario
  const getSellerId = () => {
    if (user?.role === 'Guille') return 1;
    if (user?.role === 'Santi') return 2;
    if (user?.role === 'admin') return null; // Admin ve todos
    return null;
  };

  useEffect(() => {
    async function fetchClientes() {
      try {
        const data = await getClientesCatalogo();
        
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
        
        const options = clientesFiltrados
          .slice()
          .sort((a, b) => ((a.name || a.nombre || a['Razón Social'] || '').localeCompare(b.name || b.nombre || b['Razón Social'] || '')))
          .map((c) => ({ 
            label: c.name || c.nombre || c['Razón Social'] || c.id || '(Sin nombre)', 
            value: c.name || c.nombre || c['Razón Social'] || c.id 
          }));
        setClientes(options);
        
        // 🆕 Si hay un cliente de navegación, seleccionarlo automáticamente
        if (clienteNavegacion && options.length > 0) {
          const clienteEncontrado = options.find(option => 
            option.value === clienteNavegacion || 
            option.label === clienteNavegacion
          );
          if (clienteEncontrado) {
            setCliente(clienteEncontrado.value);
          }
        }
      } catch (error) {
        console.error('Error al obtener clientes de Firestore:', error);
      } finally {
        setLoadingClientes(false);
      }
    }
    fetchClientes();
  }, [user, clienteNavegacion]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!fecha || !cliente || !monto || !cobrador || !forma) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor completa todos los campos obligatorios'
      });
      return;
    }

    setLoading(true);
    try {
      // 🆕 Determinar vendedorId automáticamente basándose en el rol del usuario
      let vendedorId = null;
      
      if (user.role === 'Santi') {
        vendedorId = 2;
      } else if (user.role === 'Guille') {
        vendedorId = 1;
      } else if (user.role === 'admin') {
        // Para admin, usar el cobrador seleccionado
        vendedorId = cobrador === 'Santi' ? 2 : 1;
      }
      
      console.log(`🆕 Usuario: ${user.role}, Cobrador: ${cobrador}, vendedorId: ${vendedorId}`);

      // 🆕 Formatear la fecha en formato dd/mm/aaaa antes de enviar
      const formatearFecha = (fecha) => {
        if (!fecha) return '';
        const dia = fecha.getDate().toString().padStart(2, '0');
        const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
        const año = fecha.getFullYear();
        return `${dia}/${mes}/${año}`;
      };

      const cobroData = {
        fecha: formatearFecha(fecha), // 🆕 Fecha formateada como string
        cliente,
        monto: parseFloat(monto),
        cobrador,
        forma,
        nota,
        cargado,
        usuario: user.email || user.name || user.role, // 🆕 Agregar usuario para el backend
        vendedorId: vendedorId // 🆕 Agregar vendedorId
        // 🆕 fechaCreacion se maneja en el backend
      };

      console.log('🆕 Enviando cobro al backend:', cobroData);
      
      // 🆕 Usar la API del backend en lugar de Firebase directamente
      const response = await api.createCobro(cobroData);
      
      console.log('🆕 Respuesta del backend:', response);
      
      setShowSuccess(true);
      setFecha(new Date());
      setCliente("");
      setCobrador(user.role === "Santi" || user.role === "Guille" ? user.role : "");
      setForma("");
      setNota("");
      setCargado(false);
      
      toast.current.show({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Cobro registrado correctamente'
      });
    } catch (error) {
      console.error("Error al guardar cobro:", error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al guardar el cobro'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-p-3 p-p-md-4 p-p-lg-5" style={{ maxWidth: "600px", margin: "0 auto" }}>
      <Toast ref={toast} />
      
      <Card className="p-fluid">
        <div className="p-text-center p-mb-4">
          <i className="pi pi-plus-circle p-text-4xl p-text-primary" style={{ marginBottom: "1rem" }}></i>
          <h2 className="p-m-0 p-text-xl p-text-md-2xl" style={{ color: "#1f2937" }}>Cargar Nuevo Cobro</h2>
          <p className="p-mt-2 p-mb-0 p-text-sm" style={{ color: "#6b7280" }}>
            Completa los datos del cobro realizado
          </p>
          {user.role === "cobrador" && (
            <div className="p-mt-3 p-p-2 p-surface-200 p-border-round p-text-sm" style={{ color: "#92400e" }}>
              <i className="pi pi-user p-mr-2"></i>
              Cargando como: <strong>{user.name}</strong>
            </div>
          )}
          {user.role === "admin" && (
            <div className="p-mt-3">
              <Button
                label="Limpiar Cache Clientes"
                icon="pi pi-refresh"
                className="p-button-sm p-button-outlined"
                onClick={() => {
                  limpiarCacheClientes();
                  window.location.reload();
                }}
                tooltip="Forzar recarga de clientes desde Firebase"
              />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-grid p-fluid">
            {/* Fecha */}
            <div className="p-col-12" style={{ marginBottom: '1.2rem' }}>
              <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                Fecha del Cobro *
              </label>
              <Calendar 
                value={fecha} 
                onChange={(e) => setFecha(e.value)} 
                dateFormat="dd/mm/yyyy" 
                showIcon 
                className="p-fluid"
                placeholder="Selecciona la fecha"
              />
            </div>

            {/* Cliente */}
            <div className="p-col-12" style={{ marginBottom: '1.2rem' }}>
              <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                Cliente *
              </label>
              {loadingClientes ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ProgressSpinner style={{ width: '1.5rem', height: '1.5rem' }} strokeWidth="4" />
                  <span>Cargando clientes...</span>
                </div>
              ) : (
                <Dropdown
                  value={cliente}
                  options={clientes}
                  onChange={e => setCliente(e.value)}
                  className="p-fluid"
                  placeholder="Selecciona un cliente"
                  filter
                />
              )}
            </div>

            {/* Monto */}
            <div className="p-col-12" style={{ marginBottom: '1.2rem' }}>
              <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                Monto *
              </label>
              <InputText 
                value={monto} 
                onChange={(e) => setMonto(e.target.value)} 
                keyfilter="money" 
                className="p-fluid"
                placeholder="0.00"
              />
            </div>

            {/* Cobrador - Solo visible para admin */}
            {user?.role === 'admin' && (
              <div className="field">
                <label htmlFor="cobrador" className="block text-900 font-medium mb-2">
                  Cobrador *
                </label>
                <Dropdown
                  id="cobrador"
                  value={cobrador}
                  options={cobradores}
                  onChange={(e) => setCobrador(e.value)}
                  placeholder="Selecciona el cobrador"
                  className="w-full"
                />
              </div>
            )}

            {/* Cobrador - Auto-asignado para vendedores */}
            {(user?.role === 'Santi' || user?.role === 'Guille') && (
              <div className="field">
                <label htmlFor="cobrador" className="block text-900 font-medium mb-2">
                  Cobrador
                </label>
                <InputText
                  id="cobrador"
                  value={cobrador}
                  disabled
                  className="w-full"
                />
              </div>
            )}

            {/* Forma de cobro */}
            <div className="p-col-12" style={{ marginBottom: '1.2rem' }}>
              <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                Forma de cobro *
              </label>
              <Dropdown 
                value={forma} 
                options={formasDeCobro} 
                onChange={(e) => setForma(e.value)} 
                placeholder="Selecciona la forma de cobro"
                className="p-fluid"
              />
            </div>

            {/* Notas adicionales */}
            <div className="p-col-12" style={{ marginBottom: '1.2rem' }}>
              <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                Notas adicionales <span style={{ color: "#6b7280", fontWeight: "400" }}>(opcional)</span>
              </label>
                             <InputTextarea
                 value={nota}
                 onChange={(e) => setNota(e.target.value)}
                 placeholder="Agrega cualquier información adicional sobre el cobro..."
                 className="p-fluid"
                 rows={3}
                 autoResize
               />
            </div>

            {/* Cargado en sistema - Solo visible para admin */}
            {user?.role === 'admin' && (
              <div className="p-col-12" style={{ marginBottom: '1.2rem' }}>
                <div className="p-d-flex p-ai-center p-gap-2">
                  <Checkbox 
                    checked={cargado} 
                    onChange={(e) => setCargado(e.checked)} 
                    inputId="cargado" 
                  />
                  <label htmlFor="cargado" className="p-text-sm" style={{ color: "#374151" }}>
                    ¿Cargado en el sistema?
                  </label>
                </div>
              </div>
            )}

            {/* Botón submit */}
            <div className="p-col-12" style={{ marginBottom: '1.2rem' }}>
              <Button 
                type="submit" 
                label={loading ? "Guardando..." : "Guardar Cobro"} 
                icon={loading ? "pi pi-spin pi-spinner" : "pi pi-save"}
                className="p-fluid"
                style={{ height: "3rem" }}
                disabled={loading}
              />
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default CobroForm;
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth, getClientesCatalogo } from "../../services/firebase";
import { collection, query, getDocs } from "firebase/firestore";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Badge } from "primereact/badge";
import { api } from "../../services/api";

function Alerts({ user, onNavigateToMyCobros }) {
  const navigate = useNavigate();
  const [pendingCobros, setPendingCobros] = useState([]);
  const [totalPending, setTotalPending] = useState(0);
  const [clientesCatalogo, setClientesCatalogo] = useState([]);
  const [catalogoCargado, setCatalogoCargado] = useState(false);
  
  // Nuevo estado para visitas pendientes del día
  const [visitasHoy, setVisitasHoy] = useState([]);
  const [totalVisitasHoy, setTotalVisitasHoy] = useState(0);

  useEffect(() => {
    async function fetchClientesCatalogo() {
      try {
        const data = await getClientesCatalogo();
        setClientesCatalogo(data);
        setCatalogoCargado(true);
      } catch (error) {
        console.error('Error al obtener clientes de Firestore:', error);
      }
    }
    fetchClientesCatalogo();
  }, []);

  const fetchCobranzas = async (force = false) => {
    let data = [];
    if (!force) {
      const cache = localStorage.getItem("cobranzas_alerts");
      if (cache) {
        data = JSON.parse(cache);
        // Filtrar cobros pendientes según el rol del usuario
        let filteredData = data.filter(cobro => !cobro.cargado);
        filteredData = getFilteredData(filteredData);
        setPendingCobros(filteredData);
        setTotalPending(filteredData.length);
        return;
      }
    }
    const q = query(collection(db, "cobranzas"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    localStorage.setItem("cobranzas_alerts", JSON.stringify(data));
    let filteredData = data.filter(cobro => !cobro.cargado);
    filteredData = getFilteredData(filteredData);
    setPendingCobros(filteredData);
    setTotalPending(filteredData.length);
  };

  useEffect(() => {
    fetchCobranzas();
  }, [user]);

  // Cargar visitas del día para vendedores
  useEffect(() => {
    const fetchVisitasHoy = async () => {
      if (user.role !== "Santi" && user.role !== "Guille") return;
      
      try {
        const sellerId = user.role === "Guille" ? 1 : 2;
        // 🆕 Usar endpoint con caché
        const visitas = await api.getVisitasCache(sellerId);
        
        const hoy = new Date().toISOString().split('T')[0];
        const visitasDelDia = visitas.filter(v => v.fecha === hoy && v.estado === 'pendiente');
        
        setVisitasHoy(visitasDelDia);
        setTotalVisitasHoy(visitasDelDia.length);
      } catch (error) {
        console.error('Error cargando visitas del día:', error);
        setVisitasHoy([]);
        setTotalVisitasHoy(0);
      }
    };
    
    fetchVisitasHoy();
  }, [user]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "";
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha.seconds * 1000);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Función para obtener razón social
  const getRazonSocial = (clienteId) => {
    if (catalogoCargado && clientesCatalogo.length > 0) {
      const cliente = clientesCatalogo.find(c => c.id === clienteId);
      return cliente ? cliente['Razón Social'] : clienteId;
    }
    return clienteId;
  };

  // Filtrar datos según el rol del usuario
  const getFilteredData = (data) => {
    if (user.role === "Santi" || user.role === "Guille") {
      return data.filter(cobro => cobro.cobrador === user.role);
    } else if (user.role === "admin") {
      return data;
    }
    return data;
  };

  if (totalPending === 0) {
    return (
      <Card style={{ marginBottom: "2rem", backgroundColor: "#f0fdf4", border: "1px solid #22c55e" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <i className="pi pi-check-circle" style={{ fontSize: "2rem", color: "#22c55e" }}></i>
          <div>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#166534" }}>
              ¡Todo al día!
            </h3>
            <p style={{ margin: 0, color: "#166534" }}>
              {user.role === "admin" 
                ? "Todos los cobros están cargados en el sistema." 
                : "Todos tus cobros están cargados en el sistema."
              }
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const totalMonto = pendingCobros.reduce((sum, cobro) => sum + (cobro.monto || 0), 0);

  return (
    <>
      {/* Alerta de cobros pendientes */}
      <Card style={{ marginBottom: "2rem", backgroundColor: "#fef2f2", border: "1px solid #ef4444" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <i className="pi pi-exclamation-triangle" style={{ fontSize: "2rem", color: "#ef4444" }}></i>
            <div>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "#991b1b" }}>
                Cobros Pendientes de Carga
              </h3>
              <p style={{ margin: 0, color: "#991b1b" }}>
                {user.role === "admin" 
                  ? `${totalPending} cobros sin cargar en el sistema` 
                  : `${totalPending} de tus cobros sin cargar en el sistema`
                }
              </p>
            </div>
          </div>
          <Badge value={totalPending} severity="danger" />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ fontWeight: "500" }}>Monto total pendiente:</span>
            <span style={{ fontWeight: "bold", color: "#ef4444" }}>{formatCurrency(totalMonto)}</span>
          </div>
        </div>

        {totalPending > 0 && (
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            <h4 style={{ margin: "0 0 1rem 0", color: "#991b1b" }}>
              Detalle de cobros pendientes:
            </h4>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {pendingCobros.slice(0, 5).map((cobro) => (
                <div 
                  key={cobro.id} 
                  style={{ 
                    padding: "0.75rem", 
                    backgroundColor: "white", 
                    borderRadius: "6px",
                    border: "1px solid #fecaca"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: "500", marginBottom: "0.25rem" }}>
                        {getRazonSocial(cobro.cliente)}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                        {formatFecha(cobro.fecha)} • {cobro.cobrador} • {cobro.forma}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: "bold", color: "#ef4444" }}>
                        {formatCurrency(cobro.monto)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {pendingCobros.length > 5 && (
                <div style={{ 
                  padding: "0.5rem", 
                  textAlign: "center", 
                  color: "#6b7280", 
                  fontSize: "0.875rem" 
                }}>
                  ... y {pendingCobros.length - 5} cobros más
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
          {user.role === "admin" ? (
            <Button 
              label="Ir a lista de cobranzas" 
              icon="pi pi-arrow-right" 
              className="p-button-danger"
              size="small"
              onClick={() => navigate("/list")}
            />
          ) : (
            <Button 
              label="Ver Mis Cobranzas" 
              icon="pi pi-list" 
              className="p-button-danger"
              size="small"
              onClick={() => navigate("/list")}
            />
          )}
          {/* 🆕 Botón actualizar solo para admin */}
          {user.role === "admin" && (
            <Button label="Actualizar" icon="pi pi-refresh" onClick={() => fetchCobranzas(true)} style={{ marginBottom: 16 }} />
          )}
        </div>
      </Card>

      {/* Alerta de visitas del día (solo para vendedores) */}
      {(user.role === "Santi" || user.role === "Guille") && totalVisitasHoy > 0 && (
        <Card style={{ marginBottom: "2rem", backgroundColor: "#fef3c7", border: "1px solid #f59e0b" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <i className="pi pi-calendar" style={{ fontSize: "2rem", color: "#f59e0b" }}></i>
              <div>
                <h3 style={{ margin: "0 0 0.5rem 0", color: "#92400e" }}>
                  Visitas Pendientes Hoy
                </h3>
                <p style={{ margin: 0, color: "#92400e" }}>
                  Tienes {totalVisitasHoy} visitas programadas para hoy
                </p>
              </div>
            </div>
            <Badge value={totalVisitasHoy} severity="warning" />
          </div>

          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            <h4 style={{ margin: "0 0 1rem 0", color: "#92400e" }}>
              Visitas de hoy:
            </h4>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {visitasHoy.slice(0, 3).map((visita) => (
                <div 
                  key={visita.id} 
                  style={{ 
                    padding: "0.75rem", 
                    backgroundColor: "white", 
                    borderRadius: "6px",
                    border: "1px solid #fed7aa"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: "500", marginBottom: "0.25rem" }}>
                        {visita.clienteNombre}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                        {visita.horario} • {visita.fecha}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Button 
                        icon="pi pi-pencil" 
                        className="p-button-warning p-button-sm"
                        size="small"
                        onClick={() => navigate("/visitas")}
                        tooltip="Reportar visita"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {visitasHoy.length > 3 && (
                <div style={{ 
                  padding: "0.5rem", 
                  textAlign: "center", 
                  color: "#6b7280", 
                  fontSize: "0.875rem" 
                }}>
                  ... y {visitasHoy.length - 3} visitas más
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <Button 
              label="Ir a Visitas" 
              icon="pi pi-calendar" 
              className="p-button-warning"
              size="small"
              onClick={() => navigate("/visitas")}
            />
          </div>
        </Card>
      )}
    </>
  );
}

export default Alerts; 
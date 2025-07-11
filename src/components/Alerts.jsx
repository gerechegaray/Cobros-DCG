import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Badge } from "primereact/badge";

function Alerts({ user, onNavigateToMyCobros }) {
  const [pendingCobros, setPendingCobros] = useState([]);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    const q = query(collection(db, "cobranzas"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });

      // Filtrar cobros pendientes según el rol del usuario
      let filteredData = data.filter(cobro => !cobro.cargado);
      
      if (user.role === "Santi" || user.role === "Guille") {
        filteredData = filteredData.filter(cobro => cobro.cobrador === user.role);
      } else if (user.role === "admin") {
        filteredData = filteredData;
      }

      setPendingCobros(filteredData);
      setTotalPending(filteredData.length);
    }, (error) => {
      console.error("Error al cargar datos:", error);
    });
    return () => unsubscribe();
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
                      {cobro.cliente}
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
            label="Ir a lista" 
            icon="pi pi-arrow-right" 
            className="p-button-danger"
            size="small"
            onClick={() => onNavigateToMyCobros && onNavigateToMyCobros("list")}
          />
        ) : (
          <Button 
            label="Ver Mis Cobranzas" 
            icon="pi pi-list" 
            className="p-button-danger"
            size="small"
            onClick={() => onNavigateToMyCobros && onNavigateToMyCobros("my-cobros")}
          />
        )}
      </div>
    </Card>
  );
}

export default Alerts; 
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { Card } from "primereact/card";
import { ProgressBar } from "primereact/progressbar";
import { Button } from "primereact/button";
import Alerts from "./Alerts";

function Dashboard({ user, onNavigateToCobros, onNavigateToMyCobros }) {
  const [stats, setStats] = useState({
    totalCobranzas: 0,
    totalMonto: 0,
    cargadasEnSistema: 0,
    pendientesDeCarga: 0,
    montoMes: 0,
    montoSemana: 0
  });

  useEffect(() => {
    const q = query(collection(db, "cobranzas"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });

      // Filtrar datos según el rol del usuario
      let filteredData = data;
      if (user.role === "cobrador") {
        // Cobradores solo ven sus propios cobros
        filteredData = data.filter(cobro => cobro.cobrador === user.name);
      }

      const totalCobranzas = filteredData.length;
      const totalMonto = filteredData.reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
      const cargadasEnSistema = filteredData.filter(cobro => cobro.cargado).length;
      const pendientesDeCarga = totalCobranzas - cargadasEnSistema;

      // Calcular monto del mes actual
      const ahora = new Date();
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const montoMes = filteredData
        .filter(cobro => {
          const fechaCobro = cobro.fecha.toDate ? cobro.fecha.toDate() : new Date(cobro.fecha.seconds * 1000);
          return fechaCobro >= inicioMes;
        })
        .reduce((sum, cobro) => sum + (cobro.monto || 0), 0);

      // Calcular monto de la semana actual
      const inicioSemana = new Date(ahora);
      inicioSemana.setDate(ahora.getDate() - ahora.getDay()); // Domingo
      inicioSemana.setHours(0, 0, 0, 0);
      const montoSemana = filteredData
        .filter(cobro => {
          const fechaCobro = cobro.fecha.toDate ? cobro.fecha.toDate() : new Date(cobro.fecha.seconds * 1000);
          return fechaCobro >= inicioSemana;
        })
        .reduce((sum, cobro) => sum + (cobro.monto || 0), 0);

      setStats({
        totalCobranzas,
        totalMonto,
        cargadasEnSistema,
        pendientesDeCarga,
        montoMes,
        montoSemana
      });
    });

    return () => unsubscribe();
  }, [user]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const porcentajeCargadas = stats.totalCobranzas > 0 
    ? (stats.cargadasEnSistema / stats.totalCobranzas) * 100 
    : 0;

  const getDashboardTitle = () => {
    if (user.role === "admin") {
      return "Dashboard General de Cobranzas";
    } else {
      return `Dashboard de ${user.name}`;
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
      <h2 style={{ textAlign: "center", marginBottom: "2rem", color: "#1f2937" }}>
        {getDashboardTitle()}
      </h2>

      {/* Alertas de cobros pendientes */}
      <Alerts user={user} onNavigateToMyCobros={onNavigateToMyCobros} />

      {user.role === "cobrador" && (
        <Card style={{ marginBottom: "2rem", backgroundColor: "#fef3c7", border: "1px solid #f59e0b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <i className="pi pi-info-circle" style={{ fontSize: "1.5rem", color: "#f59e0b" }}></i>
            <div>
              <h4 style={{ margin: "0 0 0.5rem 0", color: "#92400e" }}>Vista Personalizada</h4>
              <p style={{ margin: 0, color: "#92400e", fontSize: "0.9rem" }}>
                Solo puedes ver tus propios cobros y estadísticas personales.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "1.5rem",
        marginBottom: "2rem"
      }}>
        {/* Total de Cobranzas */}
        <Card style={{ textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
            <i className="pi pi-list" style={{ fontSize: "2rem", color: "#2563eb", marginRight: "0.5rem" }}></i>
            <h3 style={{ margin: 0, color: "#1f2937" }}>
              {user.role === "admin" ? "Total Cobranzas" : "Mis Cobranzas"}
            </h3>
          </div>
          <h2 style={{ margin: 0, color: "#2563eb", fontSize: "2.5rem" }}>{stats.totalCobranzas}</h2>
        </Card>

        {/* Monto Total */}
        <Card style={{ textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
            <i className="pi pi-dollar" style={{ fontSize: "2rem", color: "#059669", marginRight: "0.5rem" }}></i>
            <h3 style={{ margin: 0, color: "#1f2937" }}>
              {user.role === "admin" ? "Monto Total" : "Mi Monto Total"}
            </h3>
          </div>
          <h2 style={{ margin: 0, color: "#059669", fontSize: "2rem" }}>{formatCurrency(stats.totalMonto)}</h2>
        </Card>

        {/* Monto del Mes */}
        <Card style={{ textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
            <i className="pi pi-calendar" style={{ fontSize: "2rem", color: "#7c3aed", marginRight: "0.5rem" }}></i>
            <h3 style={{ margin: 0, color: "#1f2937" }}>
              {user.role === "admin" ? "Cobrado este Mes" : "Mi Cobro este Mes"}
            </h3>
          </div>
          <h2 style={{ margin: 0, color: "#7c3aed", fontSize: "2rem" }}>{formatCurrency(stats.montoMes)}</h2>
        </Card>

        {/* Monto de la Semana */}
        <Card style={{ textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
            <i className="pi pi-clock" style={{ fontSize: "2rem", color: "#f59e0b", marginRight: "0.5rem" }}></i>
            <h3 style={{ margin: 0, color: "#1f2937" }}>
              {user.role === "admin" ? "Cobrado esta Semana" : "Mi Cobro esta Semana"}
            </h3>
          </div>
          <h2 style={{ margin: 0, color: "#f59e0b", fontSize: "2rem" }}>{formatCurrency(stats.montoSemana)}</h2>
        </Card>

        {/* Cargadas en Sistema */}
        <Card style={{ textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
            <i className="pi pi-check-circle" style={{ fontSize: "2rem", color: "#059669", marginRight: "0.5rem" }}></i>
            <h3 style={{ margin: 0, color: "#1f2937" }}>
              {user.role === "admin" ? "Cargadas en Sistema" : "Mis Cargadas"}
            </h3>
          </div>
          <h2 style={{ margin: 0, color: "#059669", fontSize: "2.5rem" }}>{stats.cargadasEnSistema}</h2>
        </Card>
      </div>

      {/* Progreso de carga en sistema */}
      <Card>
        <h3 style={{ marginBottom: "1rem", color: "#1f2937" }}>
          {user.role === "admin" ? "Progreso de Carga en Sistema" : "Mi Progreso de Carga"}
        </h3>
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span>Cargadas: {stats.cargadasEnSistema}</span>
            <span>Pendientes: {stats.pendientesDeCarga}</span>
          </div>
          <ProgressBar 
            value={porcentajeCargadas} 
            style={{ height: "1rem" }}
            color={porcentajeCargadas === 100 ? "#059669" : porcentajeCargadas > 50 ? "#f59e0b" : "#dc2626"}
          />
        </div>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
          {porcentajeCargadas.toFixed(1)}% de las cobranzas están cargadas en el sistema
        </p>
      </Card>

      {/* Botón para ver cobros (solo para cobradores) */}
      {user.role === "cobrador" && (
        <Card style={{ marginTop: "2rem", backgroundColor: "#f0f9ff", border: "1px solid #0ea5e9" }}>
          <div style={{ textAlign: "center" }}>
            <h3 style={{ margin: "0 0 1rem 0", color: "#0c4a6e" }}>
              Ver Mis Cobranzas
            </h3>
            <p style={{ margin: "0 0 1.5rem 0", color: "#0369a1", fontSize: "0.9rem" }}>
              Revisa todos los cobros que has realizado y su estado actual
            </p>
            <Button 
              label="Ver Mis Cobranzas" 
              icon="pi pi-list" 
              className="p-button-primary"
              size="large"
              onClick={() => onNavigateToCobros && onNavigateToCobros()}
              style={{ 
                padding: "1rem 2rem", 
                fontSize: "1.1rem",
                backgroundColor: "#0ea5e9",
                borderColor: "#0ea5e9"
              }}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

export default Dashboard; 
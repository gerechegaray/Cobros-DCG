import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./features/auth/Login";
import Navbar from "./components/layout/Navbar";
import Dashboard from "./features/dashboard/Dashboard";
import CobroForm from "./features/cobros/CobroForm";
import CobrosList from "./features/cobros/CobrosList";
import UserProfile from "./features/auth/UserProfile";
import EstadoCuenta from "./features/clientes/EstadoCuenta";
import SelectorCliente from "./features/pedidos/SelectorCliente";
import { PresupuestoForm, PresupuestosList } from "./features/presupuestos";
import { auth, db } from "./services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import FacturasAlegra from "./features/facturas/FacturasAlegra";
import Alerts from "./features/dashboard/Alerts";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, "usuarios", firebaseUser.email);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (
              userData.role === "admin" ||
              userData.role === "cobrador" ||
              ["Santi", "Guille"].includes(userData.role)
            ) {
              setUser(userData);
              localStorage.setItem("userData", JSON.stringify(userData));
            } else {
              setUser(null);
              localStorage.removeItem("userData");
            }
          } else {
            setUser(null);
            localStorage.removeItem("userData");
          }
        } catch (error) {
          console.error("Error al obtener datos del usuario:", error);
          setUser(null);
          localStorage.removeItem("userData");
        }
      } else {
        setUser(null);
        localStorage.removeItem("userData");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    auth.signOut();
    localStorage.removeItem("userData");
    setUser(null);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  const isCobrador = user?.role === "cobrador" || ["Santi", "Guille"].includes(user?.role);

  const getMenuItems = () => {
    const baseItems = [
      { label: "Dashboard", icon: "pi pi-chart-bar", path: "/dashboard" },
      { label: "Presupuestos", icon: "pi pi-file", path: "/presupuestos" },
      { label: "Lista de Cobranzas", icon: "pi pi-list", path: "/list" },
      { label: "Estado de Cuenta", icon: "pi pi-credit-card", path: "/estado-cuenta" },
      { label: "Facturas", icon: "pi pi-file-o", path: "/facturas" },
      { label: "Mi Perfil", icon: "pi pi-user", path: "/profile" },
      { label: "Clientes", icon: "pi pi-users", path: "/clientes" }
    ];
    return baseItems;
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc"
        }}
      >
        <div style={{ textAlign: "center" }}>
          <i className="pi pi-spin pi-spinner" style={{ fontSize: "3rem", color: "#2563eb" }}></i>
          <p style={{ marginTop: "1rem", color: "#6b7280" }}>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
        {user && <Navbar user={user} onLogout={handleLogout} menuItems={getMenuItems()} />}
        <main style={{ paddingTop: "1rem" }}>
          <Routes>
            <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            {/* Rutas protegidas */}
            {user && (
              <>
                <Route path="/dashboard" element={<Dashboard user={user} />} />
                <Route path="/cargar-cobro" element={<CobroForm user={user} />} />
                <Route path="/estado-cuenta" element={<EstadoCuenta user={user} />} />
                <Route path="/list" element={<CobrosList user={user} />} />
                <Route path="/profile" element={<UserProfile user={user} onUserUpdate={handleUserUpdate} />} />
                <Route path="/clientes" element={<SelectorCliente />} />
                <Route path="/presupuestos/nuevo" element={<PresupuestoForm user={user} />} />
                <Route path="/presupuestos" element={<PresupuestosList user={user} />} />
                <Route path="/facturas" element={<FacturasAlegra user={user} />} />
                <Route path="/alertas" element={<Alerts user={user} />} />
                {/* Menú de Acceso Total: muestra todos los módulos juntos para pruebas */}
                <Route path="/acceso-total" element={
                  <div style={{padding: 24}}>
                    <h2>Acceso Total a Módulos</h2>
                    <Dashboard user={user} />
                    <CobroForm user={user} />
                    <CobrosList user={user} />
                    <EstadoCuenta user={user} />
                    <FacturasAlegra user={user} />
                    <Alerts user={user} />
                    <UserProfile user={user} onUserUpdate={handleUserUpdate} />
                    <SelectorCliente />
                    <PresupuestoForm user={user} />
                    <PresupuestosList user={user} />
                  </div>
                } />
              </>
            )}
            {/* Redirigir cualquier otra ruta al login si no está autenticado, o al dashboard si lo está */}
            <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

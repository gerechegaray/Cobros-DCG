import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./features/auth/Login";
import Navbar from "./components/layout/Navbar";
import Dashboard from "./features/dashboard/Dashboard";
import CobroForm from "./features/cobros/CobroForm";
import CobrosList from "./features/cobros/CobrosList";
import Reports from "./features/dashboard/Reports";
import UserProfile from "./features/auth/UserProfile";
import CargarPedido from "./features/pedidos/CargarPedido";
import ListaPedidosClientes from "./features/pedidos/ListaPedidosClientes";
import PedidosEnviados from "./features/pedidos/PedidosEnviados";
import { auth, db } from "./services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

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
    const baseItems = [{ label: "Dashboard", icon: "pi pi-chart-bar", path: "/dashboard" }];

    if (user?.role === "admin") {
      return [
        ...baseItems,
        { label: "Cargar Cobro", icon: "pi pi-plus", path: "/form" },
        { label: "Cargar Pedido", icon: "pi pi-shopping-cart", path: "/cargar-pedido" },
        { label: "Lista de Cobranzas", icon: "pi pi-list", path: "/list" },
        { label: "Lista de Pedidos", icon: "pi pi-list", path: "/lista-pedidos" },
        { label: "Pedidos Enviados", icon: "pi pi-send", path: "/pedidos" },
        { label: "Reportes", icon: "pi pi-file-pdf", path: "/reports" },
        { label: "Mi Perfil", icon: "pi pi-user", path: "/profile" }
      ];
    } else if (isCobrador) {
      return [
        ...baseItems,
        { label: "Cargar Cobro", icon: "pi pi-plus", path: "/form" },
        { label: "Cargar Pedido", icon: "pi pi-shopping-cart", path: "/cargar-pedido" },
        { label: "Mis Cobranzas", icon: "pi pi-list", path: "/my-cobros" },
        { label: "Lista de Pedidos", icon: "pi pi-list", path: "/lista-pedidos" },
        { label: "Pedidos Enviados", icon: "pi pi-send", path: "/pedidos" },
        { label: "Reportes", icon: "pi pi-file-pdf", path: "/reports" },
        { label: "Mi Perfil", icon: "pi pi-user", path: "/profile" }
      ];
    }
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

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
        <Navbar user={user} onLogout={handleLogout} menuItems={getMenuItems()} />
        <main style={{ paddingTop: "1rem" }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route path="/form" element={<CobroForm user={user} />} />
            <Route
              path="/cargar-pedido"
              element={user?.role ? <CargarPedido user={user} /> : <Navigate to="/dashboard" />}
            />

            <Route path="/lista-pedidos" element={<ListaPedidosClientes user={user} />} />
            <Route
              path="/list"
              element={
                user.role === "admin" ? <CobrosList user={user} /> : <Navigate to="/dashboard" />
              }
            />
            <Route
              path="/my-cobros"
              element={
                isCobrador ? (
                  <CobrosList user={user} showOnlyMyCobros />
                ) : (
                  <Navigate to="/dashboard" />
                )
              }
            />
            <Route path="/pedidos" element={<PedidosEnviados user={user} />} />
            <Route path="/reports" element={<Reports user={user} />} />
            <Route
              path="/profile"
              element={<UserProfile user={user} onUserUpdate={handleUserUpdate} />}
            />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

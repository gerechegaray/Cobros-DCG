import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import CobroForm from "./CobroForm";
import CobrosList from "./CobrosList";
import Reports from "./components/Reports";
import UserProfile from "./components/UserProfile";
import PedidosEnviados from "./components/PedidosEnviados";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  // Verificar autenticación real de Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Buscar datos del usuario en Firestore
          const userRef = doc(db, "usuarios", firebaseUser.email);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            
            if (userData.role === "admin" || userData.role === "cobrador") {
              setUser(userData);
              localStorage.setItem('userData', JSON.stringify(userData));
            } else {
              setUser(null);
              localStorage.removeItem('userData');
            }
          } else {
            setUser(null);
            localStorage.removeItem('userData');
          }
        } catch (error) {
          console.error("Error al obtener datos del usuario:", error);
          setUser(null);
          localStorage.removeItem('userData');
        }
      } else {
        setUser(null);
        localStorage.removeItem('userData');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setActiveTab("dashboard");
  };

  const handleLogout = () => {
    auth.signOut();
    localStorage.removeItem('userData');
    setUser(null);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  // Mostrar loading mientras verifica autenticación
  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        backgroundColor: "#f8fafc"
      }}>
        <div style={{ textAlign: "center" }}>
          <i className="pi pi-spin pi-spinner" style={{ fontSize: "3rem", color: "#2563eb" }}></i>
          <p style={{ marginTop: "1rem", color: "#6b7280" }}>Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario logueado, mostrar pantalla de login
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Determinar qué pestañas mostrar según el rol
  const getMenuItems = () => {
    const baseItems = [
      { label: "Dashboard", icon: "pi pi-chart-bar", value: "dashboard" }
    ];

    if (user.role === "admin") {
      return [
        ...baseItems,
        { label: "Cargar Cobro", icon: "pi pi-plus", value: "form" },
        { label: "Lista de Cobranzas", icon: "pi pi-list", value: "list" },
        { label: "Pedidos Enviados", icon: "pi pi-send", value: "pedidos" },
        { label: "Reportes", icon: "pi pi-file-pdf", value: "reports" },
        { label: "Mi Perfil", icon: "pi pi-user", value: "profile" }
      ];
    } else if (user.role === "cobrador") {
      return [
        ...baseItems,
        { label: "Cargar Cobro", icon: "pi pi-plus", value: "form" },
        { label: "Mis Cobranzas", icon: "pi pi-list", value: "my-cobros" },
        { label: "Pedidos Enviados", icon: "pi pi-send", value: "pedidos" },
        { label: "Reportes", icon: "pi pi-file-pdf", value: "reports" },
        { label: "Mi Perfil", icon: "pi pi-user", value: "profile" }
      ];
    }
    return baseItems;
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard user={user} onNavigateToCobros={() => setActiveTab("my-cobros")} onNavigateToMyCobros={(tab) => setActiveTab(tab)} />;
      case "form":
        return <CobroForm user={user} />;
      case "list":
        return user.role === "admin" ? <CobrosList user={user} onNavigateToDashboard={() => setActiveTab("dashboard")} /> : null;
      case "my-cobros":
        return user.role === "cobrador" ? <CobrosList user={user} showOnlyMyCobros={true} onNavigateToDashboard={() => setActiveTab("dashboard")} /> : null;
      case "pedidos":
        return <PedidosEnviados user={user} />;
      case "reports":
        return <Reports user={user} />;
      case "profile":
        return <UserProfile user={user} onUserUpdate={handleUserUpdate} />;
      default:
        return <Dashboard user={user} onNavigateToCobros={() => setActiveTab("my-cobros")} onNavigateToMyCobros={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user}
        onLogout={handleLogout}
        menuItems={getMenuItems()}
      />
      <main style={{ paddingTop: "1rem" }}>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
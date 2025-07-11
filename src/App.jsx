import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import CobroForm from "./CobroForm";
import CobrosList from "./CobrosList";
import Reports from "./components/Reports";
import UserProfile from "./components/UserProfile";
import PedidosEnviados from "./components/PedidosEnviados";

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Verificar si hay un usuario logueado al cargar la app
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setActiveTab("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem('userData');
    setUser(null);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

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
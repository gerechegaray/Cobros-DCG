import React, { useState } from "react";
import { Button } from "primereact/button";
import { Sidebar } from "primereact/sidebar";
import { Menu } from "primereact/menu";
import { useRef } from "react";

function Navbar({ activeTab, setActiveTab, user, onLogout, menuItems }) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const userMenuRef = useRef(null);

  const userMenuItems = [
    {
      label: `Hola, ${user.name}`,
      icon: "pi pi-user",
      disabled: true
    },
    {
      separator: true
    },
    {
      label: "Cerrar Sesión",
      icon: "pi pi-sign-out",
      command: onLogout
    }
  ];

  return (
    <>
      {/* Navbar principal */}
      <nav style={{
        backgroundColor: "#2563eb",
        padding: "1rem 2rem",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        position: "sticky",
        top: 0,
        zIndex: 1000
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: 1200,
          margin: "0 auto"
        }}>
          {/* Logo y título */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <i className="pi pi-dollar" style={{ fontSize: "2rem", color: "white" }}></i>
            <h1 style={{ color: "white", margin: 0, fontSize: "1.5rem" }}>Sistema de Gestión</h1>
          </div>

          {/* Menú desktop */}
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            {menuItems.map((item) => (
              <Button
                key={item.value}
                label={item.label === "Dashboard" ? "Resumen" : item.label}
                icon={item.icon}
                className={activeTab === item.value ? "p-button-raised" : "p-button-text"}
                style={{
                  color: activeTab === item.value ? "white" : "white",
                  backgroundColor: activeTab === item.value ? "rgba(255,255,255,0.2)" : "transparent"
                }}
                onClick={() => setActiveTab(item.value)}
              />
            ))}

            {/* Menú de usuario */}
            <Button
              icon="pi pi-user"
              className="p-button-text"
              style={{ color: "white" }}
              onClick={(e) => userMenuRef.current.toggle(e)}
              tooltip="Menú de usuario"
            />
            <Menu model={userMenuItems} popup ref={userMenuRef} />
          </div>

          {/* Botón móvil */}
          <Button
            icon="pi pi-bars"
            className="p-button-text"
            style={{ color: "white", display: "none" }}
            onClick={() => setSidebarVisible(true)}
          />
        </div>
      </nav>

      {/* Sidebar móvil */}
      <Sidebar
        visible={sidebarVisible}
        position="right"
        onHide={() => setSidebarVisible(false)}
        style={{ width: "250px" }}
      >
        <div style={{ padding: "1rem" }}>
          <div style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "#f3f4f6", borderRadius: "8px" }}>
            <h3 style={{ margin: "0 0 0.5rem 0" }}>Usuario</h3>
            <p style={{ margin: 0, color: "#6b7280" }}>{user.name}</p>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#9ca3af" }}>
              {user.role === "admin" ? "Administrador" : "Cobrador"}
            </p>
          </div>
          
          <h3 style={{ marginBottom: "1rem" }}>Menú</h3>
          {menuItems.map((item) => (
            <Button
              key={item.value}
              label={item.label}
              icon={item.icon}
              className="p-button-text"
              style={{
                width: "100%",
                justifyContent: "flex-start",
                marginBottom: "0.5rem",
                backgroundColor: activeTab === item.value ? "#e5e7eb" : "transparent"
              }}
              onClick={() => {
                setActiveTab(item.value);
                setSidebarVisible(false);
              }}
            />
          ))}
          
          <Button
            label="Cerrar Sesión"
            icon="pi pi-sign-out"
            className="p-button-danger p-button-text"
            style={{
              width: "100%",
              justifyContent: "flex-start",
              marginTop: "1rem"
            }}
            onClick={() => {
              onLogout();
              setSidebarVisible(false);
            }}
          />
        </div>
      </Sidebar>

      {/* Estilos responsive */}
      <style>{`
        @media (max-width: 768px) {
          nav div div:nth-child(2) {
            display: none !important;
          }
          nav div button {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}

export default Navbar; 
import React from "react";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";

function etiquetaRol(role) {
  if (role === "admin") return "Administrador";
  if (role === "Santi") return "Vendedor Santi";
  if (role === "Guille") return "Vendedor Guille";
  if (role === "Victor") return "Victor";
  return "Usuario";
}

function UserProfile({ user }) {
  return (
    <div className="p-p-3 p-p-md-4 p-p-lg-5" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div className="p-mb-4">
        <h1 className="p-m-0 p-text-2xl p-text-md-3xl" style={{ color: "#1f2937" }}>
          Mi Perfil
        </h1>
        <p className="p-mt-2 p-mb-0 p-text-sm" style={{ color: "#6b7280" }}>
          El acceso es con Google. Un administrador carga el rol en el sistema.
        </p>
      </div>

      <Card>
        <div className="p-grid p-fluid">
          <div className="p-col-12 p-md-6">
            <div className="flex justify-content-between align-items-center mb-3">
              <span className="text-600">Nombre:</span>
              <span className="text-900 font-medium">{user.name || "-"}</span>
            </div>
          </div>
          <div className="p-col-12 p-md-6">
            <div className="flex justify-content-between align-items-center mb-3">
              <span className="text-600">Usuario:</span>
              <span className="text-900 font-medium">{user.email}</span>
            </div>
          </div>
          <div className="p-col-12 p-md-6">
            <div className="flex justify-content-between align-items-center mb-3">
              <span className="text-600">Rol:</span>
              <Tag
                value={etiquetaRol(user.role)}
                severity={user.role === "admin" ? "danger" : "info"}
              />
            </div>
          </div>
          <div className="p-col-12 p-md-6">
            <div className="flex justify-content-between align-items-center">
              <span className="text-600">Permisos:</span>
              <span className="text-900 font-medium">
                {user.role === "admin" ? "Acceso completo" : "Funciones de vendedor"}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default UserProfile;

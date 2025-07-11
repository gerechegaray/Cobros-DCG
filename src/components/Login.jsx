import React, { useState, useRef } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { auth, googleProvider, db } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const toast = useRef(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userRef = doc(db, "usuarios", user.email);
      const userSnap = await getDoc(userRef);
      let userData;
      if (!userSnap.exists()) {
        // Crear usuario con rol vacío
        userData = {
          email: user.email,
          name: user.displayName || user.email,
          role: ""
        };
        await setDoc(userRef, userData);
        toast.current.show({
          severity: "warn",
          summary: "Pendiente de autorización",
          detail: "Tu usuario fue registrado. Espera a que un administrador te asigne un rol."
        });
        setLoading(false);
        return;
      } else {
        userData = userSnap.data();
        if (userData.role === "admin" || userData.role === "cobrador") {
          localStorage.setItem('userData', JSON.stringify(userData));
          toast.current.show({
            severity: 'success',
            summary: 'Bienvenido',
            detail: `Hola ${userData.name}!`
          });
          onLogin(userData);
        } else {
          toast.current.show({
            severity: "warn",
            summary: "Pendiente de autorización",
            detail: "Tu usuario está pendiente de autorización. Espera a que un administrador te asigne un rol."
          });
        }
        setLoading(false);
        return;
      }
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo iniciar sesión"
      });
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f8fafc"
    }}>
      <Toast ref={toast} />
      <Card style={{ width: "400px", maxWidth: "90vw" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <i className="pi pi-dollar" style={{ fontSize: "3rem", color: "#2563eb", marginBottom: "1rem" }}></i>
          <h2 style={{ margin: 0, color: "#1f2937" }}>Sistema de Cobranzas</h2>
          <p style={{ margin: "0.5rem 0 0 0", color: "#6b7280" }}>
            Inicia sesión con Google para continuar
          </p>
        </div>
        <Button
          label={loading ? "Iniciando sesión..." : "Iniciar sesión con Google"}
          icon="pi pi-google"
          className="p-button-success"
          style={{ width: "100%", height: "3rem" }}
          onClick={handleGoogleLogin}
          loading={loading}
        />
      </Card>
    </div>
  );
}

export default Login; 
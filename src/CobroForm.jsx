import React, { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Toast } from "primereact/toast";
import { useRef } from "react";

function CobroForm({ user }) {
  const [fecha, setFecha] = useState(null);
  const [cliente, setCliente] = useState("");
  const [monto, setMonto] = useState("");
  const [cobrador, setCobrador] = useState(user.role === "cobrador" ? user.name : "");
  const [forma, setForma] = useState("");
  const [cargado, setCargado] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useRef(null);

  const formasDeCobro = [
    { label: "Efectivo", value: "Efectivo" },
    { label: "Mercado Pago", value: "Mercado Pago" },
    { label: "Transferencia DCG", value: "Transferencia DCG" },
    { label: "Transferencia Santander", value: "Transferencia Santander" },
    { label: "Transferencia Galicia DCG", value: "Transferencia Galicia DCG" },
    { label: "Alleata", value: "Alleata" },
    // Mantener compatibilidad con formas antiguas
    { label: "Transferencia", value: "Transferencia" },
    { label: "Cheque", value: "Cheque" },
    { label: "Otro", value: "Otro" },
  ];

  const cobradores = [
    { label: "Mariano", value: "Mariano" },
    { label: "Ruben", value: "Ruben" },
    { label: "Diego", value: "Diego" },
    { label: "Guille", value: "Guille" },
    { label: "Santi", value: "Santi" },
    { label: "German", value: "German" },
  ];

  const showToast = (severity, summary, detail) => {
    toast.current.show({ severity, summary, detail });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fecha || !cliente || !monto || !cobrador || !forma) {
      showToast('error', 'Error', 'Por favor, completá todos los campos.');
      return;
    }
    
    setLoading(true);
    try {
      await addDoc(collection(db, "cobranzas"), {
        fecha: Timestamp.fromDate(fecha),
        cliente,
        monto: parseFloat(monto),
        cobrador,
        forma,
        cargado,
      });
      showToast('success', 'Éxito', 'Cobro guardado correctamente.');
      // Limpiar formulario
      setFecha(null);
      setCliente("");
      setMonto("");
      setCobrador(user.role === "cobrador" ? user.name : "");
      setForma("");
      setCargado(false);
    } catch (error) {
      showToast('error', 'Error', 'Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "2rem" }}>
      <Toast ref={toast} />
      
      <Card>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <i className="pi pi-plus-circle" style={{ fontSize: "3rem", color: "#2563eb", marginBottom: "1rem" }}></i>
          <h2 style={{ margin: 0, color: "#1f2937" }}>Cargar Nuevo Cobro</h2>
          <p style={{ margin: "0.5rem 0 0 0", color: "#6b7280" }}>
            Completa los datos del cobro realizado
          </p>
          {user.role === "cobrador" && (
            <div style={{ 
              marginTop: "1rem", 
              padding: "0.5rem", 
              backgroundColor: "#fef3c7", 
              borderRadius: "4px",
              fontSize: "0.875rem",
              color: "#92400e"
            }}>
              <i className="pi pi-user" style={{ marginRight: "0.5rem" }}></i>
              Cargando como: <strong>{user.name}</strong>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {/* Fecha */}
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151" }}>
                Fecha del Cobro *
              </label>
              <Calendar 
                value={fecha} 
                onChange={(e) => setFecha(e.value)} 
                dateFormat="dd/mm/yy" 
                showIcon 
                style={{ width: "100%" }}
                placeholder="Selecciona la fecha"
              />
            </div>

            {/* Cliente */}
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151" }}>
                Cliente *
              </label>
              <InputText 
                value={cliente} 
                onChange={(e) => setCliente(e.target.value)} 
                style={{ width: "100%" }}
                placeholder="Nombre del cliente"
              />
            </div>

            {/* Monto */}
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151" }}>
                Monto *
              </label>
              <InputText 
                value={monto} 
                onChange={(e) => setMonto(e.target.value)} 
                keyfilter="money" 
                style={{ width: "100%" }}
                placeholder="0.00"
              />
            </div>

            {/* Cobrador - Solo visible para admin */}
            {user.role === "admin" && (
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151" }}>
                  Quién cobró *
                </label>
                <Dropdown 
                  value={cobrador} 
                  options={cobradores} 
                  onChange={(e) => setCobrador(e.value)} 
                  placeholder="Selecciona el cobrador"
                  style={{ width: "100%" }}
                />
              </div>
            )}

            {/* Forma de cobro */}
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#374151" }}>
                Forma de cobro *
              </label>
              <Dropdown 
                value={forma} 
                options={formasDeCobro} 
                onChange={(e) => setForma(e.value)} 
                placeholder="Selecciona la forma de cobro"
                style={{ width: "100%" }}
              />
            </div>

            {/* Cargado en sistema */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Checkbox 
                checked={cargado} 
                onChange={(e) => setCargado(e.checked)} 
                inputId="cargado" 
              />
              <label htmlFor="cargado" style={{ color: "#374151" }}>
                ¿Cargado en el sistema?
              </label>
            </div>

            {/* Botón submit */}
            <Button 
              type="submit" 
              label={loading ? "Guardando..." : "Guardar Cobro"} 
              icon={loading ? "pi pi-spin pi-spinner" : "pi pi-save"}
              style={{ width: "100%", height: "3rem" }}
              disabled={loading}
            />
          </div>
        </form>
      </Card>
    </div>
  );
}

export default CobroForm;
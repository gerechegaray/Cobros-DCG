import React, { useState } from "react";
import { db } from "../../services/firebase";
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
    <div className="p-p-3 p-p-md-4 p-p-lg-5" style={{ maxWidth: "600px", margin: "0 auto" }}>
      <Toast ref={toast} />
      
      <Card className="p-fluid">
        <div className="p-text-center p-mb-4">
          <i className="pi pi-plus-circle p-text-4xl p-text-primary" style={{ marginBottom: "1rem" }}></i>
          <h2 className="p-m-0 p-text-xl p-text-md-2xl" style={{ color: "#1f2937" }}>Cargar Nuevo Cobro</h2>
          <p className="p-mt-2 p-mb-0 p-text-sm" style={{ color: "#6b7280" }}>
            Completa los datos del cobro realizado
          </p>
          {user.role === "cobrador" && (
            <div className="p-mt-3 p-p-2 p-surface-200 p-border-round p-text-sm" style={{ color: "#92400e" }}>
              <i className="pi pi-user p-mr-2"></i>
              Cargando como: <strong>{user.name}</strong>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-grid p-fluid">
            {/* Fecha */}
            <div className="p-col-12">
              <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                Fecha del Cobro *
              </label>
              <Calendar 
                value={fecha} 
                onChange={(e) => setFecha(e.value)} 
                dateFormat="dd/mm/yy" 
                showIcon 
                className="p-fluid"
                placeholder="Selecciona la fecha"
              />
            </div>

            {/* Cliente */}
            <div className="p-col-12">
              <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                Cliente *
              </label>
              <InputText 
                value={cliente} 
                onChange={(e) => setCliente(e.target.value)} 
                className="p-fluid"
                placeholder="Nombre del cliente"
              />
            </div>

            {/* Monto */}
            <div className="p-col-12">
              <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                Monto *
              </label>
              <InputText 
                value={monto} 
                onChange={(e) => setMonto(e.target.value)} 
                keyfilter="money" 
                className="p-fluid"
                placeholder="0.00"
              />
            </div>

            {/* Cobrador - Solo visible para admin */}
            {user.role === "admin" && (
              <div className="p-col-12">
                <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                  Quién cobró *
                </label>
                <Dropdown 
                  value={cobrador} 
                  options={cobradores} 
                  onChange={(e) => setCobrador(e.value)} 
                  placeholder="Selecciona el cobrador"
                  className="p-fluid"
                />
              </div>
            )}

            {/* Forma de cobro */}
            <div className="p-col-12">
              <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                Forma de cobro *
              </label>
              <Dropdown 
                value={forma} 
                options={formasDeCobro} 
                onChange={(e) => setForma(e.value)} 
                placeholder="Selecciona la forma de cobro"
                className="p-fluid"
              />
            </div>

            {/* Cargado en sistema */}
            <div className="p-col-12">
              <div className="p-d-flex p-ai-center p-gap-2">
                <Checkbox 
                  checked={cargado} 
                  onChange={(e) => setCargado(e.checked)} 
                  inputId="cargado" 
                />
                <label htmlFor="cargado" className="p-text-sm" style={{ color: "#374151" }}>
                  ¿Cargado en el sistema?
                </label>
              </div>
            </div>

            {/* Botón submit */}
            <div className="p-col-12">
              <Button 
                type="submit" 
                label={loading ? "Guardando..." : "Guardar Cobro"} 
                icon={loading ? "pi pi-spin pi-spinner" : "pi pi-save"}
                className="p-fluid"
                style={{ height: "3rem" }}
                disabled={loading}
              />
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default CobroForm;
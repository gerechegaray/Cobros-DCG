import React, { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";

function CobroForm() {
  const [fecha, setFecha] = useState(null);
  const [cliente, setCliente] = useState("");
  const [monto, setMonto] = useState("");
  const [cobrador, setCobrador] = useState("");
  const [forma, setForma] = useState("");
  const [cargado, setCargado] = useState(false);

  const formasDeCobro = [
    { label: "Efectivo", value: "Efectivo" },
    { label: "Transferencia", value: "Transferencia" },
    { label: "Cheque", value: "Cheque" },
    { label: "Otro", value: "Otro" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fecha || !cliente || !monto || !cobrador || !forma) {
      alert("Por favor, completá todos los campos.");
      return;
    }
    try {
      await addDoc(collection(db, "cobranzas"), {
        fecha: Timestamp.fromDate(fecha),
        cliente,
        monto: parseFloat(monto),
        cobrador,
        forma,
        cargado,
      });
      alert("Cobro guardado correctamente.");
      // Limpiar formulario
      setFecha(null);
      setCliente("");
      setMonto("");
      setCobrador("");
      setForma("");
      setCargado(false);
    } catch (error) {
      alert("Error al guardar: " + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: "2rem auto" }}>
      <h2>Cargar Cobro</h2>
      <div className="p-field" style={{ marginBottom: 10 }}>
        <label>Fecha</label>
        <Calendar value={fecha} onChange={(e) => setFecha(e.value)} dateFormat="dd/mm/yy" showIcon />
      </div>
      <div className="p-field" style={{ marginBottom: 10 }}>
        <label>Cliente</label>
        <InputText value={cliente} onChange={(e) => setCliente(e.target.value)} />
      </div>
      <div className="p-field" style={{ marginBottom: 10 }}>
        <label>Monto</label>
        <InputText value={monto} onChange={(e) => setMonto(e.target.value)} keyfilter="money" />
      </div>
      <div className="p-field" style={{ marginBottom: 10 }}>
        <label>Quién cobró</label>
        <InputText value={cobrador} onChange={(e) => setCobrador(e.target.value)} />
      </div>
      <div className="p-field" style={{ marginBottom: 10 }}>
        <label>Forma de cobro</label>
        <Dropdown value={forma} options={formasDeCobro} onChange={(e) => setForma(e.value)} placeholder="Seleccionar" />
      </div>
      <div className="p-field-checkbox" style={{ marginBottom: 10 }}>
        <input type="checkbox" checked={cargado} onChange={(e) => setCargado(e.target.checked)} id="cargado" />
        <label htmlFor="cargado" style={{ marginLeft: 8 }}>¿Cargado en el sistema?</label>
      </div>
      <Button type="submit" label="Guardar" icon="pi pi-save" />
    </form>
  );
}

export default CobroForm;
import React, { useState, useRef } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { InputTextarea } from "primereact/inputtextarea";

const COBRADORES = [
  { label: "Mariano", value: "Mariano" },
  { label: "Ruben", value: "Ruben" },
  { label: "Diego", value: "Diego" },
  { label: "Guille", value: "Guille" },
  { label: "Santi", value: "Santi" },
  { label: "German", value: "German" }
];

const ESTADO_RECEPCION = [
  { label: "Pendiente", value: "pendiente" },
  { label: "Recibido", value: "recibido" },
  { label: "Enviado", value: "enviado" }
];

const CONDICIONES = [
  { label: "Contado", value: "contado" },
  { label: "Cuenta Corriente", value: "cuenta_corriente" }
];

const PRODUCTOS = [
  { label: "Acá No x 500 ml.", value: "Acá No x 500 ml." },
  { label: "Artrogen Plus x 5 comprimidos.", value: "Artrogen Plus x 5 comprimidos." },
  { label: "Company Gato Adulto x 15 Kg", value: "Company Gato Adulto x 15 Kg" },
  { label: "Company Gato Adulto x 3 Kg", value: "Company Gato Adulto x 3 Kg" },
  { label: "Company Gato Cachorro x 3 Kg", value: "Company Gato Cachorro x 3 Kg" },
  { label: "Company Perro Adulto x 20 Kg", value: "Company Perro Adulto x 20 Kg" },
  { label: "Company Perro Cachorro x 20 Kg", value: "Company Perro Cachorro x 20 Kg" },
  { label: "Curabigen Plata x 440", value: "Curabigen Plata x 440" },
  { label: "Defender TOP 90 - 10,1 a 20kg", value: "Defender TOP 90 - 10,1 a 20kg" },
  { label: "Defender TOP 90 - 2 a 4,4kg", value: "Defender TOP 90 - 2 a 4,4kg" },
  { label: "Defender TOP 90 - 20,1 a 32kg", value: "Defender TOP 90 - 20,1 a 32kg" },
  { label: "Defender TOP 90 - 32,1 a 64kg", value: "Defender TOP 90 - 32,1 a 64kg" },
  { label: "Defender TOP 90 - 4,5 a 10kg", value: "Defender TOP 90 - 4,5 a 10kg" },
  { label: "Diclorcip pasta x 1 kg", value: "Diclorcip pasta x 1 kg" },
  { label: "Duositogen 40 x 4 comprimidos.", value: "Duositogen 40 x 4 comprimidos." },
  { label: "Ectogen Emulsión x 100 ml", value: "Ectogen Emulsión x 100 ml" },
  { label: "Ectogen Max 0 a 4 kg  x  0,7 ml", value: "Ectogen Max 0 a 4 kg  x  0,7 ml" },
  { label: "Ectogen Max 11 a 20 kg. x 3 ml.", value: "Ectogen Max 11 a 20 kg. x 3 ml." },
  { label: "Ectogen Max 21 a 40 kg. x 6 ml.", value: "Ectogen Max 21 a 40 kg. x 6 ml." },
  { label: "Ectogen Max 41 a 60 kg. x 80 ml.", value: "Ectogen Max 41 a 60 kg. x 80 ml." },
  { label: "Ectogen Max 5 a 10 kg. x 1.5 ml.", value: "Ectogen Max 5 a 10 kg. x 1.5 ml." },
  { label: "Ectogen Plus Gato", value: "Ectogen Plus Gato" },
  { label: "Fawna Gato Adulto Esterelizado x 3 Kg.", value: "Fawna Gato Adulto Esterelizado x 3 Kg." },
  { label: "Fawna Gato Adulto Esterelizado x 7,5 Kg.", value: "Fawna Gato Adulto Esterelizado x 7,5 Kg." },
  { label: "Fawna Gato Adulto x 3 Kg.", value: "Fawna Gato Adulto x 3 Kg." },
  { label: "Fawna Gato Adulto x 7,5 Kg.", value: "Fawna Gato Adulto x 7,5 Kg." },
  { label: "Fawna Gato Kitten x 1 Kg.", value: "Fawna Gato Kitten x 1 Kg." },
  { label: "Fawna Gato Kitten x 3 Kg.", value: "Fawna Gato Kitten x 3 Kg." },
  { label: "Fawna Gato Urinario x 3 Kg.", value: "Fawna Gato Urinario x 3 Kg." },
  { label: "Fawna Gato Urinario x 7,5 Kg.", value: "Fawna Gato Urinario x 7,5 Kg." },
  { label: "Fawna Perro Adulto Light x 3 Kg.", value: "Fawna Perro Adulto Light x 3 Kg." },
  { label: "Fawna Perro Adulto Medianos y Grandres x 15 Kg.", value: "Fawna Perro Adulto Medianos y Grandres x 15 Kg." },
  { label: "Fawna Perro Adulto Medianos y Grandres x 3 Kg.", value: "Fawna Perro Adulto Medianos y Grandres x 3 Kg." },
  { label: "Fawna Perro Adulto Raza Pequeña x 3 Kg.", value: "Fawna Perro Adulto Raza Pequeña x 3 Kg." },
  { label: "Fawna Perro Adulto Raza Pequeña x 7,5 Kg.", value: "Fawna Perro Adulto Raza Pequeña x 7,5 Kg." },
  { label: "Fawna Perro Cachorro Medianos y Grandres x 3 Kg.", value: "Fawna Perro Cachorro Medianos y Grandres x 3 Kg." },
  { label: "Fawna Perro Cachorro Medianos y Grandres x 7,5 Kg.", value: "Fawna Perro Cachorro Medianos y Grandres x 7,5 Kg." },
  { label: "Fawna Perro Cachorro Raza Pequeña x 3 Kg.", value: "Fawna Perro Cachorro Raza Pequeña x 3 Kg." },
  { label: "Fawna Perro Cachorro Raza Pequeña x 7,5 Kg.", value: "Fawna Perro Cachorro Raza Pequeña x 7,5 Kg." },
  { label: "Fawna Perro Senior x 3 Kg.", value: "Fawna Perro Senior x 3 Kg." },
  { label: "Ferramin B12", value: "Ferramin B12" },
  { label: "Fiprogen Spray x 100ml", value: "Fiprogen Spray x 100ml" },
  { label: "Fiprogen Ultra 10-20kg.", value: "Fiprogen Ultra 10-20kg." },
  { label: "Fiprogen Ultra 2-5kg.", value: "Fiprogen Ultra 2-5kg." },
  { label: "Fiprogen Ultra 20-40kg.", value: "Fiprogen Ultra 20-40kg." },
  { label: "Fiprogen Ultra 40-60kg.", value: "Fiprogen Ultra 40-60kg." },
  { label: "Fiprogen Ultra 5-10kg.", value: "Fiprogen Ultra 5-10kg." },
  { label: "Fiprogen Ultra Gatos 2-7kg.", value: "Fiprogen Ultra Gatos 2-7kg." },
  { label: "Fortipet x 30 comprimidos", value: "Fortipet x 30 comprimidos" },
  { label: "Hectopar Polvo Plus", value: "Hectopar Polvo Plus" },
  { label: "Humms Articulares Sanas x 60 ml", value: "Humms Articulares Sanas x 60 ml" },
  { label: "Humms Dental Care x 60 ml", value: "Humms Dental Care x 60 ml" },
  { label: "Humms Piel y Manto Gato x 60 ml", value: "Humms Piel y Manto Gato x 60 ml" },
  { label: "Ivervak equino 1 dosis", value: "Ivervak equino 1 dosis" },
  { label: "Ivogen 1 x 50 ml.", value: "Ivogen 1 x 50 ml." },
  { label: "Ivogen 1 x 500 ml.", value: "Ivogen 1 x 500 ml." },
  { label: "Ivogen Equino  Max B 12 x 6 gr", value: "Ivogen Equino  Max B 12 x 6 gr" },
  { label: "Manada Adulto x 20 Kg.", value: "Manada Adulto x 20 Kg." },
  { label: "Manada Adulto x 8 Kg.", value: "Manada Adulto x 8 Kg." },
  { label: "Old Prince Equilibrium Adultos Medianos y Grandes  x 15 kg", value: "Old Prince Equilibrium Adultos Medianos y Grandes  x 15 kg" },
  { label: "Old Prince Equilibrium Adultos Medianos y Grandes  x 20 kg", value: "Old Prince Equilibrium Adultos Medianos y Grandes  x 20 kg" },
  { label: "Old Prince Equilibrium Adultos Medianos y Grandes  x 3 kg", value: "Old Prince Equilibrium Adultos Medianos y Grandes  x 3 kg" },
  { label: "Old Prince Equilibrium Adultos Raza Pequeña x 15 kg", value: "Old Prince Equilibrium Adultos Raza Pequeña x 15 kg" },
  { label: "Old Prince Equilibrium Adultos Raza Pequeña x 3 kg", value: "Old Prince Equilibrium Adultos Raza Pequeña x 3 kg" },
  { label: "Old Prince Equilibrium Adultos Raza Pequeña x 7.5 kg", value: "Old Prince Equilibrium Adultos Raza Pequeña x 7.5 kg" },
  { label: "Old Prince Equilibrium Cachorro Raza Pequeña  x 3 kg", value: "Old Prince Equilibrium Cachorro Raza Pequeña  x 3 kg" },
  { label: "Old Prince Equilibrium Cachorro Raza Pequeña  x 7.5 kg", value: "Old Prince Equilibrium Cachorro Raza Pequeña  x 7.5 kg" },
  { label: "Old Prince Equilibrium Cachorros Medianos y Grandes  x 15 kg", value: "Old Prince Equilibrium Cachorros Medianos y Grandes  x 15 kg" },
  { label: "Old Prince Equilibrium Cachorros Medianos y Grandes  x 3 kg", value: "Old Prince Equilibrium Cachorros Medianos y Grandes  x 3 kg" },
  { label: "Old Prince Equilibrium Complete Care Adulto Gato x 3kg", value: "Old Prince Equilibrium Complete Care Adulto Gato x 3kg" },
  { label: "Old Prince Equilibrium Complete Care Adulto Gato x 7.5kg", value: "Old Prince Equilibrium Complete Care Adulto Gato x 7.5kg" },
  { label: "Old Prince Equilibrium Esterilizado x 3kg", value: "Old Prince Equilibrium Esterilizado x 3kg" },
  { label: "Old Prince Equilibrium Esterilizado x 7,5kg", value: "Old Prince Equilibrium Esterilizado x 7,5kg" },
  { label: "Old Prince Equilibrium Gato Adulto Urinary Care  x 7.5 kg", value: "Old Prince Equilibrium Gato Adulto Urinary Care  x 7.5 kg" },
  { label: "Old Prince Equilibrium Gato Adulto Urinary Care x 3kg", value: "Old Prince Equilibrium Gato Adulto Urinary Care x 3kg" },
  { label: "Old Prince Equilibrium Optimal Growth Kitten x 1kg", value: "Old Prince Equilibrium Optimal Growth Kitten x 1kg" },
  { label: "Old Prince Equilibrium Optimal Growth Kitten x 3kg", value: "Old Prince Equilibrium Optimal Growth Kitten x 3kg" },
  { label: "Old Prince Especial Cordero y Arroz Perro Adulto  x 15 kg", value: "Old Prince Especial Cordero y Arroz Perro Adulto  x 15 kg" },
  { label: "Old Prince Especial Cordero y Arroz Perro Adulto x 3 kg", value: "Old Prince Especial Cordero y Arroz Perro Adulto x 3 kg" },
  { label: "Old Prince Especial Cordero y Arroz Perro Adulto x 7,5 kg", value: "Old Prince Especial Cordero y Arroz Perro Adulto x 7,5 kg" },
  { label: "Old Prince Especial Cordero y Arroz Perro Cachorro x 15 kg", value: "Old Prince Especial Cordero y Arroz Perro Cachorro x 15 kg" },
  { label: "Old Prince Especial Cordero y Arroz Perro Cachorro x 3 kg", value: "Old Prince Especial Cordero y Arroz Perro Cachorro x 3 kg" },
  { label: "Old Prince Especial Cordero y Arroz Perro Cachorro x 7,5 kg", value: "Old Prince Especial Cordero y Arroz Perro Cachorro x 7,5 kg" },
  { label: "Old Prince Especial Cordero y Arroz Perro Light x 15 kg", value: "Old Prince Especial Cordero y Arroz Perro Light x 15 kg" },
  { label: "Old Prince Especial Cordero y Arroz Perro Light x 3 kg", value: "Old Prince Especial Cordero y Arroz Perro Light x 3 kg" },
  { label: "Old Prince Especial Cordero y Arroz Perro Senior x 15 kg", value: "Old Prince Especial Cordero y Arroz Perro Senior x 15 kg" },
  { label: "Old Prince Especial Cordero y Arroz Perro Senior x 3 kg", value: "Old Prince Especial Cordero y Arroz Perro Senior x 3 kg" },
  { label: "Old Prince Premium Gatito x 3 Kg", value: "Old Prince Premium Gatito x 3 Kg" },
  { label: "Old Prince Premium Gatito x 7.5 Kg", value: "Old Prince Premium Gatito x 7.5 Kg" },
  { label: "Old Prince Premium Gato Adulto x 3 Kg", value: "Old Prince Premium Gato Adulto x 3 Kg" },
  { label: "Old Prince Premium Gato Adulto x 7.5 Kg", value: "Old Prince Premium Gato Adulto x 7.5 Kg" },
  { label: "Old Prince Premium Perros Adultos Cordero x 15 Kg", value: "Old Prince Premium Perros Adultos Cordero x 15 Kg" },
  { label: "Old Prince Premium Perros Adultos Cordero x 3 Kg", value: "Old Prince Premium Perros Adultos Cordero x 3 Kg" },
  { label: "Old Prince Premium Perros Adultos x 20 Kg", value: "Old Prince Premium Perros Adultos x 20 Kg" },
  { label: "Old Prince Premium Perros Adultos x 3 Kg", value: "Old Prince Premium Perros Adultos x 3 Kg" },
  { label: "Old Prince Premium Perros Cachorro x 15 Kg", value: "Old Prince Premium Perros Cachorro x 15 Kg" },
  { label: "Old Prince Premium Perros Cachorro x 3 Kg", value: "Old Prince Premium Perros Cachorro x 3 Kg" },
  { label: "Old Prince Proteínas Cordero y Arroz Perro Adulto Raza Pequeña x 15 kg", value: "Old Prince Proteínas Cordero y Arroz Perro Adulto Raza Pequeña x 15 kg" },
  { label: "Old Prince Proteínas Cordero y Arroz Perro Adulto Raza Pequeña x 3 kg", value: "Old Prince Proteínas Cordero y Arroz Perro Adulto Raza Pequeña x 3 kg" },
  { label: "Old Prince Proteínas Cordero y Arroz Perro Adulto Raza Pequeña x 7,5kg", value: "Old Prince Proteínas Cordero y Arroz Perro Adulto Raza Pequeña x 7,5kg" },
  { label: "Old Prince Proteínas Especial Cerdo y Legumbres Adulto Perro  x 3Kg.", value: "Old Prince Proteínas Especial Cerdo y Legumbres Adulto Perro  x 3Kg." },
  { label: "Old Prince Proteínas Especial Cerdo y Legumbres Adulto Perro x 15Kg.", value: "Old Prince Proteínas Especial Cerdo y Legumbres Adulto Perro x 15Kg." },
  { label: "Old Prince Weigth Control x 15 kg", value: "Old Prince Weigth Control x 15 kg" },
  { label: "Old Prince Weigth Control x 3 kg", value: "Old Prince Weigth Control x 3 kg" },
  { label: "Origen by Company Perro Adulto x 20 kg", value: "Origen by Company Perro Adulto x 20 kg" },
  { label: "Polivitamínico Hidrodispersable x 250 gr.", value: "Polivitamínico Hidrodispersable x 250 gr." },
  { label: "Prazicuantel plus", value: "Prazicuantel plus" },
  { label: "Puaj x 100 ml", value: "Puaj x 100 ml" },
  { label: "Rubicat Aromatizada Lavanda Arena Bidón x 5.3kg. ", value: "Rubicat Aromatizada Lavanda Arena Bidón x 5.3kg. " },
  { label: "Rubicat Classic Arena Bidón x 5.3kg. ", value: "Rubicat Classic Arena Bidón x 5.3kg. " },
  { label: "Rubicat Classic Pack Ahorro x 15 kg", value: "Rubicat Classic Pack Ahorro x 15 kg" },
  { label: "Rubicat Silver x3,8 kg", value: "Rubicat Silver x3,8 kg" },
  { label: "Seguidor Adulto Carne y Cereales x 15 kg (21% PROT.)", value: "Seguidor Adulto Carne y Cereales x 15 kg (21% PROT.)" },
  { label: "Seguidor Adulto Carne y Cereales x 20 kg (21% PROT.)", value: "Seguidor Adulto Carne y Cereales x 20 kg (21% PROT.)" },
  { label: "Seguidor Adulto Carne y Cereales x 8 kg (21% PROT.)", value: "Seguidor Adulto Carne y Cereales x 8 kg (21% PROT.)" },
  { label: "Seguidor Adulto Mordida Pequeña x 15 kg (21% PROT.)", value: "Seguidor Adulto Mordida Pequeña x 15 kg (21% PROT.)" },
  { label: "Seguidor Adulto Mordida Pequeña x 8 kg (21% PROT.)", value: "Seguidor Adulto Mordida Pequeña x 8 kg (21% PROT.)" },
  { label: "Seguidor Cachorro  x 8 kg", value: "Seguidor Cachorro  x 8 kg" },
  { label: "Seguidor Cachorro Carne y Cereales x 15 kg", value: "Seguidor Cachorro Carne y Cereales x 15 kg" },
  { label: "Shampoo c/acondicionador x 250 ml", value: "Shampoo c/acondicionador x 250 ml" },
  { label: "Shampoo Cachorro x 250", value: "Shampoo Cachorro x 250" },
  { label: "Shampoo Pulguicida-Garrapaticida x 250 ml", value: "Shampoo Pulguicida-Garrapaticida x 250 ml" },
  { label: "Simparica 10MG (2,5-5 kg)", value: "Simparica 10MG (2,5-5 kg)" },
  { label: "Simparica 120MG (40-60 kg)", value: "Simparica 120MG (40-60 kg)" },
  { label: "Simparica 20MG (5-10 kg)", value: "Simparica 20MG (5-10 kg)" },
  { label: "Simparica 40MG (10-20 kg)", value: "Simparica 40MG (10-20 kg)" },
  { label: "Simparica 5MG (1,3-2,5 kg)", value: "Simparica 5MG (1,3-2,5 kg)" },
  { label: "Simparica 80MG (20-40 kg)", value: "Simparica 80MG (20-40 kg)" },
  { label: "Sitogen Max x 4 comprimidos.", value: "Sitogen Max x 4 comprimidos." },
  { label: "Vermicam Gotero x 20 ml", value: "Vermicam Gotero x 20 ml" }
];

function CargarPedido({ user }) {
  const [form, setForm] = useState({
    fecha: null,
    cliente: "",
    items: [{ producto: null, cantidad: 1 }],
    estadoRecepcion: "pendiente",
    condicion: "contado",
    observaciones: ""
  });
  const [loading, setLoading] = useState(false);
  const toast = useRef(null);

  const validar = () => {
    if (!form.fecha) return "La fecha es obligatoria";
    if (!form.cliente.trim()) return "El nombre del cliente es obligatorio";
    if (!form.items.length || form.items.some(i => !i.producto || !i.cantidad || i.cantidad < 1)) return "Debes agregar al menos un producto y cantidad válida";
    if (!form.condicion) return "La condición es obligatoria";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validar();
    if (error) {
      toast.current.show({ severity: "error", summary: "Error", detail: error });
      return;
    }
    
    setLoading(true);
    try {
      await addDoc(collection(db, "pedidosClientes"), {
        fecha: form.fecha,
        cliente: form.cliente.trim(),
        items: form.items,
        estadoRecepcion: user.role === "admin" ? form.estadoRecepcion : "pendiente",
        condicion: form.condicion,
        observaciones: form.observaciones.trim(),
        cobrador: user.role === "admin" ? "admin" : user.role,
        fechaCreacion: new Date()
      });
      
      toast.current.show({ 
        severity: "success", 
        summary: "Guardado", 
        detail: "Pedido del cliente registrado exitosamente" 
      });
      
      // Limpiar formulario
      setForm({
        fecha: null,
        cliente: "",
        items: [{ producto: null, cantidad: 1 }],
        estadoRecepcion: "pendiente",
        condicion: "contado",
        observaciones: ""
      });
    } catch (err) {
      console.error("Error al guardar pedido:", err);
      toast.current.show({ 
        severity: "error", 
        summary: "Error", 
        detail: "No se pudo guardar el pedido" 
      });
    }
    setLoading(false);
  };

  return (
    <div className="p-p-3 p-p-md-4 p-p-lg-5" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <Toast ref={toast} />
      
      <Card className="p-fluid">
        <div className="p-text-center p-mb-4">
          <i className="pi pi-shopping-cart p-text-4xl p-text-primary" style={{ marginBottom: "1rem" }}></i>
          <h2 className="p-m-0 p-text-xl p-text-md-2xl" style={{ color: "#1f2937" }}>Cargar Pedido de Cliente</h2>
          <p className="p-mt-2 p-mb-0 p-text-sm" style={{ color: "#6b7280" }}>
            Registra los pedidos que realizan los clientes
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
            <div className="p-col-12 p-md-6">
              <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                Nombre del Cliente *
              </label>
              <InputText 
                value={form.cliente} 
                onChange={e => setForm({ ...form, cliente: e.target.value })} 
                placeholder="Ingresa el nombre del cliente"
                className="p-fluid"
                required 
              />
            </div>

            <div className="p-col-12 p-md-6">
              <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                Fecha del Pedido *
              </label>
              <Calendar 
                value={form.fecha} 
                onChange={e => setForm({ ...form, fecha: e.value })} 
                dateFormat="dd/mm/yy" 
                showIcon 
                placeholder="Selecciona la fecha"
                className="p-fluid"
                required 
              />
            </div>

            <div className="p-col-12">
              <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                Ítems del Pedido *
              </label>
              {form.items.map((item, idx) => (
                <div key={idx} className="p-d-flex p-ai-center p-mb-2" style={{ gap: 8 }}>
                  <Dropdown 
                    value={item.producto}
                    options={PRODUCTOS}
                    onChange={e => {
                      const items = [...form.items];
                      items[idx].producto = e.value;
                      setForm({ ...form, items });
                    }}
                    placeholder="Producto"
                    className="p-mr-2"
                    style={{ minWidth: 180 }}
                  />
                  <InputText 
                    type="number"
                    min={1}
                    value={item.cantidad}
                    onChange={e => {
                      const items = [...form.items];
                      items[idx].cantidad = parseInt(e.target.value) || 1;
                      setForm({ ...form, items });
                    }}
                    placeholder="Cantidad"
                    style={{ width: 90 }}
                  />
                  {form.items.length > 1 && (
                    <Button icon="pi pi-trash" className="p-button-danger p-button-sm" type="button"
                      onClick={() => {
                        const items = form.items.filter((_, i) => i !== idx);
                        setForm({ ...form, items });
                      }}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </div>
              ))}
              <Button icon="pi pi-plus" label="Agregar ítem" type="button" className="p-button-sm p-button-outlined"
                onClick={() => setForm({ ...form, items: [...form.items, { producto: null, cantidad: 1 }] })}
                style={{ marginTop: 4 }}
              />
            </div>

            <div className="p-col-12 p-md-6">
              <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                Condición *
              </label>
              <Dropdown 
                value={form.condicion} 
                options={CONDICIONES} 
                onChange={e => setForm({ ...form, condicion: e.value })} 
                placeholder="Selecciona la condición"
                className="p-fluid"
                required
              />
            </div>

            {user.role === "admin" && (
              <div className="p-col-12 p-md-6">
                <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                  Estado de Recepción
                </label>
                <Dropdown 
                  value={form.estadoRecepcion} 
                  options={ESTADO_RECEPCION} 
                  onChange={e => setForm({ ...form, estadoRecepcion: e.value })} 
                  placeholder="Selecciona el estado"
                  className="p-fluid"
                />
              </div>
            )}

            <div className="p-col-12">
              <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                Observaciones
              </label>
              <InputTextarea 
                value={form.observaciones} 
                onChange={e => setForm({ ...form, observaciones: e.target.value })} 
                placeholder="Agrega observaciones adicionales..."
                rows={3}
                className="p-fluid"
              />
            </div>

            <div className="p-col-12">
              <Button 
                type="submit" 
                label={loading ? "Guardando..." : "Guardar Pedido"} 
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

export default CargarPedido; 
import React, { useEffect, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { getAlegraInvoices } from '../../services/alegra';
import { Dialog } from 'primereact/dialog';
import { db } from '../../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';

const COBRADORES = [
  { label: "Mariano", value: "Mariano" },
  { label: "Ruben", value: "Ruben" },
  { label: "Diego", value: "Diego" },
  { label: "Guille", value: "Guille" },
  { label: "Santi", value: "Santi" },
  { label: "German", value: "German" }
];

const FacturasAlegra = () => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFacturas, setSelectedFacturas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ nombre: '', fecha: null, cobrador: '' });
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    getAlegraInvoices()
      .then(data => {
        setFacturas(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleAbrirModal = () => {
    setModalVisible(true);
  };

  const validar = () => {
    if (!form.nombre.trim()) return "El nombre es obligatorio";
    if (!form.fecha) return "La fecha es obligatoria";
    if (!form.cobrador) return "Debes seleccionar el cobrador";
    if (selectedFacturas.length === 0) return "Debes seleccionar al menos una factura";
    return null;
  };

  const handleCrearHojaDeRuta = async (e) => {
    e.preventDefault();
    const error = validar();
    if (error) {
      alert(error);
      return;
    }
    setCreando(true);
    try {
      await addDoc(collection(db, "hojasDeRuta"), {
        nombre: form.nombre,
        fecha: form.fecha,
        cobrador: form.cobrador,
        facturas: selectedFacturas.map(f => f.id),
        pedidos: [] // Por compatibilidad, si se usan pedidos
      });
      setModalVisible(false);
      setSelectedFacturas([]);
      setForm({ nombre: '', fecha: null, cobrador: '' });
    } catch (err) {
      alert('Error al crear hoja de ruta: ' + err.message);
    }
    setCreando(false);
  };

  if (loading) return <p>Cargando facturas...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div>
      <h2>Facturas de Venta (Alegra)</h2>
      <Button
        label="Crear hoja de ruta con seleccionadas"
        icon="pi pi-plus"
        className="p-button-success p-mb-3"
        disabled={selectedFacturas.length === 0}
        onClick={handleAbrirModal}
      />
      <DataTable
        value={facturas}
        paginator
        rows={10}
        responsiveLayout="scroll"
        selection={selectedFacturas}
        onSelectionChange={e => setSelectedFacturas(e.value)}
        dataKey="id"
        selectionMode="multiple"
      >
        <Column selectionMode="multiple" headerStyle={{ width: '3em' }} />
        <Column field="id" header="ID" />
        <Column field="date" header="Fecha" />
        <Column field="client.name" header="Cliente" />
        <Column field="total" header="Total" />
        <Column field="status" header="Estado" />
      </DataTable>
      <Dialog header="Crear Hoja de Ruta" visible={modalVisible} style={{ width: '350px' }} onHide={() => setModalVisible(false)}>
        <form onSubmit={handleCrearHojaDeRuta}>
          <div className="p-field">
            <label>Nombre *</label>
            <InputText value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="p-fluid" required />
          </div>
          <div className="p-field">
            <label>Fecha *</label>
            <Calendar value={form.fecha} onChange={e => setForm({ ...form, fecha: e.value })} dateFormat="dd/mm/yy" showIcon className="p-fluid" required />
          </div>
          <div className="p-field">
            <label>Cobrador *</label>
            <Dropdown value={form.cobrador} options={COBRADORES} onChange={e => setForm({ ...form, cobrador: e.value })} placeholder="Selecciona cobrador" className="p-fluid" required />
          </div>
          <div className="p-field">
            <label>Facturas seleccionadas</label>
            <ul style={{ paddingLeft: 18 }}>
              {selectedFacturas.map(f => (
                <li key={f.id}>{f.client?.name || f.id} ({f.date})</li>
              ))}
            </ul>
          </div>
          <div className="p-d-flex p-jc-end p-mt-3" style={{ gap: 8 }}>
            <Button type="button" label="Cancelar" className="p-button-text" onClick={() => setModalVisible(false)} />
            <Button type="submit" label="Crear" icon="pi pi-save" loading={creando} className="p-button-primary" />
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default FacturasAlegra; 
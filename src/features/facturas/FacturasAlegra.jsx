import React, { useEffect, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { getAlegraInvoices } from '../../services/alegra';
import { Dialog } from 'primereact/dialog';
import { db } from '../../services/firebase';
import { collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import HojaDeRutaForm from '../hojasderuta/HojaDeRutaForm';

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
  const [hojasDeRuta, setHojasDeRuta] = useState([]);

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

  // Obtener hojas de ruta pendientes desde Firestore
  useEffect(() => {
    const q = query(collection(db, 'hojasDeRuta'), orderBy('fecha', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        const hoja = { id: doc.id, ...doc.data() };
        if (hoja.estado === 'pendiente') data.push(hoja);
      });
      setHojasDeRuta(data);
    });
    return () => unsubscribe();
  }, []);

  const handleAbrirModal = () => {
    console.log('[FacturasAlegra] Handler abrir modal. selectedFacturas:', selectedFacturas);
    if (selectedFacturas.length === 0) {
      alert('Selecciona al menos una factura.');
      return;
    }
    setModalVisible(true);
    console.log('[FacturasAlegra] Modal debería abrirse.');
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
        onSelectionChange={e => {
          setSelectedFacturas(e.value);
          console.log('[FacturasAlegra] onSelectionChange:', e.value);
        }}
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
      {/* Modal con el formulario modular para hoja de ruta */}
      {modalVisible && (
        (() => { console.log('[FacturasAlegra] Renderizando HojaDeRutaForm, modalVisible:', modalVisible, 'selectedFacturas:', selectedFacturas); return null; })() ||
        <HojaDeRutaForm
          visible={modalVisible}
          onHide={() => setModalVisible(false)}
          pedidosSeleccionados={selectedFacturas.map(f => ({
            id: f.id,
            cliente: f.client?.name || f.id,
            fecha: { toDate: () => new Date(f.date) },
            items: f.items || [],
            estadoFactura: f.status
          }))}
          onSave={() => {
            setSelectedFacturas([]);
            setModalVisible(false);
          }}
        />
      )}
      {/* Lista de hojas de ruta pendientes */}
      <div style={{ marginTop: 32 }}>
        <h3>Hojas de Ruta Pendientes</h3>
        <DataTable value={hojasDeRuta} dataKey="id" paginator rows={5} responsiveLayout="stack" emptyMessage="No hay hojas de ruta pendientes." className="p-datatable-sm p-fluid p-mt-3">
          <Column field="fecha" header="Fecha" body={row => row.fecha?.toDate ? row.fecha.toDate().toLocaleDateString('es-AR') : ''} />
          <Column field="responsable" header="Responsable" />
          <Column field="pedidos" header="Facturas agrupadas" body={row => row.pedidos?.map(p => p.cliente).join(', ')} />
          <Column field="estado" header="Estado" />
        </DataTable>
      </div>
    </div>
  );
};

export default FacturasAlegra; 
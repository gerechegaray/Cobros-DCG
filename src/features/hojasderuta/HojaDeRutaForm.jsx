import React, { useState, useEffect } from 'react';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { db } from '../../services/firebase';
import { collection, addDoc, Timestamp, updateDoc, doc } from 'firebase/firestore';

const RESPONSABLES = [
  { label: 'Mariano', value: 'Mariano' },
  { label: 'Ruben', value: 'Ruben' },
  { label: 'Diego', value: 'Diego' },
  { label: 'Guille', value: 'Guille' },
  { label: 'Santi', value: 'Santi' },
  { label: 'German', value: 'German' }
];

export default function HojaDeRutaForm({ visible, onHide, pedidosSeleccionados, onSave, edicion = false, hojaId, hojaData }) {
  // Si es edición, inicializar con los datos de la hoja
  const [fecha, setFecha] = useState(edicion && hojaData ? hojaData.fecha?.toDate ? hojaData.fecha.toDate() : hojaData.fecha : new Date());
  const [responsable, setResponsable] = useState(edicion && hojaData ? hojaData.responsable : null);
  const [ordenPedidos, setOrdenPedidos] = useState(edicion && hojaData ? [...(hojaData.pedidos || [])] : [...pedidosSeleccionados]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (edicion && hojaData) {
      setFecha(hojaData.fecha?.toDate ? hojaData.fecha.toDate() : hojaData.fecha);
      setResponsable(hojaData.responsable);
      setOrdenPedidos([...(hojaData.pedidos || [])]);
    } else if (!edicion) {
      setFecha(new Date());
      setResponsable(null);
      setOrdenPedidos([...pedidosSeleccionados]);
    }
    // eslint-disable-next-line
  }, [visible, edicion, hojaData, pedidosSeleccionados]);

  const moverPedido = (idx, dir) => {
    const nuevoOrden = [...ordenPedidos];
    const nuevoIdx = idx + dir;
    if (nuevoIdx < 0 || nuevoIdx >= nuevoOrden.length) return;
    const temp = nuevoOrden[idx];
    nuevoOrden[idx] = nuevoOrden[nuevoIdx];
    nuevoOrden[nuevoIdx] = temp;
    setOrdenPedidos(nuevoOrden);
  };

  const handleGuardar = async () => {
    if (!fecha || (!responsable && !ordenPedidos[0]?.cobrador) || ordenPedidos.length === 0) {
      alert('Completa todos los campos obligatorios.');
      return;
    }
    setGuardando(true);
    const datosAGuardar = {
      fecha: Timestamp.fromDate(fecha),
      responsable: responsable || ordenPedidos[0]?.cobrador || '',
      pedidos: ordenPedidos.map(p => ({
        id: p.id,
        cliente: p.cliente,
        detalle: p.detalle || p.items || [],
        estado: p.estadoFactura || p.estado || '',
      })),
      estado: hojaData?.estado || 'pendiente',
      creadoEn: hojaData?.creadoEn || Timestamp.now()
    };
    try {
      if (edicion && hojaId) {
        await updateDoc(doc(db, 'hojasDeRuta', hojaId), datosAGuardar);
      } else {
        await addDoc(collection(db, 'hojasDeRuta'), datosAGuardar);
      }
      onSave && onSave();
      onHide();
    } catch (e) {
      alert('Error al guardar la hoja de ruta: ' + e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog header={edicion ? "Editar Hoja de Ruta" : "Crear Hoja de Ruta"} visible={visible} style={{ width: '32rem' }} onHide={onHide} modal>
      <div className="p-fluid" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label>Fecha</label>
          <Calendar value={fecha} onChange={e => setFecha(e.value)} showIcon dateFormat="dd/mm/yy" />
        </div>
        <div>
          <label>Responsable</label>
          <Dropdown value={responsable} options={RESPONSABLES} onChange={e => setResponsable(e.value)} placeholder="Selecciona responsable" />
        </div>
        <div>
          <label>Pedidos seleccionados (ordena con flechas)</label>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {ordenPedidos.map((pedido, idx) => (
              <li key={pedido.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 8 }}>
                <span style={{ flex: 1 }}>{pedido.cliente} - {pedido.fecha?.toDate ? pedido.fecha.toDate().toLocaleDateString('es-AR') : pedido.fecha?.toLocaleDateString ? pedido.fecha.toLocaleDateString('es-AR') : ''}</span>
                <Button icon="pi pi-arrow-up" className="p-button-text" onClick={() => moverPedido(idx, -1)} disabled={idx === 0} />
                <Button icon="pi pi-arrow-down" className="p-button-text" onClick={() => moverPedido(idx, 1)} disabled={idx === ordenPedidos.length - 1} />
              </li>
            ))}
          </ul>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <Button label="Cancelar" className="p-button-secondary" onClick={onHide} disabled={guardando} />
          <Button label={edicion ? "Guardar Cambios" : "Guardar Hoja de Ruta"} icon="pi pi-save" onClick={handleGuardar} loading={guardando} disabled={!fecha || !responsable || ordenPedidos.length === 0} />
        </div>
      </div>
    </Dialog>
  );
} 
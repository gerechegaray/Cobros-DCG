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

export default function HojaDeRutaForm({ visible, onHide, pedidosSeleccionados, onSave, edicion = false, hojaId, hojaData, facturasDisponibles = [], user }) {
  // Si es edición, inicializar con los datos de la hoja
  const [fecha, setFecha] = useState(edicion && hojaData ? hojaData.fecha?.toDate ? hojaData.fecha.toDate() : hojaData.fecha : new Date());
  const [responsable, setResponsable] = useState(edicion && hojaData ? hojaData.responsable : null);
  const [ordenPedidos, setOrdenPedidos] = useState(edicion && hojaData ? [...(hojaData.pedidos || [])] : [...pedidosSeleccionados]);
  const [guardando, setGuardando] = useState(false);
  const [mostrarSelectorFacturas, setMostrarSelectorFacturas] = useState(false);

  // 🆕 Verificar si el usuario es admin
  const esAdmin = user?.role === 'admin';
  
  // 🆕 Verificar si el usuario es vendedor (Guille o Santi)
  const esVendedor = user?.role === 'Guille' || user?.role === 'Santi';
  
  // 🆕 Establecer responsable automáticamente para vendedores
  useEffect(() => {
    if (!edicion && esVendedor && !responsable) {
      // Si es vendedor y no es edición, establecer automáticamente el responsable
      setResponsable(user.role);
    }
  }, [edicion, esVendedor, responsable, user.role]);

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

  // 🆕 Filtrar facturas disponibles (las que no están en la hoja de ruta)
  const facturasParaAgregar = facturasDisponibles.filter(factura => 
    !ordenPedidos.find(pedido => pedido.id === factura.id)
  );

  const moverPedido = (idx, dir) => {
    const nuevoOrden = [...ordenPedidos];
    const nuevoIdx = idx + dir;
    if (nuevoIdx < 0 || nuevoIdx >= nuevoOrden.length) return;
    const temp = nuevoOrden[idx];
    nuevoOrden[idx] = nuevoOrden[nuevoIdx];
    nuevoOrden[nuevoIdx] = temp;
    setOrdenPedidos(nuevoOrden);
  };

  // 🆕 Función para eliminar pedido
  const eliminarPedido = (pedidoId) => {
    setOrdenPedidos(prev => prev.filter(p => p.id !== pedidoId));
  };

  // 🆕 Función para agregar factura
  const agregarFactura = (factura) => {
    const nuevoPedido = {
      id: factura.id,
      cliente: factura.client?.name || factura.id,
      fecha: { toDate: () => new Date(factura.date) },
      items: factura.items || [],
      estadoFactura: factura.status,
      total: factura.total || 0 // 🆕 Agregar el total de la factura
    };
    setOrdenPedidos(prev => [...prev, nuevoPedido]);
    setMostrarSelectorFacturas(false);
  };

  const handleGuardar = async () => {
    if (!fecha || (!responsable && !ordenPedidos[0]?.cobrador) || ordenPedidos.length === 0) {
      alert('Completa todos los campos obligatorios.');
      return;
    }
    setGuardando(true);
    const datosAGuardar = {
      fecha: Timestamp.fromDate(fecha),
      fechaCreacion: Timestamp.now(), // 🆕 Agregar fecha de creación
      responsable: responsable || ordenPedidos[0]?.cobrador || '',
      pedidos: ordenPedidos.map(p => ({
        id: p.id,
        cliente: p.cliente,
        detalle: p.detalle || p.items || [],
        estado: p.estadoFactura || p.estado || '',
        entregado: p.entregado || false, // 🆕 Mantener estado de entrega
        total: p.total || 0 // 🆕 Guardar el total de la factura
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
    <>
      <Dialog 
        header={edicion ? "Editar Hoja de Ruta" : "Crear Hoja de Ruta"} 
        visible={visible} 
        style={{ width: '40rem' }} 
        onHide={onHide} 
        modal
      >
        <div className="p-fluid" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="grid">
            <div className="col-12 md:col-6">
              <label className="block text-900 font-medium mb-2">Fecha</label>
              <Calendar 
                value={fecha} 
                onChange={(e) => setFecha(e.value)} 
                dateFormat="dd/mm/yyyy"
                showIcon
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6">
              <label className="block text-900 font-medium mb-2">Responsable</label>
              <Dropdown
                value={responsable}
                options={RESPONSABLES}
                onChange={(e) => setResponsable(e.value)}
                placeholder="Selecciona un responsable"
                className="w-full"
                disabled={!esAdmin} // 🆕 Solo admin puede cambiar responsable
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-content-between align-items-center mb-3">
              <label className="block text-900 font-medium">Pedidos ({ordenPedidos.length})</label>
              {edicion && esAdmin && ( // 🆕 Solo admin puede agregar facturas en edición
                <Button
                  label="+ Agregar Factura"
                  icon="pi pi-plus"
                  className="p-button-success p-button-sm"
                  onClick={() => setMostrarSelectorFacturas(true)}
                  disabled={facturasParaAgregar.length === 0}
                />
              )}
            </div>
            
            {ordenPedidos.length === 0 ? (
              <div className="text-center p-4 border-round surface-100">
                <p className="text-gray-500">No hay pedidos seleccionados</p>
              </div>
            ) : (
              <div className="border-round surface-100 p-3">
                {ordenPedidos.map((pedido, idx) => (
                  <div key={pedido.id} className="flex align-items-center gap-2 p-2 border-round surface-50 mb-2">
                    <span className="flex-1">
                      <span className="font-bold">{idx + 1}.</span> {pedido.cliente}
                      {pedido.entregado && <span className="text-green-600 ml-1">✅</span>}
                    </span>
                    <div className="flex gap-1">
                      {(esAdmin || esVendedor) && ( // 🆕 Admin y vendedores pueden cambiar orden
                        <>
                          <Button
                            icon="pi pi-arrow-up"
                            className="p-button-text p-button-sm"
                            onClick={() => moverPedido(idx, -1)}
                            disabled={idx === 0}
                            tooltip="Mover arriba"
                          />
                          <Button
                            icon="pi pi-arrow-down"
                            className="p-button-text p-button-sm"
                            onClick={() => moverPedido(idx, 1)}
                            disabled={idx === ordenPedidos.length - 1}
                            tooltip="Mover abajo"
                          />
                        </>
                      )}
                      {edicion && esAdmin && ( // 🆕 Solo admin puede eliminar pedidos
                        <Button
                          icon="pi pi-trash"
                          className="p-button-danger p-button-sm"
                          onClick={() => eliminarPedido(pedido.id)}
                          tooltip="Eliminar pedido"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <Button label="Cancelar" className="p-button-secondary" onClick={onHide} disabled={guardando} />
            <Button 
              label={edicion ? "Guardar Cambios" : "Guardar Hoja de Ruta"} 
              icon="pi pi-save" 
              onClick={handleGuardar} 
              loading={guardando} 
              disabled={!fecha || (!responsable && esAdmin) || ordenPedidos.length === 0} 
            />
          </div>
        </div>
      </Dialog>

      {/* 🆕 Modal para seleccionar facturas adicionales */}
      {mostrarSelectorFacturas && (
        <Dialog
          header="Agregar Factura"
          visible={mostrarSelectorFacturas}
          style={{ width: '50rem' }}
          onHide={() => setMostrarSelectorFacturas(false)}
          modal
        >
          <div className="p-3">
            <p className="mb-3">Selecciona una factura para agregar a la hoja de ruta:</p>
            <div className="grid">
              {facturasParaAgregar.map((factura) => (
                <div key={factura.id} className="col-12 md:col-6">
                  <div className="p-3 border-round surface-100">
                    <div className="flex justify-content-between align-items-start">
                      <div className="flex-1">
                        <div className="font-bold">{factura.client?.name || factura.id}</div>
                        <div className="text-sm text-gray-600">
                          Fecha: {factura.date}
                        </div>
                        <div className="text-sm text-gray-600">
                          Total: ${factura.total?.toLocaleString('es-AR') || 0}
                        </div>
                      </div>
                      <Button
                        label="Agregar"
                        icon="pi pi-plus"
                        className="p-button-success p-button-sm"
                        onClick={() => agregarFactura(factura)}
                        tooltip="Agregar esta factura a la hoja de ruta"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {facturasParaAgregar.length === 0 && (
              <div className="text-center p-3">
                <p className="text-gray-500">No hay facturas disponibles para agregar</p>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
} 
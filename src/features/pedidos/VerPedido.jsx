import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { ProgressSpinner } from 'primereact/progressspinner';
import { formatearFecha, formatearMoneda } from './utils';
import { getLabelEstado, getColorEstado, getLabelCondicionPago } from './constants';
import './VerPedido.css';

const VerPedido = ({ visible, onHide, pedido }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && pedido) {
      setLoading(true);
      // Simular un pequeño delay para mostrar el spinner
      const timer = setTimeout(() => {
        setLoading(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [visible, pedido]);

  if (!pedido) return null;

  const footer = (
    <div className="flex justify-content-end">
      <Button
        label="Cerrar"
        icon="pi pi-times"
        className="p-button-text"
        onClick={onHide}
      />
    </div>
  );

  return (
      <Dialog
        visible={visible}
        onHide={onHide}
        header="Detalles del Pedido"
        footer={footer}
        style={{ width: '90vw', maxWidth: '800px' }}
        breakpoints={{ 
          '960px': '95vw', 
          '768px': '98vw',
          '480px': '100vw'
        }}
        modal
        className="p-fluid"
        dismissableMask={true}
        closable={true}
      >
      {loading ? (
        <div className="flex justify-content-center align-items-center" style={{ height: '200px' }}>
          <ProgressSpinner />
        </div>
      ) : (
        <div className="grid">
        {/* Información básica */}
        <div className="col-12">
          <div className="p-3 border-1 border-200 border-round mb-3">
            <h4 className="mt-0 mb-3 text-900">Información del Pedido</h4>
            
            <div className="grid">
              <div className="col-12">
                <div className="mb-2">
                  <strong>Cliente:</strong> {pedido.cliente}
                </div>
              </div>
              
              <div className="col-12 md:col-6">
                <div className="mb-2">
                  <strong>Fecha:</strong> {formatearFecha(pedido.fechaPedido)}
                </div>
              </div>
              
              <div className="col-12 md:col-6">
                <div className="mb-2">
                  <strong>Condición:</strong> {getLabelCondicionPago(pedido.condicionPago || 'contado')}
                </div>
              </div>
              
              <div className="col-12 md:col-6">
                <div className="mb-2">
                  <strong>Estado:</strong> 
                  <Tag 
                    value={getLabelEstado(pedido.estado || 'pendiente')} 
                    severity={getColorEstado(pedido.estado || 'pendiente')}
                    className="ml-2"
                  />
                </div>
              </div>
              
              <div className="col-12 md:col-6">
                <div className="mb-2">
                  <strong>Vendedor:</strong> {pedido.vendedorNombre || pedido.vendedor}
                </div>
              </div>
              
              <div className="col-12">
                <div className="mb-2">
                  <strong>Total:</strong> 
                  <span className="text-green-600 font-bold text-xl ml-2">
                    {formatearMoneda(pedido.total || 0)}
                  </span>
                </div>
              </div>
            </div>
            
            {pedido.observaciones && (
              <div className="mt-3 pt-3 border-top-1 border-200">
                <strong>Observaciones:</strong>
                <p className="mt-1 text-700">{pedido.observaciones}</p>
              </div>
            )}
          </div>
        </div>

        {/* Productos - Solo si existen */}
        {pedido.productos && Array.isArray(pedido.productos) && pedido.productos.length > 0 && (
          <div className="col-12">
            <div className="p-3 border-1 border-200 border-round mb-3">
              <h4 className="mt-0 mb-3 text-900">Productos ({pedido.productos.length})</h4>
              {pedido.productos.slice(0, 5).map((producto, index) => (
                <div key={index} className="mb-2 p-2 border-1 border-100 border-round">
                  <div className="flex justify-content-between">
                    <div className="flex-1">
                      <div className="font-bold">{producto.nombre}</div>
                      <div className="text-sm text-600">
                        {producto.cantidad} × {formatearMoneda(producto.precioUnitario || 0)}
                        {producto.descuento && producto.descuento > 0 && (
                          <span className="text-orange-600"> (Desc: {producto.descuento}%)</span>
                        )}
                      </div>
                    </div>
                    <div className="font-bold text-green-600">
                      {formatearMoneda(producto.total || (producto.cantidad * producto.precioUnitario))}
                    </div>
                  </div>
                </div>
              ))}
              {pedido.productos.length > 5 && (
                <div className="text-center text-600 text-sm">
                  ... y {pedido.productos.length - 5} productos más
                </div>
              )}
            </div>
          </div>
        )}

        {/* Información adicional - Solo si es relevante */}
        {pedido.cargadoEnAlegra && (
          <div className="col-12">
            <div className="p-3 border-1 border-200 border-round mb-3">
              <div className="text-center">
                <Tag value="Cargado en Alegra" severity="success" className="mb-2" />
                {pedido.numeroFactura && (
                  <div className="text-600 text-sm">
                    Factura: {pedido.numeroFactura}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      )}
    </Dialog>
  );
};

export default VerPedido;

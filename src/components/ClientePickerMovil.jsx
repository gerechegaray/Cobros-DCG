import React, { useMemo, useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { leerIdsClientesRecientes } from '../offline/clientesRecientes';

export function nombreCliente(cliente) {
  if (!cliente) return '';
  if (typeof cliente === 'string') return cliente;
  return cliente.name || cliente.nombre || cliente['Razón Social'] || cliente.id || 'Sin nombre';
}

function coincide(cliente, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const nombre = nombreCliente(cliente).toLowerCase();
  const id = String(cliente.identification || cliente.id || '').toLowerCase();
  return nombre.includes(q) || id.includes(q);
}

function ClientePickerMovil({ clientes, value, onChange, loading, disabled }) {
  const [busqueda, setBusqueda] = useState('');

  const recientes = useMemo(() => {
    const ids = new Set(leerIdsClientesRecientes());
    return clientes.filter((cliente) => ids.has(String(cliente.id)));
  }, [clientes]);

  const filtrados = useMemo(
    () => clientes.filter((cliente) => coincide(cliente, busqueda)).slice(0, 40),
    [clientes, busqueda]
  );

  const mostrarRecientes = !busqueda.trim() && recientes.length > 0;

  if (value) {
    return (
      <div className="cliente-picker-movil">
        <button
          type="button"
          className="cliente-picker-movil__elegido"
          onClick={() => {
            setBusqueda('');
            onChange(null);
          }}
          disabled={disabled}
        >
          <span>{nombreCliente(value)}</span>
          <span className="cliente-picker-movil__cambiar">cambiar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="cliente-picker-movil">
      <InputText
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder={loading ? 'Cargando clientes...' : 'Buscar cliente'}
        className="w-full pedido-busqueda"
        disabled={disabled || loading}
      />

      {mostrarRecientes && (
        <div className="cliente-picker-movil__bloque">
          <div className="cliente-picker-movil__titulo">Recientes</div>
          {recientes.map((cliente) => (
            <button
              key={`rec-${cliente.id}`}
              type="button"
              className="cliente-picker-movil__item"
              onClick={() => onChange(cliente)}
              disabled={disabled}
            >
              {nombreCliente(cliente)}
            </button>
          ))}
        </div>
      )}

      <div className="cliente-picker-movil__bloque">
        <div className="cliente-picker-movil__titulo">
          {busqueda.trim() ? 'Resultados' : 'Clientes'}
        </div>
        {filtrados.length === 0 && !loading && (
          <div className="cliente-picker-movil__vacio">No hay coincidencias</div>
        )}
        {filtrados.map((cliente) => (
          <button
            key={cliente.id}
            type="button"
            className="cliente-picker-movil__item"
            onClick={() => onChange(cliente)}
            disabled={disabled}
          >
            <span className="cliente-picker-movil__nombre">{nombreCliente(cliente)}</span>
            {cliente.identification && (
              <span className="cliente-picker-movil__id">{cliente.identification}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ClientePickerMovil;

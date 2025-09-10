import React, { useState, useEffect, useMemo } from 'react';
import { InputText, Button, Dropdown, Calendar, InputNumber, Accordion, AccordionTab } from 'primereact';
import { formatMonto, formatFecha } from './utils';
import { categoriasGastos, estadosGastos } from './constants';

const BusquedaGastos = ({ gastos, onFiltrar, onLimpiar }) => {
  const [busqueda, setBusqueda] = useState('');
  const [expandido, setExpandido] = useState(false);
  const [filtros, setFiltros] = useState({
    categoria: 'todas',
    estado: 'todos',
    rangoFechas: { desde: null, hasta: null },
    rangoMontos: { min: null, max: null },
    soloVencidos: false,
    soloPendientes: false
  });

  // Aplicar filtros automáticamente cuando cambien
  useEffect(() => {
    const gastosFiltrados = aplicarFiltros(gastos, { ...filtros, busqueda });
    onFiltrar(gastosFiltrados);
  }, [gastos, filtros, busqueda, onFiltrar]);

  const aplicarFiltros = (gastos, filtros) => {
    let resultado = [...gastos];

    // Búsqueda por texto
    if (filtros.busqueda) {
      const texto = filtros.busqueda.toLowerCase();
      resultado = resultado.filter(gasto => 
        gasto.titulo?.toLowerCase().includes(texto) ||
        gasto.categoria?.toLowerCase().includes(texto) ||
        gasto.subcategoria?.toLowerCase().includes(texto) ||
        gasto.nota?.toLowerCase().includes(texto) ||
        gasto.tipoPago?.toLowerCase().includes(texto)
      );
    }

    // Filtro por categoría
    if (filtros.categoria !== 'todas') {
      resultado = resultado.filter(g => g.categoria === filtros.categoria);
    }

    // Filtro por estado
    if (filtros.estado !== 'todos') {
      resultado = resultado.filter(g => g.estado === filtros.estado);
    }

    // Filtro por rango de fechas
    if (filtros.rangoFechas.desde) {
      resultado = resultado.filter(g => {
        const fechaGasto = new Date(g.fechaVencimiento || g.fechaPago);
        return fechaGasto >= filtros.rangoFechas.desde;
      });
    }

    if (filtros.rangoFechas.hasta) {
      resultado = resultado.filter(g => {
        const fechaGasto = new Date(g.fechaVencimiento || g.fechaPago);
        return fechaGasto <= filtros.rangoFechas.hasta;
      });
    }

    // Filtro por rango de montos
    if (filtros.rangoMontos.min !== null) {
      resultado = resultado.filter(g => g.monto >= filtros.rangoMontos.min);
    }

    if (filtros.rangoMontos.max !== null) {
      resultado = resultado.filter(g => g.monto <= filtros.rangoMontos.max);
    }

    // Filtros especiales
    if (filtros.soloVencidos) {
      const hoy = new Date();
      resultado = resultado.filter(g => {
        const fechaVencimiento = new Date(g.fechaVencimiento);
        return fechaVencimiento < hoy && g.estado !== 'pagado';
      });
    }

    if (filtros.soloPendientes) {
      resultado = resultado.filter(g => g.estado === 'pendiente');
    }

    return resultado;
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltros({
      categoria: 'todas',
      estado: 'todos',
      rangoFechas: { desde: null, hasta: null },
      rangoMontos: { min: null, max: null },
      soloVencidos: false,
      soloPendientes: false
    });
    setExpandido(false);
    onLimpiar();
  };

  const opcionesCategorias = [
    { label: 'Todas las categorías', value: 'todas' },
    ...categoriasGastos.map(cat => ({
      label: cat.nombre,
      value: cat.id
    }))
  ];

  const opcionesEstados = [
    { label: 'Todos los estados', value: 'todos' },
    ...estadosGastos.map(estado => ({
      label: estado.nombre,
      value: estado.id
    }))
  ];

  return (
    <div className="p-3 border-round bg-gray-50">
      {/* Búsqueda rápida - siempre visible */}
      <div className="flex gap-3 align-items-center mb-3">
        <div className="flex-1">
          <InputText
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar por título, categoría, nota..."
            className="w-full"
          />
        </div>
        <Button
          icon={expandido ? "pi pi-chevron-up" : "pi pi-chevron-down"}
          onClick={() => setExpandido(!expandido)}
          className="p-button-outlined"
          tooltip={expandido ? "Ocultar filtros" : "Mostrar filtros"}
        />
        <Button
          label="Limpiar"
          icon="pi pi-times"
          className="p-button-text"
          onClick={limpiarFiltros}
        />
      </div>

      {/* Filtros desplegables */}
      {expandido && (
        <div className="grid">
          {/* Filtros básicos */}
          <div className="col-12 md:col-6">
            <label htmlFor="categoria" className="block mb-2 font-semibold">
              Categoría
            </label>
            <Dropdown
              id="categoria"
              value={filtros.categoria}
              onChange={(e) => setFiltros(prev => ({ ...prev, categoria: e.value }))}
              options={opcionesCategorias}
              className="w-full"
            />
          </div>

          <div className="col-12 md:col-6">
            <label htmlFor="estado" className="block mb-2 font-semibold">
              Estado
            </label>
            <Dropdown
              id="estado"
              value={filtros.estado}
              onChange={(e) => setFiltros(prev => ({ ...prev, estado: e.value }))}
              options={opcionesEstados}
              className="w-full"
            />
          </div>

          {/* Filtros de fecha */}
          <div className="col-12 md:col-6">
            <label htmlFor="fechaDesde" className="block mb-2">
              Fecha Desde
            </label>
            <Calendar
              id="fechaDesde"
              value={filtros.rangoFechas.desde}
              onChange={(e) => setFiltros(prev => ({ 
                ...prev, 
                rangoFechas: { ...prev.rangoFechas, desde: e.value } 
              }))}
              dateFormat="dd/mm/yy"
              showIcon
              className="w-full"
              placeholder="Desde"
            />
          </div>

          <div className="col-12 md:col-6">
            <label htmlFor="fechaHasta" className="block mb-2">
              Fecha Hasta
            </label>
            <Calendar
              id="fechaHasta"
              value={filtros.rangoFechas.hasta}
              onChange={(e) => setFiltros(prev => ({ 
                ...prev, 
                rangoFechas: { ...prev.rangoFechas, hasta: e.value } 
              }))}
              dateFormat="dd/mm/yy"
              showIcon
              className="w-full"
              placeholder="Hasta"
            />
          </div>

          {/* Filtros de monto */}
          <div className="col-12 md:col-6">
            <label htmlFor="montoMin" className="block mb-2">
              Monto Mínimo
            </label>
            <InputNumber
              id="montoMin"
              value={filtros.rangoMontos.min}
              onValueChange={(e) => setFiltros(prev => ({ 
                ...prev, 
                rangoMontos: { ...prev.rangoMontos, min: e.value } 
              }))}
              mode="currency"
              currency="ARS"
              locale="es-AR"
              className="w-full"
              placeholder="Mínimo"
            />
          </div>

          <div className="col-12 md:col-6">
            <label htmlFor="montoMax" className="block mb-2">
              Monto Máximo
            </label>
            <InputNumber
              id="montoMax"
              value={filtros.rangoMontos.max}
              onValueChange={(e) => setFiltros(prev => ({ 
                ...prev, 
                rangoMontos: { ...prev.rangoMontos, max: e.value } 
              }))}
              mode="currency"
              currency="ARS"
              locale="es-AR"
              className="w-full"
              placeholder="Máximo"
            />
          </div>

          {/* Filtros especiales */}
          <div className="col-12">
            <div className="flex gap-2 align-items-center flex-wrap">
              <Button
                label="Solo Vencidos"
                icon="pi pi-exclamation-triangle"
                className={filtros.soloVencidos ? 'p-button-warning' : 'p-button-outlined'}
                onClick={() => setFiltros(prev => ({ 
                  ...prev, 
                  soloVencidos: !prev.soloVencidos 
                }))}
              />
              <Button
                label="Solo Pendientes"
                icon="pi pi-clock"
                className={filtros.soloPendientes ? 'p-button-info' : 'p-button-outlined'}
                onClick={() => setFiltros(prev => ({ 
                  ...prev, 
                  soloPendientes: !prev.soloPendientes 
                }))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusquedaGastos;

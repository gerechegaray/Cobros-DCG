import React, { useState, useEffect, useRef } from 'react';
import { InputText, Button, Dropdown, Calendar, InputNumber, OverlayPanel } from 'primereact';
import { categoriasGastos, estadosGastos } from './constants';

const BusquedaCompacta = ({ gastos, onFiltrar, onLimpiar }) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState({
    categoria: 'todas',
    estado: 'todos',
    rangoFechas: { desde: null, hasta: null },
    rangoMontos: { min: null, max: null },
    soloVencidos: false,
    soloPendientes: false
  });
  const overlayRef = useRef(null);

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

  // Contar filtros activos
  const filtrosActivos = [
    filtros.categoria !== 'todas',
    filtros.estado !== 'todos',
    filtros.rangoFechas.desde !== null,
    filtros.rangoFechas.hasta !== null,
    filtros.rangoMontos.min !== null,
    filtros.rangoMontos.max !== null,
    filtros.soloVencidos,
    filtros.soloPendientes
  ].filter(Boolean).length;

  return (
    <div className="flex gap-2 align-items-center">
      {/* Búsqueda principal */}
      <div className="flex-1">
        <InputText
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar gastos..."
          className="w-full"
        />
      </div>

      {/* Botón de filtros */}
      <Button
        icon="pi pi-filter"
        onClick={(e) => overlayRef.current?.toggle(e)}
        className={filtrosActivos > 0 ? 'p-button-warning' : 'p-button-outlined'}
        tooltip={`Filtros (${filtrosActivos} activos)`}
        aria-label="Filtros"
      />

      {/* Botón limpiar */}
      {filtrosActivos > 0 && (
        <Button
          icon="pi pi-times"
          onClick={limpiarFiltros}
          className="p-button-text"
          tooltip="Limpiar filtros"
          aria-label="Limpiar filtros"
        />
      )}

      {/* Overlay con filtros */}
      <OverlayPanel
        ref={overlayRef}
        style={{ width: '400px' }}
      >
        <div className="p-3">
          <h4 className="mt-0 mb-3">Filtros Avanzados</h4>
          
          <div className="grid">
            {/* Categoría */}
            <div className="col-12">
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

            {/* Estado */}
            <div className="col-12">
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

            {/* Fechas */}
            <div className="col-12">
              <label className="block mb-2 font-semibold">Rango de Fechas</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Calendar
                    value={filtros.rangoFechas.desde}
                    onChange={(e) => setFiltros(prev => ({ 
                      ...prev, 
                      rangoFechas: { ...prev.rangoFechas, desde: e.value } 
                    }))}
                    dateFormat="dd/mm/yy"
                    showIcon
                    placeholder="Desde"
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <Calendar
                    value={filtros.rangoFechas.hasta}
                    onChange={(e) => setFiltros(prev => ({ 
                      ...prev, 
                      rangoFechas: { ...prev.rangoFechas, hasta: e.value } 
                    }))}
                    dateFormat="dd/mm/yy"
                    showIcon
                    placeholder="Hasta"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Montos */}
            <div className="col-12">
              <label className="block mb-2 font-semibold">Rango de Montos</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <InputNumber
                    value={filtros.rangoMontos.min}
                    onValueChange={(e) => setFiltros(prev => ({ 
                      ...prev, 
                      rangoMontos: { ...prev.rangoMontos, min: e.value } 
                    }))}
                    mode="currency"
                    currency="ARS"
                    locale="es-AR"
                    placeholder="Mínimo"
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <InputNumber
                    value={filtros.rangoMontos.max}
                    onValueChange={(e) => setFiltros(prev => ({ 
                      ...prev, 
                      rangoMontos: { ...prev.rangoMontos, max: e.value } 
                    }))}
                    mode="currency"
                    currency="ARS"
                    locale="es-AR"
                    placeholder="Máximo"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Filtros especiales */}
            <div className="col-12">
              <div className="flex gap-2 flex-wrap">
                <Button
                  label="Solo Vencidos"
                  icon="pi pi-exclamation-triangle"
                  className={filtros.soloVencidos ? 'p-button-warning' : 'p-button-outlined'}
                  onClick={() => setFiltros(prev => ({ 
                    ...prev, 
                    soloVencidos: !prev.soloVencidos 
                  }))}
                  size="small"
                />
                <Button
                  label="Solo Pendientes"
                  icon="pi pi-clock"
                  className={filtros.soloPendientes ? 'p-button-info' : 'p-button-outlined'}
                  onClick={() => setFiltros(prev => ({ 
                    ...prev, 
                    soloPendientes: !prev.soloPendientes 
                  }))}
                  size="small"
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div className="col-12 flex justify-content-end gap-2">
              <Button
                label="Limpiar"
                icon="pi pi-times"
                className="p-button-text"
                onClick={limpiarFiltros}
                size="small"
              />
              <Button
                label="Aplicar"
                icon="pi pi-check"
                onClick={() => overlayRef.current?.hide()}
                size="small"
              />
            </div>
          </div>
        </div>
      </OverlayPanel>
    </div>
  );
};

export default BusquedaCompacta;

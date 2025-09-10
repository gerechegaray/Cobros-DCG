import React, { useState } from 'react';
import { Card, Button, InputText, DataTable, Column, Dialog, Tag } from 'primereact';
import { templatesGastos, getTemplatesByCategoria, buscarTemplates, crearGastoDesdeTemplate } from './templates';
import { categoriasGastos } from './constants';

const TemplatesGastos = ({ visible, onHide, onSeleccionarTemplate, onCrearDesdeTemplate }) => {
  const [templates, setTemplates] = useState(templatesGastos);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [templateSeleccionado, setTemplateSeleccionado] = useState(null);

  // Filtrar templates
  const templatesFiltrados = templates.filter(template => {
    const coincideBusqueda = !busqueda || 
      template.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      template.categoria.toLowerCase().includes(busqueda.toLowerCase());
    
    const coincideCategoria = categoriaFiltro === 'todas' || 
      template.categoria === categoriaFiltro;
    
    return coincideBusqueda && coincideCategoria;
  });

  const handleSeleccionarTemplate = (template) => {
    setTemplateSeleccionado(template);
  };

  const handleCrearGasto = () => {
    if (templateSeleccionado) {
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 7); // 7 días desde hoy
      
      const gastoData = crearGastoDesdeTemplate(
        templateSeleccionado, 
        fechaVencimiento.toISOString().split('T')[0]
      );
      
      onCrearDesdeTemplate(gastoData);
      onHide();
    }
  };

  const categoriaTemplate = (rowData) => {
    const categoria = categoriasGastos.find(c => c.id === rowData.categoria);
    return (
      <Tag 
        value={categoria?.nombre || rowData.categoria}
        style={{ backgroundColor: categoria?.color, color: 'white' }}
      />
    );
  };

  const montoTemplate = (rowData) => {
    return rowData.monto > 0 ? `$${rowData.monto.toLocaleString('es-AR')}` : 'Variable';
  };

  const frecuenciaTemplate = (rowData) => {
    const frecuencias = {
      'unico': 'Único',
      'semanal': 'Semanal',
      'mensual': 'Mensual',
      'trimestral': 'Trimestral',
      'semestral': 'Semestral',
      'anual': 'Anual'
    };
    return frecuencias[rowData.frecuencia] || rowData.frecuencia;
  };

  const opcionesCategorias = [
    { label: 'Todas las categorías', value: 'todas' },
    ...categoriasGastos.map(cat => ({
      label: cat.nombre,
      value: cat.id
    }))
  ];

  return (
    <>
      <Dialog
        header="Templates de Gastos"
        visible={visible}
        onHide={onHide}
        style={{ width: '90vw', maxWidth: '1200px' }}
        modal
      >
        <div className="grid">
          {/* Búsqueda y Filtros */}
          <div className="col-12">
            <div className="flex gap-3 align-items-center mb-3">
              <div className="flex-1">
                <InputText
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar templates..."
                  className="w-full"
                />
              </div>
              <div className="w-20rem">
                <select
                  value={categoriaFiltro}
                  onChange={(e) => setCategoriaFiltro(e.target.value)}
                  className="w-full p-2 border-round"
                >
                  {opcionesCategorias.map(opcion => (
                    <option key={opcion.value} value={opcion.value}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Lista de Templates */}
          <div className="col-12">
            <DataTable
              value={templatesFiltrados}
              selection={templateSeleccionado}
              onSelectionChange={(e) => setTemplateSeleccionado(e.value)}
              selectionMode="single"
              paginator
              rows={10}
              responsiveLayout="scroll"
              emptyMessage="No hay templates disponibles"
            >
              <Column selectionMode="single" headerStyle={{ width: '3rem' }} />
              <Column field="nombre" header="Nombre" />
              <Column field="categoria" header="Categoría" body={categoriaTemplate} />
              <Column field="monto" header="Monto" body={montoTemplate} />
              <Column field="frecuencia" header="Frecuencia" body={frecuenciaTemplate} />
              <Column field="tipoPago" header="Tipo de Pago" />
            </DataTable>
          </div>

          {/* Botones */}
          <div className="col-12 flex justify-content-end gap-2">
            <Button
              label="Cancelar"
              icon="pi pi-times"
              className="p-button-text"
              onClick={onHide}
            />
            <Button
              label="Crear Gasto"
              icon="pi pi-plus"
              disabled={!templateSeleccionado}
              onClick={handleCrearGasto}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default TemplatesGastos;

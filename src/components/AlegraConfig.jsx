import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { ALEGRA_CONFIG, validateInvoiceLimits, calculateRequestCount } from '../config/alegra.js';

const AlegraConfig = () => {
  const [config, setConfig] = useState({
    dias: ALEGRA_CONFIG.INVOICES.DEFAULT_DAYS,
    limit: ALEGRA_CONFIG.INVOICES.MAX_PER_REQUEST,
    maxInvoices: ALEGRA_CONFIG.INVOICES.DEFAULT_TOTAL
  });
  
  const [validation, setValidation] = useState({ valid: true, error: '' });
  const [requestCount, setRequestCount] = useState(0);
  const [saved, setSaved] = useState(false);

  // Calcular número de peticiones necesarias
  useEffect(() => {
    const count = calculateRequestCount(config.maxInvoices, config.limit);
    setRequestCount(count);
  }, [config.maxInvoices, config.limit]);

  // Validar configuración
  useEffect(() => {
    const result = validateInvoiceLimits(config.limit, config.maxInvoices);
    setValidation(result);
  }, [config.limit, config.maxInvoices]);

  // Cargar configuración guardada
  useEffect(() => {
    const savedConfig = localStorage.getItem('alegra_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error cargando configuración de Alegra:', error);
      }
    }
  }, []);

  // Guardar configuración
  const handleSave = () => {
    if (validation.valid) {
      localStorage.setItem('alegra_config', JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  // Restaurar configuración por defecto
  const handleReset = () => {
    setConfig({
      dias: ALEGRA_CONFIG.INVOICES.DEFAULT_DAYS,
      limit: ALEGRA_CONFIG.INVOICES.MAX_PER_REQUEST,
      maxInvoices: ALEGRA_CONFIG.INVOICES.DEFAULT_TOTAL
    });
  };

  const diasOptions = ALEGRA_CONFIG.INVOICES.ALLOWED_DAYS.map(d => ({
    label: `${d} día${d > 1 ? 's' : ''}`,
    value: d
  }));

  return (
    <Card title="⚙️ Configuración de Alegra" className="mb-4">
      <div className="grid">
        <div className="col-12 md:col-4">
          <label className="block text-sm font-medium mb-2">
            Rango de días
          </label>
          <Dropdown
            value={config.dias}
            options={diasOptions}
            onChange={(e) => setConfig(prev => ({ ...prev, dias: e.value }))}
            placeholder="Seleccionar rango"
            className="w-full"
          />
          <small className="text-gray-600">
            Facturas desde hace X días
          </small>
        </div>

        <div className="col-12 md:col-4">
          <label className="block text-sm font-medium mb-2">
            Límite por petición
          </label>
          <InputNumber
            value={config.limit}
            onValueChange={(e) => setConfig(prev => ({ ...prev, limit: e.value }))}
            min={1}
            max={ALEGRA_CONFIG.INVOICES.MAX_PER_REQUEST}
            className="w-full"
            showButtons
            buttonLayout="horizontal"
            decrementButtonClassName="p-button-secondary"
            incrementButtonClassName="p-button-secondary"
            incrementButtonIcon="pi pi-plus"
            decrementButtonIcon="pi pi-minus"
          />
          <small className="text-gray-600">
            Máximo {ALEGRA_CONFIG.INVOICES.MAX_PER_REQUEST} por petición (Alegra)
          </small>
        </div>

        <div className="col-12 md:col-4">
          <label className="block text-sm font-medium mb-2">
            Total de facturas
          </label>
          <InputNumber
            value={config.maxInvoices}
            onValueChange={(e) => setConfig(prev => ({ ...prev, maxInvoices: e.value }))}
            min={1}
            max={ALEGRA_CONFIG.INVOICES.MAX_TOTAL}
            className="w-full"
            showButtons
            buttonLayout="horizontal"
            decrementButtonClassName="p-button-secondary"
            incrementButtonClassName="p-button-secondary"
            incrementButtonIcon="pi pi-plus"
            decrementButtonIcon="pi pi-minus"
          />
          <small className="text-gray-600">
            Máximo {ALEGRA_CONFIG.INVOICES.MAX_TOTAL} facturas total
          </small>
        </div>
      </div>

      {/* Información de paginación */}
      <div className="mt-4 p-3 bg-blue-50 border-round">
        <h4 className="text-lg font-medium mb-2">📄 Información de Paginación</h4>
        <div className="grid">
          <div className="col-12 md:col-6">
            <p><strong>Peticiones necesarias:</strong> {requestCount}</p>
            <p><strong>Tiempo estimado:</strong> {(requestCount * ALEGRA_CONFIG.PAGINATION.DELAY_BETWEEN_REQUESTS / 1000).toFixed(1)}s</p>
          </div>
          <div className="col-12 md:col-6">
            <p><strong>Facturas por petición:</strong> {config.limit}</p>
            <p><strong>Total a obtener:</strong> {config.maxInvoices}</p>
          </div>
        </div>
      </div>

      {/* Validación */}
      {!validation.valid && (
        <Message 
          severity="error" 
          text={validation.error} 
          className="mt-3"
        />
      )}

      {/* Botones de acción */}
      <div className="flex gap-2 mt-4">
        <Button
          label="💾 Guardar Configuración"
          icon="pi pi-save"
          onClick={handleSave}
          disabled={!validation.valid}
          className="p-button-success"
        />
        <Button
          label="🔄 Restaurar Default"
          icon="pi pi-refresh"
          onClick={handleReset}
          className="p-button-secondary"
        />
      </div>

      {/* Mensaje de éxito */}
      {saved && (
        <Message 
          severity="success" 
          text="✅ Configuración guardada correctamente" 
          className="mt-3"
        />
      )}

      {/* Notas importantes */}
      <div className="mt-4 p-3 bg-yellow-50 border-round">
        <h4 className="text-lg font-medium mb-2">⚠️ Notas Importantes</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Alegra solo permite máximo 30 facturas por petición</li>
          <li>Para obtener más facturas, se realizan múltiples peticiones automáticamente</li>
          <li>Se respeta un delay de {ALEGRA_CONFIG.PAGINATION.DELAY_BETWEEN_REQUESTS}ms entre peticiones</li>
          <li>La configuración se guarda localmente en tu navegador</li>
        </ul>
      </div>
    </Card>
  );
};

export default AlegraConfig;

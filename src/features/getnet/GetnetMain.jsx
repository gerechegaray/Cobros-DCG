import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { ESTABLECIMIENTOS, ESTABLECIMIENTOS_OPTIONS } from './constants';
import { generarInformePdf } from './generarInformePdf';
import { construirInforme, leerFilasArchivo } from './parsearExcel';
import { formatearFechaCorta, formatearMontoArs, resolverPropietario } from './utils';

function descargarBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const GetnetMain = () => {
  const toastRef = useRef(null);
  const inputRef = useRef(null);
  const [dcg, setDcg] = useState('');
  const [archivoNombre, setArchivoNombre] = useState('');
  const [filas, setFilas] = useState(null);
  const [tieneColumnaCuotas, setTieneColumnaCuotas] = useState(false);
  const [informe, setInforme] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [filename, setFilename] = useState('');
  const [pdfBlob, setPdfBlob] = useState(null);
  const [confirmado, setConfirmado] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);

  useEffect(() => {
    let url = '';
    if (!filas || !dcg) {
      setInforme(null);
      setPdfBlob(null);
      setFilename('');
      setConfirmado(false);
      setPdfUrl('');
      return undefined;
    }

    try {
      const siguiente = construirInforme(filas, resolverPropietario(dcg), { tieneColumnaCuotas });
      const generado = generarInformePdf(siguiente);
      url = URL.createObjectURL(generado.blob);
      setInforme(siguiente);
      setPdfBlob(generado.blob);
      setFilename(generado.filename);
      setConfirmado(false);
      setPdfUrl(url);
    } catch (error) {
      setInforme(null);
      setPdfBlob(null);
      setFilename('');
      setPdfUrl('');
      toastRef.current?.show({
        severity: 'error',
        summary: 'No se pudo armar el informe',
        detail: error.message || 'Revisá el archivo e intentá de nuevo.',
        life: 5000
      });
    }

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [filas, dcg, tieneColumnaCuotas]);

  const mostrarError = (detail) => {
    toastRef.current?.show({
      severity: 'error',
      summary: 'No se pudo armar el informe',
      detail,
      life: 5000
    });
  };

  const procesarArchivo = async (file) => {
    if (!file) return;
    setProcesando(true);
    try {
      const leido = await leerFilasArchivo(file);
      setArchivoNombre(file.name);
      setConfirmado(false);
      if (leido.dcgDetectado) {
        setDcg(leido.dcgDetectado);
      } else if (!dcg) {
        mostrarError('Elegí el establecimiento (DCG1 a DCG9) para nombrar el PDF.');
      }
      setTieneColumnaCuotas(Boolean(leido.tieneColumnaCuotas));
      setFilas(leido.filas);
    } catch (error) {
      setFilas(null);
      setTieneColumnaCuotas(false);
      setArchivoNombre('');
      mostrarError(error.message || 'El archivo no se pudo leer.');
    } finally {
      setProcesando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleLimpiar = () => {
    setDcg('');
    setArchivoNombre('');
    setFilas(null);
    setTieneColumnaCuotas(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleConfirmar = () => {
    if (!pdfBlob) return;
    setConfirmado(true);
    toastRef.current?.show({
      severity: 'success',
      summary: 'Informe confirmado',
      detail: 'Ya podés descargar el PDF y guardarlo en la carpeta del cliente.',
      life: 3500
    });
  };

  return (
    <div className="getnet-main">
      <Toast ref={toastRef} />

      <div className="getnet-main-header">
        <h1>
          <i className="pi pi-file-excel"></i>
          Informes Getnet
        </h1>
        <p>
          Subí el Excel del POS, revisá el PDF y descargalo con el nombre del cliente y el período.
          El archivo no se guarda en la app.
        </p>
      </div>

      <section className="getnet-toolbar">
        <div className="getnet-field">
          <label htmlFor="getnet-establecimiento">Establecimiento</label>
          <Dropdown
            inputId="getnet-establecimiento"
            value={dcg}
            options={ESTABLECIMIENTOS_OPTIONS}
            onChange={(e) => setDcg(e.value)}
            placeholder="DCG1 a DCG9"
            className="w-full"
          />
        </div>
        <div className="getnet-toolbar-actions">
          <Button
            type="button"
            label="Seleccionar Excel"
            icon="pi pi-upload"
            onClick={() => inputRef.current?.click()}
            disabled={procesando}
          />
          <Button
            type="button"
            label="Limpiar"
            icon="pi pi-times"
            severity="secondary"
            outlined
            onClick={handleLimpiar}
            disabled={procesando || (!archivoNombre && !filas)}
          />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="getnet-file-input"
          onChange={(e) => procesarArchivo(e.target.files?.[0])}
        />
      </section>

      {filas && !dcg && (
        <p className="getnet-hint">
          El Excel se leyó bien. Elegí el establecimiento para generar la vista previa del PDF.
        </p>
      )}

      {!filas && (
        <div
          className={`getnet-dropzone ${arrastrando ? 'is-dragover' : ''} ${procesando ? 'is-busy' : ''}`}
          onDragEnter={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            procesarArchivo(e.dataTransfer.files?.[0]);
          }}
        >
          <i className="pi pi-cloud-upload"></i>
          <h2>Arrastrá el Excel de Getnet</h2>
          <p>
            {dcg
              ? `Se va a armar el informe de ${ESTABLECIMIENTOS[dcg]}.`
              : 'Si el archivo se llama DCG 8_..., el cliente se detecta solo.'}
          </p>
          {procesando && <p className="getnet-hint">Procesando archivo…</p>}
        </div>
      )}

      {informe && (
        <section className="getnet-preview-wrap">
          <div className="getnet-resumen">
            <div>
              <span className="getnet-kicker">Cliente</span>
              <strong>{informe.propietario}</strong>
            </div>
            <div>
              <span className="getnet-kicker">Período</span>
              <strong>
                {formatearFechaCorta(informe.fechaDesde)} — {formatearFechaCorta(informe.fechaHasta)}
              </strong>
            </div>
            <div>
              <span className="getnet-kicker">Transacciones</span>
              <strong>{informe.kpis.transacciones}</strong>
            </div>
            <div>
              <span className="getnet-kicker">Monto bruto</span>
              <strong>{formatearMontoArs(informe.kpis.bruto)}</strong>
            </div>
          </div>

          <p className="getnet-archivo">
            Origen: {archivoNombre || 'archivo cargado'} · Nombre de descarga: <code>{filename}</code>
          </p>

          <div className="getnet-preview-frame">
            {pdfUrl ? (
              <iframe title="Vista previa del informe Getnet" src={pdfUrl} />
            ) : null}
          </div>

          <div className="getnet-actions">
            <Button
              type="button"
              label="Confirmar informe"
              icon="pi pi-check"
              onClick={handleConfirmar}
              disabled={confirmado || procesando}
            />
            <Button
              type="button"
              label="Descargar PDF"
              icon="pi pi-download"
              onClick={() => descargarBlob(pdfBlob, filename)}
              disabled={!confirmado}
            />
          </div>
          {!confirmado && (
            <p className="getnet-hint">
              Revisá el PDF. Si está bien, confirmalo y después descargalo a la carpeta del cliente.
            </p>
          )}
        </section>
      )}
    </div>
  );
};

export default GetnetMain;

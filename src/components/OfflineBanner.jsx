import React, { useEffect, useState } from 'react';
import { contarCola } from '../offline/colaOperativa';

function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    const refrescar = async () => {
      setOnline(navigator.onLine);
      try {
        setPendientes(await contarCola());
      } catch {
        setPendientes(0);
      }
    };

    refrescar();
    window.addEventListener('online', refrescar);
    window.addEventListener('offline', refrescar);
    window.addEventListener('dcg-cola-updated', refrescar);
    return () => {
      window.removeEventListener('online', refrescar);
      window.removeEventListener('offline', refrescar);
      window.removeEventListener('dcg-cola-updated', refrescar);
    };
  }, []);

  if (online && pendientes === 0) return null;

  return (
    <div className={`offline-banner ${online ? 'is-sync' : 'is-offline'}`}>
      {online
        ? `Enviando ${pendientes} pendiente${pendientes === 1 ? '' : 's'}...`
        : `Sin conexión${pendientes ? ` · ${pendientes} pendiente${pendientes === 1 ? '' : 's'}` : ''}`}
    </div>
  );
}

export default OfflineBanner;

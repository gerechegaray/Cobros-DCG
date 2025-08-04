import React, { useState, useEffect } from 'react';
import { checkBackendStatus } from '../config/backend';

const BackendStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await checkBackendStatus();
        setStatus(result);
      } catch (error) {
        setStatus({
          status: 'error',
          url: 'https://sist-gestion-dcg.onrender.com',
          error: error.message
        });
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-blue-800">Verificando conexión con el backend...</span>
        </div>
      </div>
    );
  }

  if (status?.status === 'online') {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-green-800">
            ✅ Backend conectado: {status.url}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center">
        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
        <span className="text-red-800">
          ❌ Error de conexión: {status?.error || 'Desconocido'}
        </span>
      </div>
      <div className="mt-2 text-sm text-red-600">
        URL: {status?.url}
      </div>
    </div>
  );
};

export default BackendStatus; 
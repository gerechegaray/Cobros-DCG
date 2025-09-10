import { useEffect } from 'react';

// Hook para manejar atajos de teclado
export const useAtajosTeclado = (callbacks) => {
  const {
    onGuardar,
    onCancelar,
    onNuevoGasto,
    onNuevoRecurrente,
    onBuscar,
    onExportar,
    onLimpiarFiltros
  } = callbacks;

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Evitar atajos si estamos en un input, textarea o select
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT' ||
        e.target.contentEditable === 'true'
      ) {
        return;
      }

      // Ctrl + S: Guardar
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        onGuardar?.();
        return;
      }

      // Escape: Cancelar/Cerrar
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancelar?.();
        return;
      }

      // Ctrl + N: Nuevo gasto
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        onNuevoGasto?.();
        return;
      }

      // Ctrl + Shift + N: Nuevo gasto recurrente
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        onNuevoRecurrente?.();
        return;
      }

      // Ctrl + F: Buscar
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        onBuscar?.();
        return;
      }

      // Ctrl + E: Exportar
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        onExportar?.();
        return;
      }

      // Ctrl + Shift + L: Limpiar filtros
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        onLimpiarFiltros?.();
        return;
      }

      // Números 1-9: Acceso rápido a categorías
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const numero = parseInt(e.key);
        // Esto se puede personalizar según las categorías
        console.log(`Acceso rápido a categoría ${numero}`);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [callbacks]);
};

// Hook para feedback visual
export const useFeedbackVisual = () => {
  const mostrarFeedback = (tipo, mensaje, duracion = 3000) => {
    // Crear elemento de feedback
    const feedback = document.createElement('div');
    feedback.className = `feedback-${tipo}`;
    feedback.textContent = mensaje;
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 9999;
      animation: slideIn 0.3s ease-out;
      max-width: 300px;
      word-wrap: break-word;
    `;

    // Colores según el tipo
    const colores = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };

    feedback.style.backgroundColor = colores[tipo] || colores.info;

    // Agregar estilos de animación
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(feedback);

    // Remover después de la duración
    setTimeout(() => {
      feedback.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback);
        }
      }, 300);
    }, duracion);
  };

  return { mostrarFeedback };
};

// Hook para loading states
export const useLoading = (initialState = false) => {
  const [loading, setLoading] = useState(initialState);
  const [loadingMessage, setLoadingMessage] = useState('');

  const iniciarLoading = (mensaje = 'Cargando...') => {
    setLoading(true);
    setLoadingMessage(mensaje);
  };

  const finalizarLoading = () => {
    setLoading(false);
    setLoadingMessage('');
  };

  return {
    loading,
    loadingMessage,
    iniciarLoading,
    finalizarLoading
  };
};

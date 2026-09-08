import { crearPedidoDirecto } from '../features/pedidos/pedidosService';
import { crearCobroDirecto } from '../features/cobros/cobrosService';
import { eliminarDeCola, isNetworkError, listarCola } from './colaOperativa';

function revivePedido(payload) {
  return {
    ...payload,
    fechaPedido: payload?.fechaPedido ? new Date(payload.fechaPedido) : new Date()
  };
}

function reviveCobro(payload) {
  return {
    ...payload,
    fechaCobro: payload?.fechaCobro ? new Date(payload.fechaCobro) : new Date()
  };
}

export async function procesarCola() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { processed: 0 };
  }

  const items = await listarCola();
  let processed = 0;

  for (const item of items) {
    try {
      if (item.tipo === 'pedido') {
        await crearPedidoDirecto(revivePedido(item.payload), item.usuario);
      } else if (item.tipo === 'cobro') {
        await crearCobroDirecto(reviveCobro(item.payload), item.usuario);
      }
      await eliminarDeCola(item.id);
      processed += 1;
    } catch (error) {
      if (isNetworkError(error)) break;
      console.error('[COLA] No se pudo enviar un registro, se reintenta después:', error);
      break;
    }
  }

  return { processed };
}

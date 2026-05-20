import { Timestamp } from 'firebase-admin/firestore';

export async function crearPedidoDesdeTelegram(adminDb, draft, user) {
  const now = Timestamp.now();
  const pedido = {
    cliente: draft.cliente.nombre,
    clienteId: draft.cliente.id,
    fechaPedido: draft.fechaPedido || new Date(),
    condicionPago: draft.condicionPago || 'contado',
    productos: draft.productos,
    total: draft.total,
    observaciones: draft.observaciones || '',
    estado: 'pendiente',
    vendedor: user.email,
    vendedorNombre: user.name || user.email,
    createdAt: now,
    updatedAt: now,
    createdBy: user.email,
    updatedBy: user.email,
    origen: 'telegram'
  };

  const docRef = await adminDb.collection('pedidos').add(pedido);
  await adminDb.collection('pedidos_logs').add({
    pedidoId: docRef.id,
    usuario: user.email,
    accion: 'crear',
    cambios: { anterior: null, nuevo: pedido },
    ip: 'telegram',
    userAgent: 'telegram-bot',
    origen: 'telegram',
    timestamp: now
  });

  return { id: docRef.id, ...pedido };
}

export async function crearCobroDesdeTelegram(adminDb, draft, user) {
  const now = Timestamp.now();
  const cobro = {
    cliente: draft.cliente.nombre,
    clienteId: draft.cliente.id,
    monto: Number(draft.monto),
    fechaCobro: draft.fechaCobro || new Date(),
    formaPago: draft.formaPago,
    notas: draft.notas || '',
    estado: 'pendiente',
    vendedor: user.email,
    createdAt: now,
    updatedAt: now,
    createdBy: user.email,
    updatedBy: user.email,
    origen: 'telegram'
  };

  const docRef = await adminDb.collection('cobros').add(cobro);
  await adminDb.collection('cobros_logs').add({
    cobroId: docRef.id,
    usuario: user.email,
    accion: 'crear',
    cambios: { anterior: null, nuevo: cobro },
    ip: 'telegram',
    userAgent: 'telegram-bot',
    origen: 'telegram',
    timestamp: now
  });

  return { id: docRef.id, ...cobro };
}

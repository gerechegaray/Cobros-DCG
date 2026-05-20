import { parseEnvAliases } from './aliases.js';
import { getClienteNombre, getProductoCodigo, getProductoNombre, normalizeText } from './normalization.js';

export async function getTelegramUser(adminDb, telegramId) {
  const doc = await adminDb.collection('telegramUsers').doc(String(telegramId)).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (!data || data.activo !== true) return null;
  return {
    telegramId: String(telegramId),
    email: data.email,
    name: data.name || data.email,
    role: data.role,
    ...data
  };
}

export async function getClientesAsignados(adminDb, user) {
  const snapshot = await adminDb.collection('clientesAlegra').get();
  const clientes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  if (user.role === 'admin') return clientes;

  const sellerId = getSellerIdForRole(user.role);
  if (!sellerId) return [];

  return clientes.filter((cliente) => String(cliente?.seller?.id || '') === sellerId);
}

export async function getProductosCatalogo(adminDb) {
  const snapshot = await adminDb.collection('productosAlegra').get();
  return snapshot.docs.map((doc) => transformarProducto({ id: doc.id, ...doc.data() }));
}

export async function getProductAliases(adminDb, config) {
  const aliases = parseEnvAliases(config.productAliasesRaw);

  try {
    const snapshot = await adminDb.collection('telegramAliases').get();
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const type = data.tipo || data.type;
      const value = data.valor || data.value;
      if (type === 'producto' && data.alias && value) {
        aliases.set(normalizeText(data.alias), String(value));
      }
    });
  } catch (error) {
    console.warn('[TELEGRAM] No se pudieron cargar aliases desde Firestore:', error.message);
  }

  return aliases;
}

export function resolveCliente(query, clientes) {
  return resolveEntity(query, clientes, (cliente) => [
    cliente.id,
    getClienteNombre(cliente),
    cliente.identification,
    cliente.email,
    cliente.phonePrimary,
    cliente.phoneSecondary
  ]);
}

export function resolveProducto(query, productos, aliases = new Map()) {
  const aliasValue = aliases.get(normalizeText(query));
  const resolvedQuery = aliasValue || query;
  return resolveEntity(resolvedQuery, productos, (producto) => [
    producto.id,
    producto.nombre,
    producto.codigo,
    producto.categoria
  ]);
}

export function transformarProducto(producto) {
  let precio = 0;
  if (Array.isArray(producto.price) && producto.price.length > 0) {
    precio = Number(producto.price[0].price || 0);
  } else if (producto.price && !Number.isNaN(Number(producto.price))) {
    precio = Number(producto.price);
  } else if (producto.price && typeof producto.price === 'object') {
    precio = Number(producto.price.price || producto.price.value || 0);
  } else if (producto.precio !== undefined) {
    precio = Number(producto.precio || 0);
  }

  let stock = 0;
  if (producto.stock !== undefined && producto.stock !== null) {
    stock = Number(producto.stock) || 0;
  } else if (producto.inventory?.availableQuantity !== undefined) {
    stock = Number(producto.inventory.availableQuantity || 0);
  } else if (producto.inventory?.quantity !== undefined) {
    stock = Number(producto.inventory.quantity || 0);
  } else if (Array.isArray(producto.warehouses) && producto.warehouses.length > 0) {
    const warehouse = producto.warehouses[0];
    stock = Number(warehouse.availableQuantity || warehouse.quantity || warehouse.stock || 0);
  }

  return {
    id: String(producto.id),
    nombre: getProductoNombre(producto),
    codigo: String(getProductoCodigo(producto)),
    precio,
    stock,
    activo: producto.status === undefined ? producto.activo !== false : producto.status === 'active',
    categoria: producto.category?.name || producto.categoria || 'Sin categoria'
  };
}

function getSellerIdForRole(role) {
  if (role === 'Guille') return '1';
  if (role === 'Santi') return '2';
  if (role === 'Victor') return '3';
  return null;
}

function resolveEntity(query, entities, getFields) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return { status: 'missing', matches: [] };

  const scored = entities
    .map((entity) => ({ entity, score: scoreEntity(normalizedQuery, getFields(entity)) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (scored.length === 0) return { status: 'not_found', matches: [] };
  if (scored.length === 1) return { status: 'matched', entity: scored[0].entity, matches: scored };

  const [first, second] = scored;
  if (first.score >= 95 && first.score - second.score >= 20) {
    return { status: 'matched', entity: first.entity, matches: scored };
  }

  if (first.score - second.score < 15) {
    return { status: 'ambiguous', matches: scored };
  }

  return { status: 'matched', entity: first.entity, matches: scored };
}

function scoreEntity(query, fields) {
  const queryTokens = query.split(' ').filter(Boolean);
  let best = 0;

  fields
    .filter((field) => field !== undefined && field !== null)
    .map((field) => normalizeText(field))
    .filter(Boolean)
    .forEach((field) => {
      if (field === query) best = Math.max(best, 100);
      if (field.startsWith(query)) best = Math.max(best, 85);
      if (field.includes(query)) best = Math.max(best, 70);

      const fieldTokens = field.split(' ');
      const allTokens = queryTokens.every((token) => fieldTokens.some((fieldToken) => fieldToken.includes(token)));
      if (allTokens) best = Math.max(best, 60 + Math.min(queryTokens.length, 5));

      const partialTokens = queryTokens.filter((token) => fieldTokens.some((fieldToken) => fieldToken.includes(token)));
      if (partialTokens.length > 0) best = Math.max(best, partialTokens.length * 10);
    });

  return best;
}

const DB_NAME = 'dcg-offline';
const STORE = 'cola';

function abrirDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function conStore(mode, fn) {
  const db = await abrirDb();
  const tx = db.transaction(STORE, mode);
  const store = tx.objectStore(STORE);
  const txDone = new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('IndexedDB abort'));
  });
  try {
    const result = await fn(store);
    await txDone;
    return result;
  } finally {
    db.close();
  }
}

function avisarCola() {
  window.dispatchEvent(new CustomEvent('dcg-cola-updated'));
}

export function isNetworkError(error) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const code = String(error?.code || '');
  const message = String(error?.message || error || '');
  return (
    code === 'unavailable' ||
    code === 'network-request-failed' ||
    /failed to fetch|network|offline|unavailable|ERR_INTERNET/i.test(message)
  );
}

export async function enqueueOperacion({ tipo, payload, usuario }) {
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    tipo,
    payload,
    usuario: {
      email: usuario?.email,
      name: usuario?.name || usuario?.email,
      role: usuario?.role
    },
    createdAt: new Date().toISOString()
  };
  await conStore('readwrite', (store) => requestToPromise(store.put(item)));
  avisarCola();
  return item;
}

export async function listarCola() {
  const items = await conStore('readonly', (store) => requestToPromise(store.getAll()));
  return (items || []).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export async function contarCola() {
  const items = await listarCola();
  return items.length;
}

export async function eliminarDeCola(id) {
  await conStore('readwrite', (store) => requestToPromise(store.delete(id)));
  avisarCola();
}

export async function guardarOEncolar(tipo, payload, usuario, directo) {
  const serialized = JSON.parse(JSON.stringify(payload));
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await enqueueOperacion({ tipo, payload: serialized, usuario });
    return { queued: true };
  }
  try {
    return await directo(payload, usuario);
  } catch (error) {
    if (isNetworkError(error)) {
      await enqueueOperacion({ tipo, payload: serialized, usuario });
      return { queued: true };
    }
    throw error;
  }
}

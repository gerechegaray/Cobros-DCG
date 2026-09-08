import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Funciones para obtener catálogos desde Firestore
export async function getProductosCatalogo() {
  const querySnapshot = await getDocs(collection(db, 'productos'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getClientesCatalogo() {
  const cacheKey = "clientes_catalogo";
  const cache = localStorage.getItem(cacheKey);
  let stale = null;

  if (cache) {
    try {
      const cacheData = JSON.parse(cache);
      stale = cacheData.data;
      const ahora = Date.now();
      const ttl = 7 * 24 * 60 * 60 * 1000;

      if (cacheData.timestamp && (ahora - cacheData.timestamp) < ttl) {
        return cacheData.data;
      }
    } catch (error) {
      localStorage.removeItem(cacheKey);
    }
  }

  try {
    const querySnapshot = await getDocs(collection(db, 'clientesAlegra'));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    return data;
  } catch (error) {
    if (Array.isArray(stale) && stale.length) return stale;
    throw error;
  }
}

// Función para limpiar caché de clientes
export function limpiarCacheClientes() {
  localStorage.removeItem("clientes_catalogo");
}
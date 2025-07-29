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
  // Verificar caché con TTL de 7 días
  const cacheKey = "clientes_catalogo";
  const cache = localStorage.getItem(cacheKey);
  
  if (cache) {
    try {
      const cacheData = JSON.parse(cache);
      const ahora = Date.now();
      const ttl = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos
      
      // Verificar si el caché no ha expirado
      if (cacheData.timestamp && (ahora - cacheData.timestamp) < ttl) {
        return cacheData.data;
      } else {
        localStorage.removeItem(cacheKey);
      }
    } catch (error) {
      localStorage.removeItem(cacheKey);
    }
  }

  // Si no hay caché válido, cargar desde Firebase
  const querySnapshot = await getDocs(collection(db, 'clientesAlegra'));
  const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Guardar en caché con timestamp
  const cacheData = {
    data: data,
    timestamp: Date.now()
  };
  localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  
  return data;
}

// Función para limpiar caché de clientes
export function limpiarCacheClientes() {
  localStorage.removeItem("clientes_catalogo");
}
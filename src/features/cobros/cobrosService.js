import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  orderBy, 
  where,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { guardarOEncolar } from '../../offline/colaOperativa';
import { nombreVendedorCobro } from './utils';

const COLLECTION_NAME = 'cobros';
const LOGS_COLLECTION = 'cobros_logs';
const USUARIOS_COLLECTION = 'usuarios';

let nombresPorEmailPromise;

const obtenerNombresPorEmail = () => {
  if (!nombresPorEmailPromise) {
    nombresPorEmailPromise = getDocs(collection(db, USUARIOS_COLLECTION))
      .then((snap) => {
        const mapa = {};
        snap.forEach((docu) => {
          const data = docu.data() || {};
          const email = String(data.email || docu.id || '').toLowerCase();
          const nombre = String(data.name || data.nombre || '').trim();
          if (email && nombre && !nombre.includes('@')) {
            mapa[email] = nombre;
          }
        });
        return mapa;
      })
      .catch(() => ({}));
  }
  return nombresPorEmailPromise;
};

const conNombreVendedor = async (cobros) => {
  const mapa = await obtenerNombresPorEmail();
  return cobros.map((cobro) => ({
    ...cobro,
    vendedorNombre: nombreVendedorCobro(cobro, mapa)
  }));
};

// Obtener todos los cobros
export const getCobros = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('fechaCobro', 'desc'));
    const querySnapshot = await getDocs(q);
    return conNombreVendedor(querySnapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    })));
  } catch (error) {
    console.error('Error obteniendo cobros:', error);
    throw error;
  }
};

// Obtener cobros en tiempo real
export const getCobrosRealtime = (callback) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('fechaCobro', 'desc'));
  return onSnapshot(q, async (querySnapshot) => {
    const cobros = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(await conNombreVendedor(cobros));
  });
};

// Obtener cobros por vendedor
export const getCobrosByVendedor = async (vendedorEmail) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where('vendedor', '==', vendedorEmail)
    );
    const querySnapshot = await getDocs(q);
    const cobros = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    .sort((a, b) => {
      const fechaA = a.fechaCobro?.toDate?.() || new Date(a.fechaCobro);
      const fechaB = b.fechaCobro?.toDate?.() || new Date(b.fechaCobro);
      return fechaB - fechaA;
    });
    return conNombreVendedor(cobros);
  } catch (error) {
    console.error('Error obteniendo cobros por vendedor:', error);
    throw error;
  }
};

// Obtener cobros por vendedor en tiempo real
export const getCobrosByVendedorRealtime = (vendedorEmail, callback) => {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where('vendedor', '==', vendedorEmail)
  );
  return onSnapshot(q, async (querySnapshot) => {
    const cobros = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    .sort((a, b) => {
      const fechaA = a.fechaCobro?.toDate?.() || new Date(a.fechaCobro);
      const fechaB = b.fechaCobro?.toDate?.() || new Date(b.fechaCobro);
      return fechaB - fechaA;
    });
    callback(await conNombreVendedor(cobros));
  });
};

// Crear un nuevo cobro
export const crearCobroDirecto = async (cobroData, usuario) => {
  const cobro = {
    ...cobroData,
    estado: 'pendiente',
    vendedor: usuario.email,
    vendedorNombre: usuario.name || usuario.email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: usuario.email,
    updatedBy: usuario.email
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), cobro);

  await crearLog({
    cobroId: docRef.id,
    usuario: usuario.email,
    accion: 'crear',
    cambios: { anterior: null, nuevo: cobro },
    ip: 'localhost',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'offline-queue'
  });

  return docRef.id;
};

export const crearCobro = async (cobroData, usuario) => {
  try {
    return await guardarOEncolar('cobro', cobroData, usuario, crearCobroDirecto);
  } catch (error) {
    console.error('Error creando cobro:', error);
    throw error;
  }
};

// Actualizar un cobro
export const actualizarCobro = async (cobroId, cobroData, usuario) => {
  try {
    const cobroRef = doc(db, COLLECTION_NAME, cobroId);
    
    // Obtener datos anteriores para el log
    const cobroAnterior = await getCobroById(cobroId);
    
    const cobroActualizado = {
      ...cobroData,
      updatedAt: serverTimestamp(),
      updatedBy: usuario.email
    };
    
    await updateDoc(cobroRef, cobroActualizado);
    
    // Crear log de actualización
    await crearLog({
      cobroId,
      usuario: usuario.email,
      accion: 'editar',
      cambios: { anterior: cobroAnterior, nuevo: cobroActualizado },
      ip: 'localhost',
      userAgent: navigator.userAgent
    });
    
    return cobroId;
  } catch (error) {
    console.error('Error actualizando cobro:', error);
    throw error;
  }
};

// Eliminar un cobro
export const eliminarCobro = async (cobroId, usuario) => {
  try {
    const cobroRef = doc(db, COLLECTION_NAME, cobroId);
    
    // Obtener datos del cobro para el log
    const cobroEliminado = await getCobroById(cobroId);
    
    await deleteDoc(cobroRef);
    
    // Crear log de eliminación
    await crearLog({
      cobroId,
      usuario: usuario.email,
      accion: 'eliminar',
      cambios: { anterior: cobroEliminado, nuevo: null },
      ip: 'localhost',
      userAgent: navigator.userAgent
    });
    
    return cobroId;
  } catch (error) {
    console.error('Error eliminando cobro:', error);
    throw error;
  }
};

// Obtener un cobro por ID
export const getCobroById = async (cobroId) => {
  try {
    const cobroRef = doc(db, COLLECTION_NAME, cobroId);
    const cobroDoc = await getDoc(cobroRef);
    
    if (!cobroDoc.exists()) {
      throw new Error('Cobro no encontrado');
    }
    
    return {
      id: cobroDoc.id,
      ...cobroDoc.data()
    };
  } catch (error) {
    console.error('Error obteniendo cobro:', error);
    throw error;
  }
};

// Marcar cobro como cargado en sistema de facturación
export const marcarComoCargado = async (cobroId, usuario) => {
  try {
    const cobroRef = doc(db, COLLECTION_NAME, cobroId);
    const cobroAnterior = await getCobroById(cobroId);
    
    const cobroActualizado = {
      estado: 'cargado',
      fechaCargaSistema: serverTimestamp(),
      cargadoPor: usuario.email,
      updatedAt: serverTimestamp(),
      updatedBy: usuario.email
    };
    
    await updateDoc(cobroRef, cobroActualizado);
    
    // Crear log de marcado como cargado
    await crearLog({
      cobroId,
      usuario: usuario.email,
      accion: 'marcar_cargado',
      cambios: { anterior: cobroAnterior, nuevo: cobroActualizado },
      ip: 'localhost',
      userAgent: navigator.userAgent
    });
    
    return cobroId;
  } catch (error) {
    console.error('Error marcando cobro como cargado:', error);
    throw error;
  }
};

// Marcar cobro como pendiente (revertir carga)
export const marcarComoPendiente = async (cobroId, usuario) => {
  try {
    const cobroRef = doc(db, COLLECTION_NAME, cobroId);
    const cobroAnterior = await getCobroById(cobroId);
    
    const cobroActualizado = {
      estado: 'pendiente',
      fechaCargaSistema: null,
      cargadoPor: null,
      updatedAt: serverTimestamp(),
      updatedBy: usuario.email
    };
    
    await updateDoc(cobroRef, cobroActualizado);
    
    // Crear log de marcado como pendiente
    await crearLog({
      cobroId,
      usuario: usuario.email,
      accion: 'marcar_pendiente',
      cambios: { anterior: cobroAnterior, nuevo: cobroActualizado },
      ip: 'localhost',
      userAgent: navigator.userAgent
    });
    
    return cobroId;
  } catch (error) {
    console.error('Error marcando cobro como pendiente:', error);
    throw error;
  }
};

// Crear log de auditoría
export const crearLog = async (logData) => {
  try {
    const log = {
      ...logData,
      timestamp: serverTimestamp()
    };
    
    await addDoc(collection(db, LOGS_COLLECTION), log);
  } catch (error) {
    console.error('Error creando log:', error);
    throw error;
  }
};

// Obtener logs de auditoría
export const getLogs = async (cobroId = null) => {
  try {
    let q = query(collection(db, LOGS_COLLECTION), orderBy('timestamp', 'desc'));
    
    if (cobroId) {
      q = query(
        collection(db, LOGS_COLLECTION), 
        where('cobroId', '==', cobroId),
        orderBy('timestamp', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error obteniendo logs:', error);
    throw error;
  }
};

// Obtener logs en tiempo real
export const getLogsRealtime = (callback, cobroId = null) => {
  let q = query(collection(db, LOGS_COLLECTION), orderBy('timestamp', 'desc'));
  
  if (cobroId) {
    q = query(
      collection(db, LOGS_COLLECTION), 
      where('cobroId', '==', cobroId),
      orderBy('timestamp', 'desc')
    );
  }
  
  return onSnapshot(q, (querySnapshot) => {
    const logs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(logs);
  });
};


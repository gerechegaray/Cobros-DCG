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

const COLLECTION_NAME = 'gastos';
const LOGS_COLLECTION = 'gastos_logs';

// Obtener todos los gastos
export const getGastos = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('fechaVencimiento', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error obteniendo gastos:', error);
    throw error;
  }
};

// Obtener gastos en tiempo real
export const getGastosRealtime = (callback) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('fechaVencimiento', 'desc'));
  return onSnapshot(q, (querySnapshot) => {
    const gastos = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(gastos);
  });
};

// Crear un nuevo gasto
export const crearGasto = async (gastoData, usuario) => {
  try {
    const gasto = {
      ...gastoData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: usuario.email,
      updatedBy: usuario.email
    };
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), gasto);
    
    // Crear log de creación
    await crearLog({
      gastoId: docRef.id,
      usuario: usuario.email,
      accion: 'crear',
      cambios: { anterior: null, nuevo: gasto },
      ip: 'localhost', // En producción obtener IP real
      userAgent: navigator.userAgent
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creando gasto:', error);
    throw error;
  }
};

// Actualizar un gasto
export const actualizarGasto = async (gastoId, gastoData, usuario) => {
  try {
    const gastoRef = doc(db, COLLECTION_NAME, gastoId);
    
    // Obtener datos anteriores para el log
    const gastoAnterior = await getGastoById(gastoId);
    
    const gastoActualizado = {
      ...gastoData,
      updatedAt: serverTimestamp(),
      updatedBy: usuario.email
    };
    
    await updateDoc(gastoRef, gastoActualizado);
    
    // Crear log de actualización
    await crearLog({
      gastoId,
      usuario: usuario.email,
      accion: 'editar',
      cambios: { anterior: gastoAnterior, nuevo: gastoActualizado },
      ip: 'localhost',
      userAgent: navigator.userAgent
    });
    
    return gastoId;
  } catch (error) {
    console.error('Error actualizando gasto:', error);
    throw error;
  }
};

// Eliminar un gasto
export const eliminarGasto = async (gastoId, usuario) => {
  try {
    const gastoRef = doc(db, COLLECTION_NAME, gastoId);
    
    // Obtener datos del gasto para el log
    const gastoEliminado = await getGastoById(gastoId);
    
    await deleteDoc(gastoRef);
    
    // Crear log de eliminación
    await crearLog({
      gastoId,
      usuario: usuario.email,
      accion: 'eliminar',
      cambios: { anterior: gastoEliminado, nuevo: null },
      ip: 'localhost',
      userAgent: navigator.userAgent
    });
    
    return gastoId;
  } catch (error) {
    console.error('Error eliminando gasto:', error);
    throw error;
  }
};

// Obtener un gasto por ID
export const getGastoById = async (gastoId) => {
  try {
    const gastoRef = doc(db, COLLECTION_NAME, gastoId);
    const gastoDoc = await getDocs(query(collection(db, COLLECTION_NAME), where('__name__', '==', gastoId)));
    
    if (gastoDoc.empty) {
      throw new Error('Gasto no encontrado');
    }
    
    return {
      id: gastoDoc.docs[0].id,
      ...gastoDoc.docs[0].data()
    };
  } catch (error) {
    console.error('Error obteniendo gasto:', error);
    throw error;
  }
};

// Marcar gasto como pagado
export const marcarComoPagado = async (gastoId, usuario) => {
  try {
    const gastoRef = doc(db, COLLECTION_NAME, gastoId);
    const gastoAnterior = await getGastoById(gastoId);
    
    const gastoActualizado = {
      estado: 'pagado',
      fechaPago: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: usuario.email
    };
    
    await updateDoc(gastoRef, gastoActualizado);
    
    // Crear log de pago
    await crearLog({
      gastoId,
      usuario: usuario.email,
      accion: 'pagar',
      cambios: { anterior: gastoAnterior, nuevo: gastoActualizado },
      ip: 'localhost',
      userAgent: navigator.userAgent
    });
    
    return gastoId;
  } catch (error) {
    console.error('Error marcando gasto como pagado:', error);
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
export const getLogs = async (gastoId = null) => {
  try {
    let q = query(collection(db, LOGS_COLLECTION), orderBy('timestamp', 'desc'));
    
    if (gastoId) {
      q = query(
        collection(db, LOGS_COLLECTION), 
        where('gastoId', '==', gastoId),
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
export const getLogsRealtime = (callback, gastoId = null) => {
  let q = query(collection(db, LOGS_COLLECTION), orderBy('timestamp', 'desc'));
  
  if (gastoId) {
    q = query(
      collection(db, LOGS_COLLECTION), 
      where('gastoId', '==', gastoId),
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

// ===== FUNCIONES PARA PAGOS PARCIALES =====

// Agregar pago parcial a un gasto
export const agregarPagoParcial = async (gastoId, pagoData, usuario) => {
  try {
    const gastoRef = doc(db, COLLECTION_NAME, gastoId);
    const gastoDoc = await getDoc(gastoRef);
    
    if (!gastoDoc.exists()) {
      throw new Error('Gasto no encontrado');
    }
    
    const gasto = gastoDoc.data();
    const pagosParciales = gasto.pagosParciales || [];
    
    const nuevoPago = {
      id: Date.now().toString(),
      ...pagoData,
      fechaCreacion: serverTimestamp(),
      creadoPor: usuario.email
    };
    
    const pagosActualizados = [...pagosParciales, nuevoPago];
    
    await updateDoc(gastoRef, {
      pagosParciales: pagosActualizados,
      updatedAt: serverTimestamp(),
      updatedBy: usuario.email
    });
    
    // Crear log de pago parcial
    await crearLog({
      gastoId,
      usuario: usuario.email,
      accion: 'pago_parcial_agregar',
      cambios: { 
        anterior: { pagosParciales }, 
        nuevo: { pagosParciales: pagosActualizados } 
      },
      ip: 'localhost',
      userAgent: navigator.userAgent
    });
    
    return gastoId;
  } catch (error) {
    console.error('Error agregando pago parcial:', error);
    throw error;
  }
};

// Editar pago parcial
export const editarPagoParcial = async (gastoId, pagoId, pagoData, usuario) => {
  try {
    const gastoRef = doc(db, COLLECTION_NAME, gastoId);
    const gastoDoc = await getDoc(gastoRef);
    
    if (!gastoDoc.exists()) {
      throw new Error('Gasto no encontrado');
    }
    
    const gasto = gastoDoc.data();
    const pagosParciales = gasto.pagosParciales || [];
    const pagoIndex = pagosParciales.findIndex(p => p.id === pagoId);
    
    if (pagoIndex === -1) {
      throw new Error('Pago no encontrado');
    }
    
    const pagosActualizados = [...pagosParciales];
    pagosActualizados[pagoIndex] = {
      ...pagosActualizados[pagoIndex],
      ...pagoData,
      fechaModificacion: serverTimestamp(),
      modificadoPor: usuario.email
    };
    
    await updateDoc(gastoRef, {
      pagosParciales: pagosActualizados,
      updatedAt: serverTimestamp(),
      updatedBy: usuario.email
    });
    
    // Crear log de edición de pago parcial
    await crearLog({
      gastoId,
      usuario: usuario.email,
      accion: 'pago_parcial_editar',
      cambios: { 
        anterior: { pagosParciales }, 
        nuevo: { pagosParciales: pagosActualizados } 
      },
      ip: 'localhost',
      userAgent: navigator.userAgent
    });
    
    return gastoId;
  } catch (error) {
    console.error('Error editando pago parcial:', error);
    throw error;
  }
};

// Eliminar pago parcial
export const eliminarPagoParcial = async (gastoId, pagoId, usuario) => {
  try {
    const gastoRef = doc(db, COLLECTION_NAME, gastoId);
    const gastoDoc = await getDoc(gastoRef);
    
    if (!gastoDoc.exists()) {
      throw new Error('Gasto no encontrado');
    }
    
    const gasto = gastoDoc.data();
    const pagosParciales = gasto.pagosParciales || [];
    const pagosActualizados = pagosParciales.filter(p => p.id !== pagoId);
    
    await updateDoc(gastoRef, {
      pagosParciales: pagosActualizados,
      updatedAt: serverTimestamp(),
      updatedBy: usuario.email
    });
    
    // Crear log de eliminación de pago parcial
    await crearLog({
      gastoId,
      usuario: usuario.email,
      accion: 'pago_parcial_eliminar',
      cambios: { 
        anterior: { pagosParciales }, 
        nuevo: { pagosParciales: pagosActualizados } 
      },
      ip: 'localhost',
      userAgent: navigator.userAgent
    });
    
    return gastoId;
  } catch (error) {
    console.error('Error eliminando pago parcial:', error);
    throw error;
  }
};

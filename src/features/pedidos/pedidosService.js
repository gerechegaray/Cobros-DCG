import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { api } from '../../services/api';
import { transformarProductosAlegra } from './utils';

const COLLECTION_NAME = 'pedidos';
const LOGS_COLLECTION = 'pedidos_logs';

// Obtener todos los pedidos
export const getPedidos = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const pedidos = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Ordenar en el cliente por fecha de pedido (descendente)
    return pedidos.sort((a, b) => {
      const fechaA = a.fechaPedido?.toDate?.() || new Date(a.fechaPedido);
      const fechaB = b.fechaPedido?.toDate?.() || new Date(b.fechaPedido);
      return fechaB - fechaA;
    });
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    throw error;
  }
};

// Obtener pedidos en tiempo real
export const getPedidosRealtime = (callback) => {
  const q = query(collection(db, COLLECTION_NAME));
  return onSnapshot(q, (querySnapshot) => {
    const pedidos = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Ordenar en el cliente por fecha de pedido (descendente)
    const pedidosOrdenados = pedidos.sort((a, b) => {
      const fechaA = a.fechaPedido?.toDate?.() || new Date(a.fechaPedido);
      const fechaB = b.fechaPedido?.toDate?.() || new Date(b.fechaPedido);
      return fechaB - fechaA;
    });
    
    callback(pedidosOrdenados);
  });
};

// Obtener pedidos por vendedor
export const getPedidosByVendedor = async (vendedorEmail) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME), 
      where('vendedor', '==', vendedorEmail)
    );
    const querySnapshot = await getDocs(q);
    const pedidos = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Ordenar en el cliente
    return pedidos.sort((a, b) => {
      const fechaA = a.fechaPedido?.toDate?.() || new Date(a.fechaPedido);
      const fechaB = b.fechaPedido?.toDate?.() || new Date(b.fechaPedido);
      return fechaB - fechaA;
    });
  } catch (error) {
    console.error('Error obteniendo pedidos por vendedor:', error);
    throw error;
  }
};

// Obtener pedidos por vendedor en tiempo real
export const getPedidosByVendedorRealtime = (vendedorEmail, callback) => {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where('vendedor', '==', vendedorEmail)
  );
  return onSnapshot(q, (querySnapshot) => {
    const pedidos = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Ordenar en el cliente
    const pedidosOrdenados = pedidos.sort((a, b) => {
      const fechaA = a.fechaPedido?.toDate?.() || new Date(a.fechaPedido);
      const fechaB = b.fechaPedido?.toDate?.() || new Date(b.fechaPedido);
      return fechaB - fechaA;
    });
    
    callback(pedidosOrdenados);
  });
};

// Crear un nuevo pedido
export const crearPedido = async (pedidoData, usuario) => {
  try {
    const pedido = {
      ...pedidoData,
      estado: 'pendiente', // Siempre inicia como pendiente
      vendedor: usuario.email,
      vendedorNombre: usuario.name || usuario.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: usuario.email,
      updatedBy: usuario.email
    };
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), pedido);
    
    // Crear log de creación
    await crearLog({
      pedidoId: docRef.id,
      usuario: usuario.email,
      accion: 'crear',
      cambios: { anterior: null, nuevo: pedido },
      ip: 'localhost',
      userAgent: navigator.userAgent
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creando pedido:', error);
    throw error;
  }
};

// Actualizar un pedido
export const actualizarPedido = async (pedidoId, pedidoData, usuario) => {
  try {
    const pedidoRef = doc(db, COLLECTION_NAME, pedidoId);
    
    // Obtener datos anteriores para el log
    const pedidoAnterior = await getPedidoById(pedidoId);
    
    const pedidoActualizado = {
      ...pedidoData,
      updatedAt: serverTimestamp(),
      updatedBy: usuario.email
    };
    
    await updateDoc(pedidoRef, pedidoActualizado);
    
    // Crear log de actualización
    await crearLog({
      pedidoId,
      usuario: usuario.email,
      accion: 'editar',
      cambios: { anterior: pedidoAnterior, nuevo: pedidoActualizado },
      ip: 'localhost',
      userAgent: navigator.userAgent
    });
    
    return pedidoId;
  } catch (error) {
    console.error('Error actualizando pedido:', error);
    throw error;
  }
};

// Eliminar un pedido
export const eliminarPedido = async (pedidoId, usuario) => {
  try {
    const pedidoRef = doc(db, COLLECTION_NAME, pedidoId);
    
    // Obtener datos del pedido para el log
    const pedidoEliminado = await getPedidoById(pedidoId);
    
    await deleteDoc(pedidoRef);
    
    // Crear log de eliminación
    await crearLog({
      pedidoId,
      usuario: usuario.email,
      accion: 'eliminar',
      cambios: { anterior: pedidoEliminado, nuevo: null },
      ip: 'localhost',
      userAgent: navigator.userAgent
    });
    
    return pedidoId;
  } catch (error) {
    console.error('Error eliminando pedido:', error);
    throw error;
  }
};

// Obtener un pedido por ID
export const getPedidoById = async (pedidoId) => {
  try {
    const pedidoRef = doc(db, COLLECTION_NAME, pedidoId);
    const pedidoDoc = await getDoc(pedidoRef);
    
    if (!pedidoDoc.exists()) {
      throw new Error('Pedido no encontrado');
    }
    
    return {
      id: pedidoDoc.id,
      ...pedidoDoc.data()
    };
  } catch (error) {
    console.error('Error obteniendo pedido:', error);
    throw error;
  }
};

// Cambiar estado del pedido (solo admin puede cambiar a facturado)
export const cambiarEstadoPedido = async (pedidoId, nuevoEstado, usuario) => {
  try {
    // Validar que solo admin pueda cambiar a facturado
    if (nuevoEstado === 'facturado' && usuario.role !== 'admin') {
      throw new Error('Solo el administrador puede marcar pedidos como facturados');
    }
    
    const pedidoRef = doc(db, COLLECTION_NAME, pedidoId);
    const pedidoAnterior = await getPedidoById(pedidoId);
    
    const pedidoActualizado = {
      estado: nuevoEstado,
      updatedAt: serverTimestamp(),
      updatedBy: usuario.email
    };
    
    // Si se marca como facturado, guardar fecha y usuario
    if (nuevoEstado === 'facturado') {
      pedidoActualizado.fechaFacturacion = serverTimestamp();
      pedidoActualizado.facturadoPor = usuario.email;
    }
    
    await updateDoc(pedidoRef, pedidoActualizado);
    
    // Crear log de cambio de estado
    await crearLog({
      pedidoId,
      usuario: usuario.email,
      accion: 'cambiar_estado',
      cambios: { 
        anterior: { estado: pedidoAnterior.estado }, 
        nuevo: { estado: nuevoEstado } 
      },
      ip: 'localhost',
      userAgent: navigator.userAgent
    });
    
    return pedidoId;
  } catch (error) {
    console.error('Error cambiando estado del pedido:', error);
    throw error;
  }
};

// Marcar pedido como cargado en Alegra
export const marcarComoCargadoEnAlegra = async (pedidoId, numeroFactura, usuario) => {
  try {
    const pedidoRef = doc(db, COLLECTION_NAME, pedidoId);
    const pedidoAnterior = await getPedidoById(pedidoId);
    
    const pedidoActualizado = {
      cargadoEnAlegra: true,
      numeroFactura,
      fechaCargaAlegra: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: usuario.email
    };
    
    await updateDoc(pedidoRef, pedidoActualizado);
    
    // Crear log
    await crearLog({
      pedidoId,
      usuario: usuario.email,
      accion: 'cargar_alegra',
      cambios: { anterior: pedidoAnterior, nuevo: pedidoActualizado },
      ip: 'localhost',
      userAgent: navigator.userAgent
    });
    
    return pedidoId;
  } catch (error) {
    console.error('Error marcando pedido como cargado en Alegra:', error);
    throw error;
  }
};

// Obtener productos desde Firestore (cache)
export const getProductosCache = async () => {
  try {
    const productos = await api.getProductosFirebase();
    return transformarProductosAlegra(productos);
  } catch (error) {
    console.error('Error obteniendo productos desde cache:', error);
    return [];
  }
};

// Sincronizar productos desde Alegra (solo admin)
export const sincronizarProductosAlegra = async () => {
  try {
    // Llamar al endpoint de sincronización
    const response = await api.syncProductosAlegra();
    return response;
  } catch (error) {
    console.error('Error sincronizando productos desde Alegra:', error);
    throw error;
  }
};

// Obtener productos con fallback
export const getProductos = async (forzarActualizacion = false) => {
  try {
    if (forzarActualizacion) {
      // Forzar actualización desde Alegra
      const productos = await api.getAlegraItems();
      return transformarProductosAlegra(productos);
    }
    
    // Intentar desde cache primero
    let productos = await getProductosCache();
    
    // Si no hay productos en cache, obtener de Alegra
    if (!productos || productos.length === 0) {
      const productosAlegra = await api.getAlegraItems();
      productos = transformarProductosAlegra(productosAlegra);
    }
    
    return productos;
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    throw error;
  }
};

// Obtener clientes asignados al vendedor
export const getClientesAsignados = async (user) => {
  try {
    const { getClientesCatalogo } = await import('../../services/firebase');
    const todosLosClientes = await getClientesCatalogo();
    
    // Si es admin, devolver todos los clientes
    if (user.role === 'admin') {
      return todosLosClientes;
    }
    
    // Determinar sellerId según el rol
    let sellerId = null;
    if (user.role === 'Guille') {
      sellerId = '1';
    } else if (user.role === 'Santi') {
      sellerId = '2';
    }
    
    // Si no tiene sellerId, devolver array vacío
    if (!sellerId) {
      return [];
    }
    
    // Filtrar clientes por sellerId
    const clientesFiltrados = todosLosClientes.filter(cliente => {
      if (cliente.seller && cliente.seller.id) {
        return cliente.seller.id === sellerId;
      }
      return false;
    });
    
    return clientesFiltrados;
  } catch (error) {
    console.error('Error obteniendo clientes asignados:', error);
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
export const getLogs = async (pedidoId = null) => {
  try {
    let q = query(collection(db, LOGS_COLLECTION));
    
    if (pedidoId) {
      q = query(
        collection(db, LOGS_COLLECTION), 
        where('pedidoId', '==', pedidoId)
      );
    }
    
    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Ordenar por timestamp descendente
    return logs.sort((a, b) => {
      const timestampA = a.timestamp?.toDate?.() || new Date(a.timestamp);
      const timestampB = b.timestamp?.toDate?.() || new Date(b.timestamp);
      return timestampB - timestampA;
    });
  } catch (error) {
    console.error('Error obteniendo logs:', error);
    throw error;
  }
};

// Obtener logs en tiempo real
export const getLogsRealtime = (callback, pedidoId = null) => {
  let q = query(collection(db, LOGS_COLLECTION));
  
  if (pedidoId) {
    q = query(
      collection(db, LOGS_COLLECTION), 
      where('pedidoId', '==', pedidoId)
    );
  }
  
  return onSnapshot(q, (querySnapshot) => {
    const logs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Ordenar por timestamp descendente
    const logsOrdenados = logs.sort((a, b) => {
      const timestampA = a.timestamp?.toDate?.() || new Date(a.timestamp);
      const timestampB = b.timestamp?.toDate?.() || new Date(b.timestamp);
      return timestampB - timestampA;
    });
    
    callback(logsOrdenados);
  });
};


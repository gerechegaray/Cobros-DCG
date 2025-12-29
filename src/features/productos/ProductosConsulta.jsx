import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { AutoComplete } from 'primereact/autocomplete';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { api } from '../../services/api';
import { transformarProductosAlegra } from '../pedidos/utils';
import { formatearMoneda } from '../pedidos/utils';

const ProductosConsulta = ({ user }) => {
  const toast = useRef(null);
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);

  // Cargar productos desde Firestore
  useEffect(() => {
    const cargarProductos = async () => {
      setLoading(true);
      try {
        const productosData = await api.getProductosFirebase();
        const productosTransformados = transformarProductosAlegra(productosData);
        setProductos(productosTransformados);
        setProductosFiltrados(productosTransformados);
      } catch (error) {
        console.error('Error cargando productos:', error);
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar productos'
        });
      } finally {
        setLoading(false);
      }
    };

    cargarProductos();
  }, []);

  // Filtrar productos por búsqueda
  useEffect(() => {
    if (!busqueda || busqueda.trim() === '') {
      setProductosFiltrados(productos);
      return;
    }

    const query = busqueda.toLowerCase();
    const filtered = productos.filter(p => {
      const nombre = (p.nombre || '').toLowerCase();
      const codigo = (p.codigo || '').toLowerCase();
      return nombre.includes(query) || codigo.includes(query);
    });

    setProductosFiltrados(filtered);
  }, [busqueda, productos]);

  // Obtener estado de stock
  const getEstadoStock = (producto) => {
    const stock = producto.stock || 0;
    return stock > 0 ? 'Hay stock' : 'Sin stock';
  };

  // Obtener color del tag de stock
  const getColorStock = (producto) => {
    const stock = producto.stock || 0;
    return stock > 0 ? 'success' : 'warning';
  };

  return (
    <>
      <Toast ref={toast} />
      <div className="p-4">
        <div className="mb-4">
          <h1 className="text-3xl font-bold mb-2">Consulta de Productos</h1>
          <p className="text-gray-600">Busca y consulta el estado de stock de los productos disponibles</p>
        </div>

        {/* Buscador */}
        <Card className="mb-4">
          <div className="p-3">
            <div className="field">
              <label htmlFor="busqueda-productos" className="block mb-2 font-semibold">
                Buscar Producto
              </label>
              <InputText
                id="busqueda-productos"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o código..."
                className="w-full"
                style={{ fontSize: '16px', padding: '12px' }}
              />
            </div>
          </div>
        </Card>

        {/* Lista de productos */}
        {loading ? (
          <Card>
            <div className="p-4 text-center">
              <p className="text-gray-600">Cargando productos...</p>
            </div>
          </Card>
        ) : productosFiltrados.length === 0 ? (
          <Card>
            <div className="p-4 text-center">
              <p className="text-gray-600">
                {busqueda ? 'No se encontraron productos con ese criterio de búsqueda' : 'No hay productos disponibles'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid">
            {productosFiltrados.map((producto, index) => (
              <div key={producto.id || index} className="col-12 md:col-6 lg:col-4">
                <Card className="h-full">
                  <div className="p-3">
                    <div className="flex justify-content-between align-items-start mb-2">
                      <h3 className="text-lg font-semibold mb-1" style={{ flex: 1 }}>
                        {producto.nombre || 'Sin nombre'}
                      </h3>
                    </div>
                    
                    <div className="mb-2">
                      <p className="text-sm text-gray-600 mb-1">Código: {producto.codigo || 'N/A'}</p>
                      <p className="text-lg font-bold text-primary mb-2">
                        {formatearMoneda(producto.precio || 0)}
                      </p>
                    </div>

                    <div className="mt-3">
                      <Tag 
                        value={getEstadoStock(producto)} 
                        severity={getColorStock(producto)}
                      />
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Resumen */}
        {!loading && productosFiltrados.length > 0 && (
          <Card className="mt-4">
            <div className="p-3">
              <p className="text-sm text-gray-600">
                Mostrando {productosFiltrados.length} de {productos.length} productos
              </p>
            </div>
          </Card>
        )}
      </div>
    </>
  );
};

export default ProductosConsulta;


import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
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

  // Templates para columnas
  const nombreTemplate = (rowData) => {
    return <span data-label="Producto" className="productos-nombre">{rowData.nombre || 'Sin nombre'}</span>;
  };

  const precioTemplate = (rowData) => {
    return <span data-label="Precio" className="productos-precio">{formatearMoneda(rowData.precio || 0)}</span>;
  };

  const stockTemplate = (rowData) => {
    const stock = rowData.stock || 0;
    const tieneStock = stock > 0;
    return (
      <span data-label="Stock">
        <Tag 
          value={tieneStock ? 'Hay stock' : 'Sin stock'} 
          severity={tieneStock ? 'success' : 'warning'}
          className="productos-stock-tag"
        />
      </span>
    );
  };

  return (
    <>
      <Toast ref={toast} />
      <div className="productos-consulta-container">
        {/* Header compacto */}
        <div className="productos-header">
          <h1 className="productos-title">Productos</h1>
          <p className="productos-subtitle">Consulta de precios y disponibilidad</p>
        </div>

        {/* Buscador compacto */}
        <div className="productos-buscador">
          <InputText
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código..."
            className="productos-input-busqueda"
          />
        </div>

        {/* Tabla de productos */}
        <div className="productos-table-container">
          <DataTable
            value={productosFiltrados}
            loading={loading}
            emptyMessage={busqueda ? 'No se encontraron productos' : 'No hay productos disponibles'}
            paginator
            rows={20}
            rowsPerPageOptions={[10, 20, 50, 100]}
            responsiveLayout="stack"
            breakpoint="768px"
            className="productos-datatable"
          >
            <Column 
              field="nombre" 
              header="Producto" 
              body={nombreTemplate}
              sortable
              style={{ width: '50%' }}
            />
            <Column 
              field="precio" 
              header="Precio" 
              body={precioTemplate}
              sortable
              style={{ width: '25%' }}
            />
            <Column 
              field="stock" 
              header="Stock" 
              body={stockTemplate}
              sortable
              style={{ width: '25%' }}
            />
          </DataTable>
        </div>

        {/* Resumen compacto */}
        {!loading && productosFiltrados.length > 0 && (
          <div className="productos-resumen">
            Mostrando {productosFiltrados.length} de {productos.length} productos
          </div>
        )}
      </div>
    </>
  );
};

export default ProductosConsulta;


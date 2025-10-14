import React, { useState } from 'react';
import { TabView, TabPanel } from 'primereact/tabview';
import PedidosLista from './PedidosLista';
import PedidosDashboard from './PedidosDashboard';
import PedidosReportes from './PedidosReportes';

const PedidosMain = ({ user }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="pedidos-main p-2 md:p-4">
      <div className="mb-3 md:mb-4">
        <h1 className="text-2xl md:text-4xl font-bold text-primary m-0">
          <i className="pi pi-shopping-cart mr-2 md:mr-3"></i>
          Gestión de Pedidos
        </h1>
        <p className="text-gray-600 mt-2 text-sm md:text-base">
          {user?.role === 'admin' 
            ? 'Administra y controla todos los pedidos del sistema' 
            : 'Registra y gestiona tus pedidos'}
        </p>
      </div>

      <TabView 
        activeIndex={activeIndex} 
        onTabChange={(e) => setActiveIndex(e.index)}
        className="w-full"
      >
        <TabPanel header="Lista de Pedidos" leftIcon="pi pi-list mr-2">
          <PedidosLista user={user} />
        </TabPanel>
        
        <TabPanel header="Dashboard" leftIcon="pi pi-chart-bar mr-2">
          <PedidosDashboard user={user} />
        </TabPanel>
        
        <TabPanel header="Reportes" leftIcon="pi pi-file-chart mr-2">
          <PedidosReportes user={user} />
        </TabPanel>
      </TabView>
    </div>
  );
};

export default PedidosMain;


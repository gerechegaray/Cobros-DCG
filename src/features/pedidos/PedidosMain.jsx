import React, { useState } from 'react';
import { TabView, TabPanel } from 'primereact/tabview';
import PedidosLista from './PedidosLista';
import PedidosDashboard from './PedidosDashboard';
import PedidosReportes from './PedidosReportes';

const PedidosMain = ({ user }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="pedidos-main">
      <div className="pedidos-main-header">
        <h1>
          <i className="pi pi-shopping-cart"></i>
          Gestión de Pedidos
        </h1>
        <p>
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


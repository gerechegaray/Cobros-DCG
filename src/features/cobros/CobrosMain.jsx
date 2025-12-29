import React, { useState } from 'react';
import { TabView, TabPanel } from 'primereact/tabview';
import CobrosLista from './CobrosLista';
import CobrosDashboard from './CobrosDashboard';
import CobrosLogs from './CobrosLogs';

const CobrosMain = ({ user }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="cobros-main">
      <div className="cobros-main-header">
        <h1>
          <i className="pi pi-dollar"></i>
          Gestión de Cobros
        </h1>
        <p>
          {isAdmin 
            ? 'Administra y controla todos los cobros del sistema' 
            : 'Registra tus cobros y verifica su estado en el sistema'}
        </p>
      </div>

      <TabView 
        activeIndex={activeIndex} 
        onTabChange={(e) => setActiveIndex(e.index)}
        className="w-full"
      >
        <TabPanel header="Lista de Cobros" leftIcon="pi pi-list mr-2">
          <CobrosLista user={user} />
        </TabPanel>
        
        <TabPanel header="Dashboard" leftIcon="pi pi-chart-bar mr-2">
          <CobrosDashboard user={user} />
        </TabPanel>
        
        {isAdmin && (
          <TabPanel header="Auditoría" leftIcon="pi pi-history mr-2">
            <CobrosLogs user={user} />
          </TabPanel>
        )}
      </TabView>
    </div>
  );
};

export default CobrosMain;


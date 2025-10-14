import React, { useState } from 'react';
import { TabView, TabPanel } from 'primereact/tabview';
import CobrosLista from './CobrosLista';
import CobrosDashboard from './CobrosDashboard';
import CobrosLogs from './CobrosLogs';

const CobrosMain = ({ user }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="cobros-main p-2 md:p-4">
      <div className="mb-3 md:mb-4">
        <h1 className="text-2xl md:text-4xl font-bold text-primary m-0">
          <i className="pi pi-dollar mr-2 md:mr-3"></i>
          Gestión de Cobros
        </h1>
        <p className="text-gray-600 mt-2 text-sm md:text-base">
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


import React, { useState } from 'react';
import { TabView, TabPanel } from 'primereact/tabview';
import GastosCalendario from './GastosCalendario';
import GastosDashboard from './GastosDashboard';
import GastosLogs from './GastosLogs';
import ReportesGastos from './ReportesGastos';

const GastosMain = ({ user }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="gastos-main">
      <TabView 
        activeIndex={activeIndex} 
        onTabChange={(e) => setActiveIndex(e.index)}
        className="w-full"
      >
        <TabPanel header="Calendario" leftIcon="pi pi-calendar">
          <GastosCalendario user={user} />
        </TabPanel>
        
        <TabPanel header="Dashboard" leftIcon="pi pi-chart-bar">
          <GastosDashboard user={user} />
        </TabPanel>
        
        <TabPanel header="Reportes" leftIcon="pi pi-chart-line">
          <ReportesGastos user={user} />
        </TabPanel>
        
        <TabPanel header="Auditoría" leftIcon="pi pi-history">
          <GastosLogs user={user} />
        </TabPanel>
      </TabView>
    </div>
  );
};

export default GastosMain;

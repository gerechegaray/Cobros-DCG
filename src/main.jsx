import 'primereact/resources/themes/lara-light-blue/theme.css'; // Tema de PrimeReact
import 'primereact/resources/primereact.min.css';               // Estilos base de PrimeReact
import 'primeicons/primeicons.css';                             // Iconos de PrimeReact
import './index.css';                                           // Tu CSS (ya estaba)
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
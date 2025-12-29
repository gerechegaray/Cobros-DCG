import 'primereact/resources/themes/lara-dark-blue/theme.css'; // Tema dark de PrimeReact (por defecto)
import 'primereact/resources/primereact.min.css';               // Estilos base de PrimeReact
import 'primeicons/primeicons.css';                             // Iconos de PrimeReact
import "./styles/index.css"                                        // Estilos custom DCG
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <App />
);
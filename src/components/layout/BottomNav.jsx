import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ITEMS = [
  { label: 'Clientes', icon: 'pi pi-users', path: '/menu-clientes' },
  { label: 'Pedidos', icon: 'pi pi-shopping-cart', path: '/pedidos' },
  { label: 'Cobros', icon: 'pi pi-dollar', path: '/cobros' },
  { label: 'Cuenta', icon: 'pi pi-credit-card', path: '/estado-cuenta' }
];

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bottom-nav" aria-label="Accesos de calle">
      {ITEMS.map((item) => {
        const activo = location.pathname === item.path;
        return (
          <button
            key={item.path}
            type="button"
            className={`bottom-nav__item ${activo ? 'is-active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <i className={item.icon} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;

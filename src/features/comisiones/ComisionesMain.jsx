import React from 'react';
import { useLocation } from 'react-router-dom';
import ComisionesVendedor from './ComisionesVendedor';
import ComisionesAdmin from './ComisionesAdmin';

function ComisionesMain({ user }) {
  const location = useLocation();
  
  // Determinar si es admin o vendedor
  const isAdmin = user?.role === 'admin';
  
  if (isAdmin) {
    return <ComisionesAdmin user={user} />;
  }
  
  return <ComisionesVendedor user={user} />;
}

export default ComisionesMain;


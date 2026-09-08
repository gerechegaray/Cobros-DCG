import { useEffect, useState } from 'react';

export function detectarMovil() {
  if (typeof window === 'undefined') return false;

  const ancho = window.innerWidth;
  const esTactil = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const esUserAgentMovil = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    navigator.userAgent
  );

  return ancho < 600 || (ancho < 768 && (esTactil || esUserAgentMovil));
}

export function useEsMovil() {
  const [esMovil, setEsMovil] = useState(detectarMovil);

  useEffect(() => {
    const actualizar = () => setEsMovil(detectarMovil());
    window.addEventListener('resize', actualizar);
    return () => window.removeEventListener('resize', actualizar);
  }, []);

  return esMovil;
}

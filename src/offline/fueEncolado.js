export function fueEncolado(result) {
  return Boolean(result && typeof result === 'object' && result.queued);
}

export function mensajeGuardado(result, okOnline, okCola) {
  return fueEncolado(result) ? okCola : okOnline;
}

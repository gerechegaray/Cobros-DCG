import { auth } from '../services/firebase';

export async function authHeaders(extra = {}) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('No autenticado');
  }
  return {
    ...extra,
    Authorization: `Bearer ${token}`
  };
}

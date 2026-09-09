import { auth } from '../services/firebase';

export async function authHeaders(extra = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No autenticado');
  }
  const token = await user.getIdToken(true);
  if (!token) {
    throw new Error('No autenticado');
  }
  return {
    ...extra,
    Authorization: `Bearer ${token}`
  };
}

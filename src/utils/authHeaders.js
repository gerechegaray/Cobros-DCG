import { auth } from '../services/firebase';

export async function authHeaders(extra = {}, forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No autenticado');
  }
  const token = await user.getIdToken(forceRefresh);
  if (!token) {
    throw new Error('No autenticado');
  }
  return {
    ...extra,
    Authorization: `Bearer ${token}`,
    'X-Firebase-Token': token
  };
}

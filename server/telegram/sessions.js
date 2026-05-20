const COLLECTION = 'telegramSessions';

export async function getSession(adminDb, telegramId) {
  const ref = adminDb.collection(COLLECTION).doc(String(telegramId));
  const doc = await ref.get();
  if (!doc.exists) return null;

  const session = { id: doc.id, ...doc.data() };
  const expiresAt = toDate(session.expiresAt);
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    await ref.delete();
    return null;
  }

  return session;
}

export async function saveSession(adminDb, telegramId, session, ttlMs) {
  const now = new Date();
  await adminDb.collection(COLLECTION).doc(String(telegramId)).set(
    {
      ...session,
      telegramId: String(telegramId),
      expiresAt: new Date(now.getTime() + ttlMs),
      updatedAt: now
    },
    { merge: true }
  );
}

export async function clearSession(adminDb, telegramId) {
  await adminDb.collection(COLLECTION).doc(String(telegramId)).delete();
}

function toDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  return new Date(value);
}

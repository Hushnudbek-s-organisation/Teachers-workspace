// ============================================================================
// KICHIK TTL KESH — bir xil ma'lumotni har sahifada qayta-qayta o'qimaslik
// uchun (ko'p bolalar bir vaqtda o'ynaganda server tez ishlashi uchun).
//
//   • Yozish amallari (saveBook, createCustomGame, saveResult...) keshni
//     darhol BEKOR qiladi — eski ma'lumot ko'rinmaydi
//   • TTL juda qisqa (5–30 s): yangilanishlar baribir darhol seziladi
// ============================================================================

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const gc = globalThis as unknown as { __twCache?: Map<string, CacheEntry> };

function cacheMap(): Map<string, CacheEntry> {
  if (!gc.__twCache) gc.__twCache = new Map();
  return gc.__twCache;
}

export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cacheMap().get(key);
  if (hit && hit.expiresAt > now) return Promise.resolve(hit.value as T);
  return fn().then((value) => {
    cacheMap().set(key, { value, expiresAt: now + ttlMs });
    return value;
  });
}

/** Yozish amallaridan keyin: prefiks bo'yicha (yoki to'liq) bekor qilish */
export function invalidateCache(prefix?: string): void {
  const m = cacheMap();
  if (!prefix) {
    m.clear();
    return;
  }
  for (const k of [...m.keys()]) {
    if (k.startsWith(prefix)) m.delete(k);
  }
}

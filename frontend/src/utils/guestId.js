const GUEST_KEY = 'astro_guest_id';

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `g_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getGuestId() {
  try {
    let id = localStorage.getItem(GUEST_KEY);
    if (!id) {
      id = createId();
      localStorage.setItem(GUEST_KEY, id);
    }
    return id;
  } catch {
    return createId();
  }
}

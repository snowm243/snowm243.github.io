// URL identifies a tool across name changes. Only this preference key is touched.
export const ORDER_KEY = 'sandy-tools:order:v1';

export function mergeOrder(defaultIds, saved) {
  const available = new Set(defaultIds);
  const clean = Array.isArray(saved) ? saved.filter((id) => typeof id === 'string' && available.has(id)) : [];
  return [...new Set([...clean, ...defaultIds])];
}

export function moveItem(order, id, destination) {
  const from = order.indexOf(id);
  if (from < 0 || !Number.isInteger(destination) || destination < 0 || destination >= order.length) return [...order];
  const next = [...order];
  next.splice(from, 1);
  next.splice(destination, 0, id);
  return next;
}

// Use stable grid slots rather than moving elements as targets: no hover oscillation.
// Pick the nearest row first so the empty area of a short last row means its last slot.
export function getDropIndex(slots, x, y) {
  let index = -1, bestY = Infinity, bestX = Infinity;
  slots.forEach((slot, i) => {
    const dy = Math.max(slot.top - y, y - (slot.top + slot.height), 0);
    const dx = Math.abs(x - (slot.left + slot.width / 2));
    if (dy < bestY || (dy === bestY && dx < bestX)) {
      index = i;
      bestY = dy;
      bestX = dx;
    }
  });
  return index;
}

export function readOrder(storage) {
  try { return JSON.parse(storage?.getItem(ORDER_KEY) ?? 'null'); } catch { return null; }
}

export function saveOrder(storage, order) {
  try {
    if (!storage) return false;
    storage.setItem(ORDER_KEY, JSON.stringify(order));
    return true;
  } catch { return false; }
}

export function clearOrder(storage) {
  try {
    if (!storage) return false;
    storage.removeItem(ORDER_KEY);
    return true;
  } catch { return false; }
}

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

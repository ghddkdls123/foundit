const RETURNED_ITEMS_KEY = 'foundit:localReturnedItems';
export const LOCAL_ITEM_STATUS_EVENT = 'foundit:local-item-status-change';

export function getLocallyReturnedIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(RETURNED_ITEMS_KEY) || '[]');
    return Array.isArray(ids) ? ids.map(String) : [];
  } catch {
    return [];
  }
}

export function isLocallyReturned(itemId) {
  return itemId != null && getLocallyReturnedIds().includes(String(itemId));
}

export function markLocallyReturned(itemId) {
  if (itemId == null) return false;
  const ids = new Set(getLocallyReturnedIds());
  ids.add(String(itemId));
  try {
    localStorage.setItem(RETURNED_ITEMS_KEY, JSON.stringify([...ids]));
  } catch {
    return false;
  }
  window.dispatchEvent(new CustomEvent(LOCAL_ITEM_STATUS_EVENT, { detail: { itemId: String(itemId), status: 'RETURNED' } }));
  return true;
}

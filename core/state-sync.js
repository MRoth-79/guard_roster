#core/state-sync.js
import { setState } from "./store.js";
import { STORAGE_KEYS } from "./constants.js";

export function restoreState() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FULL_STATE);
    if (data) {
      setState(JSON.parse(data));
    }
  } catch {}
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEYS.FULL_STATE, JSON.stringify(state));
}


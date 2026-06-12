#core/store.js
let state = {
  matrix: [],
  startDate: "",
  lockedName: null,
};

const listeners = [];

export function initStore() {
  state.matrix = [];
}

export function getState() {
  return state;
}

export function setState(update) {
  state = { ...state, ...update };
  listeners.forEach(fn => fn(state));
}

export function subscribe(fn) {
  listeners.push(fn);
}

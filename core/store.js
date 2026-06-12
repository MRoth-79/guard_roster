export function createStore(initialState = {}) {
  return {
    state: {
      excelMatrix: [],
      lockedName: null,
      searchQuery: "",
      parsedData: null,
      startDate: "",
      ...initialState,
    },
    listeners: [],
    setState(update) {
      this.state = { ...this.state, ...update };
      this.listeners.forEach((fn) => fn(this.state));
    },
    subscribe(fn) {
      this.listeners.push(fn);
    },
    getState() {
      return this.state;
    },
  };
}

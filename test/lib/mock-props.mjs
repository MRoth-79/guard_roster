export class MockScriptProperties {
  constructor(initial = {}) {
    this.store = { ...initial };
    this.failOn = new Set();
    this.setCalls = 0;
  }

  getProperty(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }

  setProperty(key, value) {
    this.setCalls += 1;
    if (this.failOn.has(key)) {
      throw new Error(`Injected setProperty failure for ${key}`);
    }
    this.store[key] = String(value);
  }

  deleteProperty(key) {
    delete this.store[key];
  }

  getKeys() {
    return Object.keys(this.store);
  }

  injectFailureForKey(key) {
    this.failOn.add(key);
  }

  clearFailureForKey(key) {
    this.failOn.delete(key);
  }
}

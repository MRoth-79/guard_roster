export function pushUndoSnapshot() {
  if (this.state.isRestoring) return;
  const snapshot = this.makeSnapshot();
  this.state.undoStack.push(snapshot);
  if (this.state.undoStack.length > 60) this.state.undoStack.shift();
  this.state.redoStack = [];
  this.updateUndoRedoButtons();
}

export function updateUndoRedoButtons() {
  this.el.undoBtn.disabled = this.state.undoStack.length === 0;
  this.el.redoBtn.disabled = this.state.redoStack.length === 0;
}

export function undo() {
  if (!this.state.undoStack.length) return;
  const current = this.makeSnapshot();
  const snapshot = this.state.undoStack.pop();
  this.state.redoStack.push(current);
  this.applySnapshot(snapshot);
  this.updateUndoRedoButtons();
  this.persistFullState();
  this.showStatus("בוצע Undo", "success");
}

export function redo() {
  if (!this.state.redoStack.length) return;
  const current = this.makeSnapshot();
  const snapshot = this.state.redoStack.pop();
  this.state.undoStack.push(current);
  this.applySnapshot(snapshot);
  this.updateUndoRedoButtons();
  this.persistFullState();
  this.showStatus("בוצע Redo", "success");
}


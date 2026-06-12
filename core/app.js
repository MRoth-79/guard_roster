import { renderLayout } from "../ui/layout.js";
import { initGrid } from "../features/grid.js";

export function initApp() {
  renderLayout();
  initGrid();
}

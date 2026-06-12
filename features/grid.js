#features/grid.js
import { setState, getState } from "../core/store.js";
import { TIME_SLOTS, HEB_DAYS } from "../core/constants.js";
import { renderGrid } from "../ui/excel-grid-view.js";

let matrix = [];

export function initGrid() {
  matrix = TIME_SLOTS.map(() => HEB_DAYS.map(() => ""));
  setState({ matrix });

  renderGrid(matrix);

  bindGridEvents();
}

export function getMatrix() {
  return matrix;
}

export function setMatrix(newMatrix) {
  matrix = newMatrix;
  setState({ matrix });
  renderGrid(matrix);
}

function bindGridEvents() {
  document.addEventListener("input", e => {
    const td = e.target.closest("td[data-r]");
    if (!td) return;

    const r = td.dataset.r;
    const c = td.dataset.c;

    matrix[r][c] = normalize(td.innerText);

    setState({ matrix });
  });
}

function normalize(txt) {
  return txt
    .split(/[,\\n]+/)
    .map(x => x.trim())
    .filter(Boolean)
    .join(", ");
}

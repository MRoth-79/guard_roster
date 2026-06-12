export function updateHighlights(name) {
  const root = this.el.resultsContainer;
  if (!root) return;
  if (name) root.classList.add("spotlight-active");
  else root.classList.remove("spotlight-active");
  root.querySelectorAll(".person").forEach((el) => {
    el.classList.toggle("highlight-name", el.textContent.trim() === name);
  });
}

export function updateSearchHighlights() {
  const query = this.normalizeKey(this.Store.getState().searchQuery || "").toLowerCase();
  const root = this.el.resultsContainer;
  this.state.searchMatches = [];
  this.state.currentSearchIndex = -1;

  if (root) {
    root.querySelectorAll(".person").forEach((el) => {
      el.classList.remove("search-match", "search-current");
      if (query && this.normalizeKey(el.textContent).toLowerCase().includes(query)) {
        el.classList.add("search-match");
        this.state.searchMatches.push(el);
      }
    });
  }

  if (this.state.searchMatches.length) {
    this.state.currentSearchIndex = 0;
    this.focusSearchMatch();
    this.el.searchStatus.textContent = `${this.state.currentSearchIndex + 1}/${this.state.searchMatches.length}`;
  } else {
    this.el.searchStatus.textContent = query ? "לא נמצאו תוצאות" : "אין חיפוש פעיל";
  }
}

export function focusSearchMatch() {
  this.state.searchMatches.forEach((el) => el.classList.remove("search-current"));
  if (this.state.currentSearchIndex < 0 || !this.state.searchMatches.length) return;
  const current = this.state.searchMatches[this.state.currentSearchIndex];
  if (!current) return;
  current.classList.add("search-current");
  current.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  this.el.searchStatus.textContent = `${this.state.currentSearchIndex + 1}/${this.state.searchMatches.length}`;
}

export function navigateSearch(step) {
  if (!this.state.searchMatches.length) return;
  this.state.currentSearchIndex = (this.state.currentSearchIndex + step + this.state.searchMatches.length) % this.state.searchMatches.length;
  this.focusSearchMatch();
}


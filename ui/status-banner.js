export function showStatus(message, type = "success") {
  const el = this.el.statusBanner;
  clearTimeout(this.state.statusTimer);
  el.className = `status-banner ${type}`;
  el.textContent = message;
  el.style.display = "block";
  this.state.statusTimer = setTimeout(() => {
    el.style.display = "none";
  }, 4000);
}


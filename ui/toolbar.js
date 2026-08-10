export function bindToolbar() {
  if (!this.el.toggleUrlButton || !this.el.urlInputWrap) return;
  this.el.toggleUrlButton.addEventListener("click", () => {
    const open = this.el.urlInputWrap.classList.toggle("open");
    this.el.toggleUrlButton.textContent = open ? "🔗 סגור URL" : "🔗 URL";
  });
}


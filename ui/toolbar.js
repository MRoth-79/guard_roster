export function bindToolbar() {
  this.el.toggleUrlButton.addEventListener("click", () => {
    const open = this.el.urlInputWrap.classList.toggle("open");
    this.el.toggleUrlButton.textContent = open ? "🔗 סגור URL" : "🔗 URL";
  });
}


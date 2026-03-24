(function initToast() {
  function ensureContainer() {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  }

  function removeToast(toast) {
    if (!toast) return;
    toast.classList.add("toast-exit");
    window.setTimeout(() => toast.remove(), 260);
  }

  window.showToast = function showToast(message, type = "success", duration = 3000) {
    const container = ensureContainer();
    const toast = document.createElement("div");
    const safeType = ["success", "error", "info", "warning"].includes(type) ? type : "info";

    toast.className = `toast toast-${safeType}`;
    toast.setAttribute("role", "status");
    toast.innerHTML = `
      <span class="toast-message"></span>
      <button class="toast-close" type="button" aria-label="Đóng">×</button>
    `;

    toast.querySelector(".toast-message").textContent = String(message || "");

    const closeButton = toast.querySelector(".toast-close");
    closeButton.addEventListener("click", () => removeToast(toast));

    container.appendChild(toast);

    const timeout = Math.min(Math.max(Number(duration) || 3000, 2500), 3500);
    const timerId = window.setTimeout(() => removeToast(toast), timeout);

    toast.addEventListener("mouseenter", () => window.clearTimeout(timerId), { once: true });
  };
})();

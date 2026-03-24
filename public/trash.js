const trashContainer = document.getElementById("trashContainer");
const trashPaginationContainer = document.getElementById("trashPaginationContainer");
const stcMenuToggle = document.getElementById("stcMenuToggle");
const menuNav = document.getElementById("menuNav");

const limit = 10;
let currentPage = 1;

stcMenuToggle?.addEventListener("click", () => menuNav?.classList.toggle("open"));

loadTrash(1);

async function loadTrash(page) {
  currentPage = page;
  trashContainer.innerHTML = '<div class="muted">Đang tải dữ liệu...</div>';
  trashPaginationContainer.innerHTML = "";

  try {
    const query = new URLSearchParams({ page: String(page), limit: String(limit), status: "trash" });
    const response = await fetch(`/api/library/items?${query.toString()}`);
    const data = await readJsonResponse(response, "Không thể tải thùng rác.");
    renderTrashTable(Array.isArray(data.items) ? data.items : [], data.pagination || {});
  } catch (error) {
    trashContainer.innerHTML = `<div class="muted">${escapeHtml(error.message)}</div>`;
  }
}

function renderTrashTable(items, pagination) {
  const page = Number(pagination.page) || currentPage;
  const totalPages = Math.max(Number(pagination.totalPages) || 1, 1);
  const totalFiles = Number(pagination.totalFiles) || items.length;

  if (!items.length) {
    trashContainer.innerHTML = `
      <div class="empty-file-state">
        <img src="/gif/cat-smh.gif" alt="Chưa có file để xóa" class="empty-file-gif" />
        <p>Chưa có file nào để xóa.</p>
      </div>
    `;
    return;
  }

  const start = (page - 1) * limit;
  const rows = items.map((item, idx) => `
    <tr>
      <td>${start + idx + 1}</td>
      <td>${escapeHtml(item.original_name)}</td>
      <td>${escapeHtml(getFileType(item.original_name, item.mime_type))}</td>
      <td><button class="delete-btn" type="button" data-id="${escapeHtml(item.id)}">Xóa</button></td>
    </tr>
  `).join("");

  trashContainer.innerHTML = `
    <table>
      <thead>
        <tr><th>STT</th><th>Tên file</th><th>Loại File</th><th>Xóa</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  trashPaginationContainer.innerHTML = `
    <div>Tổng: ${totalFiles} file • Trang ${page}/${totalPages}</div>
    <div class="page-controls">
      <button class="page-btn" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>Trang trước</button>
      <button class="page-btn" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>Trang sau</button>
    </div>
  `;

  document.querySelectorAll(".page-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      loadTrash(Number(btn.dataset.page));
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!window.confirm("Bạn có chắc muốn xóa vĩnh viễn file này không?")) return;
      try {
        const response = await fetch(`/api/library/items/${btn.dataset.id}/permanent`, { method: "DELETE" });
        await readJsonResponse(response, "Không thể xóa file.");
        loadTrash(currentPage);
      } catch (error) {
        window.alert(error.message);
      }
    });
  });
}

async function readJsonResponse(response, fallbackMessage) {
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(fallbackMessage); }
  if (!response.ok || !data.success) throw new Error(data.message || fallbackMessage);
  return data;
}

function getFileType(fileName, mimeType) {
  if (mimeType) return mimeType;
  const parts = String(fileName || "").split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "Không xác định";
}

function escapeHtml(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

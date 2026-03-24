const filesContainer = document.getElementById("filesContainer");
const paginationContainer = document.getElementById("paginationContainer");
const stcMenuToggle = document.getElementById("stcMenuToggle");
const menuNav = document.getElementById("menuNav");

const limit = 10;
let currentPage = 1;

stcMenuToggle?.addEventListener("click", () => {
  menuNav?.classList.toggle("open");
});

loadFiles(1);

async function loadFiles(page) {
  currentPage = page;
  filesContainer.innerHTML = '<div class="muted">Đang tải dữ liệu...</div>';
  paginationContainer.innerHTML = "";

  try {
    const search = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      status: "active"
    });

    const response = await fetch(`/api/library/items?${search.toString()}`);
    const data = await readJsonResponse(response, "Không thể tải danh sách file.");

    const items = Array.isArray(data.items) ? data.items : [];
    const pagination = normalizePagination(data.pagination, items.length, page);

    renderFiles(items, pagination);
  } catch (error) {
    filesContainer.innerHTML = `<div class="muted">${escapeHtml(error.message)}</div>`;
  }
}

function normalizePagination(pagination, itemCount, page) {
  return {
    page: Number(pagination?.page) || page,
    limit: Number(pagination?.limit) || limit,
    totalFiles: Number(pagination?.totalFiles) || itemCount,
    totalPages: Math.max(Number(pagination?.totalPages) || 1, 1)
  };
}

function renderFiles(items, pagination) {
  if (!items.length) {
    filesContainer.innerHTML = `
      <div class="empty-file-state">
        <img src="/gif/nhaynhay.gif" alt="Chưa có file" class="empty-file-gif" />
        <p>Chưa có file nào.</p>
      </div>
    `;
    paginationContainer.innerHTML = "";
    return;
  }

  const startIndex = (pagination.page - 1) * pagination.limit;

  const rows = items
    .map((item, index) => {
      const stt = startIndex + index + 1;
      const uploadedAt = new Date(item.uploaded_at).toLocaleString("vi-VN");
      const fileType = getFileType(item.original_name, item.mime_type);
      const downloadLink = `${window.location.origin}/download/${item.id}`;

      return `
        <tr>
          <td>${stt}</td>
          <td>${escapeHtml(item.original_name)}</td>
          <td>${escapeHtml(uploadedAt)}</td>
          <td>${escapeHtml(fileType)}</td>
          <td>
            <button class="copy-btn" type="button" data-link="${escapeHtml(downloadLink)}">Copy liên kết</button>
          </td>
          <td>
            <button class="delete-btn" type="button" data-id="${escapeHtml(item.id)}">Xóa file</button>
          </td>
        </tr>
      `;
    })
    .join("");

  filesContainer.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th>Tên File</th>
          <th>Ngày Đăng</th>
          <th>Loại File</th>
          <th>Link liên kết</th>
          <th>Xóa File</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  renderPagination(pagination);
  bindActions();
}

function renderPagination(pagination) {
  const prevDisabled = pagination.page <= 1 ? "disabled" : "";
  const nextDisabled = pagination.page >= pagination.totalPages ? "disabled" : "";

  paginationContainer.innerHTML = `
    <div>Tổng: ${pagination.totalFiles} file • Trang ${pagination.page}/${pagination.totalPages}</div>
    <div class="page-controls">
      <button class="page-btn" type="button" data-page="${pagination.page - 1}" ${prevDisabled}>Trang trước</button>
      <button class="page-btn" type="button" data-page="${pagination.page + 1}" ${nextDisabled}>Trang sau</button>
    </div>
  `;

  document.querySelectorAll(".page-btn").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      loadFiles(Number(button.dataset.page));
    });
  });
}

function bindActions() {
  document.querySelectorAll(".copy-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.link || "");
        const oldText = button.textContent;
        button.textContent = "Đã copy";
        setTimeout(() => {
          button.textContent = oldText;
        }, 1200);
      } catch {
        window.alert("Không thể copy liên kết.");
      }
    });
  });

  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const { id } = button.dataset;
      if (!window.confirm("Bạn có chắc muốn xóa file này?")) return;

      try {
        const response = await fetch(`/api/library/items/${id}`, { method: "DELETE" });
        await readJsonResponse(response, "Không thể xóa file.");
        loadFiles(currentPage);
      } catch (error) {
        window.alert(error.message);
      }
    });
  });
}

function getFileType(fileName, mimeType) {
  if (mimeType) return mimeType;
  const parts = String(fileName || "").split(".");
  if (parts.length > 1) return parts.pop().toUpperCase();
  return "Không xác định";
}

async function readJsonResponse(response, fallbackMessage) {
  const text = await response.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok || !data.success) {
    throw new Error(data.message || fallbackMessage);
  }

  return data;
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };

  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

const downloadMeta = document.getElementById("downloadMeta");
const confirmDownloadBtn = document.getElementById("confirmDownloadBtn");

const parts = window.location.pathname.split("/").filter(Boolean);
const id = parts.length >= 2 ? parts[1] : "";

if (!id) {
  downloadMeta.textContent = "Không tìm thấy mã file trong liên kết.";
  confirmDownloadBtn.disabled = true;
} else {
  loadMeta(id);
}

confirmDownloadBtn.addEventListener("click", () => {
  if (!id) return;
  window.location.href = `/download/${id}/file`;
});

async function loadMeta(fileId) {
  try {
    const response = await fetch(`/api/library/items/${fileId}/meta`);
    const data = await readJsonResponse(response, "Không thể tải thông tin file.");
    const item = data.item;

    downloadMeta.innerHTML = `
      <strong>Tên file:</strong> ${escapeHtml(item.original_name)}<br/>
      <strong>Ngày đăng:</strong> ${escapeHtml(new Date(item.uploaded_at).toLocaleString("vi-VN"))}<br/>
      <strong>Dung lượng:</strong> ${escapeHtml(formatFileSize(Number(item.file_size) || 0))}
    `;
  } catch (error) {
    downloadMeta.textContent = error.message;
    confirmDownloadBtn.disabled = true;
  }
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

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function escapeHtml(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

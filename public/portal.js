const menuButtons = Array.from(document.querySelectorAll(".menu-btn[data-target]"));
const stcMenuToggle = document.getElementById("stcMenuToggle");
const menuNav = document.getElementById("menuNav");
const sections = {
  uploadSection: document.getElementById("uploadSection"),
  listSection: document.getElementById("listSection"),
  trashSection: document.getElementById("trashSection"),
  helpSection: document.getElementById("helpSection")
};

const uploadForm = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");
const browseButton = document.getElementById("browseButton");
const dropZone = document.getElementById("dropZone");
const filePreview = document.getElementById("filePreview");
const fileBadge = document.getElementById("fileBadge");
const fileName = document.getElementById("fileName");
const fileInfo = document.getElementById("fileInfo");
const clearButton = document.getElementById("clearButton");
const statusMessage = document.getElementById("statusMessage");
const progressCard = document.getElementById("progressCard");
const progressBar = document.getElementById("progressBar");
const progressLabel = document.getElementById("progressLabel");
const progressPercent = document.getElementById("progressPercent");
const resultBox = document.getElementById("resultBox");
const fileLink = document.getElementById("fileLink");
const copyButton = document.getElementById("copyButton");
const uploadButton = document.getElementById("uploadButton");

const filesTableContainer = document.getElementById("filesTableContainer");
const trashTableContainer = document.getElementById("trashTableContainer");

menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activateSection(button.dataset.target);
    if (window.innerWidth <= 900) {
      menuNav.classList.remove("open");
    }
  });
});

stcMenuToggle?.addEventListener("click", () => {
  menuNav.classList.toggle("open");
});

window.addEventListener("hashchange", () => {
  const target = (window.location.hash || "").replace("#", "");
  if (target && sections[target]) {
    activateSection(target);
  }
});

browseButton.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  if (fileInput.files.length) updateSelectedFile(fileInput.files[0]);
  else resetSelectedFile();
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
  });
});

dropZone.addEventListener("drop", (event) => {
  const files = event.dataTransfer.files;
  if (!files.length) return;

  const transfer = new DataTransfer();
  transfer.items.add(files[0]);
  fileInput.files = transfer.files;
  updateSelectedFile(files[0]);
});

clearButton.addEventListener("click", () => {
  fileInput.value = "";
  resetSelectedFile();
  hideStatus();
  hideProgress();
  resultBox.classList.add("hidden");
});

uploadForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!fileInput.files.length) {
    showMessage("Vui lòng chọn file trước khi đăng.", "error");
    return;
  }
  uploadFile(fileInput.files[0]);
});

copyButton.addEventListener("click", async () => {
  if (!fileLink.value) return;
  try {
    await navigator.clipboard.writeText(fileLink.value);
    copyButton.textContent = "Đã copy";
    setTimeout(() => {
      copyButton.textContent = "Copy link";
    }, 1200);
  } catch {
    showMessage("Không thể copy link.", "error");
  }
});

const initialSection = (window.location.hash || "").replace("#", "");
if (initialSection && sections[initialSection]) {
  activateSection(initialSection);
} else {
  activateSection("uploadSection");
}

loadAllTables();

function activateSection(sectionId) {
  Object.entries(sections).forEach(([id, section]) => {
    section.classList.toggle("hidden", id !== sectionId);
  });
  menuButtons.forEach((button) => button.classList.toggle("active", button.dataset.target === sectionId));
}

function updateSelectedFile(file) {
  filePreview.classList.remove("empty");
  fileBadge.textContent = getExtension(file.name);
  fileName.textContent = file.name;
  fileInfo.textContent = `${formatFileSize(file.size)} • ${file.type || "Không xác định"}`;
  clearButton.classList.remove("hidden");
}

function resetSelectedFile() {
  filePreview.classList.add("empty");
  fileBadge.textContent = "--";
  fileName.textContent = "Chưa chọn file nào";
  fileInfo.textContent = "Thông tin file sẽ hiển thị tại đây";
  clearButton.classList.add("hidden");
}

function showProgress(percent) {
  progressCard.classList.remove("hidden");
  progressBar.style.width = `${percent}%`;
  progressPercent.textContent = `${percent}%`;
  progressLabel.textContent = percent < 100 ? "Đang tải lên..." : "Hoàn tất";
}

function hideProgress() {
  progressCard.classList.add("hidden");
  progressBar.style.width = "0%";
  progressPercent.textContent = "0%";
  progressLabel.textContent = "Đang tải lên...";
}

function showMessage(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`;
}

function hideStatus() {
  statusMessage.textContent = "";
  statusMessage.className = "status hidden";
}

function uploadFile(file) {
  const formData = new FormData();
  const xhr = new XMLHttpRequest();
  formData.append("file", file);

  uploadButton.disabled = true;
  uploadButton.textContent = "Đang đăng...";
  showProgress(0);
  showMessage("Đang đăng file...", "success");

  xhr.open("POST", "/upload", true);
  xhr.upload.addEventListener("progress", (event) => {
    if (event.lengthComputable) showProgress(Math.round((event.loaded / event.total) * 100));
  });

  xhr.addEventListener("load", () => {
    uploadButton.disabled = false;
    uploadButton.textContent = "Đăng file";

    try {
      const data = JSON.parse(xhr.responseText);
      if (xhr.status < 200 || xhr.status >= 300 || !data.success) throw new Error(data.message || "Đăng file thất bại.");
      showProgress(100);
      fileLink.value = data.link;
      resultBox.classList.remove("hidden");
      showMessage("Đăng file thành công.", "success");
      loadAllTables();
    } catch (error) {
      showMessage(error.message, "error");
    }
  });

  xhr.addEventListener("error", () => {
    uploadButton.disabled = false;
    uploadButton.textContent = "Đăng file";
    showMessage("Không thể kết nối máy chủ.", "error");
  });

  xhr.send(formData);
}

async function loadAllTables() {
  await Promise.all([loadActiveFiles(), loadTrashFiles()]);
}

async function loadActiveFiles() {
  filesTableContainer.innerHTML = '<div class="muted">Đang tải dữ liệu...</div>';
  try {
    const response = await fetch("/api/library/items?status=active&page=1&limit=200");
    const data = await readJsonResponse(response, "Không thể tải danh sách file.");
    renderActiveTable(Array.isArray(data.items) ? data.items : []);
  } catch (error) {
    filesTableContainer.innerHTML = `<div class="muted">${escapeHtml(error.message)}</div>`;
  }
}

async function loadTrashFiles() {
  trashTableContainer.innerHTML = '<div class="muted">Đang tải dữ liệu...</div>';
  try {
    const response = await fetch("/api/library/items?status=trash&page=1&limit=200");
    const data = await readJsonResponse(response, "Không thể tải thùng rác.");
    renderTrashTable(Array.isArray(data.items) ? data.items : []);
  } catch (error) {
    trashTableContainer.innerHTML = `<div class="muted">${escapeHtml(error.message)}</div>`;
  }
}

function renderActiveTable(items) {
  if (!items.length) {
    filesTableContainer.innerHTML = `
      <div class="empty-file-state">
        <img src="/gif/nhaynhay.gif" alt="Không có file" class="empty-file-gif" />
        <p>Không có danh sách file.</p>
      </div>
    `;
    return;
  }

  const rows = items
    .map((item, index) => {
      const downloadLink = `${window.location.origin}/download/${item.id}`;
      return `<tr><td>${index + 1}</td><td><a class="link-btn" href="${escapeHtml(downloadLink)}">${escapeHtml(item.original_name)}</a></td><td>${escapeHtml(new Date(item.uploaded_at).toLocaleString("vi-VN"))}</td><td><button class="copy-btn" data-link="${escapeHtml(downloadLink)}">Copy link</button></td><td><button class="delete-btn" data-id="${escapeHtml(item.id)}">Xóa file</button></td></tr>`;
    })
    .join("");

  filesTableContainer.innerHTML = `<table><thead><tr><th>STT</th><th>Danh sách file</th><th>Ngày đăng</th><th>Link coppy</th><th>Xóa file</th></tr></thead><tbody>${rows}</tbody></table>`;
  bindActiveActions();
}

function renderTrashTable(items) {
  if (!items.length) {
    trashTableContainer.innerHTML = '<div class="muted">Thùng rác đang trống.</div>';
    return;
  }

  const rows = items
    .map((item) => `<tr><td>${escapeHtml(item.original_name)}</td><td>${escapeHtml(new Date(item.uploaded_at).toLocaleString("vi-VN"))}</td><td><div class="table-actions"><button class="restore-btn" data-id="${escapeHtml(item.id)}">Khôi phục</button><button class="delete-btn" data-id="${escapeHtml(item.id)}" data-permanent="true">Xóa vĩnh viễn</button></div></td></tr>`)
    .join("");

  trashTableContainer.innerHTML = `<table><thead><tr><th>Tên file</th><th>Thời gian đăng</th><th>Thao tác</th></tr></thead><tbody>${rows}</tbody></table>`;
  bindTrashActions();
}

function bindActiveActions() {
  document.querySelectorAll(".copy-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.link || "");
        button.textContent = "Đã copy";
        setTimeout(() => (button.textContent = "Copy link"), 1200);
      } catch {
        window.alert("Không thể copy link.");
      }
    });
  });

  document.querySelectorAll(".delete-btn:not([data-permanent])").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Bạn có chắc muốn chuyển file vào thùng rác?")) return;
      try {
        const response = await fetch(`/api/library/items/${button.dataset.id}`, { method: "DELETE" });
        await readJsonResponse(response, "Không thể xóa file.");
        loadAllTables();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });
}

function bindTrashActions() {
  document.querySelectorAll(".restore-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const response = await fetch(`/api/library/items/${button.dataset.id}/restore`, { method: "PATCH" });
        await readJsonResponse(response, "Không thể khôi phục file.");
        loadAllTables();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });

  document.querySelectorAll('.delete-btn[data-permanent="true"]').forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Xóa vĩnh viễn file này?")) return;
      try {
        const response = await fetch(`/api/library/items/${button.dataset.id}/permanent`, { method: "DELETE" });
        await readJsonResponse(response, "Không thể xóa vĩnh viễn file.");
        loadAllTables();
      } catch (error) {
        window.alert(error.message);
      }
    });
  });
}

async function readJsonResponse(response, fallbackMessage) {
  const responseText = await response.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok || !data.success) throw new Error(data.message || fallbackMessage);
  return data;
}

function getExtension(fileNameValue) {
  const parts = String(fileNameValue).split(".");
  return parts.length > 1 ? parts.pop().slice(0, 4).toUpperCase() : "FILE";
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

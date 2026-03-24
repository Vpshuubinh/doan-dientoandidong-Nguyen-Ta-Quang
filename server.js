const express = require("express");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const APP_NAME = "Quang File Transfer";
const LEGACY_DATABASE_PATH = path.join(__dirname, "files.db");
const DATABASE_PATH = path.join(__dirname, "quang_file_transfer.db");
const uploadsDir = path.join(__dirname, "uploads");
const publicDir = path.join(__dirname, "public");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(DATABASE_PATH) && fs.existsSync(LEGACY_DATABASE_PATH)) {
  fs.copyFileSync(LEGACY_DATABASE_PATH, DATABASE_PATH);
}

const db = new sqlite3.Database(DATABASE_PATH, (error) => {
  if (error) {
    console.error("Khong the ket noi SQLite:", error.message);
    return;
  }

  console.log(`Da ket noi ${APP_NAME} database.`);
});

function ensureColumn(columnName, definition) {
  db.all("PRAGMA table_info(files)", [], (pragmaError, columns) => {
    if (pragmaError) {
      console.error(`Khong the kiem tra cot ${columnName}:`, pragmaError.message);
      return;
    }

    if (columns.some((column) => column.name === columnName)) {
      return;
    }

    db.run(`ALTER TABLE files ADD COLUMN ${definition}`, (alterError) => {
      if (alterError) {
        console.error(`Khong the them cot ${columnName}:`, alterError.message);
      }
    });
  });
}

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      saved_name TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      mime_type TEXT DEFAULT '',
      share_slug TEXT DEFAULT '',
      deleted_at TEXT DEFAULT NULL
    )
  `);

  ensureColumn("file_size", "file_size INTEGER DEFAULT 0");
  ensureColumn("mime_type", "mime_type TEXT DEFAULT ''");
  ensureColumn("share_slug", "share_slug TEXT DEFAULT ''");
  ensureColumn("deleted_at", "deleted_at TEXT DEFAULT NULL");
});

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, uploadsDir);
  },
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname);
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    callback(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

function sendLibraryItems(request, response) {
  const page = Math.max(Number.parseInt(request.query.page, 10) || 1, 1);
  const limit = Math.max(Number.parseInt(request.query.limit, 10) || 20, 1);
  const keyword = String(request.query.keyword || "").trim().toLowerCase();
  const status = String(request.query.status || "active");
  const offset = (page - 1) * limit;

  const filters = [];
  const params = [];

  if (keyword) {
    filters.push("LOWER(original_name) LIKE ?");
    params.push(`%${keyword}%`);
  }

  if (status === "trash") {
    filters.push("deleted_at IS NOT NULL");
  } else {
    filters.push("deleted_at IS NULL");
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const listQuery = `
    SELECT id, original_name, saved_name, uploaded_at, file_size, mime_type, share_slug, deleted_at
    FROM files
    ${whereClause}
    ORDER BY uploaded_at DESC
    LIMIT ? OFFSET ?
  `;

  const countQuery = `SELECT COUNT(*) AS total FROM files ${whereClause}`;

  db.get(countQuery, params, (countError, countRow) => {
    if (countError) {
      return response.status(500).json({ success: false, message: "Khong the lay danh sach file." });
    }

    db.all(listQuery, [...params, limit, offset], (error, rows) => {
      if (error) {
        return response.status(500).json({ success: false, message: "Khong the lay danh sach file." });
      }

      const totalFiles = countRow.total;
      const totalPages = Math.max(Math.ceil(totalFiles / limit), 1);

      response.json({
        success: true,
        items: rows,
        pagination: {
          page,
          limit,
          totalFiles,
          totalPages
        }
      });
    });
  });
}

app.get("/api/library/items", sendLibraryItems);

app.get("/api/library/items/:id/meta", (request, response) => {
  db.get(
    "SELECT id, original_name, file_size, mime_type, uploaded_at FROM files WHERE id = ? AND deleted_at IS NULL",
    [request.params.id],
    (error, row) => {
      if (error) {
        return response.status(500).json({ success: false, message: "Khong the lay thong tin file." });
      }

      if (!row) {
        return response.status(404).json({ success: false, message: "Khong tim thay file." });
      }

      response.json({ success: true, item: row });
    }
  );
});

app.post("/upload", upload.single("file"), (request, response) => {
  if (!request.file) {
    return response.status(400).json({ success: false, message: "Vui long chon file truoc khi tai len." });
  }

  const id = uuidv4();
  const originalName = request.file.originalname;
  const savedName = request.file.filename;
  const uploadedAt = new Date().toISOString();
  const fileSize = request.file.size || 0;
  const mimeType = request.file.mimetype || "";
  const shareSlug = `qft-${id.split("-")[0]}`;

  const query = `
    INSERT INTO files (id, original_name, saved_name, uploaded_at, file_size, mime_type, share_slug, deleted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
  `;

  db.run(query, [id, originalName, savedName, uploadedAt, fileSize, mimeType, shareSlug], (error) => {
    if (error) {
      return response.status(500).json({ success: false, message: "Khong the luu thong tin file." });
    }

    response.json({
      success: true,
      id,
      shareSlug,
      originalName,
      fileSize,
      link: `${request.protocol}://${request.get("host")}/download/${id}`
    });
  });
});

app.delete("/api/library/items/:id", (request, response) => {
  const deletedAt = new Date().toISOString();

  db.run(
    "UPDATE files SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL",
    [deletedAt, request.params.id],
    function onDone(error) {
      if (error) {
        return response.status(500).json({ success: false, message: "Khong the chuyen vao thung rac." });
      }

      if (!this.changes) {
        return response.status(404).json({ success: false, message: "Khong tim thay file de xoa." });
      }

      response.json({ success: true, message: "Da chuyen file vao thung rac." });
    }
  );
});

app.patch("/api/library/items/:id/restore", (request, response) => {
  db.run(
    "UPDATE files SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL",
    [request.params.id],
    function onDone(error) {
      if (error) {
        return response.status(500).json({ success: false, message: "Khong the khoi phuc file." });
      }

      if (!this.changes) {
        return response.status(404).json({ success: false, message: "Khong tim thay file trong thung rac." });
      }

      response.json({ success: true, message: "Da khoi phuc file." });
    }
  );
});

app.delete("/api/library/items/:id/permanent", (request, response) => {
  db.get("SELECT * FROM files WHERE id = ?", [request.params.id], (selectError, row) => {
    if (selectError) {
      return response.status(500).json({ success: false, message: "Khong the xoa vinh vien file." });
    }

    if (!row) {
      return response.status(404).json({ success: false, message: "Khong tim thay file." });
    }

    const filePath = path.join(uploadsDir, row.saved_name);

    const removeRecord = () => {
      db.run("DELETE FROM files WHERE id = ?", [request.params.id], (deleteError) => {
        if (deleteError) {
          return response.status(500).json({ success: false, message: "Khong the xoa vinh vien file." });
        }

        response.json({ success: true, message: "Da xoa vinh vien file." });
      });
    };

    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, () => removeRecord());
      return;
    }

    removeRecord();
  });
});

app.get("/download/:id", (request, response) => {
  db.get("SELECT id FROM files WHERE id = ? AND deleted_at IS NULL", [request.params.id], (error, row) => {
    if (error) {
      return response.status(500).send("Co loi xay ra.");
    }

    if (!row) {
      return response.status(404).send("Khong tim thay file.");
    }

    response.sendFile(path.join(publicDir, "download-confirm.html"));
  });
});

app.get("/download/:id/file", (request, response) => {
  db.get("SELECT * FROM files WHERE id = ?", [request.params.id], (error, row) => {
    if (error) {
      return response.status(500).send("Co loi xay ra.");
    }

    if (!row || row.deleted_at) {
      return response.status(404).send("Khong tim thay file.");
    }

    const filePath = path.join(uploadsDir, row.saved_name);

    if (!fs.existsSync(filePath)) {
      return response.status(404).send("File khong ton tai tren server.");
    }

    response.download(filePath, row.original_name);
  });
});

app.get("/api/app-info", (_request, response) => {
  response.json({ success: true, appName: APP_NAME });
});

app.get("/", (_request, response) => {
  response.sendFile(path.join(publicDir, "index.html"));
});

app.get("/danh-sach-file", (_request, response) => {
  response.sendFile(path.join(publicDir, "asset-library.html"));
});

app.get("/thung-rac", (_request, response) => {
  response.sendFile(path.join(publicDir, "trash.html"));
});

app.use((error, _request, response, next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return response.status(400).json({ success: false, message: "File vuot qua gioi han 1GB." });
  }

  if (error) {
    return response.status(500).json({ success: false, message: "Da xay ra loi he thong." });
  }

  next();
});

app.listen(PORT, () => {
  console.log(`${APP_NAME} dang chay tai http://localhost:${PORT}`);
});

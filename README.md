# Xây dựng phần mềm gửi nhận file trực tuyến Quang File Transfer
NTQ TH29.23
Đây là đồ án môn học của **Nguyễn Tá Quảng** với đề tài xây dựng hệ thống gửi/nhận file trực tuyến chạy trên nền tảng web.

## 1. Giới thiệu

**Quang File Transfer** là ứng dụng web hỗ trợ:
- Đăng file từ máy tính lên server.
- Tạo liên kết tải xuống để chia sẻ.
- Quản lý danh sách file đã đăng.
- Xóa mềm vào thùng rác, khôi phục hoặc xóa vĩnh viễn.
- Xác nhận trước khi tải file về máy.

## 2. Công nghệ sử dụng

- **Backend:** Node.js, Express
- **Database:** SQLite3
- **Upload middleware:** Multer
- **Frontend:** HTML, CSS, JavaScript thuần
- **Tiện ích:** UUID

## 3. Cài đặt và chạy

```bash
npm install
npm start
```

Ứng dụng mặc định chạy tại `http://localhost:3001`.

## 4. API chính

- `POST /upload`
- `GET /api/library/items?status=active|trash&page=1&limit=10&keyword=`
- `GET /api/library/items/:id/meta`
- `DELETE /api/library/items/:id`
- `PATCH /api/library/items/:id/restore`
- `DELETE /api/library/items/:id/permanent`
- `GET /download/:id`
- `GET /download/:id/file`

## 5. Cấu trúc thư mục

```text
.
├── public/
│   ├── index.html
│   ├── asset-library.html
│   ├── trash.html
│   ├── download-confirm.html
│   ├── portal.js
│   ├── asset-library.js
│   ├── trash.js
│   ├── download-confirm.js
│   ├── system.css
│   └── toast.js
├── uploads/
├── server.js
├── package.json
└── quang_file_transfer.db
```

## 6. Chức năng đã hoàn thành

- Đăng file và sinh link chia sẻ.
- Danh sách file có phân trang.
- Copy link nhanh.
- Xóa mềm vào thùng rác.
- Khôi phục file từ thùng rác.
- Xóa vĩnh viễn file.
- Trang xác nhận trước khi tải file.
- Trang Help hướng dẫn sử dụng.

## 7. Hạn chế

- Chưa có đăng nhập/đăng ký tài khoản.
- Chưa phân quyền người dùng.
- Chưa có thời hạn link tải nâng cao.

## 8. Thông tin sinh viên

- **Họ và tên:** Nguyễn Tá Quảng
- **Đề tài:** Xây dựng phần mềm gửi nhận file trực tuyến Quang File Transfer

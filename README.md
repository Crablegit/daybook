# Daybook — Calendar & Task app (Supabase + GitHub Pages)

Web app lịch cá nhân: xem theo ngày/tuần/tháng, quản lý công việc (tag, giờ, hoàn thành),
gợi ý gia hạn việc quá hạn, đăng nhập/đăng ký qua Supabase Auth, đổi ngôn ngữ
Anh/Việt/Trung, Light/Dark mode, và tính năng AI (Google Gemini) đọc text/ảnh để tự
điền công việc — dùng API key riêng của từng người dùng.

---

## 0. Cấu trúc project

```
calendar-app/
├── index.html
├── css/style.css
├── js/
│   ├── config.js         ← điền Supabase URL + anon key vào đây
│   ├── i18n.js
│   ├── supabaseClient.js
│   ├── auth.js
│   ├── ai.js
│   └── app.js
├── supabase/schema.sql   ← chạy trong Supabase SQL Editor
└── README.md
```

---

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

## 1. Tạo GitHub repository (public) + bật GitHub Pages

1. Vào GitHub → **New repository** → đặt tên (vd `daybook`) → chọn **Public** → Create.
2. Đẩy toàn bộ nội dung thư mục này lên repo (xem bước 10 bên dưới).
3. Vào **Settings → Pages**.
4. Ở mục **Build and deployment**: Source = **Deploy from a branch**, Branch = **main**, folder = **/ (root)** → Save.
5. Sau 1–2 phút, GitHub cung cấp URL dạng `https://<username>.github.io/<repo>/`.

---

## 2. Tạo Supabase project (miễn phí)

1. Vào https://supabase.com → **New project**.
2. Đặt tên project, chọn mật khẩu DB, chọn region gần bạn (vd Singapore) → Create.
3. Đợi vài phút để project khởi tạo xong.

---

## 3 & 4. Tạo database PostgreSQL + bật Auth email/password

- Database PostgreSQL được Supabase tự tạo sẵn khi khởi tạo project (không cần làm gì thêm).
- Vào **Authentication → Providers → Email**: đảm bảo **Email** đang **Enabled**.
  (Mặc định Supabase đã bật sẵn email/password.)
- Tùy chọn: ở **Authentication → Settings**, bạn có thể tắt "Confirm email" nếu muốn
  test nhanh không cần xác nhận email (không khuyến khích cho production).

---

## 5 & 6. Tạo bảng dữ liệu + bật Row Level Security (RLS)

1. Vào **SQL Editor → New query**.
2. Copy toàn bộ nội dung file [`supabase/schema.sql`](./supabase/schema.sql) vào và bấm **Run**.

File này sẽ:
- Tạo bảng `profiles` (cài đặt ngôn ngữ/theme + `gemini_api_key` riêng của từng user).
- Tạo bảng `tasks` (công việc, liên kết bằng cột `user_id`).
- Bật **Row Level Security** trên cả 2 bảng.
- Tạo policy để **mỗi user chỉ SELECT/INSERT/UPDATE/DELETE được dữ liệu có `user_id`/`id` trùng với chính họ** (`auth.uid()`).

➡️ Kết quả: dù dùng chung 1 database, user A không bao giờ đọc/sửa được dữ liệu của user B — kể cả khi họ biết `id` bản ghi đó.

---

## 7. Lấy Project URL + Publishable (anon) key

1. Vào **Project Settings → API**.
2. Copy **Project URL** và key mục **anon / public** (đôi khi gọi là *Publishable key*).
3. Mở file `js/config.js`, điền vào:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi...",
  DEFAULT_GEMINI_MODEL: "gemini-2.5-flash",
};
```

⚠️ **Tuyệt đối không** copy key mục **service_role / secret** vào đây hay vào bất kỳ
file nào trong repo public. Key `anon` an toàn để public vì mọi truy cập dữ liệu
đều bị RLS kiểm soát ở bước 6.

---

## 8. Frontend HTML/CSS/JS kết nối Supabase

Đã có sẵn trong project này:
- `js/supabaseClient.js` khởi tạo `supabase-js` bằng `config.js`.
- `js/auth.js` xử lý đăng ký/đăng nhập/đăng xuất + tạo `profiles` cho user mới.
- `js/app.js` xử lý lịch, CRUD công việc (bảng `tasks`), cài đặt.
- `js/ai.js` gọi thẳng Gemini API (`generativelanguage.googleapis.com`) từ trình
  duyệt của người dùng, dùng **API key mà chính người dùng nhập ở mục Cài đặt**
  (lưu trong `profiles.gemini_api_key`, được RLS bảo vệ — chỉ chủ tài khoản đọc được).

Không cần build tool — chỉ là HTML/CSS/JS thuần, mở `index.html` (hoặc qua GitHub
Pages) là chạy.

---

## 9. Chức năng Register / Login / Logout / lưu-đọc dữ liệu

Đã có sẵn trong UI:
- Màn hình đăng nhập/đăng ký (tab chuyển đổi) ở `index.html`.
- Đăng ký xong, nếu bật "Confirm email", Supabase sẽ gửi email xác nhận — người
  dùng cần bấm link trong email rồi mới đăng nhập được.
- Sau khi đăng nhập, app tự tạo (nếu chưa có) 1 hàng `profiles` cho user đó.
- Mọi thao tác thêm/sửa/xóa công việc đều gọi `sb.from('tasks')...` với `user_id`
  = user hiện tại, được RLS enforce ở phía server.
- Cài đặt (ngôn ngữ, theme, API key Gemini, model) lưu vào bảng `profiles`.

---

## 10. Đẩy code lên GitHub

Từ thư mục `calendar-app/`:

```bash
git init
git add .
git commit -m "Daybook: calendar + task app with Supabase"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

GitHub Pages sẽ tự động deploy lại mỗi khi bạn push lên branch `main`.

---

## 11. Kiểm tra với 2 tài khoản khác nhau

1. Mở app (URL GitHub Pages) ở **trình duyệt ẩn danh / tab riêng** hoặc 2 trình duyệt khác nhau.
2. Đăng ký **tài khoản A** (email A) → thêm vài công việc.
3. Đăng xuất → đăng ký **tài khoản B** (email B) → kiểm tra:
   - Tài khoản B **không thấy** công việc của tài khoản A.
   - Tài khoản B thêm công việc riêng, tài khoản A **không thấy** khi đăng nhập lại.
4. Nếu cả hai đều chỉ thấy dữ liệu của chính mình → RLS đang hoạt động đúng. ✅

---

## Tính năng AI (Google Gemini) — cách hoạt động

- Mỗi người dùng tự lấy API key **miễn phí** tại https://aistudio.google.com/apikey
  và nhập vào **Cài đặt → Trợ lý AI**.
- Key được lưu trong `profiles.gemini_api_key` — chỉ chủ tài khoản đọc được (RLS).
- Khi bấm **"Thêm bằng AI"**, app gửi thẳng request từ trình duyệt của người dùng
  đến Google (dùng key của chính họ) — request **không** đi qua server nào của bạn,
  nên bạn không phải trả phí hay quản lý key hộ ai cả.
- AI trả JSON gồm: `title`, `date`, `time`, `tag`, `description`, `completed`.
  Trường nào AI không chắc chắn sẽ để trống — app tự mở form thêm việc, người dùng
  chỉ cần điền nốt hoặc bỏ qua rồi lưu.
- Nếu model mặc định (`gemini-2.5-flash`) ngừng hoạt động/đổi tên, người dùng có
  thể tự đổi tên model trong Cài đặt — xem danh sách model mới nhất tại
  https://ai.google.dev/gemini-api/docs/models

## Gợi ý gia hạn công việc quá hạn

App tự kiểm tra công việc có `date`/`time` đã qua mà `completed = false`, hiển thị
banner cảnh báo phía trên lịch. Bấm vào banner sẽ mở hộp thoại cho chọn **ngày/giờ
mới** (Gia hạn) hoặc **Giữ nguyên** (bỏ qua, không xóa/sửa gì).

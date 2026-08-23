// ============================================================
// CONFIG — điền thông tin Supabase của bạn vào đây
// ============================================================
// Lấy 2 giá trị này tại: Supabase Dashboard > Project Settings > API
//   - Project URL           -> SUPABASE_URL
//   - anon / public key     -> SUPABASE_ANON_KEY   (KHÔNG dùng service_role key!)
//
// anon/public key được PHÉP để công khai trong code frontend, vì mọi quyền
// truy cập dữ liệu đều bị chặn/lọc bởi Row Level Security (RLS) ở phía DB.
// TUYỆT ĐỐI không đưa "service_role key" vào đây hay vào bất kỳ file nào
// trong repository công khai.
// ============================================================

window.APP_CONFIG = {
  SUPABASE_URL: "https://uwejhtolpuqxrxubaimx.supabase.co/rest/v1/",
  SUPABASE_ANON_KEY: "sb_publishable_W4HF3N9eK8E0Cyk0qWb78g_y8VGLQLK",

  // Model Gemini mặc định dùng cho tính năng AI nhận diện công việc.
  // Người dùng có thể đổi trong phần Cài đặt (Settings) của app.
  // Nếu model này ngừng hoạt động, hãy kiểm tra danh sách model mới nhất
  // tại https://ai.google.dev/gemini-api/docs/models
  DEFAULT_GEMINI_MODEL: "gemini-2.5-flash",
};

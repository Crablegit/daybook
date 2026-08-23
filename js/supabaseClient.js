// ============================================================
// Supabase client
// ============================================================
window.sb = supabase.createClient(
  window.APP_CONFIG.SUPABASE_URL,
  window.APP_CONFIG.SUPABASE_ANON_KEY
);

// Global in-memory app state (never persisted to localStorage,
// except the small UI-only prefs below which contain no secrets).
window.APP_STATE = {
  user: null,
  profile: null,      // row from `profiles` table (contains gemini key, lang, theme)
  tasks: [],           // all tasks for the logged-in user
  lang: localStorage.getItem("daybook_lang") || "vi",
  theme: localStorage.getItem("daybook_theme") || "light",
  view: "week",         // day | week | month
  cursorDate: new Date(), // date currently being viewed
  selectedDate: new Date(),
  tagFilters: new Set(["study", "work", "personal", "entertainment"]),
};

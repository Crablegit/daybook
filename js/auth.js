// ============================================================
// AUTH — register / login / logout / profile
// ============================================================

async function handleRegister(email, password) {
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

async function handleLogin(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function handleLogout() {
  await sb.auth.signOut();
  APP_STATE.user = null;
  APP_STATE.profile = null;
  APP_STATE.tasks = [];
  showAuthScreen();
}

// Ensure a `profiles` row exists for this user; create one on first login.
async function ensureProfile(user) {
  let { data: profile, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (!profile) {
    const { data: created, error: insertErr } = await sb
      .from("profiles")
      .insert({
        id: user.id,
        language: APP_STATE.lang,
        theme: APP_STATE.theme,
        ai_model: window.APP_CONFIG.DEFAULT_GEMINI_MODEL,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;
    profile = created;
  }
  return profile;
}

async function saveProfileSettings({ language, theme, geminiApiKey, aiModel }) {
  const payload = {
    language,
    theme,
    ai_model: aiModel || window.APP_CONFIG.DEFAULT_GEMINI_MODEL,
  };
  // Only overwrite the key if the user actually typed something new
  // (so re-saving other settings doesn't blank out an existing key).
  if (geminiApiKey !== undefined) payload.gemini_api_key = geminiApiKey;

  const { data, error } = await sb
    .from("profiles")
    .update(payload)
    .eq("id", APP_STATE.user.id)
    .select()
    .single();
  if (error) throw error;
  APP_STATE.profile = data;
  return data;
}

// Boot: check existing session on page load
async function bootAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    await onAuthed(session.user);
  } else {
    showAuthScreen();
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      await onAuthed(session.user);
    } else if (event === "SIGNED_OUT") {
      showAuthScreen();
    }
  });
}

async function onAuthed(user) {
  APP_STATE.user = user;
  try {
    const profile = await ensureProfile(user);
    APP_STATE.profile = profile;
    APP_STATE.lang = profile.language || APP_STATE.lang;
    APP_STATE.theme = profile.theme || APP_STATE.theme;
    localStorage.setItem("daybook_lang", APP_STATE.lang);
    localStorage.setItem("daybook_theme", APP_STATE.theme);
    applyTheme();
    applyLanguage();
    await loadTasks();
    showAppShell();
  } catch (err) {
    console.error(err);
    showToast(t("authError"));
  }
}

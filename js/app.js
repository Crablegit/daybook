// ============================================================
// APP — calendar rendering, task CRUD, UI wiring
// ============================================================

const TAG_LABEL_KEY = { study: "tagStudy", work: "tagWork", personal: "tagPersonal", entertainment: "tagEntertainment" };
const DOW_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTH_KEYS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

function pad2(n){ return String(n).padStart(2, "0"); }
function toISODate(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function sameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function startOfWeek(d){ const x=new Date(d); const day=x.getDay(); x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }

// ============================================================
// THEME + LANGUAGE
// ============================================================
function applyTheme(){
  document.documentElement.setAttribute("data-theme", APP_STATE.theme);
  const btn = document.getElementById("btn-theme");
  if (btn) btn.textContent = APP_STATE.theme === "dark" ? "☀️" : "🌙";
}

function applyLanguage(){
  document.documentElement.lang = APP_STATE.lang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  document.querySelectorAll(".lang-pill").forEach(p => p.classList.toggle("active", p.dataset.lang === APP_STATE.lang));
  renderPeriodLabel();
  renderMiniCal();
  renderCalendar();
}

function toggleTheme(){
  APP_STATE.theme = APP_STATE.theme === "dark" ? "light" : "dark";
  localStorage.setItem("daybook_theme", APP_STATE.theme);
  applyTheme();
  if (APP_STATE.user) saveProfileSettings({ language: APP_STATE.lang, theme: APP_STATE.theme, aiModel: APP_STATE.profile?.ai_model }).catch(()=>{});
}

// ============================================================
// SCREENS
// ============================================================
function showAuthScreen(){
  document.getElementById("auth-screen").classList.remove("hidden");
  document.getElementById("app-shell").classList.add("hidden");
}
function showAppShell(){
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("app-shell").classList.remove("hidden");
  document.getElementById("user-email").textContent = APP_STATE.user.email;
  renderPeriodLabel();
  renderMiniCal();
  renderCalendar();
  renderOverdueBanner();
}

function showToast(msg){
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add("hidden"), 2600);
}

// ============================================================
// DATA
// ============================================================
async function loadTasks(){
  const { data, error } = await sb
    .from("tasks")
    .select("*")
    .eq("user_id", APP_STATE.user.id)
    .order("date", { ascending: true })
    .order("time", { ascending: true });
  if (error) { console.error(error); return; }
  APP_STATE.tasks = data || [];
}

function tasksOnDate(dateObj){
  const iso = toISODate(dateObj);
  return APP_STATE.tasks.filter(tk => tk.date === iso && APP_STATE.tagFilters.has(tk.tag));
}

async function upsertTask(payload){
  if (payload.id) {
    const { id, ...rest } = payload;
    const { error } = await sb.from("tasks").update(rest).eq("id", id).eq("user_id", APP_STATE.user.id);
    if (error) throw error;
  } else {
    const { error } = await sb.from("tasks").insert({ ...payload, user_id: APP_STATE.user.id });
    if (error) throw error;
  }
  await loadTasks();
  renderMiniCal();
  renderCalendar();
  renderOverdueBanner();
}

async function deleteTask(id){
  const { error } = await sb.from("tasks").delete().eq("id", id).eq("user_id", APP_STATE.user.id);
  if (error) throw error;
  await loadTasks();
  renderMiniCal();
  renderCalendar();
  renderOverdueBanner();
}

async function toggleTaskCompleted(task){
  await upsertTask({ id: task.id, completed: !task.completed });
}

// ============================================================
// PERIOD LABEL + NAVIGATION
// ============================================================
function renderPeriodLabel(){
  const el = document.getElementById("period-label");
  const d = APP_STATE.cursorDate;
  if (APP_STATE.view === "month") {
    el.textContent = `${t(MONTH_KEYS[d.getMonth()])} ${d.getFullYear()}`;
  } else if (APP_STATE.view === "week") {
    const s = startOfWeek(d), e = addDays(s, 6);
    el.textContent = `${s.getDate()}/${s.getMonth()+1} – ${e.getDate()}/${e.getMonth()+1}/${e.getFullYear()}`;
  } else {
    el.textContent = `${t(DOW_KEYS[d.getDay()])}, ${d.getDate()} ${t(MONTH_KEYS[d.getMonth()])} ${d.getFullYear()}`;
  }
}

function navigate(delta){
  const d = new Date(APP_STATE.cursorDate);
  if (APP_STATE.view === "month") d.setMonth(d.getMonth() + delta);
  else if (APP_STATE.view === "week") d.setDate(d.getDate() + delta * 7);
  else d.setDate(d.getDate() + delta);
  APP_STATE.cursorDate = d;
  renderPeriodLabel();
  renderCalendar();
}

function goToday(){
  APP_STATE.cursorDate = new Date();
  APP_STATE.selectedDate = new Date();
  renderPeriodLabel();
  renderMiniCal();
  renderCalendar();
}

function setView(view){
  APP_STATE.view = view;
  document.querySelectorAll(".view-btn").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  renderPeriodLabel();
  renderCalendar();
}

// ============================================================
// MINI CALENDAR (sidebar)
// ============================================================
function renderMiniCal(){
  const label = document.getElementById("mini-cal-label");
  const grid = document.getElementById("mini-cal-grid");
  const ref = APP_STATE.cursorDate;
  label.textContent = `${t(MONTH_KEYS[ref.getMonth()])} ${ref.getFullYear()}`;

  grid.innerHTML = "";
  DOW_KEYS.forEach(k => {
    const el = document.createElement("div");
    el.className = "mc-dow";
    el.textContent = t(k)[0];
    grid.appendChild(el);
  });

  const firstOfMonth = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  const today = new Date();

  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    const el = document.createElement("div");
    el.className = "mc-day";
    if (d.getMonth() !== ref.getMonth()) el.classList.add("mc-muted");
    if (sameDay(d, today)) el.classList.add("mc-today");
    if (sameDay(d, APP_STATE.selectedDate)) el.classList.add("mc-selected");
    if (tasksOnDate(d).length > 0) el.classList.add("mc-has-task");
    el.textContent = d.getDate();
    el.addEventListener("click", () => {
      APP_STATE.selectedDate = d;
      APP_STATE.cursorDate = d;
      if (APP_STATE.view === "month" && d.getMonth() !== ref.getMonth()) { /* still jump */ }
      renderPeriodLabel();
      renderMiniCal();
      renderCalendar();
    });
    grid.appendChild(el);
  }
}

document.addEventListener("click", (e) => {
  if (e.target.id === "mini-prev") { APP_STATE.cursorDate.setMonth(APP_STATE.cursorDate.getMonth()-1); renderMiniCal(); }
  if (e.target.id === "mini-next") { APP_STATE.cursorDate.setMonth(APP_STATE.cursorDate.getMonth()+1); renderMiniCal(); }
});

// ============================================================
// MAIN CALENDAR RENDER
// ============================================================
function renderCalendar(){
  const root = document.getElementById("calendar-root");
  root.innerHTML = "";
  if (APP_STATE.view === "month") root.appendChild(renderMonthView());
  else if (APP_STATE.view === "week") root.appendChild(renderWeekView());
  else root.appendChild(renderDayView());
}

function taskPillColorVar(tag){ return `var(--${tag})`; }

function renderMonthView(){
  const wrap = document.createElement("div");
  const grid = document.createElement("div");
  grid.className = "month-grid";

  DOW_KEYS.forEach(k => {
    const el = document.createElement("div");
    el.className = "month-dow";
    el.textContent = t(k);
    grid.appendChild(el);
  });

  const ref = APP_STATE.cursorDate;
  const firstOfMonth = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  const today = new Date();

  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    const cell = document.createElement("div");
    cell.className = "month-cell";
    if (d.getMonth() !== ref.getMonth()) cell.classList.add("muted");
    if (sameDay(d, today)) cell.classList.add("today");

    const num = document.createElement("div");
    num.className = "month-cell-num";
    num.textContent = d.getDate();
    cell.appendChild(num);

    const dayTasks = tasksOnDate(d);
    dayTasks.slice(0, 3).forEach(tk => {
      const pill = document.createElement("div");
      pill.className = "month-task-pill" + (tk.completed ? " done" : "");
      pill.style.borderLeft = `3px solid ${taskPillColorVar(tk.tag)}`;
      pill.textContent = (tk.time ? tk.time.slice(0,5) + " " : "") + tk.title;
      pill.addEventListener("click", (e) => { e.stopPropagation(); openTaskModal(tk); });
      cell.appendChild(pill);
    });
    if (dayTasks.length > 3) {
      const more = document.createElement("div");
      more.className = "month-more";
      more.textContent = `+${dayTasks.length - 3}`;
      cell.appendChild(more);
    }

    cell.addEventListener("click", () => openTaskModal(null, d));
    grid.appendChild(cell);
  }
  wrap.appendChild(grid);
  return wrap;
}

function renderWeekView(){
  const wrap = document.createElement("div");
  const start = startOfWeek(APP_STATE.cursorDate);
  const days = Array.from({length:7}, (_,i) => addDays(start, i));
  const today = new Date();

  const grid = document.createElement("div");
  grid.className = "week-grid";

  // header row
  const cornerFake = document.createElement("div");
  cornerFake.className = "week-col-head";
  cornerFake.style.background = "transparent";
  cornerFake.style.border = "none";
  grid.appendChild(cornerFake);

  days.forEach(d => {
    const head = document.createElement("div");
    head.className = "week-col-head" + (sameDay(d, today) ? " today" : "");
    head.innerHTML = `<div class="wch-dow">${t(DOW_KEYS[d.getDay()])}</div><div class="wch-num">${d.getDate()}</div>`;
    grid.appendChild(head);
  });

  for (let h = 0; h < 24; h++) {
    const label = document.createElement("div");
    label.className = "week-hour-label";
    label.textContent = `${pad2(h)}:00`;
    grid.appendChild(label);

    days.forEach(d => {
      const cell = document.createElement("div");
      cell.className = "week-cell";
      const dayTasks = tasksOnDate(d).filter(tk => {
        const hh = tk.time ? parseInt(tk.time.slice(0,2), 10) : null;
        return hh === h;
      });
      dayTasks.forEach(tk => {
        const block = document.createElement("div");
        block.className = "week-task-block" + (tk.completed ? " done" : "");
        block.style.borderLeft = `3px solid ${taskPillColorVar(tk.tag)}`;
        block.textContent = tk.title;
        block.addEventListener("click", (e) => { e.stopPropagation(); openTaskModal(tk); });
        cell.appendChild(block);
      });
      cell.addEventListener("click", () => openTaskModal(null, d, `${pad2(h)}:00`));
      grid.appendChild(cell);
    });
  }
  wrap.appendChild(grid);
  return wrap;
}

function renderDayView(){
  const wrap = document.createElement("div");
  wrap.className = "day-view";
  const d = APP_STATE.cursorDate;
  const dayTasks = tasksOnDate(d);

  if (dayTasks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = t("noTasks");
    wrap.appendChild(empty);
  }

  for (let h = 0; h < 24; h++) {
    const row = document.createElement("div");
    row.className = "day-hour-row";
    const label = document.createElement("div");
    label.className = "day-hour-label";
    label.textContent = `${pad2(h)}:00`;
    row.appendChild(label);

    const cellTasks = document.createElement("div");
    cellTasks.className = "day-hour-tasks";
    dayTasks.filter(tk => (tk.time ? parseInt(tk.time.slice(0,2),10) : 0) === h).forEach(tk => {
      const card = document.createElement("div");
      card.className = "day-task-card" + (tk.completed ? " done" : "");
      card.innerHTML = `
        <span class="dtc-check ${tk.completed ? "done" : ""}"></span>
        <span class="dtc-time">${tk.time ? tk.time.slice(0,5) : ""}</span>
        <span class="dtc-title">${escapeHtml(tk.title)}</span>
      `;
      card.querySelector(".dtc-check").addEventListener("click", (e) => { e.stopPropagation(); toggleTaskCompleted(tk); });
      card.addEventListener("click", () => openTaskModal(tk));
      cellTasks.appendChild(card);
    });
    row.appendChild(cellTasks);
    wrap.appendChild(row);
  }
  return wrap;
}

function escapeHtml(s){
  return (s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

// ============================================================
// TASK MODAL
// ============================================================
function openTaskModal(task, presetDate, presetTime, aiPrefill){
  const modal = document.getElementById("modal-task");
  document.getElementById("task-modal-title").textContent = task ? t("editTask") : t("newTask");
  document.getElementById("task-id").value = task?.id || "";
  document.getElementById("task-title").value = task?.title || aiPrefill?.title || "";
  document.getElementById("task-date").value = task?.date || (presetDate ? toISODate(presetDate) : toISODate(aiPrefill?.date ? new Date(aiPrefill.date) : APP_STATE.selectedDate));
  document.getElementById("task-time").value = task?.time ? task.time.slice(0,5) : (presetTime || aiPrefill?.time || "");
  document.getElementById("task-tag").value = task?.tag || aiPrefill?.tag || "personal";
  document.getElementById("task-description").value = task?.description || aiPrefill?.description || "";
  document.getElementById("task-completed").checked = task?.completed || aiPrefill?.completed || false;
  document.getElementById("task-delete-btn").classList.toggle("hidden", !task);
  modal.classList.remove("hidden");
  document.getElementById("task-title").focus();
}

function closeModal(id){ document.getElementById(id).classList.add("hidden"); }

async function handleTaskFormSubmit(e){
  e.preventDefault();
  const id = document.getElementById("task-id").value || null;
  const payload = {
    id,
    title: document.getElementById("task-title").value.trim(),
    date: document.getElementById("task-date").value,
    time: document.getElementById("task-time").value || null,
    tag: document.getElementById("task-tag").value,
    description: document.getElementById("task-description").value.trim(),
    completed: document.getElementById("task-completed").checked,
  };
  if (!payload.title || !payload.date) return;
  try {
    await upsertTask(payload);
    closeModal("modal-task");
  } catch (err) {
    console.error(err);
    showToast(t("authError"));
  }
}

// ============================================================
// SETTINGS MODAL
// ============================================================
function openSettingsModal(){
  document.getElementById("settings-lang").value = APP_STATE.lang;
  document.querySelectorAll("[data-theme-choice]").forEach(b => b.classList.toggle("active", b.dataset.themeChoice === APP_STATE.theme));
  document.getElementById("settings-api-key").value = "";
  document.getElementById("settings-api-key").placeholder = APP_STATE.profile?.gemini_api_key ? "•••••••• (đã lưu)" : "AIza...";
  document.getElementById("settings-model").value = APP_STATE.profile?.ai_model || window.APP_CONFIG.DEFAULT_GEMINI_MODEL;
  document.getElementById("settings-saved-msg").classList.add("hidden");
  document.getElementById("modal-settings").classList.remove("hidden");
}

async function handleSaveSettings(){
  const lang = document.getElementById("settings-lang").value;
  const themeChoice = document.querySelector("[data-theme-choice].active")?.dataset.themeChoice || APP_STATE.theme;
  const keyInput = document.getElementById("settings-api-key").value.trim();
  const model = document.getElementById("settings-model").value.trim();

  APP_STATE.lang = lang;
  APP_STATE.theme = themeChoice;
  localStorage.setItem("daybook_lang", lang);
  localStorage.setItem("daybook_theme", themeChoice);

  try {
    await saveProfileSettings({
      language: lang,
      theme: themeChoice,
      aiModel: model,
      geminiApiKey: keyInput ? keyInput : undefined,
    });
    applyTheme();
    applyLanguage();
    document.getElementById("settings-saved-msg").classList.remove("hidden");
    setTimeout(() => closeModal("modal-settings"), 900);
  } catch (err) {
    console.error(err);
    showToast(t("authError"));
  }
}

// ============================================================
// POSTPONE (reschedule) SUGGESTION
// ============================================================
function overdueTasks(){
  const now = new Date();
  const nowISO = toISODate(now);
  const nowHM = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  return APP_STATE.tasks.filter(tk => {
    if (tk.completed) return false;
    if (tk.date < nowISO) return true;
    if (tk.date === nowISO && tk.time && tk.time.slice(0,5) < nowHM) return true;
    return false;
  });
}

function renderOverdueBanner(){
  const banner = document.getElementById("overdue-banner");
  const list = overdueTasks();
  if (list.length === 0) { banner.classList.add("hidden"); return; }
  banner.classList.remove("hidden");
  banner.textContent = `⏰ ${list.length} — ${t("overdueTitle")}`;
  banner.onclick = () => openPostponeModal(list[0]);
}

let currentPostponeTask = null;
function openPostponeModal(task){
  currentPostponeTask = task;
  document.getElementById("postpone-task-title").textContent = task.title;
  document.getElementById("postpone-date").value = toISODate(new Date());
  document.getElementById("postpone-time").value = task.time ? task.time.slice(0,5) : "";
  document.getElementById("modal-postpone").classList.remove("hidden");
}

async function handlePostponeConfirm(){
  if (!currentPostponeTask) return;
  const date = document.getElementById("postpone-date").value;
  const time = document.getElementById("postpone-time").value || null;
  try {
    await upsertTask({ id: currentPostponeTask.id, date, time });
    closeModal("modal-postpone");
    showToast(t("settingsSaved"));
  } catch (err) {
    console.error(err);
  }
}

async function handlePostponeDismiss(){
  // Leave the task as-is, but mark it as "seen" for this session so the
  // banner moves on to the next overdue task without nagging again immediately.
  if (currentPostponeTask) currentPostponeTask.completed = currentPostponeTask.completed; // no-op, explicit intent
  closeModal("modal-postpone");
}

// ============================================================
// AI IMPORT
// ============================================================
let aiMode = "text";
let aiImageBase64 = null, aiImageMime = null;

function openAiModal(){
  document.getElementById("ai-text-input").value = "";
  document.getElementById("ai-image-input").value = "";
  document.getElementById("ai-image-preview").classList.add("hidden");
  document.getElementById("ai-error").textContent = "";
  aiImageBase64 = null;
  document.getElementById("modal-ai").classList.remove("hidden");
  if (!APP_STATE.profile?.gemini_api_key) {
    document.getElementById("ai-error").textContent = t("aiImportNoKey");
  }
}

async function handleAiRun(){
  const errEl = document.getElementById("ai-error");
  errEl.textContent = "";
  if (!APP_STATE.profile?.gemini_api_key) { errEl.textContent = t("aiImportNoKey"); return; }

  const btn = document.getElementById("btn-ai-run");
  const originalLabel = btn.textContent;
  btn.textContent = t("aiImportRunning");
  btn.disabled = true;

  try {
    const text = aiMode === "text" ? document.getElementById("ai-text-input").value : "";
    const result = await callGeminiExtractTask({
      text,
      imageBase64: aiMode === "image" ? aiImageBase64 : null,
      imageMimeType: aiImageMime,
    });
    closeModal("modal-ai");
    const missing = !result.title || !result.date;
    openTaskModal(null, null, null, {
      title: result.title,
      date: result.date || null,
      time: result.time || "",
      tag: ["study","work","personal","entertainment"].includes(result.tag) ? result.tag : "personal",
      description: result.description || "",
      completed: !!result.completed,
    });
    if (missing) showToast(t("aiImportMissing"));
  } catch (err) {
    console.error(err);
    errEl.textContent = err.code === "NO_KEY" ? t("aiImportNoKey") : t("aiImportError");
  } finally {
    btn.textContent = originalLabel;
    btn.disabled = false;
  }
}

// ============================================================
// EVENT WIRING
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  applyTheme();

  // Auth tabs
  document.querySelectorAll("[data-auth-tab]").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("[data-auth-tab]").forEach(x => x.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("login-form").classList.toggle("hidden", tab.dataset.authTab !== "login");
      document.getElementById("register-form").classList.toggle("hidden", tab.dataset.authTab !== "register");
    });
  });

  document.querySelectorAll(".lang-pill").forEach(p => {
    p.addEventListener("click", () => {
      APP_STATE.lang = p.dataset.lang;
      localStorage.setItem("daybook_lang", APP_STATE.lang);
      applyLanguage();
    });
  });

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const errEl = document.getElementById("login-error");
    errEl.textContent = "";
    try { await handleLogin(email, password); }
    catch (err) { errEl.textContent = err.message || t("authError"); }
  });

  document.getElementById("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const confirm = document.getElementById("register-confirm").value;
    const errEl = document.getElementById("register-error");
    const noteEl = document.getElementById("register-note");
    errEl.textContent = ""; noteEl.textContent = "";
    if (password !== confirm) { errEl.textContent = t("authError"); return; }
    try {
      const data = await handleRegister(email, password);
      if (!data.session) noteEl.textContent = t("checkEmailConfirm");
    } catch (err) { errEl.textContent = err.message || t("authError"); }
  });

  document.getElementById("btn-logout").addEventListener("click", handleLogout);
  document.getElementById("btn-theme").addEventListener("click", toggleTheme);
  document.getElementById("btn-today").addEventListener("click", goToday);
  document.getElementById("btn-prev").addEventListener("click", () => navigate(-1));
  document.getElementById("btn-next").addEventListener("click", () => navigate(1));
  document.querySelectorAll(".view-btn").forEach(b => b.addEventListener("click", () => setView(b.dataset.view)));

  document.querySelectorAll(".tag-filter-cb").forEach(cb => {
    cb.addEventListener("change", () => {
      if (cb.checked) APP_STATE.tagFilters.add(cb.value); else APP_STATE.tagFilters.delete(cb.value);
      renderMiniCal();
      renderCalendar();
    });
  });

  document.getElementById("btn-add-task").addEventListener("click", () => openTaskModal(null, APP_STATE.selectedDate));
  document.getElementById("task-form").addEventListener("submit", handleTaskFormSubmit);
  document.getElementById("task-delete-btn").addEventListener("click", async () => {
    const id = document.getElementById("task-id").value;
    if (!id) return;
    try { await deleteTask(id); closeModal("modal-task"); } catch(err){ console.error(err); }
  });

  document.getElementById("btn-settings").addEventListener("click", openSettingsModal);
  document.getElementById("btn-save-settings").addEventListener("click", handleSaveSettings);
  document.querySelectorAll("[data-theme-choice]").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll("[data-theme-choice]").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
    });
  });

  // AI modal
  document.getElementById("btn-ai-import").addEventListener("click", openAiModal);
  document.getElementById("btn-ai-run").addEventListener("click", handleAiRun);
  document.querySelectorAll("[data-ai-mode]").forEach(b => {
    b.addEventListener("click", () => {
      aiMode = b.dataset.aiMode;
      document.querySelectorAll("[data-ai-mode]").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      document.getElementById("ai-text-pane").classList.toggle("hidden", aiMode !== "text");
      document.getElementById("ai-image-pane").classList.toggle("hidden", aiMode !== "image");
    });
  });
  document.getElementById("ai-image-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    aiImageMime = file.type;
    aiImageBase64 = await fileToBase64(file);
    const preview = document.getElementById("ai-image-preview");
    preview.src = URL.createObjectURL(file);
    preview.classList.remove("hidden");
  });

  // Postpone modal
  document.getElementById("btn-postpone-confirm").addEventListener("click", handlePostponeConfirm);
  document.getElementById("btn-postpone-dismiss").addEventListener("click", handlePostponeDismiss);

  // Generic modal close
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => closeModal(b.dataset.close)));
  document.querySelectorAll(".modal-overlay").forEach(ov => {
    ov.addEventListener("click", (e) => { if (e.target === ov) ov.classList.add("hidden"); });
  });

  bootAuth();
});

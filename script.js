const API_URL =
  "https://lzg5xr5zkb.execute-api.eu-central-1.amazonaws.com/prod";

/* ---------- State ---------- */
const state = {
  pendingEmail: null, // email awaiting verification
  idToken: localStorage.getItem("idToken") || null,
};

/* ---------- DOM helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const screens = {
  auth: $("#screen-auth"),
  verify: $("#screen-verify"),
  notes: $("#screen-notes"),
};

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

function setMsg(formKey, text, kind = "") {
  const el = document.querySelector(`.form-msg[data-for="${formKey}"]`);
  if (!el) return;
  el.textContent = text || "";
  el.className = "form-msg" + (kind ? " " + kind : "");
}

function toast(text, kind = "") {
  const t = $("#toast");
  t.textContent = text;
  t.className = "toast show" + (kind ? " " + kind : "");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2600);
}

function setBusy(btn, busy, label) {
  if (!btn) return;
  if (busy) {
    btn.dataset.original = btn.querySelector("span").textContent;
    btn.querySelector("span").textContent = label || "Working…";
    btn.disabled = true;
  } else {
    if (btn.dataset.original)
      btn.querySelector("span").textContent = btn.dataset.original;
    btn.disabled = false;
  }
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorFrom(data, fallback) {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  return data.message || data.error || fallback;
}

/* ---------- Tabs ---------- */
const tabsEl = $(".tabs");
const formSign = $("#form-signup");
const formLog = $("#form-login");

$$(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const key = tab.dataset.tab;
    tabsEl.dataset.active = key;
    if (key === "signup") {
      formSign.classList.add("active");
      formLog.classList.remove("active");
    } else {
      formLog.classList.add("active");
      formSign.classList.remove("active");
    }
    setMsg("signup", "");
    setMsg("login", "");
  });
});

/* ---------- Sign Up ---------- */
formSign.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(formSign);
  const email = fd.get("email").trim();
  const password = fd.get("password");
  const confirm = fd.get("confirm");

  if (password !== confirm) {
    setMsg("signup", "Passwords do not match.", "error");
    return;
  }

  const submitBtn = formSign.querySelector('button[type="submit"]');
  setBusy(submitBtn, true, "Creating…");
  setMsg("signup", "");

  try {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await readJson(response);
    if (!response.ok) {
      setMsg("signup", errorFrom(data, "Sign up failed."), "error");
      return;
    }
    state.pendingEmail = email;
    formSign.reset();
    showScreen("verify");
    toast("Verification code sent ✦", "success");
  } catch (err) {
    setMsg("signup", err.message || "Network error.", "error");
  } finally {
    setBusy(submitBtn, false);
  }
});

/* ---------- Verification ---------- */
const formVerify = $("#form-verify");

formVerify.addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = new FormData(formVerify).get("code").trim();
  const email = state.pendingEmail;
  if (!email) {
    setMsg("verify", "Sign up first to get a code.", "error");
    return;
  }
  const submitBtn = formVerify.querySelector('button[type="submit"]');
  setBusy(submitBtn, true, "Verifying…");

  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await readJson(response);
    if (!response.ok) {
      setMsg("verify", errorFrom(data, "Could not verify."), "error");
      return;
    }
    setMsg("verify", "Verified! Redirecting to sign in…", "success");
    formVerify.reset();
    setTimeout(() => {
      state.pendingEmail = null;
      showScreen("auth");
      // Switch to login tab
      $$(".tab").forEach((t) => t.classList.remove("active"));
      $('.tab[data-tab="login"]').classList.add("active");
      tabsEl.dataset.active = "login";
      formLog.classList.add("active");
      formSign.classList.remove("active");
      toast("Account verified — please log in", "success");
    }, 700);
  } catch (err) {
    setMsg("verify", err.message || "Network error.", "error");
  } finally {
    setBusy(submitBtn, false);
  }
});

$("#back-to-auth").addEventListener("click", () => {
  state.pendingEmail = null;
  showScreen("auth");
});

/* ---------- Login ---------- */
formLog.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(formLog);
  const email = fd.get("email").trim();
  const password = fd.get("password");

  const submitBtn = formLog.querySelector('button[type="submit"]');
  setBusy(submitBtn, true, "Signing in…");
  setMsg("login", "");

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await readJson(response);
    if (!response.ok) {
      setMsg("login", errorFrom(data, "Login failed."), "error");
      return;
    }
    if (!data || !data.idToken) {
      setMsg("login", "Login response missing token.", "error");
      return;
    }
    state.idToken = data.idToken;
    localStorage.setItem("idToken", data.idToken);
    formLog.reset();
    showScreen("notes");
    toast("Welcome back", "success");
    loadNotes();
  } catch (err) {
    setMsg("login", err.message || "Network error.", "error");
  } finally {
    setBusy(submitBtn, false);
  }
});

/* ---------- Logout ---------- */
$("#logout-btn").addEventListener("click", () => {
  localStorage.removeItem("idToken");
  state.idToken = null;
  showScreen("auth");
  toast("Signed out");
});

/* ---------- API ---------- */
async function api(path, options = {}) {
  if (!state.idToken) throw new Error("Not authenticated");
  const res = await fetch(API_URL + path, {
    ...options,
    headers: {
      Authorization: state.idToken,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    state.idToken = null;
    localStorage.removeItem("idToken");
    showScreen("auth");
    toast("Session expired — please log in again", "error");
    throw new Error("Unauthorized");
  }
  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(errorFrom(data, `Request failed (${res.status})`));
  }
  return data;
}

/* ---------- Notes UI ---------- */
const noteInput = $("#note-input");
const addBtn = $("#add-note-btn");
const notesList = $("#notes-list");
const notesEmpty = $("#notes-empty");
const notesLoad = $("#notes-loading");
const notesCount = $("#notes-count");
const charCount = $("#char-count");
const todayDate = $("#today-date");

function fmtDate(input) {
  if (!input) return "";
  const d =
    typeof input === "number"
      ? new Date(input < 1e12 ? input * 1000 : input)
      : new Date(input);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function setTodayDate() {
  const d = new Date();
  todayDate.textContent = d
    .toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();
}

noteInput.addEventListener("input", () => {
  const len = noteInput.value.length;
  charCount.textContent = `${len} character${len === 1 ? "" : "s"}`;
});

function pickField(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function normalizeNote(raw) {
  if (typeof raw === "string") {
    return { id: raw, text: raw, createdAt: null };
  }
  return {
    id:
      pickField(raw, ["noteId", "id", "NoteId", "pk", "sk"]) ||
      crypto.randomUUID(),
    text: pickField(raw, ["content", "text", "note", "body", "message"]) || "",
    createdAt: pickField(raw, ["createdAt", "created_at", "timestamp", "date"]),
  };
}

function extractNotesArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload) return [];
  for (const key of ["notes", "items", "Items", "data", "results"]) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
}

function renderNotes(list) {
  notesList.innerHTML = "";
  if (!list.length) {
    notesEmpty.hidden = false;
    notesCount.textContent = "0 notes";
    return;
  }
  notesEmpty.hidden = true;
  notesCount.textContent = `${list.length} note${list.length === 1 ? "" : "s"}`;

  // Newest first if we have timestamps
  list.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  list.forEach((n, i) => {
    const li = document.createElement("li");
    li.className = "note-item";
    li.style.animationDelay = `${Math.min(i, 8) * 50}ms`;
    li.dataset.text = n.text;

    const bar = document.createElement("span");
    bar.className = "note-bar";

    const body = document.createElement("div");
    body.className = "note-body";

    const p = document.createElement("p");
    p.className = "note-text";
    p.textContent = n.text;

    const meta = document.createElement("span");
    meta.className = "note-meta";
    meta.textContent = n.createdAt ? fmtDate(n.createdAt) : "";

    body.appendChild(p);
    if (meta.textContent) body.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "note-actions";

    const edit = document.createElement("button");
    edit.className = "note-icon-btn note-edit";
    edit.title = "Edit note";
    edit.setAttribute("aria-label", "Edit note");
    edit.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 6l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    edit.addEventListener("click", () => enterEditMode(n.id, li));

    const del = document.createElement("button");
    del.className = "note-icon-btn note-delete";
    del.title = "Delete note";
    del.setAttribute("aria-label", "Delete note");
    del.textContent = "×";
    del.addEventListener("click", () => deleteNote(n.id, li));

    actions.append(edit, del);

    li.append(bar, body, actions);
    notesList.appendChild(li);
  });
}

/* ---------- Edit Note ---------- */
function enterEditMode(id, li) {
  if (li.classList.contains("editing")) return;
  li.classList.add("editing");

  const body = li.querySelector(".note-body");
  const original = li.dataset.text || "";
  const meta = body.querySelector(".note-meta");
  const metaHTML = meta ? meta.outerHTML : "";

  body.innerHTML = `
    <textarea class="note-edit-input" rows="3"></textarea>
    ${metaHTML}
    <div class="note-edit-actions">
      <button type="button" class="btn-edit btn-edit-cancel">Cancel</button>
      <button type="button" class="btn-edit btn-edit-save">Save</button>
    </div>
  `;

  const textarea = body.querySelector(".note-edit-input");
  textarea.value = original;
  textarea.focus();
  // Place cursor at end
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);

  const actions = li.querySelector(".note-actions");
  if (actions) actions.style.display = "none";

  body.querySelector(".btn-edit-cancel").addEventListener("click", () => {
    cancelEdit(li, original, meta);
  });
  body.querySelector(".btn-edit-save").addEventListener("click", () => {
    saveEdit(id, li, textarea.value, meta);
  });
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit(li, original, meta);
    } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      saveEdit(id, li, textarea.value, meta);
    }
  });
}

function exitEditMode(li, text, meta) {
  li.classList.remove("editing");
  const body = li.querySelector(".note-body");
  body.innerHTML = "";

  const p = document.createElement("p");
  p.className = "note-text";
  p.textContent = text;
  body.appendChild(p);

  if (meta && meta.textContent) {
    const m = document.createElement("span");
    m.className = "note-meta";
    m.textContent = meta.textContent;
    body.appendChild(m);
  }

  li.dataset.text = text;
  const actions = li.querySelector(".note-actions");
  if (actions) actions.style.display = "";
}

function cancelEdit(li, original, meta) {
  exitEditMode(li, original, meta);
}

async function saveEdit(id, li, newText, meta) {
  const trimmed = newText.trim();
  if (!trimmed) {
    toast("Note can't be empty", "error");
    return;
  }
  if (trimmed === li.dataset.text) {
    exitEditMode(li, trimmed, meta);
    return;
  }

  const saveBtn = li.querySelector(".btn-edit-save");
  const cancelBtn = li.querySelector(".btn-edit-cancel");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
  }
  if (cancelBtn) cancelBtn.disabled = true;

  try {
    await api(`/notes/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ content: trimmed }),
    });
    exitEditMode(li, trimmed, meta);
    toast("Note updated", "success");
  } catch (err) {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
    }
    if (cancelBtn) cancelBtn.disabled = false;
    if (err.message !== "Unauthorized") {
      toast(err.message || "Could not update note", "error");
    }
  }
}

async function loadNotes() {
  setTodayDate();
  notesLoad.style.display = "block";
  notesEmpty.hidden = true;
  notesList.innerHTML = "";
  notesCount.textContent = "—";
  try {
    const data = await api("/notes", { method: "GET" });
    const arr = extractNotesArray(data).map(normalizeNote);
    renderNotes(arr);
  } catch (err) {
    if (err.message !== "Unauthorized") {
      toast(err.message || "Could not load notes", "error");
      notesEmpty.hidden = false;
    }
  } finally {
    notesLoad.style.display = "none";
  }
}

async function addNote() {
  const text = noteInput.value.trim();
  if (!text) {
    noteInput.focus();
    return;
  }
  setBusy(addBtn, true, "Saving…");
  try {
    await api("/notes", {
      method: "POST",
      body: JSON.stringify({ content: text, text: text }),
    });
    noteInput.value = "";
    charCount.textContent = "0 characters";
    toast("Note saved", "success");
    loadNotes();
  } catch (err) {
    if (err.message !== "Unauthorized") {
      toast(err.message || "Could not save note", "error");
    }
  } finally {
    setBusy(addBtn, false);
  }
}

async function deleteNote(id, li) {
  if (!id) return;
  // Optimistic fade
  li.style.transition = "opacity .25s, transform .25s";
  li.style.opacity = "0.5";
  try {
    await api(`/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
    li.style.opacity = "0";
    li.style.transform = "translateX(20px)";
    setTimeout(() => loadNotes(), 250);
    toast("Note deleted");
  } catch (err) {
    li.style.opacity = "1";
    if (err.message !== "Unauthorized") {
      toast(err.message || "Could not delete note", "error");
    }
  }
}

addBtn.addEventListener("click", addNote);
noteInput.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    addNote();
  }
});

/* ---------- Boot ---------- */
(function boot() {
  setTodayDate();
  if (state.idToken) {
    showScreen("notes");
    loadNotes();
  } else {
    showScreen("auth");
  }
})();

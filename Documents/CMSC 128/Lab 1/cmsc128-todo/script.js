/* ========= Firebase (CDN modules) ========= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  onSnapshot,
  query,
  where,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

/* ========= Firebase config ========= */
const firebaseConfig = {
  apiKey: "AIzaSyCqCqt9wXYrIlB2rW7feWY-2Ipk6etc49Q",
  authDomain: "taskdash-c5cc1.firebaseapp.com",
  projectId: "taskdash-c5cc1",
  storageBucket: "taskdash-c5cc1.firebasestorage.app",
  messagingSenderId: "822232313643",
  appId: "1:822232313643:web:8033f4160c040cf4771f6e",
  measurementId: "G-8ZQ4R12DDF",
};

const appFB = initializeApp(firebaseConfig);
const auth = getAuth(appFB);
const db = getFirestore(appFB);
const tasksCol = collection(db, "tasks");

/* ========= Auth (local display name) ========= */
const USER_KEY = "todo.user.v1";
let currentUser = localStorage.getItem(USER_KEY);

if (!currentUser) {
  window.location.href = "login.html";
}

/* ========= State & element refs ========= */
let authUser = null;
let tasks = [];
let deleted = [];
let lastDeleted = null;
let toastTimer = null;

const $ = (s) => document.querySelector(s);

// Toggles / buttons
const sidebarToggle = $("#sidebarToggle");
const topbarToggle = $("#topbarToggle");
const logoutBtn = $("#logoutBtn");

// Identity / avatars
const displayName = $("#displayName");
const profileName = $("#profileName");
const avatar = $("#avatar");

// Lists & counts
const todoList = $("#todoList");
const doneList = $("#doneList");
const deletedList = $("#deletedList");

const todoCount = $("#todoCount");
const doneCount = $("#doneCount");
const delCount = $("#delCount");

// Donuts
const donutDone = $("#donutDone");
const donutProg = $("#donutProg");
const donutNot = $("#donutNot");

// Controls
const sortSelect = $("#sortSelect");
const searchInput = $("#searchInput");
const todayLabel = $("#todayLabel");
const addTaskBtn = $("#addTaskBtn");

// Dialog & form
const dialog = $("#taskDialog");
const form = $("#taskForm");
const saveBtn = document.getElementById("saveTaskBtn");

const idInput = $("#idInput");
const titleInput = $("#titleInput");
const descInput = $("#descInput");
const priorityInput = $("#priorityInput");
const dateInput = $("#dateInput");
const timeInput = $("#timeInput");
const dueTextInput = $("#dueTextInput");
const cancelDialog = $("#cancelDialog");

// Toast
const toast = $("#toast");
const toastMsg = $("#toastMsg");
const undoBtn = $("#undoBtn");

/* ========= Utils ========= */
const initials = (name = "Guest") =>
  name
    .trim()
    .split(/\s+/)
    .map((s) => s[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "G";

const first = (name = "Friend") => name.trim().split(/\s+/)[0] || "Friend";

function combineDue(d, t) {
  if (!d && !t) return null;
  const iso = d || new Date().toISOString().slice(0, 10);
  const tt = t || "00:00";
  return new Date(`${iso}T${tt}:00`);
}

function formatDate(x) {
  if (!x) return "—";
  const d = x instanceof Date ? x : new Date(x);
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const escapeHTML = (s) =>
  (s || "").replace(/[&<>\"']/g, (m) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[m];
  });

/* ========= Sidebar & logout ========= */
profileName.textContent = currentUser;
displayName.textContent = first(currentUser);
avatar.textContent = initials(currentUser);

const toggleSidebar = () => document.body.classList.toggle("sidebar-collapsed");

sidebarToggle.addEventListener("click", toggleSidebar);
topbarToggle.addEventListener("click", toggleSidebar);

logoutBtn.addEventListener("click", async () => {
  if (!confirm("Log out?")) return;
  localStorage.removeItem(USER_KEY);
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
  window.location.href = "login.html";
});

/* ========= Firestore CRUD ========= */
async function createTask(t) {
  const ref = await addDoc(tasksCol, t);
  return { id: ref.id, ...t };
}

async function updateTask(id, patch) {
  await updateDoc(doc(db, "tasks", id), patch);
}

async function softDelete(id) {
  await updateDoc(doc(db, "tasks", id), { isDeleted: true, deletedAt: Date.now() });
}

async function restoreTask(id) {
  await updateDoc(doc(db, "tasks", id), { isDeleted: false, deletedAt: null });
}

async function purgeTask(id) {
  await deleteDoc(doc(db, "tasks", id));
}

/* ========= Rendering ========= */
function updateDonut(el, pct, color) {
  if (pct <= 0) {
    el.style.background = `conic-gradient(#e5e7eb 0 100%)`;
    el.textContent = "0%";
    return;
  }
  el.style.background = `conic-gradient(${color} 0 ${pct}%, #e5e7eb ${pct}% 100%)`;
  el.textContent = `${pct}%`;
}

function render() {
  const q = searchInput.value.trim().toLowerCase();
  const sortKey = sortSelect.value;

  const priorityRank = { High: 0, Mid: 1, Low: 2 };

  const sorted = [...tasks]
    .sort((a, b) => {
      if (sortKey === "createdDesc") return (b.createdAt || 0) - (a.createdAt || 0);
      if (sortKey === "createdAsc") return (a.createdAt || 0) - (b.createdAt || 0);
      if (sortKey === "dueAsc") return (a.dueAt || Infinity) - (b.dueAt || Infinity);
      if (sortKey === "dueDesc") return (b.dueAt || -Infinity) - (a.dueAt || -Infinity);
      if (sortKey === "priority") return priorityRank[a.priority] - priorityRank[b.priority];
      return 0;
    })
    .filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
    );

  const dones = sorted.filter((t) => t.status === "done");
  const others = sorted.filter((t) => t.status !== "done");

  todoCount.textContent = `(${others.length})`;
  doneCount.textContent = `(${dones.length})`;
  delCount.textContent = `(${deleted.length})`;

  todoList.replaceChildren(...others.map(taskCard));
  doneList.replaceChildren(...dones.map(taskCardCompact));
  deletedList.replaceChildren(...deleted.map(deletedCard));

  const total = tasks.length;
  const cDone = tasks.filter((t) => t.status === "done").length;
  const cProg = tasks.filter((t) => t.status === "in_progress").length;
  const cNot = tasks.filter((t) => t.status === "not_started").length;

  if (total === 0) {
    updateDonut(donutDone, 0, "var(--ok)");
    updateDonut(donutProg, 0, "var(--prog)");
    updateDonut(donutNot, 0, "var(--not)");
  } else {
    const pct = (n) => Math.round((n / total) * 100);
    updateDonut(donutDone, pct(cDone), "var(--ok)");
    updateDonut(donutProg, pct(cProg), "var(--prog)");
    updateDonut(donutNot, pct(cNot), "var(--not)");
  }
}

function taskCard(t) {
  const li = document.createElement("li");
  li.className = "card";
  li.innerHTML = `
    <div class="card-head">
      <div class="task-title">
        <span class="dot ${t.priority.toLowerCase()}"></span>
        <span>${escapeHTML(t.title)}</span>
      </div>
      <div class="card-actions">
        <button class="btn">${t.status === "in_progress" ? "Stop" : "Start"}</button>
        <button class="btn check">${t.status === "done" ? "Undo" : "Done"}</button>
        <button class="btn">Edit</button>
        <button class="btn danger">Delete</button>
      </div>
    </div>
    ${t.description ? `<div class="desc">${escapeHTML(t.description)}</div>` : ""}
    <div class="meta">
      <span class="badge">Priority: <strong>${t.priority}</strong></span>
      <span class="badge">Added: ${formatDate(t.createdAt)}</span>
      <span class="badge">Due: ${
        t.dueAt ? formatDate(t.dueAt) : t.dueText || "—"
      }</span>
      ${
        t.status === "done"
          ? `<span class="badge done">Status: Done</span>`
          : t.status === "in_progress"
          ? `<span class="badge progress">Status: In Progress</span>`
          : `<span class="badge nstart">Status: Not Started</span>`
      }
    </div>
  `;

  const [btnStart, btnDone, btnEdit, btnDel] = li.querySelectorAll(".card-actions .btn");

  btnStart.addEventListener("click", async () => {
    const next = t.status === "in_progress" ? "not_started" : "in_progress";
    await updateTask(t.id, { status: next });
  });

  btnDone.addEventListener("click", async () => {
    const next = t.status === "done" ? "not_started" : "done";
    await updateTask(t.id, { status: next });
  });

  btnEdit.addEventListener("click", () => openDialogFor(t));

  btnDel.addEventListener("click", async () => {
    if (!confirm("Delete this task?")) return;
    lastDeleted = { task: structuredClone(t) };
    await softDelete(t.id);
    showToast("Task moved to Deleted.");
  });

  return li;
}

function taskCardCompact(t) {
  const li = document.createElement("li");
  li.className = "card";
  li.innerHTML = `
    <div class="card-head">
      <div class="task-title">
        <span class="dot ${t.priority.toLowerCase()}"></span>
        <span>${escapeHTML(t.title)}</span>
      </div>
      <div class="card-actions">
        <button class="btn check">Undo</button>
        <button class="btn danger">Delete</button>
      </div>
    </div>
    <div class="meta">
      <span class="badge done">Completed</span>
      <span class="badge">Added: ${formatDate(t.createdAt)}</span>
      <span class="badge">Due: ${
        t.dueAt ? formatDate(t.dueAt) : t.dueText || "—"
      }</span>
    </div>
  `;

  const [btnUndo, btnDel] = li.querySelectorAll(".card-actions .btn");

  btnUndo.addEventListener("click", async () => {
    await updateTask(t.id, { status: "not_started" });
  });

  btnDel.addEventListener("click", async () => {
    if (!confirm("Delete this task?")) return;
    lastDeleted = { task: structuredClone(t) };
    await softDelete(t.id);
    showToast("Task moved to Deleted.");
  });

  return li;
}

function deletedCard(t) {
  const li = document.createElement("li");
  li.className = "card";
  li.innerHTML = `
    <div class="card-head">
      <div class="task-title">
        <span class="dot ${t.priority?.toLowerCase() || "low"}"></span>
        <span>${escapeHTML(t.title)}</span>
      </div>
      <div class="card-actions">
        <button class="btn">Restore</button>
        <button class="btn danger">Purge</button>
      </div>
    </div>
    <div class="meta">
      <span class="badge">Deleted: ${formatDate(t.deletedAt)}</span>
    </div>
  `;

  const [btnRestore, btnPurge] = li.querySelectorAll(".card-actions .btn");

  btnRestore.addEventListener("click", async () => {
    await restoreTask(t.id);
    showToast("Task restored.");
  });

  btnPurge.addEventListener("click", async () => {
    if (!confirm("Permanently delete this task?")) return;
    await purgeTask(t.id);
    showToast("Task permanently removed.");
  });

  return li;
}

/* ========= Dialog ========= */
function openDialogFor(task = null) {
  dialog.showModal();
  form.reset();

  idInput.value = task ? task.id : "";
  document.getElementById("dialogTitle").textContent = task ? "Edit Task" : "Add Task";

  if (task) {
    titleInput.value = task.title;
    descInput.value = task.description || "";
    priorityInput.value = task.priority || "Mid";

    if (task.dueAt) {
      const d = new Date(task.dueAt);
      dateInput.value = d.toISOString().slice(0, 10);
      timeInput.value = d.toTimeString().slice(0, 5);
    }

    dueTextInput.value = task.dueText || "";
  }
}

addTaskBtn.addEventListener("click", () => openDialogFor());
cancelDialog.addEventListener("click", () => dialog.close());

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = idInput.value || null;
  const dueAt = combineDue(dateInput.value, timeInput.value);
  const base = id ? tasks.find((t) => t.id === id) : null;

  const payload = {
    userId: authUser.uid,
    title: titleInput.value.trim(),
    description: (descInput.value || "").trim() || null,
    priority: priorityInput.value,
    createdAt: base ? base.createdAt : Date.now(),
    dueAt: dueAt ? dueAt.getTime() : null,
    dueText: (dueTextInput.value || "").trim() || null,
    status: base ? base.status : "not_started",
    isDeleted: false,
    deletedAt: null,
  };

  if (!payload.title) {
    showToast("Please enter a title.");
    return;
  }

  saveBtn.disabled = true;
  const oldText = saveBtn.textContent;
  saveBtn.textContent = "Saving…";

  try {
    if (id) {
      await updateTask(id, payload);
    } else {
      await createTask(payload);
    }
    dialog.close();
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = oldText;
  }
});

/* ========= Toast & undo ========= */
function showToast(msg) {
  toastMsg.textContent = msg;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.hidden = true), 5000);
}

undoBtn.addEventListener("click", async () => {
  if (!lastDeleted) {
    toast.hidden = true;
    return;
  }
  await restoreTask(lastDeleted.task.id);
  lastDeleted = null;
  toast.hidden = true;
});

/* ========= Misc ========= */
sortSelect.addEventListener("change", render);
searchInput.addEventListener("input", render);

todayLabel.textContent = new Date().toLocaleString([], {
  weekday: "long",
  year: "numeric",
  month: "short",
  day: "2-digit",
});

/* ========= Auth gate + realtime subscription ========= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    await signInAnonymously(auth);
    return; // will fire again with user
  }

  authUser = user;

  // Show local “display name” from login.html
  profileName.textContent = currentUser;
  displayName.textContent = first(currentUser);
  avatar.textContent = initials(currentUser);

  // Live query all tasks for this uid
  const qUser = query(tasksCol, where("userId", "==", authUser.uid));
  onSnapshot(qUser, (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    tasks = all.filter((x) => !x.isDeleted);
    deleted = all.filter((x) => x.isDeleted);
    render();
  });
});

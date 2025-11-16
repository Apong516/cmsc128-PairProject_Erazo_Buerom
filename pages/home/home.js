/* ========= Firebase (CDN modules) ========= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { 
  getAuth,
  onAuthStateChanged,
  signOut
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
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { firebaseConfig } from '/secrets.js';

// sanity check for runtime config
if (!firebaseConfig || typeof firebaseConfig !== 'object') {
  console.error('Missing or invalid firebaseConfig in /secrets.js');
  throw new Error('Missing firebaseConfig');
}

const appFB = initializeApp(firebaseConfig);
const auth = getAuth(appFB);
const db = getFirestore(appFB);
const tasksCol = collection(db, "tasks");

/* Local profile */
const USER_KEY='todo.user.v1';
const USER_EMAIL_KEY='todo.email.v1';
const USER_PHOTO_KEY='todo.photo.v1';
// Read a cached name for UI placeholders — do NOT treat this as an auth gate.
let currentUser = localStorage.getItem(USER_KEY) || '';

// Hide the app UI until we confirm the Firebase auth state. This prevents
// unauthenticated visitors from seeing the dashboard when auth hasn't been
// verified yet (avoids relying solely on localStorage which can be stale).
try { document.body.style.visibility = 'hidden'; } catch (e) {}

/* els */
let authUser = null, tasks = [], deleted = [], toastTimer = null;
const $ = s => document.querySelector(s);

const topbarToggle = $('#topbarToggle'), logoutBtn = $('#logoutBtn');
const displayName = $('#displayName');
const profileNameTop = $('#profileNameTop'), profileEmail = $('#profileEmail');
const avatarInitials = $('#avatarInitials'), profilePhoto = $('#profilePhoto');
const photoInput = $('#photoInput'), photoHolder = $('#photoHolder'), clearPhotoBtn = $('#clearPhotoBtn');
const todoList = $('#todoList'), doneList = $('#doneList'), deletedList = $('#deletedList');
const todoCount = $('#todoCount'), doneCount = $('#doneCount'), delCount = $('#delCount');
const donutDone = $('#donutDone'), donutProg = $('#donutProg'), donutNot = $('#donutNot');
const sortSelect = $('#sortSelect'), searchInput = $('#searchInput');
//const todayLabel = $('#todayLabel'), clockLabel = $('#clockLabel');
const dialog = $('#taskDialog'), form = $('#taskForm');
const saveBtn = $('#saveTaskBtn');
const idInput = $('#idInput'), titleInput = $('#titleInput'), descInput = $('#descInput');
const priorityInput = $('#priorityInput'), dateInput = $('#dateInput'), timeInput = $('#timeInput'), dueTextInput = $('#dueTextInput');
const cancelDialog = $('#cancelDialog');
const toast = $('#toast'), toastMsg = $('#toastMsg'), undoBtn = $('#undoBtn');
// Defensive: ensure toast is hidden on load. Some build/tooling or page loads
// may remove the `hidden` attribute; explicitly set it here to guarantee state.
if (toast) try { toast.hidden = true; } catch (e) {}

/* helpers */
const initials = (name='Guest') => name.trim().split(/\s+/).map(s=>s[0]||'').join('').slice(0,2).toUpperCase() || 'G';
const first = (name='Friend') => name.trim().split(/\s+/)[0] || 'Friend';
function combineDue(d,t){ if(!d && !t) return null; const iso=d||new Date().toISOString().slice(0,10); const tt=t||'00:00'; return new Date(`${iso}T${tt}:00`); }
function formatDate(x){ if(!x) return '—'; const d=(x instanceof Date)?x:new Date(x); return d.toLocaleString([], {timeZone:'Asia/Manila', year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'}); }
const escapeHTML = s => (s||'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;'}[m]));
function statusLabel(s){ return s==='in_progress'?'In Progress': s==='done'?'Done':'Not Started'; }

/* clock 
function updateClock(){
  const now = new Date();
  todayLabel.textContent = now.toLocaleString([], { timeZone:'Asia/Manila', weekday:'long', year:'numeric', month:'short', day:'2-digit' });
  clockLabel.textContent = now.toLocaleTimeString([], { timeZone:'Asia/Manila', hour:'2-digit', minute:'2-digit', second:'2-digit' });
}
updateClock(); setInterval(updateClock, 1000); */

/* sidebar toggle + scroll top */
function scrollToTop(){ const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; window.scrollTo({top:0,behavior:reduce?'auto':'smooth'}); }
const toggleSidebar = ()=> document.body.classList.toggle('sidebar-collapsed');
topbarToggle.addEventListener('click', ()=>{ toggleSidebar(); scrollToTop(); });

/* profile name/email */
profileNameTop.textContent = currentUser;
displayName.textContent = first(currentUser);
profileEmail.textContent = localStorage.getItem(USER_EMAIL_KEY) || '';

/* Photo UI helpers */
function updatePhotoUI(){
  const hasPhoto = !!localStorage.getItem(USER_PHOTO_KEY);
  if (hasPhoto){
    profilePhoto.hidden = false;
    avatarInitials.style.display = 'none';
    clearPhotoBtn.hidden = false;
  } else {
    profilePhoto.hidden = true;
    avatarInitials.style.display = 'grid';
    clearPhotoBtn.hidden = true;
  }
}
avatarInitials.textContent = initials(currentUser);
const savedPhoto = localStorage.getItem(USER_PHOTO_KEY);
if (savedPhoto){ profilePhoto.src = savedPhoto; }
updatePhotoUI();

/* change/remove photo */
photoHolder.addEventListener('click', (e)=>{
  if (e.target === clearPhotoBtn) return;
  e.preventDefault(); e.stopPropagation();
  photoInput.click();
});
photoInput.addEventListener('change', async (e)=>{
  const file = e.target.files?.[0]; if(!file) return;
  const resized = await resizeImageFile(file, 256, 256, 0.85);
  localStorage.setItem(USER_PHOTO_KEY, resized);
  profilePhoto.src = resized;
  updatePhotoUI();
});
clearPhotoBtn.addEventListener('click', (e)=>{
  e.stopPropagation();
  localStorage.removeItem(USER_PHOTO_KEY);
  profilePhoto.src = '';
  updatePhotoUI();
});
function resizeImageFile(file, maxW, maxH, quality=0.9){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = ()=>{
      const ratio = Math.min(maxW/img.width, maxH/img.height, 1);
      const w = Math.round(img.width*ratio), h = Math.round(img.height*ratio);
      const c = document.createElement('canvas'); c.width=w; c.height=h;
      const ctx = c.getContext('2d'); ctx.drawImage(img,0,0,w,h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/* logout */
logoutBtn.addEventListener('click', async ()=>{
  if (!confirm('Log out?')) return;
  // Remove all local UI caches tied to the current user session.
  try { localStorage.removeItem(USER_KEY); } catch (e) {}
  try { localStorage.removeItem(USER_EMAIL_KEY); } catch (e) {}
  try { localStorage.removeItem(USER_PHOTO_KEY); } catch (e) {}
  try { await signOut(auth); } catch (e) { /* ignore sign-out errors */ }
  // Send user back to the in-repo login page under `pages/login/`.
  window.location.href = '../login/login.html';
});

/* Firestore CRUD */
async function createTask(t){ const ref = await addDoc(tasksCol, t); return { id: ref.id, ...t }; }
async function updateTask(id, patch){ await updateDoc(doc(db,'tasks',id), patch); }
async function softDelete(id){ await updateDoc(doc(db,'tasks',id), { isDeleted:true, deletedAt:Date.now() }); }
async function restoreTask(id){ await updateDoc(doc(db,'tasks',id), { isDeleted:false, deletedAt:null }); }
async function purgeTask(id){ await deleteDoc(doc(db,'tasks',id)); }

/* rendering */
function updateDonut(el, pct, color){
  if (pct <= 0){ el.style.background = `conic-gradient(#e5e7eb 0 100%)`; el.textContent = "0%"; }
  else { el.style.background = `conic-gradient(${color} 0 ${pct}%, #e5e7eb ${pct}% 100%)`; el.textContent = `${pct}%`; }
}
function render(){
  const q = searchInput.value.trim().toLowerCase();
  const s = sortSelect.value;

  const sorted = [...tasks].sort((a,b)=>{
    if(s==='createdDesc') return (b.createdAt||0)-(a.createdAt||0);
    if(s==='createdAsc')  return (a.createdAt||0)-(b.createdAt||0);
    if(s==='dueAsc')      return (a.dueAt||Infinity)-(b.dueAt||Infinity);
    if(s==='dueDesc')     return (b.dueAt||-Infinity)-(a.dueAt||-Infinity);
    if(s==='priority')    return ({High:0,Mid:1,Low:2}[a.priority]-({High:0,Mid:1,Low:2}[b.priority]));
    return 0;
  }).filter(t => t.title.toLowerCase().includes(q) || (t.description||'').toLowerCase().includes(q));

  const dones = sorted.filter(t=>t.status==='done');
  const others = sorted.filter(t=>t.status!=='done');

  todoCount.textContent = `(${others.length})`;
  doneCount.textContent = `(${dones.length})`;
  delCount.textContent  = `(${deleted.length})`;

  todoList.replaceChildren(...others.map(taskCard));
  doneList.replaceChildren(...dones.map(taskCardCompact));
  deletedList.replaceChildren(...deleted.map(deletedCard));

  const total = tasks.length;
  const cDone = tasks.filter(t=>t.status==='done').length;
  const cProg = tasks.filter(t=>t.status==='in_progress').length;
  const cNot  = tasks.filter(t=>t.status==='not_started').length;

  if (total === 0){
    updateDonut(donutDone, 0, 'var(--ok)');
    updateDonut(donutProg, 0, 'var(--prog)');
    updateDonut(donutNot,  0, 'var(--not)');
  } else {
    const pct = n => Math.round(n/total*100);
    updateDonut(donutDone, pct(cDone), 'var(--ok)');
    updateDonut(donutProg, pct(cProg), 'var(--prog)');
    updateDonut(donutNot,  pct(cNot),  'var(--not)');
  }
}
function taskCard(t){
  const li = document.createElement('li');
  li.className='card';
  li.innerHTML = `
    <div class="card-head">
      <div class="task-title"><span class="dot ${t.priority.toLowerCase()}"></span><span>${escapeHTML(t.title)}</span></div>
      <div class="card-actions">
        <button class="btn">${t.status==='in_progress'? 'Stop':'Start'}</button>
        <button class="btn check">${t.status==='done'? 'Undo':'Done'}</button>
        <button class="btn">Edit</button>
        <button class="btn danger">Delete</button>
      </div>
    </div>
    ${t.description?`<div class="desc">${escapeHTML(t.description)}</div>`:''}
    <div class="meta">
      <span class="badge">Priority: <strong>${t.priority}</strong></span>
      <span class="badge">Added: ${formatDate(t.createdAt)}</span>
      <span class="badge">Due: ${t.dueAt?formatDate(t.dueAt):(t.dueText||'—')}</span>
      ${t.status==='done' ? `<span class="badge done">Status: Done</span>` :
        t.status==='in_progress' ? `<span class="badge progress">Status: In Progress</span>` :
        `<span class="badge nstart">Status: Not Started</span>`}
    </div>`;

  const [btnStart,btnDone,btnEdit,btnDel] = li.querySelectorAll('.card-actions .btn');

  btnStart.addEventListener('click', async ()=>{
    const prev = t.status;
    const next = (t.status==='in_progress') ? 'not_started' : 'in_progress';
    await updateTask(t.id, {status: next});
    showToast(`Task status: ${statusLabel(next)}`, { undoText:'Undo', onUndo:()=>updateTask(t.id,{status:prev}) });
  });

  btnDone.addEventListener('click', async ()=>{
    const prev = t.status;
    const next = (t.status==='done') ? 'not_started' : 'done';
    await updateTask(t.id, {status: next});
    showToast(`Task status: ${statusLabel(next)}`, { undoText:'Undo', onUndo:()=>updateTask(t.id,{status:prev}) });
  });

  btnEdit.addEventListener('click',()=>openDialogFor(t));

  btnDel.addEventListener('click', async ()=>{
    if(!confirm('Delete this task?')) return;
    await softDelete(t.id);
    showToast('Task moved to Deleted.', { undoText:'Undo', onUndo:()=>restoreTask(t.id) });
  });

  return li;
}
function taskCardCompact(t){
  const li = document.createElement('li');
  li.className='card';
  li.innerHTML = `
    <div class="card-head">
      <div class="task-title"><span class="dot ${t.priority.toLowerCase()}"></span><span>${escapeHTML(t.title)}</span></div>
      <div class="card-actions">
        <button class="btn check">Undo</button>
        <button class="btn danger">Delete</button>
      </div>
    </div>
    <div class="meta">
      <span class="badge done">Completed</span>
      <span class="badge">Added: ${formatDate(t.createdAt)}</span>
      <span class="badge">Due: ${t.dueAt?formatDate(t.dueAt):(t.dueText||'—')}</span>
    </div>`;
  const [btnUndo,btnDel] = li.querySelectorAll('.card-actions .btn');

  btnUndo.addEventListener('click', async ()=>{
    const prev = t.status;
    await updateTask(t.id,{status:'not_started'});
    showToast('Task status: Not Started', { undoText:'Undo', onUndo:()=>updateTask(t.id,{status:prev}) });
  });

  btnDel.addEventListener('click', async ()=>{
    if(!confirm('Delete this task?')) return;
    await softDelete(t.id);
    showToast('Task moved to Deleted.', { undoText:'Undo', onUndo:()=>restoreTask(t.id) });
  });

  return li;
}
function deletedCard(t){
  const li = document.createElement('li');
  li.className = 'card';
  li.innerHTML = `
    <div class="card-head">
      <div class="task-title"><span class="dot ${t.priority?.toLowerCase()||'low'}"></span><span>${escapeHTML(t.title)}</span></div>
      <div class="card-actions">
        <button class="btn">Restore</button>
        <button class="btn danger">Purge</button>
      </div>
    </div>
    <div class="meta">
      <span class="badge">Deleted: ${formatDate(t.deletedAt)}</span>
    </div>`;
  const [btnRestore, btnPurge] = li.querySelectorAll('.card-actions .btn');

  btnRestore.addEventListener('click', async ()=>{ await restoreTask(t.id); showToast('Task restored.'); });
  btnPurge.addEventListener('click', async ()=>{ if(!confirm('Permanently delete this task?')) return; await purgeTask(t.id); showToast('Task permanently removed.'); });

  return li;
}

/* dialog */
function openDialogFor(task=null){
  dialog.showModal(); form.reset();
  idInput.value = task ? task.id : '';
  document.getElementById('dialogTitle').textContent = task ? 'Edit Task' : 'Add Task';
  if(task){
    titleInput.value = task.title; descInput.value = task.description||''; priorityInput.value = task.priority||'Mid';
    if(task.dueAt){ const d=new Date(task.dueAt); dateInput.value=d.toISOString().slice(0,10); timeInput.value=d.toTimeString().slice(0,5); }
    dueTextInput.value = task.dueText||'';
  }
}

// Add task button + quick keyboard affordance
const addTaskBtn = $('#addTaskBtn');
if (addTaskBtn) addTaskBtn.addEventListener('click', () => openDialogFor());
searchInput.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter' && !searchInput.value.trim()) {
    e.preventDefault();
    openDialogFor();
  }
});

cancelDialog.addEventListener('click',()=>dialog.close());

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const id = idInput.value || null;
  const dueAt = combineDue(dateInput.value, timeInput.value);
  const base = id ? tasks.find(t=>t.id===id) : null;

  const payload = {
    userId: authUser.uid,
    title: titleInput.value.trim(),
    description: (descInput.value || "").trim() || null,
    priority: priorityInput.value,
    createdAt: base ? base.createdAt : Date.now(),
    dueAt: dueAt ? dueAt.getTime() : null,
    dueText: (dueTextInput.value || "").trim() || null,
    status: base ? base.status : 'not_started',
    isDeleted: false,
    deletedAt: null
  };

  if(!payload.title){ showToast('Please enter a title.'); return; }

  saveBtn.disabled = true; const oldText = saveBtn.textContent; saveBtn.textContent = 'Saving…';
  try{
    if (id) { await updateTask(id, payload); showToast('Task updated.'); }
    else { await createTask(payload); showToast('Task added.'); }
    dialog.close();
  } finally { saveBtn.disabled = false; saveBtn.textContent = oldText; }
});

/* toast */
function showToast(msg, opts={}){
  // Toast pop-ups are intentionally disabled (redundant UX).
  // Keep calls safe and log suppressed messages for debugging.
  try { console.debug('[toast suppressed] ', msg, opts); } catch (e) {}
  // No UI changes performed.
  return;
}
toast?.addEventListener('click', (e)=>{ if (e.target !== undoBtn) toast.hidden = true; });

/* sort/search */
sortSelect.addEventListener('change', render);
searchInput.addEventListener('input', render);

/* auth + realtime */
let __authChecked = false;
onAuthStateChanged(auth, (user) => {
  __authChecked = true;
  // If there's no authenticated Firebase user, redirect to login.
  // We intentionally do NOT sign in anonymously here so the app requires a real user session.
  if (!user) { window.location.href = '../login/login.html'; return; }

  // Mirror Firebase user into localStorage so the rest of the UI (which reads USER_KEY)
  // remains in sync even if the page was loaded directly after sign-in.
  const fallbackName = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
  try { localStorage.setItem(USER_KEY, fallbackName); } catch (e) {}
  try { localStorage.setItem(USER_EMAIL_KEY, user.email || ''); } catch (e) {}
  authUser = user;
  currentUser = fallbackName;

  profileNameTop.textContent = currentUser;
  displayName.textContent = first(currentUser);
  avatarInitials.textContent = initials(currentUser);

  // Auth verified — show the app UI.
  try { document.body.style.visibility = ''; } catch (e) {}

  const qUser = query(tasksCol, where('userId','==', authUser.uid));
  onSnapshot(qUser, (snap) => {
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    tasks = all.filter(x => !x.isDeleted);
    deleted = all.filter(x => x.isDeleted);
    render();
  });
});

// If auth hasn't been resolved quickly, and there's no currentUser, force a redirect
// to the login page. This prevents exposing the UI when the listener hasn't fired
// (network delays or SDK init delays). The delay is short to avoid flicker.
setTimeout(() => {
  try {
    if (!__authChecked && !auth.currentUser) {
      // If auth still unresolved, redirect to the in-repo login page
      window.location.href = '../login/login.html';
    }
  } catch (e) {
    // ignore
  }
}, 1200);
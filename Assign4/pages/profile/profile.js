// pages/profile/profile.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { firebaseConfig } from "/secrets.js";
import {
  getAuth,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const USER_KEY = "todo.user.v1";
const USER_EMAIL_KEY = "todo.email.v1";
const USER_PHOTO_KEY = "todo.photo.v1";
// Per-user cached handle
const handleKey = (uid) => `todo.handle.v1.${uid}`;

/* ---------- Elements ---------- */
const profileForm = document.getElementById("profileForm");
const pwdForm = document.getElementById("pwdForm");

const nameEl = document.getElementById("name");
const usernameEl = document.getElementById("username");
const emailEl = document.getElementById("email");
const nameMsg = document.getElementById("nameMsg");
const usernameMsg = document.getElementById("usernameMsg");
const saveBtn = document.getElementById("saveBtn");
const msgInfo = document.getElementById("msgInfo");
const msgErr = document.getElementById("msgErr");

const newPwdEl = document.getElementById("newPwd");
const confirmPwdEl = document.getElementById("confirmPwd");
const pwdBtn = document.getElementById("pwdBtn");
const pwdOk = document.getElementById("pwdOk");
const pwdErr = document.getElementById("pwdErr");
const pwdMsg = document.getElementById("pwdMsg");
const confirmPwdMsg = document.getElementById("confirmPwdMsg");
const strengthFill = document.getElementById("strengthFill");
const strengthLabel = document.getElementById("strengthLabel");

const reauthPanel = document.getElementById("reauthPanel");
const reauthForm = document.getElementById("reauthForm");
const reauthMsg = document.getElementById("reauthMsg");
const reauthBtn = document.getElementById("reauthBtn");
const cancelReauth = document.getElementById("cancelReauth");
const currentPwdEl = document.getElementById("currentPwd");

/* Avatar */
const avatarInitials = document.getElementById("avatarInitials");
const profilePhoto = document.getElementById("profilePhoto");
const clearPhotoBtn = document.getElementById("clearPhotoBtn");
const replacePhotoBtn = document.getElementById("replacePhotoBtn");
const removePhotoBtn = document.getElementById("removePhotoBtn");
const photoInput = document.getElementById("photoInput");

let user = null;
let pendingAction = null;

/* ---------- Helpers ---------- */
const initials = (name = "User") =>
  name.trim().split(/\s+/).map(s => s[0] || "").join("").slice(0, 2).toUpperCase() || "U";

function scorePassword(pwd) {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 6) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  if (pwd.length >= 10) s++;
  return Math.min(s, 5);
}
function updateStrength() {
  const s = scorePassword(newPwdEl.value);
  const pct = [0, 25, 45, 70, 85, 100][s];
  strengthFill.style.width = pct + "%";
  strengthLabel.textContent = ["Too short", "Weak", "Okay", "Good", "Strong", "Strong"][s];
}

/* resize to square (max 256) */
function resizeImageFile(file, maxW = 256, maxH = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * r), h = Math.round(img.height * r);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function updateAvatarUI() {
  const dataUrl = localStorage.getItem(USER_PHOTO_KEY);
  if (dataUrl) {
    profilePhoto.src = dataUrl;
    profilePhoto.hidden = false;
    avatarInitials.hidden = true;
    clearPhotoBtn.hidden = false;
    removePhotoBtn.hidden = false;
  } else {
    profilePhoto.hidden = true;
    avatarInitials.hidden = false;
    clearPhotoBtn.hidden = true;
    removePhotoBtn.hidden = true;
  }
}

/* ---------- Reauth helpers ---------- */
function showReauth(action) {
  pendingAction = action;
  reauthPanel.classList.remove("hidden");
  reauthMsg.textContent = "";
  currentPwdEl.value = "";
  currentPwdEl.focus();
}
function hideReauth() {
  reauthPanel.classList.add("hidden");
  pendingAction = null;
  reauthMsg.textContent = "";
}
cancelReauth.onclick = hideReauth;

reauthForm.onsubmit = async (e) => {
  e.preventDefault();
  reauthMsg.textContent = "";
  try {
    reauthBtn.disabled = true; reauthBtn.textContent = "Verifying…";
    const cred = EmailAuthProvider.credential(user.email, currentPwdEl.value);
    await reauthenticateWithCredential(user, cred);
    hideReauth();
    if (typeof pendingAction === "function") await pendingAction();
  } catch (ex) {
    reauthMsg.textContent =
      ex.code === "auth/wrong-password" ? "Incorrect password." :
      ex.code === "auth/too-many-requests" ? "Too many attempts. Try again later." :
      ex.message;
  } finally {
    reauthBtn.disabled = false; reauthBtn.textContent = "Confirm";
  }
};

/* ---------- Auth state ---------- */
onAuthStateChanged(auth, async (u) => {
  if (!u) { location.href = "../login/login.html"; return; }
  user = u;

  const display = u.displayName || (u.email ? u.email.split("@")[0] : "User");
  try { localStorage.setItem(USER_KEY, display); } catch {}
  try { localStorage.setItem(USER_EMAIL_KEY, u.email || ""); } catch {}
  if (u.photoURL) { try { localStorage.setItem(USER_PHOTO_KEY, u.photoURL); } catch {} }

  nameEl.value = display;
  emailEl.value = u.email || "";
  avatarInitials.textContent = initials(display);
  updateAvatarUI();

  // Username from Firestore (per-UID cache fallback)
  try {
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data()?.username) {
      const handle = String(snap.data().username || "").toLowerCase();
      usernameEl.value = handle;
      try { localStorage.setItem(handleKey(u.uid), handle); } catch {}
    } else {
      usernameEl.value = localStorage.getItem(handleKey(u.uid)) || "";
    }
  } catch {
    usernameEl.value = localStorage.getItem(handleKey(u.uid)) || "";
  } finally {
    saveBtn.disabled = true;
    pwdBtn.disabled = true;
  }
});

/* ---------- Validate forms ---------- */
function validateProfile() {
  let ok = true;
  if (!nameEl.value.trim()) { nameMsg.textContent = "Enter your name."; ok = false; } else nameMsg.textContent = "";
  if (!usernameEl.value.trim()) { usernameMsg.textContent = "Enter a username."; ok = false; } else usernameMsg.textContent = "";

  const nameChanged = nameEl.value !== (user?.displayName || "");
  const cachedHandle = localStorage.getItem(handleKey(user?.uid || "")) || "";
  const handleChanged = usernameEl.value.trim().toLowerCase() !== cachedHandle;

  saveBtn.disabled = !ok || (!nameChanged && !handleChanged);
  return !saveBtn.disabled;
}
function validatePassword() {
  let ok = true;
  pwdMsg.textContent = newPwdEl.value.length < 6 ? "At least 6 characters." : "";
  if (newPwdEl.value.length < 6) ok = false;
  if (confirmPwdEl.value !== newPwdEl.value) { confirmPwdMsg.textContent = "Passwords do not match."; ok = false; }
  else confirmPwdMsg.textContent = "";
  pwdBtn.disabled = !ok;
  return ok;
}
[nameEl, usernameEl].forEach(el => el.addEventListener("input", validateProfile));
[newPwdEl, confirmPwdEl].forEach(el => el.addEventListener("input", () => { updateStrength(); validatePassword(); }));
updateStrength();

/* ---------- Save profile (name + username) ---------- */
profileForm.onsubmit = async (e) => {
  e.preventDefault(); msgErr.textContent = ""; msgInfo.textContent = "";
  if (!validateProfile()) return;

  const newName = nameEl.value.trim();
  const newHandle = usernameEl.value.trim().toLowerCase(); // enforce lowercase for uniqueness

  saveBtn.disabled = true; saveBtn.textContent = "Saving…";

  const persist = async () => {
    try {
      // Uniqueness check for username (case-insensitive by storing lower-case)
      if (newHandle) {
        const usersCol = collection(db, "users");
        const q = query(usersCol, where("username", "==", newHandle));
        const snaps = await getDocs(q);
        const takenByAnother = snaps.docs.find(d => d.id !== user.uid);
        if (takenByAnother) {
          usernameMsg.textContent = "That username is already taken. Choose another.";
          saveBtn.disabled = false; saveBtn.textContent = "Save changes";
          return;
        }
      }

      // Update Auth displayName if changed
      if (newName !== (user.displayName || "")) {
        await updateProfile(user, { displayName: newName });
      }

      // Persist to Firestore (merge)
      const ref = doc(db, "users", user.uid);
      await setDoc(ref, {
        username: newHandle || "",
        displayName: newName,
        email: user.email || ""
      }, { merge: true });

      // Cache locally per user
      try { localStorage.setItem(USER_KEY, newName || "User"); } catch {}
      try { localStorage.setItem(handleKey(user.uid), newHandle || ""); } catch {}

      msgInfo.textContent = "Profile updated.";
    } catch (ex) {
      if (ex.code === "auth/requires-recent-login") {
        msgErr.textContent = "Please confirm your password to continue.";
        showReauth(persist);
        return;
      }
      msgErr.textContent = ex.message;
    } finally {
      saveBtn.disabled = false; saveBtn.textContent = "Save changes";
    }
  };

  await persist();
};

/* ---------- Change password ---------- */
pwdForm.onsubmit = async (e) => {
  e.preventDefault(); pwdErr.textContent = ""; pwdOk.textContent = "";
  if (!validatePassword()) return;

  const newPwd = newPwdEl.value;

  const doUpdate = async () => {
    try {
      await updatePassword(user, newPwd);
      pwdOk.textContent = "Password updated.";
      newPwdEl.value = ""; confirmPwdEl.value = "";
      updateStrength(); validatePassword();
    } catch (ex) {
      if (ex.code === "auth/requires-recent-login") {
        showReauth(doUpdate);
        return;
      }
      pwdErr.textContent = ex.message;
    }
  };

  // likely needs recent login, so prompt
  showReauth(doUpdate);
};

/* ---------- Avatar: replace/remove ---------- */
function setLocalPhoto(dataUrl) {
  try { localStorage.setItem(USER_PHOTO_KEY, dataUrl || ""); } catch {}
  updateAvatarUI();
}
function clearLocalPhoto() {
  try { localStorage.removeItem(USER_PHOTO_KEY); } catch {}
  updateAvatarUI();
}

replacePhotoBtn?.addEventListener("click", () => photoInput.click());

photoInput?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0]; if (!file) return;
  const resized = await resizeImageFile(file, 256, 256, 0.85);

  // Try to save to Firebase Auth (best effort), but DO NOT prompt for reauth.
  try {
    await updateProfile(user, { photoURL: resized });
  } catch (ex) {
    if (ex?.code !== "auth/requires-recent-login") {
      console.debug("updateProfile(photoURL) error:", ex);
    }
  }

  setLocalPhoto(resized);
  avatarInitials.textContent = initials(nameEl.value || user.displayName || "User");
  e.target.value = "";
});

removePhotoBtn?.addEventListener("click", async () => {
  try { await updateProfile(user, { photoURL: null }); } catch (ex) {
    if (ex?.code !== "auth/requires-recent-login") {
      console.debug("clear photoURL error:", ex);
    }
  }
  clearLocalPhoto();
});

clearPhotoBtn?.addEventListener("click", async (e) => {
  e.stopPropagation();
  try { await updateProfile(user, { photoURL: null }); } catch (ex) {
    if (ex?.code !== "auth/requires-recent-login") {
      console.debug("clear photoURL error:", ex);
    }
  }
  clearLocalPhoto();
});

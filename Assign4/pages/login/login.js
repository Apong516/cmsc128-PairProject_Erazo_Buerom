// pages/login/login.js

// ---------- Firebase (CDN modules) ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { firebaseConfig } from "/secrets.js";

// ---------- Config guard ----------
if (!firebaseConfig || typeof firebaseConfig !== "object") {
  console.error("[Auth] Missing firebaseConfig from /secrets.js");
  const el = document.getElementById("loginMsg");
  if (el) { el.textContent = "Firebase not configured."; el.classList.add("error"); }
  throw new Error("Missing firebaseConfig");
}

const appFB = initializeApp(firebaseConfig);
const auth  = getAuth(appFB);
const db    = getFirestore(appFB);

// ---------- Helpers ----------
const params  = new URLSearchParams(location.search);
const nextUrl = params.get("next")
  ? decodeURIComponent(params.get("next"))
  : "../home/home.html";
const goNext = () => location.replace(nextUrl);

const USER_KEY       = "todo.user.v1";
const USER_EMAIL_KEY = "todo.email.v1";

function setFieldError(el, msg) {
  if (!el) return;
  el.textContent = msg || "";
  el.classList.add("error");
  const field =
    el.previousElementSibling?.classList?.contains("field")
      ? el.previousElementSibling
      : el.closest(".input-group")?.querySelector(".field");
  field?.classList.add("error");
}

function clearErrors() {
  [userErrEl, passErrEl, msgEl].forEach(el => {
    if (!el) return;
    el.textContent = "";
    el.classList.remove("error","success");
  });
  document.querySelectorAll(".field.error").forEach(f => f.classList.remove("error"));
}

// Try to resolve username -> email (may fail if Firestore rules disallow reads)
async function resolveUsernameToEmail(username) {
  const usersCol = collection(db, "users");
  const q        = query(usersCol, where("username", "==", username));
  const snaps    = await getDocs(q); // may throw PERMISSION_DENIED if rules block
  if (snaps.empty) return null;
  const data = snaps.docs[0].data();
  return (data && data.email) ? String(data.email) : null;
}

// ---------- UI wiring ----------
const pw          = document.getElementById("loginPassword");
const togglePwBtn = document.getElementById("toggleLoginPw");
if (pw && togglePwBtn) {
  togglePwBtn.onclick = () => {
    const isPw = pw.type === "password";
    pw.type = isPw ? "text" : "password";
    togglePwBtn.textContent = isPw ? "HIDE" : "SHOW";
    togglePwBtn.setAttribute("aria-label", isPw ? "Hide password" : "Show password");
  };
}

// Switch panels (login <-> recover)
const panels = {
  login:   document.getElementById("panel-login"),
  recover: document.getElementById("panel-recover"),
};

function showTab(name) {
  Object.entries(panels).forEach(([k, p]) => {
    if (!p) return;
    const active = k === name;
    p.classList.toggle("hidden", !active);
    p.setAttribute("aria-hidden", String(!active));
  });
  const forgotBtn = document.getElementById("forgotBtn");
  if (forgotBtn) forgotBtn.setAttribute("aria-expanded", String(name === "recover"));
  if (name === "recover") document.getElementById("recoverEmail")?.focus();
}

document.getElementById("forgotBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  showTab("recover");
});
document.querySelectorAll(".link-login").forEach(b =>
  b.addEventListener("click", (e) => { e.preventDefault(); showTab("login"); })
);

// ---------- Auto redirect if already signed in ----------
onAuthStateChanged(auth, (u) => {
  if (!u) return;
  try { localStorage.setItem(USER_KEY, u.displayName || "User"); } catch {}
  try { localStorage.setItem(USER_EMAIL_KEY, u.email || ""); } catch {}
  goNext();
});

// ---------- Recover flow ----------
const recoverForm  = document.getElementById("recoverForm");
const recoverEmail = document.getElementById("recoverEmail");
const recoverMsg   = document.getElementById("recoverMsg");

if (recoverForm) {
  recoverForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    recoverMsg.textContent = ""; recoverMsg.classList.remove("error","success");
    const email = (recoverEmail?.value || "").trim().toLowerCase();
    if (!email) { recoverMsg.textContent = "Enter your email."; recoverMsg.classList.add("error"); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      recoverMsg.textContent = "Reset link sent. Check your inbox (and spam).";
      recoverMsg.classList.add("success");
      setTimeout(() => showTab("login"), 1200);
    } catch (ex) {
      console.error("[Recover]", ex);
      const map = {
        "auth/invalid-email":       "That email looks invalid.",
        "auth/user-not-found":      "No account with that email.",
        "auth/too-many-requests":   "Too many attempts. Try again later.",
        "auth/unauthorized-domain": "This domain is not authorized in Firebase."
      };
      recoverMsg.textContent = map[ex.code] || ex.message || "Unable to send reset link.";
      recoverMsg.classList.add("error");
      recoverEmail?.focus();
    }
  });
}

// ---------- Sign-in flow ----------
const form      = document.getElementById("loginForm");
const idEl      = document.getElementById("loginId");
const pwdEl     = document.getElementById("loginPassword");
const msgEl     = document.getElementById("loginMsg");
const userErrEl = document.getElementById("loginUserError");
const passErrEl = document.getElementById("loginPassError");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const identifier = (idEl?.value || "").trim();
    const pwd        = (pwdEl?.value || "");

    if (!identifier) { setFieldError(userErrEl, "Enter your email or username."); idEl?.focus(); return; }
    if (!pwd)        { setFieldError(passErrEl, "Enter your password.");        pwdEl?.focus(); return; }

    try { await setPersistence(auth, browserSessionPersistence); } catch {}

    try {
      // Resolve to email (supports username OR email login)
      let email = "";
      if (identifier.includes("@")) {
        email = identifier.toLowerCase();
        try { await fetchSignInMethodsForEmail(auth, email); } catch {}
      } else {
        try {
          email = await resolveUsernameToEmail(identifier);
          if (!email) {
            setFieldError(userErrEl, "User not found. Try your email address.");
            idEl?.focus();
            return;
          }
        } catch (usernameErr) {
          console.warn("[Username lookup blocked or failed]", usernameErr);
          setFieldError(userErrEl, "Username lookup is unavailable. Please sign in with your email address.");
          idEl?.focus();
          return;
        }
      }

      const result = await signInWithEmailAndPassword(auth, email, pwd);
      const u = result.user;
      try { localStorage.setItem(USER_KEY, u.displayName || "User"); } catch {}
      try { localStorage.setItem(USER_EMAIL_KEY, u.email || ""); } catch {}

      goNext();
    } catch (err) {
      console.error("[Sign-in]", err);
      const code = err?.code || "";
      const map = {
        "auth/wrong-password":      "Incorrect password.",
        "auth/invalid-credential":  "Incorrect email or password.",
        "auth/user-not-found":      "Email not found.",
        "auth/invalid-email":       "Invalid email address.",
        "auth/unauthorized-domain": "This domain is not authorized in Firebase Authentication settings."
      };
      msgEl.textContent = map[code] || (err.message || "Login failed.");
      msgEl.classList.add("error");
    }
  });
}

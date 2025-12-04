// ========= Firebase setup =========
import { firebaseConfig } from "/secrets.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ========= Elements =========
const form = document.getElementById("signupForm");
const nameEl = document.getElementById("name");
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const confEl = document.getElementById("confirm");
const submitBtn = document.getElementById("submitBtn");
const msg = document.getElementById("msg");

const nameMsg = document.getElementById("nameMsg");
const emailMsg = document.getElementById("emailMsg");
const passMsg = document.getElementById("passMsg");
const confirmMsg = document.getElementById("confirmMsg");

const strengthFill = document.getElementById("strengthFill");
const strengthLabel = document.getElementById("strengthLabel");

// ========= Password Strength =========
function scorePassword(pwd) {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 6) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  if (pwd.length >= 10) s++;
  const blacklist = ["password", "qwerty", "123456", "111111", "abc123", "letmein", "iloveyou"];
  if (blacklist.includes(pwd.toLowerCase())) s = Math.min(s, 1);
  return Math.min(s, 5);
}

function updateStrength() {
  const s = scorePassword(passEl.value);
  const widths = [0, 25, 45, 70, 85, 100];
  strengthFill.style.width = widths[s] + "%";
  strengthLabel.textContent = ["Too short", "Weak", "Okay", "Good", "Strong", "Strong"][s];
}

// ========= Validation =========
function validate(showErrors = false) {
  let ok = true;

  if (!nameEl.value.trim()) {
    if (showErrors) nameMsg.textContent = "Please enter your name.";
    ok = false;
  } else nameMsg.textContent = "";

  if (!emailEl.value.trim() || !emailEl.validity.valid) {
    if (showErrors) emailMsg.textContent = "Enter a valid email address.";
    ok = false;
  } else emailMsg.textContent = "";

  if (passEl.value.length < 6) {
    if (showErrors) passMsg.textContent = "Password must be at least 6 characters.";
    ok = false;
  } else passMsg.textContent = "";

  if (confEl.value !== passEl.value || !confEl.value) {
    if (showErrors) confirmMsg.textContent = "Passwords do not match.";
    ok = false;
  } else confirmMsg.textContent = "";

  submitBtn.disabled = !ok;
  return ok;
}

// ========= Live Listeners =========
[nameEl, emailEl, passEl, confEl].forEach((el) => {
  el.addEventListener("input", () => {
    updateStrength();
    validate(false);
  });
});

updateStrength();
validate(false);

// ========= Submit =========
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const ok = validate(true);
  if (!ok) return;

  const name = nameEl.value.trim();
  const email = emailEl.value.trim();
  const pwd = passEl.value;

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating…";
  msg.textContent = "";

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pwd);
    await updateProfile(cred.user, { displayName: name });

    localStorage.setItem("todo.user.v1", cred.user.displayName || name);
    localStorage.setItem("todo.email.v1", cred.user.email || email);

    window.location.href = "../home/home.html";
  } catch (err) {
    console.error("Signup error:", err);
    const map = {
      "auth/email-already-in-use": "This email already has an account.",
      "auth/invalid-email": "That email looks invalid.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/operation-not-allowed": "Enable Email/Password in Firebase → Authentication.",
      "auth/unauthorized-domain": "Add your domain in Firebase → Authentication → Authorized domains."
    };
    msg.textContent = map[err.code] || err.message;
    msg.classList.add("error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign up";
  }
});

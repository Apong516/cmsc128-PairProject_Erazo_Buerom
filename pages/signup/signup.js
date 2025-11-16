import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { firebaseConfig } from '/secrets.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const form = document.getElementById('signupForm');
const nameEl = document.getElementById('name');
const emailEl = document.getElementById('email');
const passEl = document.getElementById('password');
const confEl = document.getElementById('confirm');
const submitBtn = document.getElementById('submitBtn');
const msg = document.getElementById('msg');

const nameMsg = document.getElementById('nameMsg');
const emailMsg = document.getElementById('emailMsg');
const passMsg = document.getElementById('passMsg');
const confirmMsg = document.getElementById('confirmMsg');

const strengthFill = document.getElementById('strengthFill');
const strengthLabel = document.getElementById('strengthLabel');

function scorePassword(pwd) {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 6) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  if (pwd.length >= 10) s++;
  const blacklist = ["password","qwerty","123456","111111","abc123","letmein","iloveyou"];
  if (blacklist.includes(pwd.toLowerCase())) s = Math.min(s, 1);
  return Math.min(s, 5);
}

function updateStrength() {
  const s = scorePassword(passEl.value);
  const widths = [0, 25, 45, 70, 85, 100];
  strengthFill.style.width = widths[s] + '%';
  strengthFill.dataset.level = String(s);
  strengthLabel.textContent = ["Too short","Weak","Okay","Good","Strong","Strong"][s];
}

function validate() {
  let ok = true;

  if (!nameEl.value.trim()) {
    nameMsg.textContent = 'Please enter your name.';
    ok = false;
  } else {
    nameMsg.textContent = '';
  }

  if (!emailEl.validity.valid) {
    emailMsg.textContent = 'Enter a valid email address.';
    ok = false;
  } else {
    emailMsg.textContent = '';
  }

  if (passEl.value.length < 6) {
    passMsg.textContent = 'Password must be at least 6 characters.';
    ok = false;
  } else {
    passMsg.textContent = '';
  }

  if (confEl.value !== passEl.value) {
    confirmMsg.textContent = 'Passwords do not match.';
    ok = false;
  } else {
    confirmMsg.textContent = '';
  }

  submitBtn.disabled = !ok;
  return ok;
}

[nameEl, emailEl, passEl, confEl].forEach(el =>
  el.addEventListener('input', () => {
    updateStrength();
    validate();
  })
);

updateStrength();
validate();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;

  const name = nameEl.value.trim();
  const email = emailEl.value.trim();
  const pwd = passEl.value;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating…';
  msg.textContent = '';

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pwd);
    await updateProfile(cred.user, { displayName: name });

  // Mirror newly created user into localStorage so the app shows the correct name/email
  try { localStorage.setItem('todo.user.v1', cred.user.displayName || name); } catch (e) {}
  try { localStorage.setItem('todo.email.v1', cred.user.email || email); } catch (e) {}

  // After successful sign-up, go straight to the app home page (user stays signed in)
  window.location.href = '../home/home.html';
  } catch (err) {
    msg.textContent = ({
      'auth/email-already-in-use': 'This email already has an account. Try logging in or use Forgot password.',
      'auth/invalid-email': 'That email looks invalid.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/operation-not-allowed': 'Enable Email/Password in Firebase → Auth.',
      'auth/unauthorized-domain': 'Add your domain in Firebase → Auth → Authorized domains.'
    }[err.code] || err.message);

    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign up';
  }
});

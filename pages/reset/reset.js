import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { firebaseConfig } from "/secrets.js";

import {
  getAuth,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { firebaseConfig } from '/secrets.js';

if (!firebaseConfig || typeof firebaseConfig !== 'object') {
  console.error('Missing or invalid firebaseConfig in /secrets.js');
  throw new Error('Missing firebaseConfig');
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// if already logged in, bounce to home/dashboard
onAuthStateChanged(auth, (u) => {
  if (u) location.href = "home.html";
});

const emailEl = document.getElementById("email");
const emailMsg = document.getElementById("emailMsg");
const btn = document.getElementById("submitBtn");
const err = document.getElementById("msg");
const ok = document.getElementById("ok");
const form = document.getElementById("resetForm");

function validate() {
  let good = true;

  if (!emailEl.validity.valid) {
    emailMsg.textContent = "enter a valid email address.";
    good = false;
  } else {
    emailMsg.textContent = "";
  }

  btn.disabled = !good;
  return good;
}

emailEl.addEventListener("input", validate);
validate();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.textContent = "";
  ok.textContent = "";

  if (!validate()) return;

  btn.disabled = true;
  btn.textContent = "sending…";

  try {
    const emailToSend = emailEl.value.trim().toLowerCase();
    console.debug('Sending password reset to', emailToSend);
    await sendPasswordResetEmail(auth, emailToSend);
    console.debug('sendPasswordResetEmail resolved for', emailToSend);
    ok.textContent = "reset link sent. check your inbox (and spam).";
  } catch (ex) {
    const map = {
      "auth/invalid-email": "that email looks invalid.",
      "auth/user-not-found": "no account with that email. try another or sign up.",
      "auth/unauthorized-domain": "this domain is not authorized in firebase.",
      "auth/network-request-failed": "network error. try again."
    };
    console.error('sendPasswordResetEmail error', ex);
    err.textContent = map[ex.code] || ex.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "send reset link";
  }
});
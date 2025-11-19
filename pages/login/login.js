// Firebase + auth (mirrors `script.js` behavior for the login page)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, setPersistence, browserSessionPersistence, fetchSignInMethodsForEmail, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { firebaseConfig } from '../../secrets.js';


// sanity check for runtime config (clear message if missing)
if (!firebaseConfig || typeof firebaseConfig !== 'object') {
  console.error('Missing or invalid firebaseConfig in /secrets.js');
  const loginMsg = (typeof document !== 'undefined') ? document.getElementById('loginMsg') : null;
  if (loginMsg) loginMsg.textContent = 'Configuration error: firebase not configured.';
    if (loginMsg) loginMsg.classList.add('error');
  throw new Error('Missing firebaseConfig');
}

const appFB = initializeApp(firebaseConfig);
const auth = getAuth(appFB);
const db = getFirestore(appFB);

// toggle show/hide password
const pw = document.getElementById('loginPassword') || document.getElementById('password');
const togglePwBtn = document.getElementById('toggleLoginPw');

if (pw && togglePwBtn) {
  togglePwBtn.onclick = () => {
    const isPw = pw.type === 'password';
    pw.type = isPw ? 'text' : 'password';
    togglePwBtn.textContent = isPw ? 'HIDE' : 'SHOW';
  };
}

// localStorage keys (same keys used across the app)
const USER_KEY = 'todo.user.v1', USER_EMAIL_KEY = 'todo.email.v1';

// If an authenticated user exists, mirror to localStorage and redirect to the app.
onAuthStateChanged(auth, (u) => {
  // Mirror Firebase user into localStorage for UI placeholders.
  // Do NOT auto-redirect here — keep routing decisions local to the page actions
  // (e.g., form submit) to avoid racing with explicit post-sign-in navigation.
  if (u) {
    try { localStorage.setItem(USER_KEY, u.displayName || 'User'); } catch (e) {}
    try { localStorage.setItem(USER_EMAIL_KEY, u.email || ''); } catch (e) {}
  }
});

// NOTE: removed the aggressive auto-redirect listener that forwarded any
// authenticated session visiting the login page to the app. That listener
// caused unexpected redirects during development and interfered with the
// auth gating logic. Redirection after sign-in is now handled explicitly by
// the form submit handler above, and global gating is enforced in `home.js`.

// panel switching (login / signup / recover)
const panels = {
  login: document.getElementById('panel-login'),
  signup: document.getElementById('panel-signup'),
  recover: document.getElementById('panel-recover'),
};

function showTab(name) {
  Object.entries(panels).forEach(([k,p]) => {
    if (!p) return;
    const isActive = k === name;
    p.classList.toggle('hidden', !isActive);
    p.setAttribute('aria-hidden', String(!isActive));
  });

  // Toggle aria-expanded on the forgot button if present
  try {
    const forgotBtn = document.getElementById('forgotBtn');
    if (forgotBtn) forgotBtn.setAttribute('aria-expanded', String(name === 'recover'));
  } catch (e) {}

  // If showing recover panel, focus the email input for quick access
  if (name === 'recover') {
    const recoverEmail = document.getElementById('recoverEmail');
    if (recoverEmail) recoverEmail.focus();
  }
}

// hook links
const linkForgot = document.querySelector('.link-forgot');
const linkSignup = document.querySelector('.link-signup');
const linkLogins = document.querySelectorAll('.link-login');

if (linkForgot) {
  // prevent the anchor from navigating away and show the in-page recover panel instead
  linkForgot.addEventListener('click', (e) => { e.preventDefault(); showTab('recover'); });
}

if (linkSignup) {
  linkSignup.onclick = () => showTab('signup');
}

linkLogins.forEach(a => {
  a.onclick = () => showTab('login');
});

// In-page password recover form (if present in the login.html)
const recoverForm = document.getElementById('recoverForm');
const recoverEmailEl = document.getElementById('recoverEmail');
const recoverMsg = document.getElementById('recoverMsg');
if (recoverForm) {
  recoverForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (recoverMsg) { recoverMsg.textContent = ''; recoverMsg.classList.remove('error','success'); }
    const email = recoverEmailEl ? (recoverEmailEl.value || '').trim().toLowerCase() : '';
    if (!email) { if (recoverMsg) { recoverMsg.textContent = 'Enter your email.'; recoverMsg.classList.add('error'); } return; }
    try {
      console.debug('Recover: sending password reset to', email);
      await sendPasswordResetEmail(auth, email);
      if (recoverMsg) { recoverMsg.textContent = 'Reset link sent. Check your inbox (and spam).'; recoverMsg.classList.add('success'); }
      // after a short delay return to login panel for convenience
      setTimeout(() => showTab('login'), 1200);
    } catch (ex) {
      console.error('Password reset error', ex);
      const map = {
        'auth/invalid-email': 'That email looks invalid.',
        'auth/user-not-found': 'No account with that email.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
        'auth/unauthorized-domain': 'This domain is not authorized in firebase.'
      };
      if (recoverMsg) recoverMsg.textContent = map[ex.code] || ex.message || 'Unable to send reset link.';
      if (recoverEmailEl) recoverEmailEl.focus();
    }
  });
}

// Login form wiring (if present on the page)
const form = document.getElementById('loginForm');
// prefer visible per-page message elements but fall back to a generic id if present
const msg = document.getElementById('msg') || document.getElementById('loginMsg');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (msg) { msg.textContent = ''; msg.classList.remove('error','success'); }
    // Clear field-level errors
    const userErrEl = document.getElementById('loginUserError');
    const passErrEl = document.getElementById('loginPassError');
    if (userErrEl) { userErrEl.textContent = ''; const f = (document.getElementById('loginId')||document.getElementById('loginEmail'))?.closest('.field'); if(f) f.classList.remove('error'); }
    if (passErrEl) { passErrEl.textContent = ''; const pf = (document.getElementById('loginPassword')||document.getElementById('loginPass')||document.getElementById('password'))?.closest('.field'); if(pf) pf.classList.remove('error'); }
    // the login page uses `loginId` for the identifier field; accept several fallbacks
    const emailEl = document.getElementById('email') || document.getElementById('loginId') || document.getElementById('loginEmail');
    const pwdEl = document.getElementById('password') || document.getElementById('loginPassword') || document.getElementById('loginPass');
  let email = emailEl ? emailEl.value.trim() : '';
  const pwd = pwdEl ? pwdEl.value : '';
  // normalized identifier (what the user typed: username or email)
  const identifier = (document.getElementById('loginId') || document.getElementById('loginEmail') || document.getElementById('email'))?.value.trim() || '';
      try {
          // If the identifier looks like an email, use it as the email value
          // (some pages may also have an `email` input that is empty or different),
          // then check whether that email is registered.
          if (identifier && identifier.includes('@')) {
            // ensure we use the identifier value for email checks/sign-in
            // trim and normalize case for the check (Firebase auth is case-insensitive for emails)
            email = identifier.trim().toLowerCase();
            console.debug('Login: identifier looks like email', { identifier, email });
            try {
              const methods = await fetchSignInMethodsForEmail(auth, email);
              console.debug('fetchSignInMethodsForEmail returned', methods);
              if (!methods || methods.length === 0) {
                // fetchSignInMethodsForEmail returned no methods. This can happen
                // for multiple reasons; don't block the sign-in attempt here —
                // proceed to signInWithEmailAndPassword and let Firebase return
                // the canonical error (auth/user-not-found) if appropriate.
                console.warn('No sign-in methods found for', email, '- will attempt sign-in to confirm.');
              }
            } catch (checkErr) {
              console.warn('fetchSignInMethodsForEmail failed', checkErr);
              // fetchSignInMethodsForEmail can throw for invalid email formats; let the normal flow handle it
              // but map invalid-email explicitly below in the catch block.
            }
          }

          // If the identifier looks like a username (no @), try to resolve username -> email via Firestore
          if (identifier && !identifier.includes('@')) {
            try {
              const usersCol = collection(db, 'users');
              const q = query(usersCol, where('username', '==', identifier));
              const snaps = await getDocs(q);
              console.debug('Username lookup snaps size', snaps.size);
              const uf = (document.getElementById('loginId')||document.getElementById('loginEmail')||document.getElementById('email'))?.closest('.field');
              if (snaps.empty) {
                if (userErrEl) userErrEl.textContent = 'User not found.';
                if (uf) uf.classList.add('error');
                (document.getElementById('loginId')||document.getElementById('loginEmail')||document.getElementById('email'))?.focus();
                return;
              }
              // take first match
              const docSnap = snaps.docs[0];
              const data = docSnap.data();
              console.debug('Username lookup data', data);
              if (data && data.email) {
                // overwrite email variable to use found email for sign-in
                email = data.email;
              } else {
                // if no email stored, abort and show error
                if (userErrEl) userErrEl.textContent = 'User record incomplete.';
                if (uf) uf.classList.add('error');
                return;
              }
            } catch (ux) {
              console.error('Username lookup failed', ux);
              // fall through to normal auth attempt
            }
          }

          // Use session persistence so the auth state does not persist across browser restarts.
          try { await setPersistence(auth, browserSessionPersistence); } catch (pe) { /* ignore persistence errors */ }
          const result = await signInWithEmailAndPassword(auth, email, pwd);
      const user = result.user;
      try { localStorage.setItem(USER_KEY, user.displayName || 'User'); } catch (e) {}
      try { localStorage.setItem(USER_EMAIL_KEY, user.email || ''); } catch (e) {}
  // After successful sign-in, send user to the app home page.
  window.location.href = '../home/home.html';
    } catch (err) {
      // Map common Firebase Auth errors to specific field messages
      const code = err && err.code ? err.code : null;
      const identifier = (document.getElementById('loginId') || document.getElementById('loginEmail') || document.getElementById('email'))?.value || '';

      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        if (passErrEl) passErrEl.textContent = 'Incorrect password.';
        const pf = (document.getElementById('loginPassword')||document.getElementById('loginPass')||document.getElementById('password'))?.closest('.field');
        if (pf) pf.classList.add('error');
      } else if (code === 'auth/user-not-found') {
        if (userErrEl) userErrEl.textContent = identifier.includes('@') ? 'Email not found.' : 'User not found.';
        const uf = (document.getElementById('loginId')||document.getElementById('loginEmail')||document.getElementById('email'))?.closest('.field');
        if (uf) uf.classList.add('error');
      } else if (code === 'auth/invalid-email') {
        if (userErrEl) userErrEl.textContent = 'Invalid email address.';
        const uf = (document.getElementById('loginId')||document.getElementById('loginEmail')||document.getElementById('email'))?.closest('.field');
        if (uf) uf.classList.add('error');
      } else {
        if (msg) { msg.textContent = err.message || 'Login failed'; msg.classList.add('error'); }
      }
    }
  });
}

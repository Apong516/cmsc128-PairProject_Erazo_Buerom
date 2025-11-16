import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getAuth, onAuthStateChanged, updateProfile, updateEmail, updatePassword,
  reauthenticateWithCredential, EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { firebaseConfig } from '/secrets.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const USER_KEY='todo.user.v1', USER_EMAIL_KEY='todo.email.v1';
const USER_PHOTO_KEY='todo.photo.v1';

// optional local handle key (client-side store for username/handle)
const USER_HANDLE_KEY = 'todo.handle.v1';

// elements
const nameEl = document.getElementById('name');
const usernameEl = document.getElementById('username');
const emailEl = document.getElementById('email');
const nameMsg = document.getElementById('nameMsg');
const usernameMsg = document.getElementById('usernameMsg');
const emailMsg = document.getElementById('emailMsg');
const saveBtn = document.getElementById('saveBtn');
const msgInfo = document.getElementById('msgInfo');
const msgErr = document.getElementById('msgErr');

const newPwdEl = document.getElementById('newPwd');
const confirmPwdEl = document.getElementById('confirmPwd');
const currentPwdInline = document.getElementById('currentPwdInline');
const pwdBtn = document.getElementById('pwdBtn');
const pwdOk = document.getElementById('pwdOk');
const pwdErr = document.getElementById('pwdErr');
const pwdMsg = document.getElementById('pwdMsg');
const confirmPwdMsg = document.getElementById('confirmPwdMsg');
const strengthFill = document.getElementById('strengthFill');
const strengthLabel = document.getElementById('strengthLabel');

const reauthPanel = document.getElementById('reauthPanel');
const reauthForm = document.getElementById('reauthForm');
const reauthMsg = document.getElementById('reauthMsg');
const reauthBtn = document.getElementById('reauthBtn');
const cancelReauth = document.getElementById('cancelReauth');
const currentPwdEl = document.getElementById('currentPwd');

let user = null;
let pendingAction = null;

/* password strength logic */
function scorePassword(pwd){
  if(!pwd) return 0;
  let s=0;
  if (pwd.length>=6) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  if (pwd.length>=10) s++;
  return Math.min(s,5);
}
function updateStrength(){
  const s = scorePassword(newPwdEl.value);
  const pct = [0,25,45,70,85,100][s];
  strengthFill.style.width = pct + '%';
  strengthFill.dataset.level = String(s);
  strengthLabel.textContent = ["Too short","Weak","Okay","Good","Strong","Strong"][s];
}

/* validation */
function validateProfile(){
  let ok = true;
  if(!nameEl.value.trim()){ nameMsg.textContent='Enter your name.'; ok=false; } else nameMsg.textContent='';
  if(!usernameEl.value.trim()){ usernameMsg.textContent='Enter a username.'; ok=false; } else usernameMsg.textContent='';
  // email is read-only on this page; we only allow changing name and username
  saveBtn.disabled = !ok || (nameEl.value === (user?.displayName||'') && usernameEl.value === (localStorage.getItem(USER_HANDLE_KEY) || ''));
  return !saveBtn.disabled;
}
function validatePassword(){
  let ok = true;
  pwdMsg.textContent = newPwdEl.value.length<6 ? 'At least 6 characters.' : '';
  if(newPwdEl.value.length<6) ok=false;
  if(confirmPwdEl.value !== newPwdEl.value){ confirmPwdMsg.textContent='Passwords do not match.'; ok=false; }
  else confirmPwdMsg.textContent='';
  pwdBtn.disabled = !ok;
  return ok;
}

/* auth state */
onAuthStateChanged(auth, u=>{
  if(!u){ location.href='login.html'; return; }
  user = u;

  // Mirror user's basic info into localStorage so other pages (home) can show cached UI quickly.
  try { localStorage.setItem(USER_KEY, u.displayName || 'User'); } catch (e) {}
  try { localStorage.setItem(USER_EMAIL_KEY, u.email || ''); } catch (e) {}
  if (u.photoURL) { try { localStorage.setItem(USER_PHOTO_KEY, u.photoURL); } catch (e) {} }

  nameEl.value = u.displayName || '';
  // email is read-only
  emailEl.value = u.email || '';

  // Load username from Firestore (if present). Fall back to localStorage otherwise.
  (async ()=>{
    try {
      const ref = doc(db, 'users', u.uid);
      const snap = await getDoc(ref);
      if (snap.exists()){
        const data = snap.data();
        if (data && data.username) {
          usernameEl.value = data.username;
          try { localStorage.setItem(USER_HANDLE_KEY, data.username); } catch(e) {}
        } else {
          usernameEl.value = localStorage.getItem(USER_HANDLE_KEY) || '';
        }
      } else {
        usernameEl.value = localStorage.getItem(USER_HANDLE_KEY) || '';
      }
    } catch (e) {
      // ignore Firestore read errors and fallback to localStorage
      usernameEl.value = localStorage.getItem(USER_HANDLE_KEY) || '';
    } finally {
      saveBtn.disabled = true;
      pwdBtn.disabled = true;
    }
  })();
});

[nameEl,emailEl].forEach(el=>el.addEventListener('input',validateProfile));
[newPwdEl,confirmPwdEl].forEach(el=>el.addEventListener('input',()=>{ updateStrength(); validatePassword(); }));
updateStrength();

/* reauth flow */
function showReauth(action){
  pendingAction = action;
  reauthPanel.classList.remove('hidden');
  reauthMsg.textContent='';
  currentPwdEl.value='';
  currentPwdEl.focus();
}
function hideReauth(){
  reauthPanel.classList.add('hidden');
  pendingAction=null;
  reauthMsg.textContent='';
}
cancelReauth.onclick = hideReauth;

reauthForm.onsubmit = async e =>{
  e.preventDefault();
  reauthMsg.textContent='';
  try{
    reauthBtn.disabled=true; reauthBtn.textContent='Verifying…';
    const cred = EmailAuthProvider.credential(user.email,currentPwdEl.value);
    await reauthenticateWithCredential(user,cred);
    hideReauth();
    if(typeof pendingAction === 'function') await pendingAction();
  }catch(ex){
    reauthMsg.textContent = ex.code==='auth/wrong-password'
      ? 'Incorrect password.'
      : ex.code==='auth/too-many-requests'
        ? 'Too many attempts. Try again later.'
        : ex.message;
  }finally{
    reauthBtn.disabled=false; reauthBtn.textContent='Confirm';
  }
};

/* update profile */
profileForm.onsubmit = async e =>{
  e.preventDefault(); msgErr.textContent=''; msgInfo.textContent='';
  if(!validateProfile()) return;

  const newName = nameEl.value.trim();
  const newHandle = usernameEl.value.trim();

  saveBtn.disabled=true; saveBtn.textContent='Saving…';

  const doSave = async ()=>{
    try{
      if(newName !== (user.displayName||'')) await updateProfile(user,{displayName:newName});
      // Persist the display name to Auth and write username to Firestore (merge)
      try {
        const ref = doc(db, 'users', user.uid);
        await setDoc(ref, { username: newHandle, displayName: newName, email: user.email || '' }, { merge: true });
      } catch (e) {
        // If Firestore write fails, report but continue to update local cache
        console.error('Failed to save username to Firestore', e);
        msgErr.textContent = 'Profile saved locally but failed to persist to server.';
      }

      // Update local cache
      try { localStorage.setItem(USER_KEY,newName||'User'); } catch (e) {}
      try { localStorage.setItem(USER_HANDLE_KEY,newHandle||''); } catch (e) {}

      msgInfo.textContent='Profile updated.';
    }catch(ex){
      if(ex.code==='auth/requires-recent-login'){
        msgErr.textContent='Please confirm your password to continue.';
        showReauth(doSave);
        return;
      }
      msgErr.textContent=ex.message;
    }finally{
      saveBtn.disabled=false; saveBtn.textContent='Save changes';
    }
  };

  await doSave();
};

/* update password */
pwdForm.onsubmit = async e =>{
  e.preventDefault(); pwdErr.textContent=''; pwdOk.textContent='';
  // Require current password inline for reauthentication, then update password
  if(!validatePassword()) return;
  const currentPwd = currentPwdInline?.value || '';
  if(!currentPwd){ pwdErr.textContent='Enter your current password.'; return; }

  const newPwd = newPwdEl.value;
  pwdBtn.disabled=true; pwdBtn.textContent='Updating…';

  try{
    // Reauthenticate first using the provided current password
    const cred = EmailAuthProvider.credential(user.email, currentPwd);
    await reauthenticateWithCredential(user, cred);
    // Now update the password
    await updatePassword(user, newPwd);
    pwdOk.textContent='Password updated.';
    newPwdEl.value=''; confirmPwdEl.value=''; if(currentPwdInline) currentPwdInline.value='';
    updateStrength(); validatePassword();
  }catch(ex){
    pwdErr.textContent = ex.code === 'auth/wrong-password' ? 'Incorrect current password.' : ex.message;
  }finally{
    pwdBtn.disabled=false; pwdBtn.textContent='Update password';
  }
};

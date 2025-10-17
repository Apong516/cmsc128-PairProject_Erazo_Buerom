import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔹 Firebase config (same as your app.js)
const firebaseConfig = {
  apiKey: "AIzaSyCqCqt9wXYrIlB2rW7feWY-2Ipk6etc49Q",
  authDomain: "taskdash-c5cc1.firebaseapp.com",
  projectId: "taskdash-c5cc1",
  storageBucket: "taskdash-c5cc1.appspot.com",
  messagingSenderId: "822232313643",
  appId: "1:822232313643:web:8033f4160c040cf4771f6e",
  measurementId: "G-8ZQ4R12DDF"
};

// 🔹 Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);

// 🔹 Check authentication
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // redirect if not logged in
    window.location.href = "accounts.html";
    return;
  }

  // display name + initials
  $("welcomeName").textContent = `Welcome, ${user.displayName || "User"}`;
  $("userInitial").textContent = user.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : "U";
  $("profileEmail").value = user.email;

  // load Firestore profile
  const snap = await getDoc(doc(db, "users", user.uid));
  if (snap.exists()) {
    const u = snap.data();
    $("profileName").value = u.name ?? "";
    $("profileUsername").value = u.username ?? "";
  }
});

// 🔹 Log out
$("btnLogout").onclick = async () => {
  await signOut(auth);
  window.location.href = "accounts.html";
};

// 🔹 Save profile
$("btnSaveProfile").onclick = async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  const name = $("profileName").value.trim();
  const username = $("profileUsername").value.trim().toLowerCase();
  const msg = $("profileMsg");
  msg.textContent = "Saving...";
  msg.className = "msg info";

  try {
    await updateProfile(user, { displayName: name });
    await updateDoc(doc(db, "users", user.uid), {
      name,
      username,
      updatedAt: Date.now()
    });
    msg.textContent = "Profile updated successfully!";
    msg.className = "msg ok";
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "msg error";
  }
};

// 🔹 Change password
$("btnChangePassword").onclick = async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  const msg = $("passwordMsg");

  const curr = $("currentPassword").value;
  const next = $("newPassword").value;
  const confirm = $("confirmPassword").value;

  if (!curr || !next || !confirm) {
    msg.textContent = "Please fill in all password fields.";
    msg.className = "msg error";
    return;
  }
  if (next !== confirm) {
    msg.textContent = "New passwords do not match.";
    msg.className = "msg error";
    return;
  }

  try {
    const cred = EmailAuthProvider.credential(user.email, curr);
    await reauthenticateWithCredential(user, cred);
    await updatePassword(user, next);
    msg.textContent = "Password updated successfully!";
    msg.className = "msg ok";
    $("currentPassword").value = "";
    $("newPassword").value = "";
    $("confirmPassword").value = "";
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "msg error";
  }
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, setPersistence, browserLocalPersistence,
  onAuthStateChanged, createUserWithEmailAndPassword, updateProfile,
  signInWithEmailAndPassword, signOut, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* 🔹 Firebase Config */
const firebaseConfig = {
  apiKey: "AIzaSyCqCqt9wXYrIlB2rW7feWY-2Ipk6etc49Q",
  authDomain: "taskdash-c5cc1.firebaseapp.com",
  projectId: "taskdash-c5cc1",
  storageBucket: "taskdash-c5cc1.appspot.com",
  messagingSenderId: "822232313643",
  appId: "1:822232313643:web:8033f4160c040cf4771f6e",
  measurementId: "G-8ZQ4R12DDF"
};

/* 🔹 Initialize Firebase */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
await setPersistence(auth, browserLocalPersistence);

/* 🔹 Helper */
const $ = (id) => document.getElementById(id);
const panels = {
  login: $("panel-login"),
  signup: $("panel-signup"),
  recover: $("panel-recover"),
};
function showTab(name) {
  Object.values(panels).forEach((p) => p.classList.add("hidden"));
  panels[name]?.classList.remove("hidden");
}
showTab("login");

/* 🔹 Sign out (guarded — will only attach if element exists) */
const signOutBtn = $("btnSignOut");
if (signOutBtn) {
  signOutBtn.addEventListener("click", async () => {
    await signOut(auth);
    showTab("login");
  });
}

/* 🔹 Sign up */
$("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("signupName").value.trim();
  const username = $("signupUsername").value.trim().toLowerCase();
  const email = $("signupEmail").value.trim();
  const password = $("signupPassword").value;
  const msg = $("signupMsg");
  msg.textContent = "Creating account...";
  msg.className = "msg info";

  if (!/^[a-zA-Z0-9_.]{3,20}$/.test(username)) {
    msg.textContent = "Username must be 3–20 chars (letters/numbers/._).";
    msg.className = "msg error";
    return;
  }

  try {
    const uq = query(collection(db, "users"), where("username", "==", username));
    const snap = await getDocs(uq);
    if (!snap.empty) {
      msg.textContent = "Username already taken.";
      msg.className = "msg error";
      return;
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      email: email.toLowerCase(),
      name,
      username,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    msg.textContent = "Account created! Redirecting...";
    msg.className = "msg ok";
    window.location.href = "profile.html";
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "msg error";
  }
});

/* 🔹 Login */
$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  $("loginUserError").textContent = "";
  $("loginPassError").textContent = "";
  const msg = $("loginMsg");
  msg.textContent = "";
  msg.className = "";

  const loginId = $("loginId").value.trim();
  const password = $("loginPassword").value;

  try {
    let emailToUse = loginId;

    if (!loginId.includes("@")) {
      const q = query(collection(db, "users"), where("username", "==", loginId.toLowerCase()));
      const s = await getDocs(q);
      if (s.empty) {
        $("loginUserError").textContent = "Username not found.";
        msg.textContent = "";
        return;
      }
      emailToUse = s.docs[0].data().email;
    }

    await signInWithEmailAndPassword(auth, emailToUse, password);
    window.location.href = "profile.html";
  } catch (err) {
    console.log(err.code);
    msg.textContent = "";

    if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
      $("loginPassError").textContent = "Incorrect password.";
    } else if (err.code === "auth/user-not-found") {
      $("loginUserError").textContent = "User not found.";
    } else {
      msg.textContent = err.message;
      msg.className = "msg error";
    }
  }
});

/* 🔹 Recover */
$("recoverForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("recoverEmail").value.trim();
  const msg = $("recoverMsg");
  msg.textContent = "Sending reset link...";
  msg.className = "msg info";
  try {
    await sendPasswordResetEmail(auth, email);
    msg.textContent = "Reset email sent. Check your inbox.";
    msg.className = "msg ok";
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "msg error";
  }
});

/* 🔹 Auth State (no banner toggling anymore) */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    showTab("login");
  }
  // If logged in, we simply keep the page as-is.
  // (No "Signed in as" banner to update.)
});
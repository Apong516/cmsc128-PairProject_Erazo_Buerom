# Firebase Accounts (Lab 2)

A tiny client‑side web app that demonstrates email/username sign‑in, sign‑up, password recovery, and a profile page backed by Firebase Authentication + Cloud Firestore.

> Built as a learning exercise. Not production‑hardened.

---

## Features

* Sign up with name, username, email, and password
* Log in using email *or* username
* "Forgot password" via email reset link
* Auth‑gated Profile page (edit display name & username)
* Change password with re‑authentication
* Firestore user doc created on first sign‑up: `users/{uid}`

---

## Project structure

```
accounts.html   # Auth UI (sign in / sign up / recover)
app.js          # Auth logic: sign up, login (email or username), recovery
profile.html    # Auth‑gated profile UI
profile.js      # Profile logic (load/update profile, change password, logout)
styles.css      # Shared styles for auth pages
profile.css     # Styles for profile page
```

Open `accounts.html` to start. Successful auth redirects to `profile.html`.

---

## 🛠️ Stack

* Vanilla HTML/CSS/JS (module scripts)
* Firebase Web SDK v10 (modules via CDN imports)
* Cloud Firestore (user metadata)

---

## 🚀 Getting started (local)

### Prerequisites

* Recent browser (Chrome, Edge, Firefox)
* A static file server (recommended), or open `accounts.html` directly for a quick test

### Serve locally

Pick one:

```bash
# Python (any OS)
python -m http.server 8080

# Node (with http-server)
npx http-server -p 8080
```

Then open: `http://localhost:8080/accounts.html`

> If module imports fail when opening files directly, use a local server as above.

---

## 🔥 Firebase setup

This repo uses CDN imports for the Firebase SDK and a sample `firebaseConfig` included in `app.js` and `profile.js`.

If you want to plug in your own Firebase project:

1. Go to Firebase Console → create a project.
2. Enable Authentication → Sign‑in method → Email/Password.
3. Create Cloud Firestore in *production* or *test* mode (your choice for class work).
4. Copy your project’s web config and replace the `firebaseConfig` object in both `app.js` and `profile.js`.
5. (Optional, but recommended) Set Firestore security rules appropriately for class/testing.

### Suggested Firestore data

On sign‑up, a document is created at `users/{uid}` with fields like:

```json
{
  "uid": "<auth uid>",
  "email": "user@example.com",
  "name": "Jane Doe",
  "username": "janed",
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000
}
```

### Example (teaching‑only) Rules

> ⚠️ For learning/testing only. Do not ship to production as‑is.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, update: if request.auth != null && request.auth.uid == uid;
      allow create: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

---

## ▶️ Usage

* Sign up: create account with name, username, email, password
* Sign in: enter email or username + password
* Forgot password: sends reset email
* Profile page: edit display name & username, update password (requires current password)
* Log out: available from the profile sidebar

---

## 🧪 Testing tips

* Try signing up two accounts with different usernames
* Verify username lookup by logging in with just the username
* Test password reset flow (check spam folder)

---

## 🐞 Troubleshooting

* Module import / CORS errors → Serve the folder via a local static server
* “Username already taken” → Check the `users` collection in Firestore
* Auth error codes → Open DevTools Console for detailed messages

---

## 🔐 Security & Privacy

* The Firebase API key in web apps is not a secret; rules protect your data.
* This project is for learning. Review Auth/Firestore rules before deploying anywhere public.

---

## 📦 Deployment notes

Any static host works (e.g., GitHub Pages, Netlify, Vercel). Ensure module scripts are served with the correct MIME type (default behavior for these hosts).

* Start page: `accounts.html`
* Redirect after sign‑in: `profile.html`

---

## 🗺️ Roadmap / Ideas (optional)

* Client‑side form validation & stronger password UX
* Avatar upload via Firebase Storage
* Email verification + banner prompts
* Profile username uniqueness check on edit
* Theming / dark mode

---

## 🧩 Backend chosen

Firebase (BaaS)

* Auth: Email/password sign‑in. Username login is implemented by looking up the username in Firestore to resolve the user’s email, then signing in via Auth.
* Database: Cloud Firestore (users collection). Docs persist across refresh/server restarts.
* Why Firebase: fast to prototype, easy to scale/deploy for small projects; satisfies “lightweight database + backend” requirement without introducing disallowed full stacks.

---

## 🧪 Example API endpoints (Firestore & Auth REST)

While the app uses the Firebase Web SDK in-browser, here are equivalent REST examples to demonstrate database connectivity, per instructions. Replace placeholders with your project values.

> Replace `PROJECT_ID`, `API_KEY`, and `ID_TOKEN` (from a signed‑in user) as needed.

### Create/Update user profile (Firestore REST)

```bash
curl -X PATCH \
  "https://firestore.googleapis.com/v1/projects/PROJECT_ID/databases/(default)/documents/users/UID?updateMask.fieldPaths=name&updateMask.fieldPaths=username" \
  -H "Authorization: Bearer ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "name": {"stringValue": "Jane Doe"},
      "username": {"stringValue": "janed"}
    }
  }'
```

### Read user profile (Firestore REST)

```bash
curl -H "Authorization: Bearer ID_TOKEN" \
  "https://firestore.googleapis.com/v1/projects/PROJECT_ID/databases/(default)/documents/users/UID"
```

### Query by username (Firestore REST)

```bash
curl -X POST \
  -H "Authorization: Bearer ID_TOKEN" \
  -H "Content-Type: application/json" \
  "https://firestore.googleapis.com/v1/projects/PROJECT_ID/databases/(default)/documents:runQuery" \
  -d '{
    "structuredQuery": {
      "from": [{"collectionId": "users"}],
      "where": {
        "fieldFilter": {
          "field": {"fieldPath": "username"},
          "op": "EQUAL",
          "value": {"stringValue": "janed"}
        }
      },
      "limit": 1
    }
  }'
```

### Sign up / Sign in (Auth REST)

```bash
# Sign up (email + password)
curl -X POST \
  -H "Content-Type: application/json" \
  "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=API_KEY" \
  -d '{"email":"user@example.com","password":"P@ssw0rd","returnSecureToken":true}'

# Sign in (email + password)
curl -X POST \
  -H "Content-Type: application/json" \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=API_KEY" \
  -d '{"email":"user@example.com","password":"P@ssw0rd","returnSecureToken":true}'
```

> The app’s username login flow resolves `email` via Firestore first, then calls the Auth SDK sign‑in.

---

## 🎨 Design & HCI notes

* Clear visual grouping: form labels above inputs, inline validation messages
* Primary actions are visually distinct; disabled/working states for async ops
* Keyboard accessible (tab order, visible focus); sufficient color contrast
* Responsive layout (mobile first); readable line lengths and touch targets

---

## 📝 License

For class use and learning. No license specified.
# CMSC128 — Pair Project: To Do List Web App

This project is the Assign4 deliverable for CMSC 128 (Software Engineering I). It compiles the laboratory activities from Lab 1 through Lab 4 into a single static front-end prototype: a To Do web application with user-account flows (signup, login, profile, reset, and home) implemented using plain HTML, CSS, and JavaScript.

## Purpose

Provide a static front-end prototype for the To Do application used in CMSC128 pair project work. The pages are static files that can be opened directly in a browser or served from a simple static server for better compatibility with fetch/XHR operations.

## Project structure

- `pages/`
  - `home/` — `home.html`, `home.css`, `home.js` (main dashboard)
  - `login/` — `login.html`, `login.css`, `login.js` (login page)
  - `signup/` — `signup.html`, `signup.css`, `signup.js` (signup / register page)
  - `reset/` — `reset.html`, `reset.css`, `reset.js` (password reset)
  - `profile/` — `profile.html`, `profile.css`, `profile.js` (profile/settings)

- `secrets.js` — local testing values (do NOT commit production secrets)
- `README.md` — this file

Note: file paths above are relative to the project root (`Assign4`).

## Quick start — run locally


Because this is a static site, you can open pages directly in a browser. For features that use fetch/XHR (or to avoid file:// CORS restrictions) serve the project with a simple static server.

From PowerShell (Windows):

```powershell
# change to the project root
cd "c:\Users\Lenovo\Documents\CMSC 128\Lab 1\128\cmsc128-PairProject_Erazo_Buerom\Assign4"
# start a simple HTTP server on port 8000 (Python must be installed)
python -m http.server 8000; # then open http://localhost:8000/pages/home/home.html
```

Or double-click `pages/home/home.html` to open it directly—just be aware some JS features may require serving over HTTP.

## Deployment notes

- Current branch: `lab-4-deployed` (this is the branch where deployment-ready changes are kept).
- You can host this project on any static hosting service (GitHub Pages, Netlify, Vercel, etc.). For GitHub Pages, enable Pages for the branch and set the project folder to `Assign4` (or move files to the repository root).
- Do not commit real credentials. Keep `secrets.js` out of source control or replace it with environment-backed configuration in production.

## Development notes

- Uses vanilla JavaScript and no build pipeline. If you add Node tooling, include `package.json` and update this README with scripts.
- Add unit or integration tests if you introduce logic that benefits from automated checking.

## File overview

- `pages/home/home.html` — main UI and task list UX
- `pages/login/login.html` — login form and client-side validation
- `pages/signup/signup.html` — create account form
- `pages/reset/reset.html` — reset password / email flow
- `pages/profile/profile.html` — view/update profile

Each HTML page includes a CSS and JS file in the same folder.

## Contributors

- Owner: Apong516
- Contributors: Erazo, Buerom

Please add your name and a short note of contributions if you're a contributor.

## Notes for instructors / graders

- Branch used for deployment/testing: `lab-4-deployed`.
- This project contains the static front-end only. No backend service is included with the submission.

## License

No license specified. Add a LICENSE file (for example MIT) if you want to release the code under an open license.

## Contact

For questions about this assignment, contact the repository owner or the contributors listed above.

---
This README was updated to correct folder references and add deployment notes for Assign4.

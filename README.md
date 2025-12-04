- CMSC128 — Pair Project: To Do List Web App

This repository collects the Assign1–Assign4 deliverables for CMSC 128 (Software Engineering I). The project compiles laboratory activities from Lab 1 through Lab 4 into a single To Do web application. The client is built with HTML, CSS and JavaScript and the project uses Firebase (Authentication + Firestore) as the backend for persistence, authentication, and collaborative features. A live demo is available (see Deployment section).

Table of contents

- Project summary
- Course & prerequisites
- System restrictions
- Tech stack
- Labs (1 → 4) instructions & requirements
- Project structure
- Quick start (run locally)
- Deployment (live demo)
- Security & secrets
- Git & commit guidance
- Development notes
- Contributors & contact
- License

Course & prerequisites
----------------------
Course: CMSC 128 — Software Engineering I

Prerequisites:

- Familiarity with CMSC 128 topics
- GitHub account and repository for each lab (public)
- Code editor (VS Code recommended)

Overview
--------
This repository is a cumulative project that implements the lab activities for CMSC 128. The app is a To Do List web application that evolves across the labs. Each lab builds upon the previous one: Lab 1 creates a basic To Do interface; Lab 2 adds account pages; Lab 3 integrates multi-account behavior and persistence; Lab 4 optimizes and deploys the application.

System restrictions (must follow)
--------------------------------

1. Do not use a full SPA tech stack (e.g., MERN), component libraries (e.g., React), or frameworks (e.g., Angular).
2. Frontend: HTML, CSS, JavaScript (you may use a CSS framework such as Tailwind or Bootstrap).
3. Backend: any language + database except PHP + MySQL. Lightweight backend options: Flask + SQLite, Node.js (Express) + MongoDB Atlas, or a BaaS (Firebase). Choose a backend that is easy to scale and deploy.

Tech stack
----------

This project uses the following technologies:

- Frontend: HTML5, CSS3, Vanilla JavaScript (ES6+). No frontend frameworks are used. CSS is authored with plain CSS; small utility classes are used for layout and components.
- Backend / BaaS: Firebase Authentication (Email/Password) and Firestore for persistence and collaborative lists.
- Hosting / Deployment: Vercel (production demo at https://taskdash-delta.vercel.app). 

Notes:

- Firebase client configuration (apiKey, projectId, etc.) is required to connect the app to your Firebase project. Keep any service-account JSON or private keys out of source control.
- The codebase intentionally avoids heavy frameworks to satisfy the course restrictions.

Labs (detailed instructions and required features)
------------------------------------------------

Lab 1 — Individual Activity (To Do List basic CRUD)

Prerequisites: CMSC 128 knowledge, GitHub account, lab repo, VS Code.

Goal: Build a simple To Do list web app that supports CRUD and persists data.

Minimum features (pass):

- To Do list interface
- Add task
- Set Due Date and Time (string input accepted)
- Delete task (with confirmation dialog)
- Edit task
- Mark task as Done
- Data persists after refreshing the browser

Expanded features (perfect score):

- Task priority (High, Mid, Low) with color tags
- Record timestamp when task was added (for sorting)
- Use date picker for due date
- Use time picker for due time
- Show a "Task Deleted" toast with an Undo option
- Sort tasks by Date Added, Due Date, Priority

Notes:

- Use a lightweight database for persistence (local persistence like localStorage is acceptable for initial labs, but a backend DB is required when integrating accounts and multi-user features).
- Create a `README.md` for Lab 1 explaining the backend choice (if any), how to run the app, and example API endpoints if a backend exists.
- Final commit name for Lab 1: `cmsc128-Indiv-Act1-finalX` (replace X with your version number).

Lab 2 — Account Management pages

Prerequisites: CMSC 128 knowledge, GitHub repo, VS Code.

Goal: Add account creation, login, and data persistence for user accounts.

Minimum features (pass):

- Account creation (Sign Up) with at least: username/email, password, and name
- Account login
- Data persistence after refresh

Expanded features (perfect score):

- Profile page to change username/password/name
- Password recovery (Forgot Password flow)

Notes:

- Add a `README.md` for Lab 2 describing the backend used, how to run, and API endpoints.
- Final commit name for Lab 2 changes: `cmsc128-Indiv-Act1-finalX` (follow instructor naming conventions).

Lab 3 — Multi-Account integration

Goal: Integrate Labs 1 and 2 so tasks are per-user and stored in separate tables/collections.

Minimum features (pass):

- Separate tables/collections for Tasks and Users/Accounts
- Users can create an account, log in, and be directed to their own To Do List page
- Users can only access their own To Do List
- Data persists after refresh and server restarts (user remains logged in and sees their TDL)

Expanded features (perfect score): Collaborative To-Do Lists

- Users can switch between Personal and Collaborative lists
- Users can add other users to a collaborative list (by username/email)
- Users can see the collaborative lists they are a member of

Scenario example (expanded features):

- Nikko has a Personal TDL and a "Nikko's Group List". He adds Victor to the group list by username/email. Victor then sees his own Personal TDL, his personal collaborative lists, and the lists he was added to (including "Nikko's Group List"). Nikko cannot see Victor's lists unless added.

Notes:

- Use a proper backend DB (e.g., SQLite, MongoDB Atlas, Firebase) so data persists across restarts.
- Add a `README.md` describing backend choice, how to run, and API endpoints. Final commit name: `cmsc128-Indiv-Act2-finalX`.

Lab 4 — Optimize & Deploy

Goal: Polish UX/UI, optimize backend where applicable, and deploy online.

Minimum features (pass):

- Local deployment: Application can be accessed from multiple devices on the local network (e.g., via local server IP)

Expanded features (perfect score):

- Online deployment: Host the app online and make it accessible via a public URL

Notes:

- Ensure the backend is production-ready (sensible CORS, secure secrets, environment variables, proper DB configuration).

Deployment (live demo)
----------------------
Live demo: https://taskdash-delta.vercel.app

- Deployment branch used: `lab-4-deployed`.
- Host on GitHub Pages, Vercel, Netlify, or similar. For GitHub Pages, either move files to repository root or set Pages to serve from the `Assign4` folder/branch.

Security & secrets
------------------

- Do NOT commit production credentials or API keys. Keep `secrets.js` and `.env` files out of the repository.
- A `.gitignore` has been added to ignore `secrets.js`, `.env*`, `node_modules/`, and common artifacts.

If `secrets.js` has already been committed, remove it from the index while keeping a local copy:


Git & commit guidance
----------------------
- Maintain a public GitHub repo named `cmsc128-IndivProject_<Lastname>` for individual lab submissions.
- Use `.gitignore` to exclude packages and local secrets.
- Final lab commit naming examples:
  - Lab 1 final commit: `cmsc128-Indiv-Act1-finalX`
  - Lab 2 final commit: `cmsc128-Indiv-Act1-finalX` (follow instructor naming)
  - Lab 3 final commit: `cmsc128-Indiv-Act2-finalX`
  - Final submission: `cmsc128-Final-Lab`

Contributors & contact
----------------------
Rei Jansen Buerom (Full Stack Engineer)
John Romson Erazo (Full Stack Engineer)

This README documents the course labs and includes the live deployment link.
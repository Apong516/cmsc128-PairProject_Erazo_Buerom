What this does

- Provides `secrets.example.js` you can copy to `secrets.js` and fill with your Firebase project config.
- Adds `.gitignore` entry so `secrets.js` won't be committed.

Quick start (local dev)

1. Copy the example file:

   - Windows PowerShell:

     cp .\\secrets.example.js .\\secrets.js

2. Edit `secrets.js` and replace the placeholder strings with your Firebase config values.

3. Load `secrets.js` before your module scripts in your HTML (non-module approach):

   <script src="secrets.js"></script>
   <script type="module" src="script.js"></script>

   Or, use it as an ES module by exporting `firebaseConfig` from `secrets.js` and importing it
   in your module scripts:

   // secrets.js
   export const firebaseConfig = { /* ... */ };

   // in your module
   import { firebaseConfig } from './secrets.js';

Notes & security

- Firebase API keys used by client-side SDKs are intended to be public-ish; they identify your
  project but don't, by themselves, grant privileged access. Protect your project by:
  - Restricting Authorized domains in Firebase Auth (Console → Auth → Authorized domains).
  - Writing strict Firestore/Storage rules so read/write access requires proper auth and checks.
  - Using server-side secrets for operations that must be truly private.

- For production, prefer injecting secrets on the server (e.g., via environment variables) and
  only exposing minimal, authorized configs to the client.

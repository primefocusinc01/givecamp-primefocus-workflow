# Migration: Spring Boot + Cloud Run → Firebase Hosting (Frontend-Only)

## Goal

Move the React frontend from the Spring Boot + Google Cloud Run container stack to Firebase Hosting, eliminating the backend and all supporting Cloud Run infrastructure while preserving Firebase Auth and Firestore data access.

## Current State

- **Frontend**: React (Vite) in `PVF_React_Frontend/` using Firebase Auth and Firestore client SDKs directly.
- **Backend**: Spring Boot app that provides unused CRUD passthroughs and Firebase Admin SDK custom-claim management. The frontend never calls any `/api/**` endpoints.
- **Deployment**: Docker multi-stage build embeds the React build into a Spring Boot JAR, then deploys to Cloud Run.
- **Secrets**: `firestore-credentials` Secret Manager secret holds a service account key for the Spring Boot runtime.

## Target State

- **Frontend**: Same React app, built with `npm run build` and deployed as a static site to Firebase Hosting.
- **Backend**: None.
- **Auth/Authorization**: Firebase Auth + Firestore Security Rules (no custom claims required for the current role model).
- **Deployment**: GitHub Actions deploys `PVF_React_Frontend/dist/` to Firebase Hosting via `firebase-tools`.
- **Infra**: No Cloud Run service, no Artifact Registry docker repo, no container build, no backend service account key.

## Prerequisites

- [ ] Firebase project `prime-vision-focus-abe` has Hosting enabled.
- [ ] Local `firebase-tools` CLI installed (`npm install -g firebase-tools` or use `npx firebase-tools`).
- [ ] Owner/Editor access to the Firebase project and the GCP project `prime-focus-services`.
- [ ] GitHub repository has permission to add/update repository secrets and Actions workflows.

## Phase 1: Firebase Hosting Setup (No Code Changes to App Logic)

1. [ ] **Initialize Firebase Hosting in the repo root**
   - Run `firebase init hosting` (or `npx firebase-tools init hosting`).
   - Select the existing Firebase project `prime-vision-focus-abe`.
   - Set public directory to `PVF_React_Frontend/dist`.
   - Configure as a single-page app (yes to rewrite all URLs to `index.html`).
   - Do **not** enable GitHub Actions deploy yet; we will configure the workflow manually.

2. [ ] **Review and commit generated files**
   - `firebase.json` (hosting configuration)
   - `.firebaserc` (project alias)
   - Add both to version control.

3. [ ] **Verify local build output**
   - `cd PVF_React_Frontend && npm ci && npm run build`
   - Confirm `dist/` exists and contains `index.html`, JS, and CSS assets.

4. [ ] **First manual deploy to Firebase Hosting (preview channel recommended)**
   - `firebase hosting:channel:deploy preview-migration --expires 7d`
   - Verify the preview URL serves the app and the `HashRouter` routes work.
   - Do **not** promote to the live channel until final testing.

## Phase 2: Frontend Hardening

### 2.1 Move Firebase config to build-time env vars

1. [ ] **Update `PVF_React_Frontend/src/firebase.ts`**
   - Replace the hardcoded `firebaseConfig` object with values read from `import.meta.env`.
   - Example:
     ```ts
     const firebaseConfig = {
       apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
       authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
       projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
       storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
       messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
       appId: import.meta.env.VITE_FIREBASE_APP_ID,
       measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
     }
     ```

2. [ ] **Update `PVF_React_Frontend/.env.example`**
   - Keep all required `VITE_FIREBASE_*` variables.

3. [ ] **Update `.gitignore`**
   - Ensure `PVF_React_Frontend/.env` and any `.env.*.local` files are ignored.
   - Do not commit real `.env` files.

4. [ ] **Document local setup**
   - Add a note in the migration doc or README explaining that developers must copy `.env.example` to `.env` and fill in the public Firebase config values.

> **Note**: The Firebase config values are **public** by design. They identify the project; they do not grant access. The actual security comes from Firebase Auth and Firestore Security Rules.

### 2.2 Add Firestore Security Rules

1. [ ] **Create `firestore.rules`** in the repo root
   - Rules must enforce:
     - Authenticated users can read/write their own `users/{uid}` document.
     - Only users with `role == 'admin'` can read all `users` documents and update any `users/{uid}.role` field.
     - Authenticated doctors/admins can read/write `participants`.
     - Basic users have limited access (define based on product requirements).
   - Example starter rules:
     ```js
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         function isAuthenticated() {
           return request.auth != null;
         }
         function isAdmin() {
           return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
         }
         function isDoctor() {
           return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'doctor';
         }
         function isOwner(userId) {
           return isAuthenticated() && request.auth.uid == userId;
         }

         match /users/{userId} {
           allow read: if isOwner(userId) || isAdmin();
           allow create: if isOwner(userId) || isAdmin();
           allow update: if isOwner(userId) || isAdmin();
           allow delete: if isAdmin();
         }

         match /participants/{participantId} {
           allow read: if isAuthenticated() && (isAdmin() || isDoctor());
           allow write: if isAuthenticated() && (isAdmin() || isDoctor());
         }
       }
     }
     ```
   - Adjust participant access rules based on actual requirements (e.g., a participant might need to see their own record).

2. [ ] **Create `firestore.indexes.json`** if needed
   - Currently the app does simple document ID lookups. Add composite indexes only if queries are expanded later.

3. [ ] **Add rules deploy to the workflow**
   - `firebase deploy --only firestore:rules,hosting` (or deploy rules separately during testing).

### 2.3 Bootstrap the first admin

1. [ ] **Document the bootstrap process**
   - Without the Spring Boot backend, the first admin must be created manually:
     - Sign in to the app once to create the Firebase user.
     - In the Firebase console, find the user's UID and create/update the `users/{uid}` document with `role: 'admin'`.
   - Alternative: add a one-time Cloud Function or manual script, but for a small fixed admin team the console approach is simplest.

2. [ ] **Test the bootstrap**
   - After creating the first admin doc, verify the `AdminUsers` page loads and can promote other users to admin/doctor.

### 2.4 Router consideration (optional)

1. [ ] **Decide on `HashRouter` vs `BrowserRouter`**
   - The app currently uses `HashRouter`, which works on Firebase Hosting without any rewrite rules.
   - `BrowserRouter` is cleaner for URLs but requires the Hosting rewrite rule `"source": "**", "destination": "/index.html"` in `firebase.json`.
   - Recommendation: keep `HashRouter` for the migration to minimize changes, then switch to `BrowserRouter` in a follow-up if desired.

## Phase 3: GitHub Actions Deployment Workflow

1. [ ] **Create `.github/workflows/deploy-firebase-hosting.yml`**
   - Trigger: `workflow_dispatch` (same manual trigger style as the current Cloud Run workflow).
   - Steps:
     - Check out code.
     - Set up Node.js 22.
     - `cd PVF_React_Frontend && npm ci && npm run build`.
     - Authenticate to Firebase using a service account key stored in GitHub secrets.
     - `firebase deploy --only hosting` (or `firestore:rules,hosting` if rules are ready).
   - Do not remove the existing Cloud Run workflow yet.

2. [ ] **Create Firebase Hosting deploy service account**
   - In GCP, create a service account (e.g., `firebase-hosting-deploy-sa`) with the **Firebase Hosting Admin** role.
   - Download a JSON key and add it to GitHub Secrets as `FIREBASE_SERVICE_ACCOUNT_KEY` (or similar).
   - Store the project ID as a secret or hardcode it in the workflow if it is not sensitive.

3. [ ] **Test the workflow**
   - Run the workflow manually from a feature branch or use a preview channel first.
   - Verify the deployment URL works and the live channel is updated only when intended.

## Phase 4: Parallel Testing (Firebase Hosting + Existing Cloud Run)

1. [ ] **Deploy current frontend to Firebase Hosting preview channel**
   - Run the new workflow or manual `firebase hosting:channel:deploy`.

2. [ ] **Functional test checklist**
   - [ ] Sign up with email/password creates a `users/{uid}` doc with `role: 'basic-user'`.
   - [ ] Log in with email/password works.
   - [ ] Google sign-in works.
   - [ ] Role-based navigation shows/hides `Participants` and `Admin Users` links correctly.
   - [ ] `Participants` page reads and writes `participants` collection.
   - [ ] `AdminUsers` page lists users and can change roles.
   - [ ] A non-admin user cannot access admin features (enforced by Firestore rules, not just UI).
   - [ ] Log out works and redirects to `/login`.
   - [ ] Direct URL refresh on a deep route works (with `HashRouter`, routes are `#/path`, so this is expected to work).

3. [ ] **Security test checklist**
   - [ ] Confirm Firestore rules reject unauthorized reads/writes.
   - [ ] Confirm unauthenticated users cannot read `participants`.
   - [ ] Confirm non-admin users cannot read other users' docs.

4. [ ] **Compare with Cloud Run deployment**
   - Verify the Firebase Hosting version behaves identically to the Cloud Run version for the same frontend build.

5. [ ] **Promote to live Firebase Hosting channel only after all tests pass**

## Phase 5: Remove Spring Boot and Cloud Run Artifacts

### 5.1 Code and build cleanup

1. [ ] **Remove backend source**
   - Delete `src/main/java/`, `src/main/resources/`, and `src/test/java/`.
   - Delete `build.gradle`, `settings.gradle`, `gradlew`, `gradlew.bat`, and `gradle/` directory.

2. [ ] **Remove Docker/container files**
   - Delete root `Dockerfile` (the Spring Boot + frontend container).
   - Delete `PVF_React_Frontend/Dockerfile` (nginx container) unless you want to keep a container option; since Firebase Hosting is the target, it is no longer needed.
   - Delete `.dockerignore`.

3. [ ] **Remove Cloud Run deployment workflow**
   - Delete `.github/workflows/deploy-cloud-run.yml`.

### 5.2 Documentation cleanup

1. [ ] **Update `AGENTS.md` / `CLAUDE.md`**
   - Remove Spring Boot, Gradle, Cloud Run, and `GOOGLE_CREDENTIALSJSON` references.
   - Add Firebase Hosting deployment instructions and Firestore rules guidance.

2. [ ] **Update or remove `DEPLOYMENT_SETUP.md`**
   - Replace Cloud Run setup steps with Firebase Hosting setup steps.
   - Document the new GitHub Actions workflow and required secrets.

3. [ ] **Update `README.md`**
   - Reflect the new stack, build commands, and deployment process.

### 5.3 GCP resource teardown (manual, outside of code)

1. [ ] **Delete the Cloud Run service**
   - `gcloud run services delete primefocus-workflow --region=us-east5 --project=prime-focus-services`

2. [ ] **Delete the Artifact Registry docker repository** (if no other images are stored there)
   - `gcloud artifacts repositories delete docker --location=us-east5 --project=prime-focus-services`

3. [ ] **Delete the `firestore-credentials` Secret Manager secret** (no longer needed)
   - `gcloud secrets delete firestore-credentials --project=prime-focus-services`

4. [ ] **Delete the `firestore-runtime-sa` service account** (no backend runtime)
   - `gcloud iam service-accounts delete firestore-runtime-sa@prime-focus-services.iam.gserviceaccount.com --project=prime-focus-services`

5. [ ] **Delete the `github-deploy-sa` service account and key** (Cloud Run deploy only)
   - `gcloud iam service-accounts delete github-deploy-sa@prime-focus-services.iam.gserviceaccount.com --project=prime-focus-services`

6. [ ] **Remove GitHub secrets that are no longer needed**
   - `GCP_SA_KEY`
   - `GCP_PROJECT_ID` (may be reused for Firebase Hosting if not secret)
   - `GCP_REGION`
   - `GCP_SERVICE_NAME`
   - `GCP_ARTIFACT_REGISTRY`

## Phase 6: Final Verification and Rollback Plan

### Final verification

- [ ] Live Firebase Hosting site is the canonical deployment.
- [ ] Cloud Run service is deleted and no traffic is routed there.
- [ ] GitHub Actions deploys only to Firebase Hosting.
- [ ] Firestore rules are deployed and enforced.
- [ ] The first admin can manage roles, and all role-based UI works.
- [ ] No references to the old backend remain in the repo.

### Rollback plan

- If a critical issue is found after promoting Firebase Hosting:
  1. Re-enable or redeploy the Cloud Run service from the last known-good backend commit.
  2. Update DNS / custom domain to point back to the Cloud Run URL if a custom domain is in use.
  3. Fix the Firebase Hosting issue and redeploy.
- Because Firebase Hosting and Cloud Run can run side-by-side, the safest path is to keep the Cloud Run service live until Firebase Hosting is fully validated.

## Open Questions / Decisions

1. **Router**: Keep `HashRouter` or switch to `BrowserRouter`?
2. **Admin bootstrap**: Manual Firestore document creation, or one-time Cloud Function/script?
3. **Firestore rules for participants**: Should a basic user ever read their own participant record, or is that strictly admin/doctor only?
4. **Custom domains**: Is a custom domain configured on Cloud Run that needs to be migrated to Firebase Hosting?
5. **Preview channels**: Should every PR get a preview channel, or only manual deployments?
6. **Container option**: Do you want to keep the frontend `Dockerfile` for local development / alternative hosting, or delete it entirely?

## Progress Tracker

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Firebase Hosting Setup | Not started | |
| Phase 2: Frontend Hardening | Not started | |
| Phase 3: GitHub Actions Workflow | Not started | |
| Phase 4: Parallel Testing | Not started | |
| Phase 5: Remove Spring Boot/Cloud Run | Not started | |
| Phase 6: Final Verification | Not started | |

# Firebase Hosting Deployment Setup Guide

This guide covers the GitHub Actions workflow for deploying the React frontend
and Firestore security rules to Firebase Hosting.

## Prerequisites

1. A Firebase project linked to the Google Cloud project `primefocus-workflow`.
2. Firebase Authentication enabled with at least **Email/Password** and **Google** providers.
3. Firebase Hosting enabled in the project.
4. Firestore database created in the project.

## GitHub Actions Workflow

- File: `.github/workflows/deploy-firebase-hosting.yml`
- Trigger: `workflow_dispatch` (manual trigger from the Actions tab)
- Input: `channel` — use `live` for the live site, or a preview channel name
  (e.g., `ci-test`) for a temporary preview URL.

### What it does

1. Checks out the repository.
2. Sets up Node.js 22 and caches `npm`.
3. Installs frontend dependencies in `PVF_React_Frontend/`.
4. Builds the frontend with `VITE_FIREBASE_*` variables.
5. Deploys Firestore security rules from `firestore.rules`.
6. Deploys the built frontend to Firebase Hosting.

## Required GitHub Configuration

Go to **Settings → Secrets and variables → Actions** in the GitHub repository.

### Secret

| Secret Name | Description |
|-------------|-------------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Full JSON contents of the `github-deploy-sa` service account key. Used to authenticate `firebase-tools` for deployment. |

### Variables

The Firebase config values are public project identifiers, so they are stored as
**Variables** (not secrets):

| Variable Name | Value |
|---------------|-------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyBkxV72Jefo-ZN9HXTTAApzWPiAuB-fn7w` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `primefocus-workflow.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `primefocus-workflow` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `primefocus-workflow.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `939430515884` |
| `VITE_FIREBASE_APP_ID` | `1:939430515884:web:372f7c363f4af4be55bb09` |

## Service Account Roles

The `github-deploy-sa` service account needs the following roles on the
`primefocus-workflow` project:

- `roles/firebasehosting.admin` — deploy to Firebase Hosting
- `roles/firebase.editor` — manage Firebase web app and project resources
- `roles/firebase.viewer` — read Firebase project config
- `roles/datastore.owner` — deploy Firestore security rules

To add a role:

```bash
gcloud projects add-iam-policy-binding primefocus-workflow \
  --member="serviceAccount:github-deploy-sa@primefocus-workflow.iam.gserviceaccount.com" \
  --role="ROLE_NAME" \
  --condition=None
```

## Local Development

```bash
cd PVF_React_Frontend
cp .env.example .env
npm ci
npm run dev
```

The `.env` file is gitignored. It contains public Firebase config values only.

## Usage

1. Go to the **Actions** tab in the GitHub repository.
2. Select **Deploy to Firebase Hosting**.
3. Click **Run workflow**.
4. Enter `live` for production, or a preview channel name for testing.
5. Click **Run workflow**.

## Live Site

Production URL: https://primefocus-workflow.web.app

## Troubleshooting

### Workflow shows empty `VITE_FIREBASE_*` values

Make sure the values are stored under **Variables**, not **Secrets**. The
workflow uses `vars.VITE_FIREBASE_*`, not `secrets.VITE_FIREBASE_*`.

### `Permission denied` during Firestore rules deploy

Verify that `github-deploy-sa` has `roles/datastore.owner` on the project.

### `Permission denied` during Hosting deploy

Verify that `github-deploy-sa` has `roles/firebasehosting.admin` on the project.

### Google sign-in fails on a preview channel

Add the preview channel domain (e.g., `primefocus-workflow--ci-test-abc123.web.app`)
to the Firebase Auth authorized domains list in the Firebase console.

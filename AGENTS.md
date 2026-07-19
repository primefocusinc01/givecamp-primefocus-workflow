# Agent Instructions

## Stack
- React (Vite/TypeScript) frontend in `PVF_React_Frontend/`.
- Firebase Authentication for sign-in.
- Firebase Firestore for data persistence.
- Firebase Hosting for static site deployment.
- No backend server — the frontend talks directly to Firebase services.

## Build & Test
```
cd PVF_React_Frontend && npm ci && npm run build   # frontend build
```

For local development, copy `PVF_React_Frontend/.env.example` to `PVF_React_Frontend/.env`.
The `VITE_FIREBASE_*` values are public Firebase config values, not secrets.

## Deployment (GitHub Actions → Firebase Hosting)
- Workflow: `.github/workflows/deploy-firebase-hosting.yml`, manual `workflow_dispatch` only.
- Trigger with `channel` = `live` to deploy to the live channel, or a preview channel name
  (e.g., `ci-test`) for a temporary preview URL.
- Deploys to Firebase project `prime-focus-services`.
- Uses `github-deploy-sa` via the `FIREBASE_SERVICE_ACCOUNT_KEY` GitHub secret.
- Public Firebase config values are stored as GitHub Variables (`VITE_FIREBASE_*`).
- Deploys both Firestore security rules and the hosting build.

### Required GitHub configuration
- **Secret:** `FIREBASE_SERVICE_ACCOUNT_KEY` — JSON contents of the `github-deploy-sa` key.
- **Variables:** `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
  `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.

## Firestore Security Rules
- Rules are in `firestore.rules` and deployed with the hosting workflow.
- Authorization is based on the authenticated user's UID and the `role` field in `users/{uid}`.
- Admins can manage user roles; admins and doctors can read/write `participants` and `events`.
- Regular users can only read/write their own `users/{uid}` document.

## Commit Attribution
AI commits MUST include:
```
Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>
```

## Remotes
- `origin` → `primefocusinc01/givecamp-primefocus-workflow` (no push access from this account)
- `newfork` → `jbrinkman/givecamp-primefocus-workflow-1` (fork with push access — push branches here, then `gh pr create --base main --head jbrinkman:BRANCH --repo primefocusinc01/givecamp-primefocus-workflow`)
- PRs must be merged by the repo owner; this account cannot merge.

## GCP Access
`gcloud` CLI is available locally. It is useful for GCP resource management (e.g., deleting
Cloud Run services or Artifact Registry repositories after the migration). If `gcloud` commands
fail with an `imp` module error, reinstall via `curl https://sdk.cloud.google.com | bash` rather
than `gcloud components update`.

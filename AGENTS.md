# Agent Instructions

## Stack
Spring Boot (Java 17, Gradle) backend + React (Vite/TS) frontend in `PVF_React_Frontend/`.
Frontend is built and copied into `src/main/resources/static/` at Docker build time (see `Dockerfile`).

## Build & Test
```
./gradlew bootJar        # backend build
./gradlew test           # backend tests
cd PVF_React_Frontend && npm ci && npm run build   # frontend build
```
No local JDK 17 toolchain may be installed — verify Java changes via the actual Docker build
(`gradle:9.2-jdk17` image, see `Dockerfile`) rather than assuming `./gradlew` works locally.

## Commit Attribution
AI commits MUST include:
```
Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>
```

## Remotes
- `origin` → `primefocusinc01/givecamp-primefocus-workflow` (no push access from this account)
- `newfork` → `jbrinkman/givecamp-primefocus-workflow-1` (fork with push access — push branches here, then `gh pr create --base main --head jbrinkman:BRANCH --repo primefocusinc01/givecamp-primefocus-workflow`)
- PRs must be merged by the repo owner; this account cannot merge.

## Deployment (GitHub Actions → Google Cloud Run)
- Workflow: `.github/workflows/deploy-cloud-run.yml`, manual `workflow_dispatch` only.
- GCP project `prime-focus-services`, region `us-east5`, Artifact Registry repo `docker`,
  Cloud Run service `primefocus-workflow`.
- Auth: service account key (`GCP_SA_KEY` GitHub secret for `github-deploy-sa`), not Workload
  Identity Federation — kept simple intentionally.
- Full setup/troubleshooting steps: see `DEPLOYMENT_SETUP.md`.

### Firestore credentials
- App reads `google.credentialsJson` (`@Value` in `FirestoreService.java`), bound from env var
  `GOOGLE_CREDENTIALSJSON` (no underscore between CREDENTIALS/JSON — Spring canonical-property
  rules require this exact form to map to `google.credentialsJson`).
- This is a **static credential**, provisioned once directly in GCP, not pushed by CI:
  stored in Secret Manager secret `firestore-credentials`, owned by service account
  `firestore-runtime-sa` (`roles/datastore.user`). Cloud Run's runtime SA has
  `secretmanager.secretAccessor` on it; `github-deploy-sa` has no access to it.
- To rotate: `gcloud secrets versions add firestore-credentials --data-file=/path/to/new-key.json`.

## Security
- `SecurityConfig` (`@Profile("!local")`) currently `permitAll()`s every request — there are no
  protected REST endpoints yet. `LocalSecurityConfig` (`@Profile("local")`) does the same but that
  profile is never actually activated anywhere.
- When adding authenticated endpoints (e.g. wiring up `AuthService`), tighten `SecurityConfig` to
  scope `permitAll()` to only the static frontend/public routes instead of `anyRequest()`.

## GCP Access
`gcloud` CLI is available locally but was reinstalled fresh during setup (previous install was
too old, broke on Python 3.12+ `imp` removal). If `gcloud` commands fail with an `imp` module
error, reinstall via `curl https://sdk.cloud.google.com | bash` rather than `gcloud components update`.

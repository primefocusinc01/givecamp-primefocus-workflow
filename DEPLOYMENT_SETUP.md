# Google Cloud Run Deployment Setup Guide

This guide will help you set up the GitHub Actions workflow for deploying your Spring Boot + React application to Google Cloud Run.

## Prerequisites

1. Google Cloud Project with the following APIs enabled:
   - Cloud Run API
   - Artifact Registry API
   - Cloud Build API (optional, if using Cloud Build)

2. Google Cloud SDK installed locally for setup steps

## Google Cloud Setup Steps

### 1. Create Artifact Registry Repository

```bash
# Replace with your project details
gcloud artifacts repositories create YOUR_ARTIFACT_REGISTRY \
  --repository-format=docker \
  --location=YOUR_REGION \
  --description="Docker repository for Spring Boot application"
```

Example:
```bash
gcloud artifacts repositories create primefocus-workflow \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker repository for Spring Boot application"
```

### 2. Configure IAM Permissions

Grant the Cloud Run Service Account the necessary permissions:

```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')

# Grant Cloud Run Service Account permissions to pull from Artifact Registry
gcloud artifacts repositories add-iam-policy-binding YOUR_ARTIFACT_REGISTRY \
  --location=YOUR_REGION \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
```

### 3. Create Service Account and Key

#### 3a. Create Service Account for Deployments

```bash
gcloud iam service-accounts create github-deploy-sa \
  --display-name="GitHub Deployment Service Account" \
  --project=YOUR_PROJECT_ID
```

#### 3b. Grant Permissions to Service Account

```bash
# Grant permissions to deploy to Cloud Run
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-deploy-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.developer"

# Grant permissions to push to Artifact Registry
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-deploy-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

#### 3c. Create Service Account Key

```bash
gcloud iam service-accounts keys create github-deploy-key.json \
  --iam-account=github-deploy-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

**Important**: Keep this key file secure and never commit it to your repository!

#### 3d. Grant the compute service account permission to be impersonated

Cloud Run deployments run as the default compute service account unless a
different runtime service account is specified. `github-deploy-sa` needs
permission to act as that account:

```bash
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')

gcloud iam service-accounts add-iam-policy-binding \
  ${PROJECT_NUMBER}-compute@developer.gserviceaccount.com \
  --member="serviceAccount:github-deploy-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### 4. Set Up Firestore Credentials for the Application

The Spring Boot app reads a Google service account key via the
`google.credentialsJson` property (bound from the `GOOGLE_CREDENTIALSJSON`
environment variable) to initialize the Firebase Admin SDK / Firestore
client. Because this value is a large multi-line JSON blob containing a
private key, it is **not** passed as a plain Cloud Run environment variable
(the `deploy-cloudrun` action's `env_vars` input can't safely carry
multi-line/JSON values, and a plaintext private key would otherwise be
visible in the Cloud Run console and deploy logs). Instead it's stored once
in Secret Manager and injected by Cloud Run at runtime.

This credential is static — it's not something CI needs to rotate on every
deploy, so it's provisioned as a one-time setup step, not part of the
workflow.

#### 4a. Create a dedicated runtime service account

```bash
gcloud iam service-accounts create firestore-runtime-sa \
  --display-name="Cloud Run Runtime Service Account (Firestore)" \
  --project=YOUR_PROJECT_ID

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:firestore-runtime-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user" \
  --condition=None
```

#### 4b. Create a key and store it in Secret Manager

```bash
gcloud services enable secretmanager.googleapis.com --project=YOUR_PROJECT_ID

gcloud iam service-accounts keys create /tmp/firestore-runtime-key.json \
  --iam-account=firestore-runtime-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com

gcloud secrets create firestore-credentials \
  --replication-policy=automatic \
  --project=YOUR_PROJECT_ID \
  --data-file=/tmp/firestore-runtime-key.json

rm /tmp/firestore-runtime-key.json
```

If the key ever needs to be rotated, add a new version with:

```bash
gcloud secrets versions add firestore-credentials \
  --project=YOUR_PROJECT_ID \
  --data-file=/tmp/new-key.json
```

#### 4c. Grant Cloud Run access to the secret

Only the Cloud Run runtime identity needs access — CI/CD does not read or
write this secret:

```bash
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding firestore-credentials \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=YOUR_PROJECT_ID
```

The `deploy-cloudrun` step references the secret directly:

```yaml
secrets: |
  GOOGLE_CREDENTIALSJSON=firestore-credentials:latest
```

Cloud Run injects the secret's value as the `GOOGLE_CREDENTIALSJSON`
environment variable at container startup, which Spring Boot binds to
`google.credentialsJson`. No GitHub secret or workflow step is needed for
this value — it lives only in Secret Manager.

## GitHub Secrets Configuration

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `GCP_PROJECT_ID` | Your Google Cloud Project ID | `prime-focus-services` |
| `GCP_REGION` | Google Cloud region | `us-east5` |
| `GCP_SERVICE_NAME` | Cloud Run service name | `primefocus-workflow` |
| `GCP_ARTIFACT_REGISTRY` | Artifact Registry repository name | `docker` |
| `GCP_SA_KEY` | Service account key JSON content | Contents of `github-deploy-key.json` |

### Adding the Service Account Key

1. Open the `github-deploy-key.json` file you created earlier
2. Copy the entire contents of the file
3. In your GitHub repository, go to Settings → Secrets and variables → Actions
4. Click "New repository secret"
5. Name it `GCP_SA_KEY`
6. Paste the entire contents of the JSON file
7. Click "Add secret"

## React Frontend Setup

The Dockerfile expects the React frontend to be located at:
```
PVF_React_Frontend/
```

Make sure this directory structure exists before running the workflow, or modify the Dockerfile to match your actual frontend location.

## Usage

1. Go to the Actions tab in your GitHub repository
2. Select "Build and Deploy to Google Cloud Run" workflow
3. Click "Run workflow"
4. Optionally specify a custom image tag (defaults to git SHA)
5. Click "Run workflow"

## Troubleshooting

### Permission Denied Errors
- Verify the service account has the correct IAM roles
- Verify `github-deploy-sa` has `roles/iam.serviceAccountUser` on the compute service account (required to deploy to Cloud Run)
- Verify the Cloud Run runtime service account has `roles/secretmanager.secretAccessor` on the `firestore-credentials` secret

### Build Failures
- Ensure the React frontend directory exists and contains package.json
- Check that all dependencies are properly defined in package.json
- Verify the Gradle build works locally: `./gradlew bootJar`

### Deployment Failures
- Verify Cloud Run API is enabled
- Check that the service name doesn't already exist (or update existing service)
- Ensure the region is correct and supported by Cloud Run
- If Firestore calls fail at runtime, check that `firestore-credentials` in Secret Manager contains a valid key and that the runtime service account has `roles/datastore.user`

# Prime Focus Workflow

A React + TypeScript + Vite frontend for managing Prime Focus events, participants, and user roles. It uses Firebase Authentication, Firestore, and Firebase Hosting.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + MUI
- **Authentication:** Firebase Auth (email/password + Google sign-in)
- **Database:** Firebase Firestore
- **Hosting:** Firebase Hosting
- **Deployment:** GitHub Actions → Firebase Hosting

## Project Structure

```
/
├── PVF_React_Frontend/   # React application
├── .github/workflows/    # GitHub Actions deployment workflow
├── firestore.rules       # Firestore security rules
├── firestore.indexes.json
├── firebase.json         # Firebase Hosting configuration
└── .firebaserc           # Firebase project alias
```

## Local Development

```bash
cd PVF_React_Frontend
cp .env.example .env
npm ci
npm run dev
```

The `.env` file contains public Firebase config values (not secrets). See `PVF_React_Frontend/.env.example`.

## Build

```bash
cd PVF_React_Frontend
npm ci
npm run build
```

The built static files are output to `PVF_React_Frontend/dist/`.

## Deploy

Deployments are handled by the **Deploy to Firebase Hosting** GitHub Actions workflow:

1. Go to **Actions** in the GitHub repository.
2. Select **Deploy to Firebase Hosting**.
3. Click **Run workflow**.
4. Enter `live` for the production site, or a preview channel name for testing.

Live site: https://primefocus-workflow.web.app

See `DEPLOYMENT_SETUP.md` for the full setup and required GitHub secrets/variables.

## Security

Access control is enforced by **Firestore Security Rules** (`firestore.rules`):

- Users can create and manage their own `users/{uid}` profile but cannot change their own role.
- Admins can manage all user profiles, including roles.
- Admins and doctors can read and write `participants` and `events`.
- Basic users cannot access `participants` or `events`.

## First Admin Bootstrap

After the first user signs up, their `users/{uid}` document is created with `role: 'basic-user'`.
To promote that user to admin:

1. Open the Firebase Console → Firestore Database → `users` collection.
2. Find the user's document and change `role` to `'admin'`.
3. Refresh the app. The **Admin Users** link will appear.

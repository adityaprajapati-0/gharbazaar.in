# Create Test Users Script

## Quick Setup Guide

### Step 1: Install Firebase Admin SDK

```bash
cd c:\Users\Dixie\Downloads\gharbazaar.in-main\gharbazaar.in-main\frontend
npm install firebase-admin --save-dev
```

### Step 2: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project "GharBazaar"
3. Click the gear icon (⚙️) → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the downloaded JSON file as `serviceAccountKey.json`
7. Move it to: `c:\Users\Dixie\Downloads\gharbazaar.in-main\gharbazaar.in-main\frontend\scripts\serviceAccountKey.json`

### Step 3: Run the Script

```bash
cd c:\Users\Dixie\Downloads\gharbazaar.in-main\gharbazaar.in-main\frontend
node scripts/createTestUsers.js
```

### Step 4: Verify Users Created

The script will create these test users:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@gharbazaar.com | Admin@123 |
| Employee | employee@gharbazaar.com | Employee@123 |
| Legal Partner | legal@gharbazaar.com | Legal@123 |
| Ground Partner | ground@gharbazaar.com | Ground@123 |
| Partner | partner@gharbazaar.com | Partner@123 |
| Founder | founder@gharbazaar.com | Founder@123 |
| User | user@gharbazaar.com | User@123 |

## Alternative: Manual Creation in Firebase Console

If you prefer to create users manually:

1. Go to Firebase Console → Authentication
2. Click "Add User"
3. Enter email and password for each user
4. After creating, go to Firestore Database
5. Navigate to `users` collection
6. Add a document with the user's UID containing:
   ```json
   {
     "email": "user@example.com",
     "name": "User Name",
     "role": "role-type",
     "emailVerified": true,
     "createdAt": "auto-generated"
   }
   ```

## Security Note

⚠️ **IMPORTANT**: 
- Never commit `serviceAccountKey.json` to git
- Add it to `.gitignore` immediately
- These are test credentials - change before production!

## Troubleshooting

### Error: Cannot find module 'firebase-admin'
Run: `npm install firebase-admin --save-dev`

### Error: Service account key not found
Make sure `serviceAccountKey.json` is in the `scripts/` folder

### Error: Permission denied
Make sure your Firebase project has Firestore and Authentication enabled

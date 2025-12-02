# Fixing FCM on Vercel - Environment Variables Setup

## Problem
Your Firebase Cloud Messaging (FCM) is failing on Vercel with a 500 error because the Firebase Admin SDK is not properly initialized. This is almost always due to missing or incorrectly formatted environment variables.

## Solution

You need to configure Firebase Admin credentials on Vercel. There are **two methods** to do this:

### Method 1: Using Individual Environment Variables (RECOMMENDED)

This is the easiest and most reliable method for Vercel.

1. Go to your **Firebase Console** → **Project Settings** → **Service Accounts**
2. Click **"Generate New Private Key"** and download the JSON file
3. Open the JSON file and extract these three values:
   - `project_id`
   - `client_email`
   - `private_key`

4. Go to your **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

5. Add these three environment variables:

   ```
   FIREBASE_PROJECT_ID
   Value: your_project_id
   
   FIREBASE_CLIENT_EMAIL
   Value: your-service-account@your-project.iam.gserviceaccount.com
   
   FIREBASE_PRIVATE_KEY
   Value: -----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n
   ```

   **CRITICAL FOR PRIVATE KEY:**
   - Copy the ENTIRE private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
   - Make sure the `\n` characters are LITERAL `\n` (not actual newlines)
   - If your key has actual newlines, you need to replace them with `\n`
   - Example: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n`

6. **Important:** After adding variables, you MUST:
   - Redeploy your project from Vercel dashboard, OR
   - Push a new commit to trigger a deployment

### Method 2: Using Single JSON Variable

If you prefer to use a single environment variable:

1. Take the entire service account JSON file content
2. **Minify it to a single line** (no newlines in the JSON itself)
3. For the `private_key` field, make sure `\n` is escaped as `\\n`

   Example:
   ```json
   {"type":"service_account","project_id":"your-project","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEv...\\n-----END PRIVATE KEY-----\\n","client_email":"..."}
   ```

4. Add to Vercel:
   ```
   FIREBASE_SERVICE_ACCOUNT
   Value: {"type":"service_account","project_id":"your-project",...}
   ```

## Testing After Setup

1. After adding the environment variables and redeploying, check the Vercel Function Logs:
   - Go to your Vercel Dashboard → Your Project → **Logs**
   - Filter by Function: `/api/notifications/send-push`

2. You should now see detailed logs:
   ```
   🔧 Initializing Firebase Admin services...
   🔍 Environment check: { hasServiceAccount: false, hasIndividualKeys: true, projectId: '✓', clientEmail: '✓', privateKey: '✓' }
   ✅ Firebase Admin initialized successfully
   📱 Fetching FCM tokens for accountId: ...
   ```

3. If you still see errors, the logs will now show the exact issue (e.g., "Invalid key format", "Permission denied", etc.)

## Common Issues

### Issue 1: Private Key Format Error
**Error:** `Error parsing private key`

**Solution:** The `FIREBASE_PRIVATE_KEY` must have literal `\n` characters, not actual newlines. 

Correct format:
```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----\n
```

### Issue 2: Environment Variables Not Applied
**Error:** Still showing "Missing environment variables"

**Solution:** After adding variables, you MUST redeploy. Variables are only applied during build/deployment, not instantly.

### Issue 3: Cloud Messaging API Not Enabled
**Error:** `Requested entity was not found` or `API not enabled`

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** → **Library**
4. Search for **"Firebase Cloud Messaging API"**
5. Click **Enable**

### Issue 4: Service Account Permissions
**Error:** `Permission denied`

**Solution:**
1. Go to Google Cloud Console → **IAM & Admin** → **Service Accounts**
2. Find your Firebase service account
3. Make sure it has these roles:
   - Firebase Admin
   - Cloud Datastore User (for Firestore)

## Verification Checklist

- [ ] Firebase Admin credentials added to Vercel environment variables
- [ ] `FIREBASE_PRIVATE_KEY` has literal `\n` (not newlines)
- [ ] Project redeployed after adding variables
- [ ] Cloud Messaging API enabled in Google Cloud Console
- [ ] Service account has proper permissions
- [ ] Checked Vercel Function Logs for detailed error messages

## Need More Help?

Check the Vercel Function Logs at: `https://vercel.com/[your-team]/[your-project]/logs`

The enhanced logging will now show you exactly what's failing.


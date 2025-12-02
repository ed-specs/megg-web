# Quick FCM Fix for Your Project

Based on your credentials, here's what you need to verify:

## 1. Check Vercel Environment Variables Format

Go to: https://vercel.com/your-account/megg-web/settings/environment-variables

Make sure these are set **WITHOUT QUOTES**:

```
FIREBASE_PROJECT_ID
megg-tech

FIREBASE_CLIENT_EMAIL
firebase-adminsdk-fbsvc@megg-tech.iam.gserviceaccount.com

FIREBASE_PRIVATE_KEY
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCxeYetc0rmWZTt\nfJwUismxCpIxaCT8hHP612YkaPI2gvN4VH/WYXfdedxj8zW65IuJpK9iD3rB/2tZ\ngs2LYc+rLCW9A6wtkbI3bBPh2PKNPj/Tdcra6nnfjVRK7Ike0lv27IVPaLh3jYGB\nDRI5dkoXf4VlNZY0bnrB7Y7sF5DqhdXivqbQLxxE6qle/+YjZ5hbE3y7ttQDBLRD\n7Pq1kr/gFDl4TG/lmz0YJJBAwQqH/CcdDSKnajAqSkY3hYdkQDbxROzc/uon5xjE\nAJSmvPq4KZGaJv0Y6P+TyocqNp0yvxgSo7Qqw5Duapvcw/s3U8rT7YUBpAebTU0W\nRiDkx8KhAgMBAAECggEAAdQPMPBtoUbjUQ5ba0jCFYKsM+RvRnIKNyzYlApyvbCx\nV8LYbaR5FX0yZziJDAEGa6dt2R7wtFFF0VkWy1dOyjl9CrVKz6NfHdFiuQ0WSUc5\nZXEiuF5PCB25dGt7FCgK+NXB9Sn5MIjIK0SvtIuCmDsLlu8rj3m4kQk5/jZV8LHm\nL++NcX9ZPtNAxtqvC72LB6CeqJSyfLJzJZsoeOQ1DhOZHGBwoSF/D0f2c+qC+KoB\nigHtUlplpRm5GEvRo17NlKfkjPphHbvhAi2XpeLgjR2igtjEME8zcVpJYTfjup+F\niBcBetKsJ8hYk4cO98yXN4W5WlZfeTF4aG48J0nLYQKBgQDw7B46VLY5PdT/MTYA\nFaDKLxAO70Vh7UKKaLTfyjR7YqrWmLJMl3kP2Rzjo8NX7swOg8deEioc/Pv4yhqc\nb1dxtPF+ZOQ+SKUm0WwLiP0ALcc2DSL6FkBy/24aDXq/SCkob7n7qipExvtDSwpe\nMXTIipwgJ6W3kmtnSt8oJA0ZmQKBgQC8lOaNUwsnFc86SMme3NSbC9qflTPujfpW\n1Fd7pqvTxSRu8/6dTncJoDba2q6fATbYEn3y/N6A8kTwVcCiVoDly9mkG1yMGwqO\n5oj5S02vFtuUTmlMegLSQzIf0uJPF6ywx2zSikXjpdKtfLGGtMVIY6EQ6AAHBSze\n8aTOl+zmSQKBgQDpbT0Uc0NjTr9yyjFx/4KcouDCN55X9VPFWxH0yqvy6HRyG9yV\nTSXk7w2ImgEIz7wyTAf840iecZeJQ/honZByAUkCl6p1llk9tSckPgQ0Cia7/hpn\niOvFACujXnARqU8HeMkQR51QqiKE3s4a2Xw3WeVPWlq79EfP+sEg2V0/8QKBgHO3\nzw2TkrlmKaYzOf1Qtul5Sas5LAfLeX1EiXYn3TJyu5uV/3xZxLPUazS6kgKiBRxr\npHuxbXukrmbnx/AVsrzP7PpFi/GxOjZcAlsvOTkihpUn1HeIOyj48M4UYqhz95T2\nmrFLBf3eKDwq0ui9Dn4QHKq6IiIsq88WarIXCdh5AoGAOLA0VfNADxtD7DqYDY3E\nbIUOgZ+f+rHPxnzUISPwm5L9mLKDxEJG2/kCq4GCkqd8d9s6anHbbEo6gcIT8kdH\nHuO3kRSdMaIqaZR4GysTnqBsHwOkublILBczbCEm3ji8zFfmlGOu8gixFVJLiBuV\nMyAQGA1A4dEMJjSnoRntLjo=\n-----END PRIVATE KEY-----\n
```

⚠️ **KEY POINT**: No quotes around the private key value in Vercel!

## 2. Enable Firebase Cloud Messaging API

This is the most common issue! You MUST enable the new FCM API:

1. Go to: https://console.cloud.google.com/
2. Select project: **megg-tech**
3. In the search bar at top, type: "Firebase Cloud Messaging API"
4. Click on it and click **ENABLE**
5. Also enable "FCM Registration API" if shown

Or use this direct link:
https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=megg-tech

## 3. Redeploy on Vercel

After updating environment variables, you MUST redeploy:

**Option A: Via Dashboard**
1. Go to: https://vercel.com/your-account/megg-web/deployments
2. Click the ⋯ menu on the latest deployment
3. Click "Redeploy"
4. Make sure "Use existing Build Cache" is **UNCHECKED**

**Option B: Via Git Push**
Just push any commit to trigger a new deployment

## 4. Check the Logs

After redeploying, try logging in again and check:
https://vercel.com/your-account/megg-web/logs

Filter by: `/api/notifications/send-push`

You should now see detailed logs:
```
🔧 Initializing Firebase Admin services...
🔍 Environment check: { hasServiceAccount: false, hasIndividualKeys: true, projectId: '✓', clientEmail: '✓', privateKey: '✓' }
✅ Firebase Admin initialized successfully
📱 Fetching FCM tokens for accountId: sonnysarcia
```

If it fails, the logs will tell you exactly why!

## 5. Quick Checklist

- [ ] Removed quotes from `FIREBASE_PRIVATE_KEY` in Vercel
- [ ] Firebase Cloud Messaging API is enabled in Google Cloud Console
- [ ] Redeployed the application
- [ ] Checked Vercel function logs for detailed error messages

## Most Likely Issue

Based on the error "Failed to send push notification" without more details, this is **99% likely** to be the Firebase Cloud Messaging API not being enabled in Google Cloud Console. This is a new requirement as of 2024.


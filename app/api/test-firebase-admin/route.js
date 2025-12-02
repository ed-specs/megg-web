// Temporary test endpoint to check Firebase Admin configuration
export async function GET() {
  const check = {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? '✅ Found' : '❌ Missing',
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? '✅ Found' : '❌ Missing',
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? '✅ Found (length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : '❌ Missing',
    FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL ? '✅ Found' : '❌ Missing',
    FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT ? '✅ Found' : '❌ Not using this method',
  }

  // Check if private key has correct format
  if (process.env.FIREBASE_PRIVATE_KEY) {
    const key = process.env.FIREBASE_PRIVATE_KEY
    check.privateKeyStartsWith = key.startsWith('-----BEGIN PRIVATE KEY-----') ? '✅ Correct format' : '❌ Wrong format (should start with -----BEGIN PRIVATE KEY-----)'
    check.privateKeyHasNewlines = key.includes('\\n') ? '✅ Has \\n characters' : '❌ Missing \\n characters'
    check.privateKeyFirstChars = key.substring(0, 30) + '...'
  }

  return Response.json({
    message: 'Firebase Admin Environment Check',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    checks: check
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, must-revalidate',
    }
  })
}


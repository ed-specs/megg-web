import { createTransport } from "nodemailer"
import { db } from "../../../config/firebaseConfig"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"

// Create transporter using the same config as send-verification
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    return null
  }
  return createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    requireTLS: true,
    logger: false,
    debug: false
  })
}

export async function POST(request) {
  try {
    const { accountId, subject, message } = await request.json()

    if (!accountId || !subject || !message) {
      return Response.json(
        { error: "accountId, subject, and message are required" },
        { status: 400 }
      )
    }

    // Check environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error("Email credentials not configured")
      return Response.json(
        { error: "Email service not configured" },
        { status: 500 }
      )
    }

    // Get user by accountId using client SDK (same as other routes)
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("accountId", "==", accountId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return Response.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const userData = querySnapshot.docs[0].data()
    const userEmail = userData.email

    if (!userEmail) {
      return Response.json(
        { error: "User email not found" },
        { status: 404 }
      )
    }

    // Check if email notifications are enabled
    const settingsRef = doc(db, "notificationSettings", accountId)
    const settingsSnap = await getDoc(settingsRef)

    if (settingsSnap.exists()) {
      const settings = settingsSnap.data()
      if (settings.emailNotifications === false) {
        console.log(`Email notifications disabled for user ${accountId}`)
        return Response.json(
          { error: "Email notifications are disabled for this user", skipped: true },
          { status: 200 }
        )
      }
    }

    // Create email transporter
    const transporter = createTransporter()
    if (!transporter) {
      return Response.json(
        { error: "Failed to create email transporter" },
        { status: 500 }
      )
    }

    // Verify transporter
    try {
      await transporter.verify()
    } catch (error) {
      console.error("SMTP verification failed:", error)
      return Response.json(
        { error: "Email service temporarily unavailable" },
        { status: 503 }
      )
    }

    // Send email with same style as other email routes
    const mailOptions = {
      from: {
        name: "MEGG",
        address: process.env.EMAIL_USER,
      },
      to: userEmail,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f9fafb 0%, #dbeafe 50%, #fed7aa 100%);">
          
          <!-- Main Container -->
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <div>
                <h1 style="font-size: 48px; font-weight: bold; color: #105588; margin: 0 0 8px 0;">MEGG</h1>
                <p style="color: #6b7280; font-size: 18px; margin: 0;">Smart Egg Defect Detection and Sorting</p>
              </div>
            </div>

            <!-- Main Card -->
            <div style="background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(229, 231, 235, 0.8); border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); padding: 40px; margin-bottom: 32px;">
              
              <!-- Content -->
              <div style="margin-bottom: 32px;">
                ${message}
              </div>

              <!-- Security Info -->
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 16px; padding: 20px; margin: 32px 0;">
                <div style="display: flex; align-items: flex-start;">
                  <div style="color: #d97706; font-size: 20px; margin-right: 12px; flex-shrink: 0;">🔒</div>
                  <div>
                    <h3 style="color: #92400e; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">Security Note</h3>
                    <p style="color: #a16207; font-size: 14px; margin: 0; line-height: 1.5;">
                      If you did not make this change, please contact support immediately or change your password.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; color: #9ca3af; font-size: 14px;">
              <p style="margin: 0 0 8px 0;">
                <strong style="color: #105588;">MEGG</strong>
              </p>
              <p style="margin: 0; font-size: 12px;">
                This is an automated message. Please do not reply to this email.
              </p>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(156, 163, 175, 0.3);">
                <p style="margin: 0; font-size: 12px;">
                  © ${new Date().getFullYear()} MEGG. All rights reserved.
                </p>
              </div>
            </div>

          </div>
        </body>
        </html>
      `,
    }

    // Send email
    await transporter.sendMail(mailOptions)

    console.log(`Email sent to ${userEmail}`)

    return Response.json({
      success: true,
      email: userEmail,
    })
  } catch (error) {
    console.error("Error sending email:", error)
    return Response.json(
      { error: "Failed to send email", details: error.message },
      { status: 500 }
    )
  }
}


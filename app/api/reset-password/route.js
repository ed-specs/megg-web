import { createTransport } from "nodemailer"
import { db } from "../../config/firebaseConfig"
import { doc, updateDoc, query, collection, where, getDocs } from "firebase/firestore"
import { generateResetToken } from "../../utils/token"

// Create transporter only if email credentials are available
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
    // Check if email configuration is available
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return Response.json(
        { error: "Email configuration not available" },
        { status: 500 }
      )
    }

    const { email } = await request.json()

    if (!email) {
      return Response.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Find user by email
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("email", "==", email))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return Response.json(
        { error: "No user found with this email address" },
        { status: 404 }
      )
    }

    const userDoc = querySnapshot.docs[0]
    const userData = userDoc.data()
    const accountId = userData.accountId

    // Generate reset token
    const { resetToken, hash, expiryDate } = generateResetToken()

    // Update user document with reset token
    await updateDoc(doc(db, "users", accountId), {
      resetPasswordToken: hash,
      resetPasswordExpiry: expiryDate,
    })

    const transporter = createTransporter()
    if (!transporter) {
      return Response.json(
        { error: "Failed to create email transporter" },
        { status: 500 }
      )
    }

    // Create reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${email}`

    // Setup email data with beautiful design matching auth pages
    const mailOptions = {
      from: {
        name: "MEGG",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: "🔐 Password Reset Request - MEGG",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password - MEGG</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f9fafb 0%, #dbeafe 50%, #fed7aa 100%);">
          
          <!-- Main Container -->
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <!-- Welcome Text -->
              <div>
                <h1 style="font-size: 48px; font-weight: bold; color: #105588; margin: 0 0 8px 0;">Password Reset</h1>
                <p style="color: #6b7280; font-size: 18px; margin: 0;">Secure your account with a new password</p>
              </div>
            </div>

            <!-- Main Card with Glassmorphism -->
            <div style="background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(229, 231, 235, 0.8); border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); padding: 40px; margin-bottom: 32px;">
              
              <!-- Greeting -->
              <div style="margin-bottom: 32px; text-align: center;">
                <h2 style="color: #111827; font-size: 28px; font-weight: 600; margin: 0 0 16px 0;">Reset Your Password ✨</h2>
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0;">
                  We received a request to reset your password for your MEGG account. Click the button below to create a new password.
                </p>
              </div>

              <!-- Reset Button -->
              <div style="text-align: center; margin: 40px 0;">
                <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px solid #e2e8f0; border-radius: 20px; padding: 32px; margin: 20px 0; position: relative; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);">
                  <p style="color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 24px 0;">Secure Password Reset</p>
                  
                  <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #105588 0%, #0d4470 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 16px; font-weight: 600; font-size: 16px; box-shadow: 0 10px 25px -5px rgba(16, 85, 136, 0.4); transition: all 0.3s ease; border: none; margin-bottom: 20px;">
                    Reset My Password
                  </a>
                </div>
                
                <div style="margin-top: 20px; padding: 16px; background: rgba(243, 244, 246, 0.5); border-radius: 12px; border: 1px solid rgba(209, 213, 219, 0.5);">
                  <p style="color: #6b7280; font-size: 14px; margin: 0; line-height: 1.5;">
                    <strong>Can't click the button?</strong><br>
                    Copy and paste this link in your browser:
                  </p>
                  <p style="word-break: break-all; color: #105588; font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace; font-size: 12px; margin: 8px 0 0 0; padding: 8px; background: rgba(255, 255, 255, 0.7); border-radius: 6px; border: 1px solid rgba(209, 213, 219, 0.5);">
                    ${resetUrl}
                  </p>
                </div>
              </div>

              <!-- Security Info -->
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 16px; padding: 20px; margin: 32px 0;">
                <div style="display: flex; align-items: flex-start;">
                  <div style="color: #d97706; font-size: 20px; margin-right: 12px; flex-shrink: 0;">⏰</div>
                  <div>
                    <h3 style="color: #92400e; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">Time Sensitive</h3>
                    <p style="color: #a16207; font-size: 14px; margin: 0; line-height: 1.5;">
                      This password reset link will expire in <strong>1 hour</strong>. If you didn't request this reset, you can safely ignore this email.
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

    // Verify SMTP connection
    try {
      await transporter.verify()
    } catch (error) {
      console.error("SMTP verification failed:", error)
      return Response.json(
        { error: "Email service temporarily unavailable" },
        { status: 503 }
      )
    }

    // Send email
    await transporter.sendMail(mailOptions)

    return Response.json({ 
      success: true,
      message: "Password reset email sent successfully"
    })

  } catch (error) {
    console.error("Error in reset password:", error)
    return Response.json(
      { error: "Failed to process password reset request" },
      { status: 500 }
    )
  }
}
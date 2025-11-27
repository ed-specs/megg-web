import { createTransport } from "nodemailer"

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
    // Validate config
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return Response.json(
        { error: "Email configuration not available" },
        { status: 500 }
      )
    }

    const { email, otp } = await request.json()

    if (!email || !otp) {
      return Response.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      )
    }

    const transporter = createTransporter()
    if (!transporter) {
      return Response.json(
        { error: "Failed to create email transporter" },
        { status: 500 }
      )
    }

    const mailOptions = {
      from: { name: "MEGG", address: process.env.EMAIL_USER },
      to: email,
      subject: "🎉 Welcome to MEGG - Verify Your Email",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - MEGG</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #f9fafb 0%, #dbeafe 50%, #fed7aa 100%);">
          
          <!-- Main Container -->
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <!-- Welcome Text -->
              <div>
                <h1 style="font-size: 48px; font-weight: bold; color: #105588; margin: 0 0 8px 0;">Welcome!</h1>
                <p style="color: #6b7280; font-size: 18px; margin: 0;">Just one more step to get started</p>
              </div>
            </div>

            <!-- Main Card with Glassmorphism -->
            <div style="background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(229, 231, 235, 0.8); border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); padding: 40px; margin-bottom: 32px;">
              
              <!-- Greeting -->
              <div style="margin-bottom: 32px; text-align: center;">
                <h2 style="color: #111827; font-size: 28px; font-weight: 600; margin: 0 0 16px 0;">Almost there! ✨</h2>
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0;">
                  Thanks for signing up with MEGG! To complete your registration and secure your account, please verify your email address using the code below.
                </p>
              </div>

              <!-- OTP Code Display -->
              <div style="text-align: center; margin: 40px 0;">
                <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px solid #e2e8f0; border-radius: 20px; padding: 32px; margin: 20px 0; position: relative; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);">
                  <p style="color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px 0;">Your Verification Code</p>
                  <div style="font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace; font-size: 48px; font-weight: bold; color: #105588; letter-spacing: 8px; margin: 0; text-shadow: 0 2px 4px rgba(16, 85, 136, 0.1);">
                    ${otp}
                  </div>
                </div>
              </div>

              <!-- Instructions -->
              <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 1px solid #93c5fd; border-radius: 16px; padding: 20px; margin: 32px 0;">
                <div style="display: flex; align-items: flex-start;">
                  <div style="color: #1d4ed8; font-size: 20px; margin-right: 12px; flex-shrink: 0;">💡</div>
                  <div>
                    <h3 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">How to use this code:</h3>
                    <ol style="color: #1e3a8a; font-size: 14px; margin: 0; padding-left: 16px; line-height: 1.5;">
                      <li style="margin-bottom: 4px;">Return to the MEGG verification page</li>
                      <li style="margin-bottom: 4px;">Enter the 6-digit code above</li>
                      <li>Click "Verify Email" to complete setup</li>
                    </ol>
                  </div>
                </div>
              </div>

              <!-- Security Info -->
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 16px; padding: 20px; margin: 32px 0;">
                <div style="display: flex; align-items: flex-start;">
                  <div style="color: #d97706; font-size: 20px; margin-right: 12px; flex-shrink: 0;">⏰</div>
                  <div>
                    <h3 style="color: #92400e; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">Time Sensitive</h3>
                    <p style="color: #a16207; font-size: 14px; margin: 0; line-height: 1.5;">
                      This verification code will expire in <strong>15 minutes</strong>. If you didn't create a MEGG account, you can safely ignore this email.
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

    await transporter.sendMail(mailOptions)
    return Response.json({ success: true })
  } catch (error) {
    console.error("Error sending verification email:", error)
    return Response.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    )
  }
}
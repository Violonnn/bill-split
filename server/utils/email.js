import nodemailer from 'nodemailer';

// Email is considered ready only when all SMTP settings are present.
export const isEmailConfigured = () => {
  const required = [
    process.env.SMTP_HOST,
    process.env.SMTP_PORT,
    process.env.SMTP_USER,
    process.env.SMTP_PASS,
    process.env.SMTP_FROM,
  ];
  return required.every((value) => typeof value === 'string' && value.trim().length > 0);
};

// Parse and validate the SMTP port once so invalid env values fail fast.
const getSmtpPort = () => {
  const port = Number.parseInt(process.env.SMTP_PORT || '', 10);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('SMTP_PORT must be a valid positive integer');
  }
  return port;
};

// Create a reusable transporter so all email services share one implementation.
const getTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: getSmtpPort(),
  secure: process.env.SMTP_SECURE === 'true',
  // Some school/corporate networks inject TLS certificates. Keep strict by default.
  tls: {
    rejectUnauthorized: process.env.SMTP_ALLOW_SELF_SIGNED !== 'true',
  },
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Allow a development-only recipient override for safe testing.
const getEffectiveTo = (userEmail) => {
  const override = process.env.SMTP_DEV_RECIPIENT?.trim();
  if (override) {
    console.log('[Mail] Using dev recipient override:', override, '(original:', userEmail, ')');
    return override;
  }
  return userEmail;
};

// Generic send utility reused by verification, reset, and invite flows.
async function sendEmail({ to, subject, html }) {
  if (!isEmailConfigured()) {
    throw new Error('SMTP email is not configured');
  }

  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: getEffectiveTo(to),
    subject,
    html,
  });
  return info;
}

/**
 * Sends email confirmation after registration. User must click the link to confirm before they can log in.
 * Email includes a congratulatory/welcome message and a link to the login page.
 */
export async function sendVerificationEmail(to, verifyUrl, firstName) {
  const displayName = firstName || 'there';

  if (!isEmailConfigured()) {
    console.log('[Dev] SMTP is not configured. Verify link:', verifyUrl);
    return null;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #164E63; margin-bottom: 8px;">Congratulations, ${displayName}!</h2>
      <p style="font-size: 18px; font-weight: 600; color: #0E7490; margin-bottom: 20px;">Welcome to BillSplit.</p>
      <p style="font-size: 16px; line-height: 1.6; color: #334155;">
        Thank you for registering. We're excited to have you on board. Your account has been created successfully.
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #334155;">
        To activate your account and log in, please confirm your email address by clicking the button below. After confirmation, you will be able to sign in and start splitting bills with friends.
      </p>
      <p style="margin: 28px 0;">
        <a href="${verifyUrl}" style="background: #06B6D4; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Confirm My Email</a>
      </p>
      <p style="font-size: 14px; color: #64748b;">
        Or copy this link: <a href="${verifyUrl}" style="color: #06B6D4;">${verifyUrl}</a>
      </p>
      <hr style="margin: 28px 0; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="font-size: 14px; color: #64748b;">
        This confirmation link expires in 24 hours. If you did not create an account, you can safely ignore this email.
      </p>
    </div>
  `;

  const data = await sendEmail({
    to,
    subject: 'BillSplit - Confirm Your Email Address',
    html,
  });
  console.log('[Mail] Verification email sent. Message ID:', data?.messageId);
  return data;
}

/**
 * Sends password reset email.
 */
export async function sendPasswordResetEmail(to, resetUrl, firstName) {
  if (!isEmailConfigured()) {
    console.log('[Dev] SMTP is not configured. Reset link:', resetUrl);
    return null;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #164E63;">Reset Your Password</h2>
      <p>Hi ${firstName || 'there'},</p>
      <p>You requested a password reset. Click the button below to set a new password:</p>
      <p><a href="${resetUrl}" style="background: #06B6D4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Reset Password</a></p>
      <p>Or copy this link: ${resetUrl}</p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>Best regards,<br />The BillSplit Team</p>
    </div>
  `;

  const data = await sendEmail({
    to,
    subject: 'BillSplit - Reset Your Password',
    html,
  });
  return data;
}

/**
 * Sends guest invitation email with link to join the bill (invitation code in URL).
 */
export async function sendGuestInviteEmail(to, joinUrl, billTitle, inviterName) {
  if (!isEmailConfigured()) {
    console.log('[Dev] SMTP is not configured. Guest join link:', joinUrl);
    return null;
  }
  const displayBill = billTitle || 'a bill';
  const displayInviter = inviterName || 'Someone';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #164E63; margin-bottom: 16px;">You're Invited to Split a Bill</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #334155;">
        ${displayInviter} has invited you to view and contribute to <strong>${displayBill}</strong> on BillSplit.
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #334155;">
        You can join as a guest (no account required). Click the button below to enter your name and email and access the bill. Guest access is 6 hours per day; you can re-enter the invitation code to extend.
      </p>
      <p style="margin: 24px 0;">
        <a href="${joinUrl}" style="background: #06B6D4; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Join as Guest</a>
      </p>
      <p style="font-size: 14px; color: #64748b;">
        Or copy this link: <a href="${joinUrl}" style="color: #06B6D4;">${joinUrl}</a>
      </p>
      <p style="margin-top: 24px; font-size: 14px; color: #64748b;">
        Best regards,<br />The BillSplit Team
      </p>
    </div>
  `;

  const data = await sendEmail({
    to,
    subject: `BillSplit – You're invited to "${displayBill}"`,
    html,
  });
  console.log('[Mail] Guest invite sent to', to);
  return data;
}

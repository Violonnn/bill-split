import { Resend } from 'resend';

export const isEmailConfigured = () => !!process.env.RESEND_API_KEY;

const getResend = () =>
  process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const getFrom = () =>
  process.env.RESEND_FROM || 'BillSplit <onboarding@resend.dev>';

/**
 * Resend test/onboarding domain can only send to delivered@resend.dev unless you verify your own domain.
 * Set RESEND_DEV_RECIPIENT=delivered@resend.dev to force all outgoing mail to that address (for testing).
 */
const getEffectiveTo = (userEmail) => {
  const override = process.env.RESEND_DEV_RECIPIENT?.trim();
  if (override) {
    console.log('[Resend] Using dev recipient override:', override, '(original:', userEmail, ')');
    return override;
  }
  return userEmail;
};

/**
 * Sends email confirmation. User must click the link to confirm before they can log in.
 */
export async function sendVerificationEmail(to, verifyUrl, firstName) {
  const displayName = firstName || 'there';

  const resend = getResend();
  if (!resend) {
    console.log('[Dev] RESEND_API_KEY not set. Verify link:', verifyUrl);
    return null;
  }

  const effectiveTo = getEffectiveTo(to);

  const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #164E63; margin-bottom: 16px;">Welcome to BillSplit, ${displayName}!</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #334155;">
        Congratulations on creating your account! We are excited to have you on board.
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #334155;">
        Please confirm your email address by clicking the button below. Once confirmed, you will be able to log in and start splitting bills with friends effortlessly.
      </p>
      <p style="margin: 24px 0;">
        <a href="${verifyUrl}" style="background: #06B6D4; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Confirm My Email</a>
      </p>
      <p style="font-size: 14px; color: #64748b;">
        Or copy this confirmation link: <a href="${verifyUrl}" style="color: #06B6D4;">${verifyUrl}</a>
      </p>
      <hr style="margin: 28px 0; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="font-size: 14px; color: #64748b;">
        After confirming, you can sign in here: <a href="${loginUrl}" style="color: #06B6D4; font-weight: 600;">Go to Login Page</a>
      </p>
      <p style="font-size: 14px; color: #64748b;">
        This confirmation link expires in 24 hours. If you did not create an account, you can safely ignore this email.
      </p>
      <p style="margin-top: 24px; font-size: 14px; color: #64748b;">
        Best regards,<br />The BillSplit Team
      </p>
    </div>
  `;

  const fromAddr = getFrom();
  const { data, error } = await resend.emails.send({
    from: fromAddr,
    to: [effectiveTo],
    subject: 'BillSplit – Confirm Your Email Address',
    html,
  });

  if (error) {
    const msg = error?.message || JSON.stringify(error);
    console.error('[Resend] Send failed:', { to, from: fromAddr, error: msg, full: error });
    throw new Error(msg);
  }
  console.log('[Resend] Email sent successfully to', to, 'id:', data?.id);
  return data;
}

/**
 * Sends password reset email.
 */
export async function sendPasswordResetEmail(to, resetUrl, firstName) {
  const resend = getResend();
  if (!resend) {
    console.log('[Dev] RESEND_API_KEY not set. Reset link:', resetUrl);
    return null;
  }

  const effectiveTo = getEffectiveTo(to);

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

  const { data, error } = await resend.emails.send({
    from: getFrom(),
    to: [effectiveTo],
    subject: 'BillSplit - Reset Your Password',
    html,
  });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Sends guest invitation email with link to join the bill (invitation code in URL).
 */
export async function sendGuestInviteEmail(to, joinUrl, billTitle, inviterName) {
  const resend = getResend();
  if (!resend) {
    console.log('[Dev] RESEND_API_KEY not set. Guest join link:', joinUrl);
    return null;
  }

  const effectiveTo = getEffectiveTo(to);
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

  const { data, error } = await resend.emails.send({
    from: getFrom(),
    to: [effectiveTo],
    subject: `BillSplit – You're invited to "${displayBill}"`,
    html,
  });

  if (error) {
    console.error('[Resend] Guest invite send failed:', to, error?.message || error);
    throw new Error(error?.message || 'Failed to send invite email');
  }
  console.log('[Resend] Guest invite sent to', to);
  return data;
}

import { Resend } from 'resend';

// Initialize Resend with API key
const resendApiKey = process.env.RESEND_API_KEY;
export const resend = new Resend(resendApiKey);

// Default sender email address
const defaultFromEmail = process.env.EMAIL_FROM || 'GunEvent <notifications@testmail.quaalescookies.com>';

/**
 * Sends an email using Resend
 * @param to Email address to send to
 * @param subject Email subject
 * @param html HTML content of the email
 * @param text Plain text content of the email (optional)
 * @returns Success status and message or error
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = defaultFromEmail
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}) {
  if (!resendApiKey) {
    console.error('RESEND_API_KEY is not set');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    console.log(`Attempting to send email from: ${from} to: ${to}`);
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text: text || undefined,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error: any) {
    console.error('Exception sending email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sends a verification code email
 * @param to Email address to send to
 * @param code Verification code
 * @returns Success status
 */
export async function sendVerificationEmail(to: string, code: string) {
  const subject = 'Your GunEvent Verification Code';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Your Verification Code</h2>
      <p>Use the following code to verify your account:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
        ${code}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, you can safely ignore this email.</p>
      <p style="margin-top: 30px; color: #777; font-size: 12px;">
        This is an automated message from GunEvent. Please do not reply to this email.
      </p>
    </div>
  `;
  
  const text = `
    Your Verification Code: ${code}
    
    This code will expire in 10 minutes.
    
    If you didn't request this code, you can safely ignore this email.
  `;
  
  const result = await sendEmail({
    to,
    subject,
    html,
    text
  });
  
  return result.success;
} 
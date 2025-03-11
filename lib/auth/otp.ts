import { prisma } from '@/lib/prisma';
import { sendSMS } from '@/lib/twilio';

/**
 * Generates a random OTP code
 * @returns A 6-digit OTP code
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Sets an OTP for a user and stores it in the database
 * @param userId The user ID to set the OTP for
 * @returns The generated OTP
 */
export async function setOTPForUser(userId: string): Promise<string> {
  // Generate a new OTP
  const otp = generateOTP();
  
  // Set expiry to 10 minutes from now
  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() + 10);
  
  // Store the OTP in the database
  await prisma.user.update({
    where: { id: userId },
    data: {
      otpSecret: otp,
      otpExpiry: expiryTime
    }
  });
  
  return otp;
}

/**
 * Verifies an OTP for a user
 * @param userId The user ID to verify the OTP for
 * @param otp The OTP to verify
 * @returns Whether the OTP is valid
 */
export async function verifyOTP(userId: string, otp: string): Promise<boolean> {
  // Get the user's OTP info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { otpSecret: true, otpExpiry: true }
  });
  
  if (!user || !user.otpSecret || !user.otpExpiry) {
    return false;
  }
  
  // Check if OTP has expired
  const now = new Date();
  if (now > user.otpExpiry) {
    return false;
  }
  
  // Check if OTP matches
  const isValid = user.otpSecret === otp;
  
  if (isValid) {
    // Clear the OTP after successful verification
    await prisma.user.update({
      where: { id: userId },
      data: {
        otpSecret: null,
        otpExpiry: null
      }
    });
  }
  
  return isValid;
}

/**
 * Sends an OTP to a user via email
 * This is a placeholder function - implement your email sending logic here
 * @param email The email to send the OTP to
 * @param otp The OTP to send
 * @returns Whether the email was sent successfully
 */
export async function sendEmailOTP(email: string, otp: string): Promise<boolean> {
  // This is where you would integrate with your email service (SendGrid, Mailgun, etc.)
  console.log(`SEND EMAIL: OTP ${otp} sent to ${email}`);
  
  // For now, just return true to simulate successful sending
  return true;
}

/**
 * Sends an OTP to a user via SMS using Twilio
 * @param phoneNumber The phone number to send the OTP to
 * @param otp The OTP to send
 * @returns Whether the SMS was sent successfully
 */
export async function sendSMSOTP(phoneNumber: string, otp: string): Promise<boolean> {
  try {
    const message = `Your GunEvent verification code is: ${otp}. Valid for 10 minutes.`;
    
    // Use the Twilio service to send the SMS
    const success = await sendSMS(phoneNumber, message);
    
    return success;
  } catch (error) {
    console.error('Error in sendSMSOTP:', error);
    return false;
  }
} 
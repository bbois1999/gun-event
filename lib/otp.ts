import { randomBytes, createHmac } from 'crypto';
import { prisma } from '@/lib/prisma';

// Generate a random OTP
export function generateOTP(length: number = 6): string {
  // Generate a random number with the specified length
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
}

// Set OTP for a user
export async function setOTPForUser(userId: string, expiryMinutes: number = 10): Promise<string> {
  const otp = generateOTP();
  const otpSecret = otp;
  const otpExpiry = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  // Update user with OTP info
  await prisma.user.update({
    where: { id: userId },
    data: {
      otpSecret,
      otpExpiry,
    }
  });
  
  return otp;
}

// Verify OTP for a user
export async function verifyOTP(userId: string, providedOTP: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      otpSecret: true,
      otpExpiry: true,
    }
  });
  
  // Check if OTP exists and is valid
  if (!user || !user.otpSecret || !user.otpExpiry) {
    return false;
  }
  
  // Check if OTP has expired
  if (user.otpExpiry < new Date()) {
    return false;
  }
  
  // Check if OTP matches
  const isValid = user.otpSecret === providedOTP;
  
  if (isValid) {
    // Clear OTP after successful verification
    await prisma.user.update({
      where: { id: userId },
      data: {
        otpSecret: null,
        otpExpiry: null,
      }
    });
  }
  
  return isValid;
}

// TODO: Implement email sending functionality
export async function sendEmailOTP(email: string, otp: string): Promise<boolean> {
  // In a real implementation, you would use a service like SendGrid, Mailgun, etc.
  // For now, just log the OTP
  console.log(`[DEV ONLY] Email OTP for ${email}: ${otp}`);
  
  // In a real implementation, handle errors and return false if sending fails
  return true;
}

// TODO: Implement SMS sending functionality
export async function sendSMSOTP(phoneNumber: string, otp: string): Promise<boolean> {
  // In a real implementation, you would use a service like Twilio, etc.
  // For now, just log the OTP
  console.log(`[DEV ONLY] SMS OTP for ${phoneNumber}: ${otp}`);
  
  // In a real implementation, handle errors and return false if sending fails
  return true;
} 
import { prisma } from '@/lib/prisma';
import { sendSMS } from '@/lib/twilio';
import { sendVerificationEmail } from '@/lib/resend';
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

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
  try {
    // Get the user with contact information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        email: true, 
        phoneNumber: true,
        otpSecret: true, 
        otpExpiry: true 
      }
    });
    
    if (!user || !user.otpExpiry) {
      console.log("No user found or OTP expired");
      return false;
    }
    
    // Check if OTP has expired
    const now = new Date();
    if (now > user.otpExpiry) {
      console.log("OTP expired");
      return false;
    }
    
    // Get the contact information to check against Twilio
    const contactInfo = user.phoneNumber || user.email;
    
    if (!contactInfo) {
      console.log("No contact info found for user");
      return false;
    }
    
    console.log(`Verifying OTP for ${contactInfo} with code ${otp}`);
    
    // Use Twilio Verify to check the code
    try {
      const verificationCheck = await client.verify.v2
        .services(VERIFY_SERVICE_SID!)
        .verificationChecks.create({
          to: contactInfo,
          code: otp
        });
      
      const isValid = verificationCheck.status === 'approved';
      console.log(`Twilio verification result: ${verificationCheck.status}`);
      
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
    } catch (twilioError) {
      console.error("Twilio verification error:", twilioError);
      
      // Fall back to direct OTP check if Twilio fails
      const isValid = user.otpSecret === otp;
      console.log(`Fallback to direct OTP check: ${isValid}`);
      
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
  } catch (error) {
    console.error("OTP verification error:", error);
    return false;
  }
}

/**
 * Sends an OTP to a user via email
 * @param email The email to send the OTP to
 * @param otp The OTP to send
 * @returns Whether the email was sent successfully
 */
export async function sendEmailOTP(email: string, otp: string): Promise<boolean> {
  try {
    console.log(`Sending OTP ${otp} via email to ${email}`);
    
    // Use the Resend service to send the email
    const success = await sendVerificationEmail(email, otp);
    
    if (success) {
      console.log(`Successfully sent OTP email to ${email}`);
    } else {
      console.error(`Failed to send OTP email to ${email}`);
    }
    
    return success;
  } catch (error) {
    console.error('Error in sendEmailOTP:', error);
    return false;
  }
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
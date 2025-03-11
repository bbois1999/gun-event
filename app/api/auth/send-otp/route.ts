import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import twilio from "twilio";
import { sendEmailOTP } from "@/lib/auth/otp";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

// Helper function to normalize phone numbers
const normalizePhoneNumber = (value: string) => {
  return value.replace(/\D/g, '');
};

// Function to ensure phone number is in E.164 format
const formatPhoneForStorage = (phoneNumber: string): string => {
  const normalized = normalizePhoneNumber(phoneNumber);
  // If not already in proper format, add +1 (US) prefix
  return normalized.startsWith('+') ? normalized : 
         normalized.startsWith('1') ? `+${normalized}` : `+1${normalized}`;
};

// Function to generate a random OTP code
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const { identifier, method } = await request.json();

    if (!identifier) {
      return NextResponse.json(
        { error: "Email or phone number is required" },
        { status: 400 }
      );
    }

    // Determine if identifier is email or phone
    const isEmail = identifier.includes('@');
    
    // For phone numbers, ensure proper formatting
    const normalizedIdentifier = isEmail 
      ? identifier 
      : formatPhoneForStorage(identifier);

    console.log(`Looking for user with ${isEmail ? 'email' : 'phone'}: ${normalizedIdentifier}`);

    // Find user by email or phone
    let user = await prisma.user.findFirst({
      where: isEmail
        ? { email: normalizedIdentifier }
        : { phoneNumber: normalizedIdentifier },
    });

    // If not found and it's a phone number, try alternative formats
    if (!user && !isEmail) {
      const numericPhoneOnly = normalizePhoneNumber(identifier);
      console.log("Trying alternative phone lookup:", numericPhoneOnly);
      
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { phoneNumber: `+${numericPhoneOnly}` },
            { phoneNumber: `+1${numericPhoneOnly}` },
            { phoneNumber: numericPhoneOnly }
          ]
        }
      });
    }

    if (!user) {
      console.log(`User not found for ${isEmail ? 'email' : 'phone'}: ${normalizedIdentifier}`);
      return NextResponse.json(
        { error: "No account found with this information" },
        { status: 404 }
      );
    }

    console.log(`User found: ${user.id}, sending verification code via ${method}`);

    try {
      let verificationSuccess = false;
      
      // Set OTP expiry (15 minutes)
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 15);
      
      if (method === "email") {
        // For email, generate our own OTP and send via Resend
        const otp = generateOTP();
        
        // Store the OTP in the database
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            otpSecret: otp,
            otpExpiry
          },
        });
        
        // Send email with the OTP
        verificationSuccess = await sendEmailOTP(user.email!, otp);
      } else {
        // For SMS, use Twilio Verify
        const verification = await client.verify.v2
          .services(VERIFY_SERVICE_SID!)
          .verifications.create({
            to: user.phoneNumber!,
            channel: "sms",
          });

        console.log(`Twilio verification status: ${verification.status}`);
        verificationSuccess = verification.status === "pending";
        
        // Update user with OTP expiry
        await prisma.user.update({
          where: { id: user.id },
          data: { otpExpiry },
        });
      }
      
      if (!verificationSuccess) {
        return NextResponse.json(
          { error: `Failed to send verification code via ${method}` },
          { status: 500 }
        );
      }

      // Return success response
      return NextResponse.json({
        success: true,
        message: `Verification code sent to your ${method}`,
        method,
        identifier: method === "email" ? user.email : user.phoneNumber,
      });
    } catch (error: any) {
      console.error("Verification send error:", error);
      return NextResponse.json(
        { error: `Failed to send verification code: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in send-otp:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 
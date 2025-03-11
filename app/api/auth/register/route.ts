import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import twilio from "twilio";

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

// Store pending registrations in memory (in production, use Redis or similar)
const pendingRegistrations = new Map<string, {
  email: string;
  username: string;
  phoneNumber: string;
  verificationMethod: string;
  expiresAt: Date;
}>();

// Utility function to normalize phone numbers
const normalizePhoneNumber = (value: string) => {
  // Remove all non-numeric characters and ensure it starts with +
  const normalized = value.replace(/\D/g, '');
  return normalized.startsWith('+') ? normalized : `+1${normalized}`;
};

export async function POST(request: Request) {
  try {
    const { email, username, phoneNumber, verificationMethod } = await request.json();

    // Validate required fields
    if (!email || !username || !phoneNumber) {
      return NextResponse.json(
        { error: 'Email, username, and phone number are required' },
        { status: 400 }
      );
    }

    // Validate verification method
    if (!verificationMethod || (verificationMethod !== 'email' && verificationMethod !== 'phone')) {
      return NextResponse.json(
        { error: 'Valid verification method (email or phone) is required' },
        { status: 400 }
      );
    }

    // Normalize the phone number
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

    // Check if email is taken
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email is already taken' },
        { status: 409 }
      );
    }

    // Check if username is taken
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    // Check if phone number is taken
    const existingPhone = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhoneNumber },
    });

    if (existingPhone) {
      return NextResponse.json(
        { error: 'Phone number is already registered' },
        { status: 409 }
      );
    }

    // Store registration data temporarily
    const identifier = verificationMethod === 'email' ? email : normalizedPhoneNumber;
    pendingRegistrations.set(identifier, {
      email,
      username,
      phoneNumber: normalizedPhoneNumber,
      verificationMethod,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
    });

    // Send verification code using Twilio Verify
    try {
      const verification = await client.verify.v2
        .services(VERIFY_SERVICE_SID!)
        .verifications.create({
          to: verificationMethod === 'phone' ? normalizedPhoneNumber : email,
          channel: verificationMethod === 'phone' ? 'sms' : 'email'
        });

      console.log('Verification status:', verification.status);

      // Create temporary user record with verification pending status
      const user = await prisma.user.create({
        data: {
          email,
          username,
          phoneNumber: normalizedPhoneNumber,
          verifiedEmail: false,
          verifiedPhone: false,
          preferredMfa: verificationMethod,
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
        },
      });

      return NextResponse.json({
        success: true,
        message: `Verification code sent to your ${verificationMethod}`,
        identifier: verificationMethod === 'phone' ? normalizedPhoneNumber : email,
        email,
        phoneNumber: normalizedPhoneNumber,
        method: verificationMethod
      });
    } catch (error: any) {
      console.error('Twilio verification error:', error);
      return NextResponse.json(
        { error: `Failed to send verification code: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration' },
      { status: 500 }
    );
  }
}

// Export pendingRegistrations for use in verify endpoint
export { pendingRegistrations }; 
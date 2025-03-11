import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import twilio from "twilio";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

export async function POST(request: Request) {
  try {
    const { identifier, code } = await request.json();

    if (!identifier || !code) {
      return NextResponse.json(
        { error: "Identifier and verification code are required" },
        { status: 400 }
      );
    }
    
    // Determine if identifier is email or phone
    const isEmail = identifier.includes('@');
    
    // Format the identifier appropriately
    const formattedIdentifier = isEmail ? identifier : formatPhoneForStorage(identifier);
    
    console.log(`Processing verification for ${isEmail ? 'email' : 'phone'}: ${formattedIdentifier}`);

    // Find the pending user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: formattedIdentifier },
          { phoneNumber: formattedIdentifier }
        ],
        otpExpiry: {
          gt: new Date()
        }
      }
    });
    
    // If not found and it's a phone number, try alternative formats
    if (!user && !isEmail) {
      const numericPhone = normalizePhoneNumber(identifier);
      console.log("Trying alternative phone formats for verification:", numericPhone);
      
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { phoneNumber: `+${numericPhone}` },
            { phoneNumber: `+1${numericPhone}` },
            { phoneNumber: numericPhone }
          ],
          otpExpiry: {
            gt: new Date()
          }
        }
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "No pending verification found or verification expired" },
        { status: 400 }
      );
    }

    // Use the actual stored identifier for verification
    const verificationIdentifier = isEmail ? user.email : user.phoneNumber;
    console.log(`Using stored identifier for verification: ${verificationIdentifier}`);

    try {
      let isVerificationValid = false;
      
      if (isEmail) {
        // For email, check against stored OTP in database
        isVerificationValid = user.otpSecret === code;
        console.log(`Email OTP verification result: ${isVerificationValid}`);
      } else {
        // For SMS, use Twilio Verify API
        const verificationCheck = await client.verify.v2
          .services(VERIFY_SERVICE_SID!)
          .verificationChecks.create({
            to: verificationIdentifier!,
            code
          });

        isVerificationValid = verificationCheck.status === 'approved';
        console.log(`SMS verification result: ${verificationCheck.status}`);
      }

      if (isVerificationValid) {
        console.log("OTP verified successfully!");
        
        // Update user verification status
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            verifiedEmail: isEmail ? true : undefined,
            verifiedPhone: !isEmail ? true : undefined,
            otpSecret: null, // Clear the OTP
            otpExpiry: new Date() // Expire the OTP immediately after successful verification
          },
          select: {
            id: true,
            email: true, 
            username: true,
            phoneNumber: true,
            verifiedEmail: true,
            verifiedPhone: true
          }
        });

        // Create token for direct login with the format NextAuth expects
        const token = {
          name: updatedUser.username,
          email: updatedUser.email,
          picture: null, // NextAuth expects this
          sub: updatedUser.id, // This is required by NextAuth
          id: updatedUser.id,
          username: updatedUser.username,
          phoneNumber: updatedUser.phoneNumber,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
        };

        console.log("Creating login session with token:", JSON.stringify(token));

        // Create response with session cookie
        const response = NextResponse.json({
          success: true,
          message: "Verification successful",
          user: updatedUser
        });
        
        // Set the session cookie for immediate login
        response.cookies.set({
          name: "next-auth.session-token",
          value: JSON.stringify(token),
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 30 * 24 * 60 * 60 // 30 days
        });

        // Also add a custom flag cookie that can be seen by client code
        response.cookies.set({
          name: "auth-login-pending",
          value: "true",
          path: "/",
          maxAge: 60 // 1 minute expiry
        });
        
        return response;
      } else {
        return NextResponse.json(
          { error: "Invalid verification code" },
          { status: 400 }
        );
      }
    } catch (error: any) {
      console.error('Verification check error:', error);
      return NextResponse.json(
        { error: `Verification failed: ${error.message}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: "An unexpected error occurred during verification" },
      { status: 500 }
    );
  }
} 
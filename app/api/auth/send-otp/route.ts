import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setOTPForUser, sendEmailOTP, sendSMSOTP } from "@/lib/auth/otp";

// Utility function to normalize phone numbers
const normalizePhoneNumber = (value: string) => {
  // Remove all non-numeric characters
  return value.replace(/\D/g, '');
};

export async function POST(request: Request) {
  try {
    const { identifier, method } = await request.json();

    if (!identifier) {
      return NextResponse.json(
        { error: "Identifier (email or phone) is required" },
        { status: 400 }
      );
    }

    if (!method || (method !== "email" && method !== "phone")) {
      return NextResponse.json(
        { error: "Valid method (email or phone) is required" },
        { status: 400 }
      );
    }

    // Validate identifier format based on method
    if (method === "email" && !identifier.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (method === "phone" && !/^[\d\s()+\-]+$/.test(identifier)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // Normalize phone number if method is phone
    const normalizedIdentifier = method === "phone" 
      ? normalizePhoneNumber(identifier)
      : identifier;

    // Find the user by email or phone number
    const user = await prisma.user.findFirst({
      where: method === "email" 
        ? { email: normalizedIdentifier } 
        : { phoneNumber: normalizedIdentifier }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Generate and store OTP
    const otp = await setOTPForUser(user.id);
    
    // Send OTP via the preferred method
    let otpSent = false;
    
    if (method === "email") {
      otpSent = await sendEmailOTP(normalizedIdentifier, otp);
    } else if (method === "phone") {
      otpSent = await sendSMSOTP(normalizedIdentifier, otp);
    }

    // Update the user's preferred MFA method
    await prisma.user.update({
      where: { id: user.id },
      data: { preferredMfa: method }
    });

    if (!otpSent) {
      return NextResponse.json(
        { error: "Failed to send verification code" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("OTP request error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 
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
    const body = await request.json();
    const { email, username, phoneNumber, verificationMethod } = body;

    // Validate input
    if (!email || !username || !phoneNumber) {
      return NextResponse.json(
        { error: "Email, username, and phone number are required" },
        { status: 400 }
      );
    }

    if (!verificationMethod || (verificationMethod !== "email" && verificationMethod !== "phone")) {
      return NextResponse.json(
        { error: "A valid verification method (email or phone) is required" },
        { status: 400 }
      );
    }

    // Normalize the phone number
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

    // Check if user already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Check if username is taken
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }

    // Check if phone number is taken
    const existingPhone = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhoneNumber },
    });

    if (existingPhone) {
      return NextResponse.json(
        { error: "Phone number is already registered" },
        { status: 409 }
      );
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        phoneNumber: normalizedPhoneNumber,
        preferredMfa: verificationMethod,
        verifiedEmail: false,
        verifiedPhone: false,
      },
    });

    // Generate and send OTP
    const otp = await setOTPForUser(user.id);
    let success = false;

    if (verificationMethod === "email") {
      success = await sendEmailOTP(email, otp);
    } else if (verificationMethod === "phone") {
      success = await sendSMSOTP(normalizedPhoneNumber, otp);
    }

    if (!success) {
      // If we can't send the verification, still continue but notify the user
      console.error(`Failed to send verification code via ${verificationMethod}`);
    }

    // Return success without exposing sensitive data
    return NextResponse.json(
      { 
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          phoneNumber: user.phoneNumber,
          verificationSent: success,
          verificationMethod
        },
        message: success 
          ? `Verification code sent to your ${verificationMethod}` 
          : `Account created but failed to send verification code to your ${verificationMethod}`
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
} 
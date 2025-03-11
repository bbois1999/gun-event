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

export async function POST(request: Request) {
  try {
    const { identifier, code } = await request.json();

    if (!identifier || !code) {
      return NextResponse.json(
        { error: "Identifier and verification code are required" },
        { status: 400 }
      );
    }

    // Find the pending user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phoneNumber: identifier }
        ],
        otpExpiry: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "No pending verification found or verification expired" },
        { status: 400 }
      );
    }

    try {
      // Verify the code with Twilio
      const verificationCheck = await client.verify.v2
        .services(VERIFY_SERVICE_SID!)
        .verificationChecks.create({
          to: identifier,
          code
        });

      if (verificationCheck.status === 'approved') {
        console.log("OTP verified successfully!");
        
        // Update user verification status
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            verifiedEmail: identifier === user.email ? true : undefined,
            verifiedPhone: identifier === user.phoneNumber ? true : undefined,
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
      console.error('Twilio verification check error:', error);
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
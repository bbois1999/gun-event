import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Find the verified user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        phoneNumber: true,
        verifiedEmail: true,
        verifiedPhone: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Only allow direct login for verified users
    if (!user.verifiedEmail && !user.verifiedPhone) {
      return NextResponse.json(
        { error: "User is not verified" },
        { status: 403 }
      );
    }

    // Create a token with the correct format for NextAuth
    const token = {
      name: user.username,
      email: user.email,
      picture: null, // NextAuth expects this
      sub: user.id, // Required by NextAuth
      id: user.id,
      username: user.username,
      phoneNumber: user.phoneNumber,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
    };

    console.log("Creating direct login token:", JSON.stringify(token));

    // Create a response with cookies
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
    
    // Set the session cookie with the token
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
  } catch (error) {
    console.error("Direct login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 
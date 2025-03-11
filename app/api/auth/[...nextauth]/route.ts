import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyOTP } from "@/lib/auth/otp";

// Utility function to normalize phone numbers
const normalizePhoneNumber = (value: string) => {
  // Remove all non-numeric characters
  return value.replace(/\D/g, '');
};

// Add custom properties to the session user
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      username?: string | null;
      phoneNumber?: string | null;
    }
  }
}

export const authOptions: NextAuthOptions = {
  // A secret is still required even without encryption
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      id: "otp",
      name: "OTP",
      credentials: {
        identifier: { label: "Email or Phone", type: "text", placeholder: "email@example.com or (123) 456-7890" },
        otp: { label: "Verification Code", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.otp) {
          console.log("Missing credentials", credentials);
          return null;
        }

        try {
          const isEmail = credentials.identifier.includes('@');
          
          // Normalize phone number if needed
          const normalizedIdentifier = isEmail 
            ? credentials.identifier 
            : normalizePhoneNumber(credentials.identifier);
          
          console.log("Looking for user with identifier:", normalizedIdentifier);
          
          // Find user based on identifier type
          const user = await prisma.user.findFirst({
            where: isEmail 
              ? { email: normalizedIdentifier } 
              : { phoneNumber: normalizedIdentifier },
            select: {
              id: true,
              email: true,
              username: true,
              phoneNumber: true,
              otpSecret: true,
              otpExpiry: true
            }
          });

          if (!user) {
            console.log("User not found for identifier:", normalizedIdentifier);
            return null;
          }

          console.log("Found user:", user.id, "Verifying OTP:", credentials.otp);
          
          // Verify OTP
          const isValidOTP = await verifyOTP(user.id, credentials.otp);
          
          if (!isValidOTP) {
            console.log("Invalid OTP for user:", user.id);
            return null;
          }

          console.log("OTP verified successfully for user:", user.id);
          
          // Return user data
          return {
            id: user.id,
            email: user.email,
            username: user.username,
            phoneNumber: user.phoneNumber
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  jwt: {
    // Just use simple JSON handling to be compatible with our direct login
    encode: async ({ token }) => {
      if (!token) return "";
      return JSON.stringify(token);
    },
    decode: async ({ token }) => {
      if (!token) return {};
      
      try {
        // Try to parse the token
        return JSON.parse(token as string);
      } catch (error) {
        console.error("Failed to parse JWT token", error);
        // Return a minimal valid token object if parsing fails
        return { 
          sub: String(token) 
        };
      }
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.phoneNumber = (user as any).phoneNumber;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.phoneNumber = token.phoneNumber as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
    error: '/login'
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
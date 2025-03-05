import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
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
  adapter: PrismaAdapter(prisma) as any,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "OTP",
      credentials: {
        identifier: { label: "Email or Phone", type: "text", placeholder: "email@example.com or (123) 456-7890" },
        otp: { label: "Verification Code", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.otp) {
          return null;
        }

        try {
          const isEmail = credentials.identifier.includes('@');
          
          // Normalize phone number if needed
          const normalizedIdentifier = isEmail 
            ? credentials.identifier 
            : normalizePhoneNumber(credentials.identifier);
          
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

          // Verify OTP
          const isValidOTP = await verifyOTP(user.id, credentials.otp);
          
          if (!isValidOTP) {
            console.log("Invalid OTP for user:", user.id);
            return null;
          }

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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.phoneNumber = user.phoneNumber;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.phoneNumber = token.phoneNumber as string;
      }
      return session;
    }
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 
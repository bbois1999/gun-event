// Temporary auth implementation until NextAuth is set up

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Get the current user from the session
export async function getSessionUser() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return null;
    }
    return session.user;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

// Mock user for development fallback
export const MOCK_USER = {
  id: "temp-user-id",
  name: "Temporary User",
  email: "temp@example.com"
}; 

export { authOptions };

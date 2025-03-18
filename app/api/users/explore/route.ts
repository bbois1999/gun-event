import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

type UserWithoutPassword = {
  id: string;
  email: string;
};

type UserWithFollowStatus = UserWithoutPassword & {
  isFollowing: boolean;
};

type FollowRelation = {
  followingId: string;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user's ID
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all users except the current user
    const users = await prisma.user.findMany({
      where: { 
        id: { 
          not: currentUser.id 
        } 
      },
      select: {
        id: true,
        email: true,
      },
    });

    // Find users that the current user is following
    const userFollowing = await prisma.follow.findMany({
      where: {
        followerId: currentUser.id,
      },
      select: {
        followedId: true,
      },
    });

    // Create a set of following IDs for quick lookup
    const followingIds = new Set(userFollowing.map((follow: { followedId: string }) => follow.followedId));

    // Add isFollowing flag to each user
    const usersWithFollowStatus: UserWithFollowStatus[] = users.map(user => ({
      ...user,
      isFollowing: followingIds.has(user.id),
    }));

    return NextResponse.json(usersWithFollowStatus);
  } catch (error) {
    console.error('Error in /api/users/explore:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
} 
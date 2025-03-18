import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // No need for authentication to view public user profiles
    
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id

    if (!userId) {
      return new NextResponse('Missing user ID', { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        profileImageUrl: true
      }
    })

    if (!user) {
      return new NextResponse('User not found', { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// Add a PATCH endpoint to update profile image
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id

    // Ensure users can only update their own profile
    if (session.user.id !== userId) {
      return new NextResponse('Forbidden: Cannot update another user\'s profile', { status: 403 })
    }

    const body = await request.json()
    const { profileImageUrl, profileImageKey } = body

    if (!profileImageUrl || !profileImageKey) {
      return new NextResponse('Missing profile image data', { status: 400 })
    }

    try {
      // Update the user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          profileImageUrl,
          profileImageKey
        },
        select: {
          id: true,
          email: true,
          username: true,
          profileImageUrl: true,
          profileImageKey: true
        }
      });
      
      return NextResponse.json(updatedUser);
    } catch (prismaError) {
      // Using raw SQL as a fallback
      const result = await prisma.$executeRaw`
        UPDATE User 
        SET profileImageUrl = ${profileImageUrl}, profileImageKey = ${profileImageKey}
        WHERE id = ${userId}
      `;
      
      // Fetch the user after update
      const userAfterRawUpdate = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true
        }
      });
      
      // Add the fields manually since they may not be in the schema yet
      const enrichedUser = {
        ...userAfterRawUpdate,
        profileImageUrl,
        profileImageKey
      };
      
      return NextResponse.json(enrichedUser);
    }
  } catch (error) {
    console.error('Error updating user profile:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// POST to follow a user
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const targetUserId = params.id
    
    // Get the current user's ID
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followedId: {
          followerId: currentUser.id,
          followedId: targetUserId,
        },
      },
    })

    if (existingFollow) {
      return NextResponse.json({ error: 'Already following this user' }, { status: 400 })
    }

    // Create follow relationship
    await prisma.follow.create({
      data: {
        followerId: currentUser.id,
        followedId: targetUserId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error following user:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// DELETE to unfollow a user
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const userIdToUnfollow = params.id
    const currentUserId = session.user.id

    // Check if follow relationship exists
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followedId: {
          followerId: currentUserId,
          followedId: userIdToUnfollow
        }
      }
    })

    if (!follow) {
      return new NextResponse('Not following this user', { status: 404 })
    }

    // Delete follow relationship
    await prisma.follow.delete({
      where: {
        followerId_followedId: {
          followerId: currentUserId,
          followedId: userIdToUnfollow
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unfollowing user:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const userId = params.id
    const currentUserId = session.user.id

    // Get followers count
    const followersCount = await prisma.follow.count({
      where: {
        followedId: userId
      }
    })

    // Check if current user is following this user
    const isFollowing = await prisma.follow.findUnique({
      where: {
        followerId_followedId: {
          followerId: currentUserId,
          followedId: userId
        }
      }
    }) !== null

    return NextResponse.json({
      count: followersCount,
      isFollowing
    })
  } catch (error) {
    console.error('Error fetching followers:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
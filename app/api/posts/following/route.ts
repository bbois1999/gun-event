import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const currentUserId = session.user.id

    // Get IDs of users that the current user follows
    const follows = await prisma.follow.findMany({
      where: {
        followerId: currentUserId
      },
      select: {
        followedId: true
      }
    })

    const followedUserIds = follows.map(follow => follow.followedId)

    // If not following anyone, return empty array
    if (followedUserIds.length === 0) {
      return NextResponse.json([])
    }

    // Fetch posts from followed users
    const [posts, imagePosts] = await Promise.all([
      prisma.post.findMany({
        where: {
          authorId: {
            in: followedUserIds
          },
          published: true
        },
        include: {
          author: {
            select: {
              id: true,
              email: true
            }
          },
          event: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.imagePost.findMany({
        where: {
          authorId: {
            in: followedUserIds
          },
          published: true
        },
        include: {
          author: {
            select: {
              id: true,
              email: true
            }
          },
          event: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ])

    // Combine and sort all posts by creation date
    const allPosts = [...posts, ...imagePosts].sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    )

    return NextResponse.json(allPosts)
  } catch (error) {
    console.error('Error fetching followed posts:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get IDs of users that the current user follows
    const follows = await prisma.follow.findMany({
      where: {
        followerId: currentUser.id
      },
      select: {
        followedId: true
      },
    })

    const followedUserIds = follows.map(follow => follow.followedId)

    // If not following anyone, return empty array
    if (followedUserIds.length === 0) {
      return NextResponse.json([])
    }

    // Fetch both regular posts and image posts from followed users
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
          },
          likes: {
            where: {
              userId: currentUser.id
            },
            select: {
              id: true,
              userId: true
            }
          },
          _count: {
            select: {
              likes: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50
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
          },
          likes: {
            where: {
              userId: currentUser.id
            },
            select: {
              id: true,
              userId: true
            }
          },
          _count: {
            select: {
              likes: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50
      })
    ])

    // Combine and sort all posts by creation date
    const allPosts = [...posts, ...imagePosts].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json(allPosts)
  } catch (error) {
    console.error('Error in following feed API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts from followed users' },
      { status: 500 }
    )
  }
} 
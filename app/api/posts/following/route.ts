import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

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

    // Fetch posts from followed users
    const posts = await prisma.post.findMany({
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
            email: true,
            username: true
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
      take: 100
    });

    // Manually fetch images for each post
    const postsWithImages = await Promise.all(posts.map(async (post) => {
      // Get images for this post using raw SQL query
      const images = await prisma.$queryRaw`
        SELECT id, createdAt, updatedAt, url, key, position, postId 
        FROM PostImage 
        WHERE postId = ${post.id} 
        ORDER BY position ASC
      `;
      
      // Add images to the post
      return {
        ...post,
        images: images || [] // Return empty array if no images found
      };
    }));

    return NextResponse.json(postsWithImages)
  } catch (error) {
    console.error('Error in following feed API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts from followed users' },
      { status: 500 }
    )
  }
} 
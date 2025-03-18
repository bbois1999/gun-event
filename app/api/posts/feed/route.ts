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

    // Fetch posts with their authors, events, and likes
    const posts = await prisma.post.findMany({
      where: {
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
      take: 100 // Increased limit for post feed
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
    console.error('Error in feed API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
} 
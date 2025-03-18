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

    // Get author IDs to fetch their profile images
    const authorIds = [...new Set(posts.map(post => post.authorId))];

    // Fetch profile images for all authors in a single query
    const authorProfiles = await prisma.user.findMany({
      where: {
        id: {
          in: authorIds
        }
      },
      select: {
        id: true,
        profileImageUrl: true
      }
    });

    // Create a lookup map for easy access
    const profileImageLookup = authorProfiles.reduce((acc, author) => {
      acc[author.id] = author.profileImageUrl;
      return acc;
    }, {} as Record<string, string | null>);

    // Manually fetch images for each post
    const postsWithImages = await Promise.all(posts.map(async (post) => {
      // Get images for this post using raw SQL query
      const images = await prisma.$queryRaw`
        SELECT id, createdAt, updatedAt, url, key, position, postId 
        FROM PostImage 
        WHERE postId = ${post.id} 
        ORDER BY position ASC
      `;
      
      // Add images to the post and enhance author with profile image
      return {
        ...post,
        images: images || [], // Return empty array if no images found
        author: {
          ...post.author,
          profileImageUrl: profileImageLookup[post.authorId]
        }
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
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // No need for authentication for public posts
    
    // Properly await params before accessing its properties
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id
    
    if (!userId) {
      return new NextResponse('Missing user ID', { status: 400 })
    }

    // Fetch both regular posts and image posts with their associated events
    // Only fetch published posts for public viewing
    const [posts, imagePosts] = await Promise.all([
      prisma.post.findMany({
        where: {
          authorId: userId,
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
          likes: true,
          _count: {
            select: {
              likes: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.imagePost.findMany({
        where: {
          authorId: userId,
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
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ])

    // Fetch profile image for the author
    const authorProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profileImageUrl: true
      }
    });

    // Combine and sort all posts by creation date
    const allPosts = [...posts, ...imagePosts].map(post => ({
      ...post,
      author: {
        ...post.author,
        profileImageUrl: authorProfile?.profileImageUrl || null
      }
    })).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    )

    return NextResponse.json(allPosts)
  } catch (error) {
    console.error('Error fetching user posts:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
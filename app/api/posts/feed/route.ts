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

    // Fetch both regular posts and image posts with their authors and events
    const [posts, imagePosts] = await Promise.all([
      prisma.post.findMany({
        where: {
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
        take: 50 // Limit to 50 most recent posts
      }),
      prisma.imagePost.findMany({
        where: {
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
    console.error('Error in feed API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
} 
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

    // Ensure users can only access their own posts
    if (session.user.id !== params.id) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Fetch both regular posts and image posts with their associated events
    const [posts, imagePosts] = await Promise.all([
      prisma.post.findMany({
        where: {
          authorId: params.id
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
          authorId: params.id
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
    console.error('Error fetching user posts:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
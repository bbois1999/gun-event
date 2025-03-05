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

    // Fetch both regular posts and image posts with their associated events
    // Only fetch published posts for public viewing
    const [posts, imagePosts] = await Promise.all([
      prisma.post.findMany({
        where: {
          authorId: params.id,
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
          authorId: params.id,
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
    console.error('Error fetching user posts:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
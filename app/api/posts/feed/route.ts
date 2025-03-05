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
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50 // Limit to 50 most recent image posts
      })
    ])

    // Combine and sort all posts by creation date
    const allPosts = [...posts, ...imagePosts].sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    ).slice(0, 50) // Ensure we only return the 50 most recent posts overall

    return NextResponse.json(allPosts)
  } catch (error) {
    console.error('Error fetching posts:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
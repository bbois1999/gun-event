import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const json = await request.json()
    const { title, content, published, event, imageUrl, imageKey } = json

    const post = await prisma.post.create({
      data: {
        title,
        content,
        published,
        ...(imageUrl && { imageUrl }),
        ...(imageKey && { imageKey }),
        author: {
          connect: { id: session.user.id }
        },
        ...(event && {
          event: {
            connect: { id: event.connect.id }
          }
        })
      },
      include: {
        author: true
      }
    })

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error creating post:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
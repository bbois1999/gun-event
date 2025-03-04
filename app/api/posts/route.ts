import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const json = await request.json()
    const { title, content, published, event, image } = json

    const post = await prisma.post.create({
      data: {
        title,
        content,
        published,
        ...(image && { image }),
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
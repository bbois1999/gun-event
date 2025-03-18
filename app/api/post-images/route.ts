import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export interface PostImageInput {
  url: string;
  key: string;
  position: number;
}

export async function POST(request: Request) {
  try {
    // Validate session
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request data
    const data = await request.json()
    const { postId, images } = data

    // Validate request data
    if (!postId || !images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. postId and images array are required' },
        { status: 400 }
      )
    }

    // Verify post ownership
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to add images to this post' },
        { status: 403 }
      )
    }

    // Create post images using raw SQL
    const createdImages = []
    
    for (const image of images) {
      const { url, key, position } = image
      
      // Validate each image
      if (!url || !key) {
        continue // Skip invalid images
      }
      
      // Generate a unique ID
      const id = crypto.randomUUID()
      const now = new Date()
      
      // Execute raw SQL
      await prisma.$executeRaw`
        INSERT INTO PostImage (id, createdAt, updatedAt, url, key, position, postId) 
        VALUES (${id}, ${now}, ${now}, ${url}, ${key}, ${position || 0}, ${postId})
      `
      
      createdImages.push({
        id,
        url,
        key,
        position: position || 0,
        postId
      })
    }

    return NextResponse.json({ 
      success: true,
      images: createdImages
    })
  } catch (error) {
    console.error('Error creating post images:', error)
    return NextResponse.json(
      { error: 'Failed to create post images' },
      { status: 500 }
    )
  }
} 
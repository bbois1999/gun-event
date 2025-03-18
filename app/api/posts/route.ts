import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const limit = searchParams.get('limit')
    
    const whereClause: any = {}
    
    if (eventId) {
      whereClause.eventId = eventId
    }
    
    const posts = await prisma.post.findMany({
      where: whereClause,
      take: limit ? parseInt(limit) : undefined,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
          },
        },
        likes: true,
        // images: true - Removed due to linter error, but we need to manually add the images in the response
        _count: {
          select: {
            likes: true,
          },
        },
      },
    })
    
    // Manually fetch and add images for each post
    const postsWithImages = await Promise.all(posts.map(async (post) => {
      // Use $queryRaw instead of accessing the postImage property directly
      const images = await prisma.$queryRaw`
        SELECT id, createdAt, updatedAt, url, key, position, postId 
        FROM PostImage 
        WHERE postId = ${post.id} 
        ORDER BY position ASC
      `;
      
      return {
        ...post,
        images
      };
    }));
    
    return NextResponse.json(postsWithImages)
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { title, content, eventId, imageUrl, imageKey, additionalImages } = body
    
    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }
    
    console.log("Creating post with:", { title, eventId, hasImage: !!imageUrl });
    if (additionalImages) {
      console.log("With additional images:", additionalImages.length);
    }
    
    // Create post
    const post = await prisma.post.create({
      data: {
        title,
        content,
        published: true, // Make sure posts are published by default
        authorId: session.user.id,
        ...(eventId ? { eventId } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        ...(imageKey ? { imageKey } : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
    })
    
    // If there are additional images, add them to the post
    if (additionalImages && Array.isArray(additionalImages) && additionalImages.length > 0) {
      try {
        console.log("Adding additional images to post:", post.id);
        
        // Create all the additional images using raw SQL since the model might not be available yet
        for (const image of additionalImages) {
          // Use executeRaw to insert directly into the PostImage table
          await prisma.$executeRaw`
            INSERT INTO PostImage (id, createdAt, updatedAt, url, key, position, postId) 
            VALUES (${crypto.randomUUID()}, ${new Date()}, ${new Date()}, ${image.url}, ${image.key}, ${image.position}, ${post.id})
          `;
        }
        
        console.log(`Successfully added ${additionalImages.length} additional images`);
      } catch (imageError) {
        console.error('Error adding additional images:', imageError);
        // We don't fail the post creation if image addition fails
      }
    }
    
    return NextResponse.json(post)
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
} 
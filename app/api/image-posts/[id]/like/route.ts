import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// POST to like an image post
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract and validate the ID - properly await params
    const resolvedParams = await Promise.resolve(params);
    const imagePostId = resolvedParams.id;
    
    console.log('Attempting to like image post:', { imagePostId, user: session.user.email });
    
    if (!imagePostId) {
      return NextResponse.json({ error: 'Missing image post ID' }, { status: 400 });
    }
    
    // Get the current user's ID
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!currentUser) {
      console.log('User not found:', session.user.email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if image post exists
    const imagePost = await prisma.imagePost.findUnique({
      where: { id: imagePostId },
      include: { author: true }
    });

    if (!imagePost) {
      console.log('Image post not found:', imagePostId);
      
      // Try to find if this is actually a regular post
      const regularPost = await prisma.post.findUnique({
        where: { id: imagePostId }
      });
      
      if (regularPost) {
        console.log('Found as regular post instead:', imagePostId);
        return NextResponse.json({ 
          error: 'This is a regular post, not an image post', 
          suggestion: 'Use the /api/posts/[id]/like endpoint instead' 
        }, { status: 400 });
      }
      
      return NextResponse.json({ error: 'Image post not found' }, { status: 404 });
    }

    // Check if user already liked this image post
    const existingLike = await prisma.like.findFirst({
      where: {
        userId: currentUser.id,
        imagePostId: imagePostId,
      },
    });

    if (existingLike) {
      return NextResponse.json({ error: 'Already liked this image post' }, { status: 400 });
    }

    // Create like
    const like = await prisma.like.create({
      data: {
        userId: currentUser.id,
        imagePostId: imagePostId,
      },
    });

    // Create notification for image post author (if not liking own post)
    if (imagePost.authorId !== currentUser.id) {
      await prisma.notification.create({
        data: {
          type: 'like',
          message: `${currentUser.email} liked your image post "${imagePost.title}"`,
          userId: imagePost.authorId,
          senderId: currentUser.id,
          imagePostId: imagePostId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in like image post:', error);
    return NextResponse.json(
      { error: 'Failed to like image post' },
      { status: 500 }
    );
  }
}

// DELETE to unlike an image post
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Extract and validate the ID - properly await params
    const resolvedParams = await Promise.resolve(params);
    const imagePostId = resolvedParams.id;
    
    if (!imagePostId) {
      return NextResponse.json({ error: 'Missing image post ID' }, { status: 400 });
    }
    
    // Get the current user's ID
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the like exists
    const existingLike = await prisma.like.findFirst({
      where: {
        userId: currentUser.id,
        imagePostId: imagePostId,
      },
    });

    if (!existingLike) {
      return NextResponse.json({ error: 'Not liked this image post' }, { status: 400 });
    }

    // Delete like
    await prisma.like.delete({
      where: {
        id: existingLike.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in unlike image post:', error);
    return NextResponse.json(
      { error: 'Failed to unlike image post' },
      { status: 500 }
    );
  }
} 
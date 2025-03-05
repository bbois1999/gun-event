import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// POST to like a post
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
    const postId = resolvedParams.id;
    
    if (!postId) {
      return NextResponse.json({ error: 'Missing post ID' }, { status: 400 });
    }
    
    // Get the current user's ID
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if user already liked this post
    const existingLike = await prisma.like.findFirst({
      where: {
        userId: currentUser.id,
        postId: postId,
      },
    });

    if (existingLike) {
      return NextResponse.json({ error: 'Already liked this post' }, { status: 400 });
    }

    // Create like
    const like = await prisma.like.create({
      data: {
        userId: currentUser.id,
        postId: postId,
      },
    });

    // Create notification for post author (if not liking own post)
    if (post.authorId !== currentUser.id) {
      await prisma.notification.create({
        data: {
          type: 'like',
          message: `${currentUser.email} liked your post "${post.title}"`,
          userId: post.authorId,
          senderId: currentUser.id,
          postId: postId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in like post:', error);
    return NextResponse.json(
      { error: 'Failed to like post' },
      { status: 500 }
    );
  }
}

// DELETE to unlike a post
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
    const postId = resolvedParams.id;
    
    if (!postId) {
      return NextResponse.json({ error: 'Missing post ID' }, { status: 400 });
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
        postId: postId,
      },
    });

    if (!existingLike) {
      return NextResponse.json({ error: 'Not liked this post' }, { status: 400 });
    }

    // Delete like
    await prisma.like.delete({
      where: {
        id: existingLike.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in unlike post:', error);
    return NextResponse.json(
      { error: 'Failed to unlike post' },
      { status: 500 }
    );
  }
} 
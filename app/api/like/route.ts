import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      console.log('Unauthorized like attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body containing post info
    const body = await request.json().catch(err => {
      console.error('Error parsing request body:', err);
      return null;
    });
    
    if (!body) {
      console.log('Invalid request body for like');
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { postId } = body;
    
    if (!postId) {
      console.log('Missing post ID in like request');
      return NextResponse.json({ error: 'Missing post ID' }, { status: 400 });
    }
    
    console.log('Attempting to like:', { 
      postId, 
      user: session.user.email,
      timestamp: new Date().toISOString()
    });
    
    // Get the current user's ID
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!currentUser) {
      console.log(`User not found for like: ${session.user.email}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the post
    let post = null;
    try {
      post = await prisma.post.findUnique({
        where: { id: postId },
        include: { author: true }
      });
    } catch (error) {
      console.error(`Error finding post:`, error);
      return NextResponse.json({ error: 'Error finding post' }, { status: 500 });
    }

    if (!post) {
      console.log(`Post not found with ID: ${postId}`);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if user already liked this post
    let existingLike;
    const likeWhere = {
      userId: currentUser.id,
      postId
    };
    
    console.log('Checking for existing like with:', likeWhere);
    
    try {
      existingLike = await prisma.like.findFirst({
        where: likeWhere,
      });
    } catch (error) {
      console.error('Error checking existing like:', error);
      return NextResponse.json({ error: 'Error checking like status' }, { status: 500 });
    }

    if (existingLike) {
      console.log(`User ${currentUser.email} already liked post ${postId}`);
      return NextResponse.json({ error: `Already liked this post` }, { status: 400 });
    }

    // Create like
    try {
      const likeData = {
        userId: currentUser.id,
        postId
      };
      
      console.log('Creating like with data:', likeData);
      
      const like = await prisma.like.create({
        data: likeData,
      });
      
      console.log(`Like created successfully: ${like.id} for post ${postId}`);
    } catch (error) {
      console.error('Error creating like:', error);
      return NextResponse.json({ 
        error: 'Failed to create like',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    // Create notification for post author (if not liking own post)
    if (post.author && post.author.id !== currentUser.id) {
      try {
        const notification = await prisma.notification.create({
          data: {
            type: 'like',
            message: `${currentUser.email} liked your post "${post.title}"`,
            userId: post.author.id,
            senderId: currentUser.id,
            postId
          },
        });
        console.log(`Notification created: ${notification.id}`);
      } catch (error) {
        console.error('Error creating notification:', error);
        // Continue even if notification creation fails
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully liked post with ID ${postId}`
    });
  } catch (error) {
    console.error('Error in like post:', error);
    return NextResponse.json(
      { error: 'Failed to like post' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      console.log('Unauthorized unlike attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request body containing post info
    const body = await request.json().catch(err => {
      console.error('Error parsing request body:', err);
      return null;
    });
    
    if (!body) {
      console.log('Invalid request body for unlike');
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { postId } = body;
    
    if (!postId) {
      console.log('Missing post ID in unlike request');
      return NextResponse.json({ error: 'Missing post ID' }, { status: 400 });
    }
    
    console.log('Attempting to unlike:', { 
      postId, 
      user: session.user.email,
      timestamp: new Date().toISOString()
    });
    
    // Get the current user's ID
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!currentUser) {
      console.log(`User not found for unlike: ${session.user.email}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the like
    const likeWhere = {
      userId: currentUser.id,
      postId
    };
    
    console.log('Finding like to delete:', likeWhere);
    
    // Delete the like if it exists
    try {
      const result = await prisma.like.deleteMany({
        where: likeWhere,
      });
      
      if (result.count === 0) {
        console.log(`No like found to delete for user ${currentUser.email} and post ${postId}`);
        return NextResponse.json({ 
          error: 'No like found for this post'
        }, { status: 404 });
      }
      
      console.log(`Deleted ${result.count} like(s) for user ${currentUser.email} and post ${postId}`);
    } catch (error) {
      console.error('Error deleting like:', error);
      return NextResponse.json({ 
        error: 'Failed to unlike post',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully unliked post with ID ${postId}`
    });
  } catch (error) {
    console.error('Error in unlike post:', error);
    return NextResponse.json(
      { error: 'Failed to unlike post' },
      { status: 500 }
    );
  }
}
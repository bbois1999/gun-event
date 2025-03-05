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
    
    const { postId, postType } = body;
    
    if (!postId) {
      console.log('Missing post ID in like request');
      return NextResponse.json({ error: 'Missing post ID' }, { status: 400 });
    }
    
    // Default to 'post' if postType is missing or invalid
    const validatedPostType = (postType === 'imagePost') ? 'imagePost' : 'post';
    
    console.log('Attempting to like:', { 
      postId, 
      postType: validatedPostType, 
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

    // Try to find the post using the correct type
    let post = null;
    let author = null;
    let actualPostType = validatedPostType; // Track what type the post actually is
    
    try {
      if (validatedPostType === 'post') {
        post = await prisma.post.findUnique({
          where: { id: postId },
          include: { author: true }
        });
      } else {
        post = await prisma.imagePost.findUnique({
          where: { id: postId },
          include: { author: true }
        });
      }
      
      author = post?.author;
    } catch (error) {
      console.error(`Error finding ${validatedPostType}:`, error);
    }
    
    // If post not found with specified type, try the other type
    if (!post) {
      try {
        if (validatedPostType === 'post') {
          console.log(`Post not found as regular post, trying as imagePost: ${postId}`);
          post = await prisma.imagePost.findUnique({
            where: { id: postId },
            include: { author: true }
          });
          if (post) actualPostType = 'imagePost'; // Update actual type if found
        } else {
          console.log(`Post not found as imagePost, trying as regular post: ${postId}`);
          post = await prisma.post.findUnique({
            where: { id: postId },
            include: { author: true }
          });
          if (post) actualPostType = 'post'; // Update actual type if found
        }
        author = post?.author;
      } catch (error) {
        console.error('Error finding post with alternative type:', error);
      }
    }

    if (!post) {
      console.log(`Post not found with ID: ${postId} (tried both types)`);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if user already liked this post - use the ACTUAL post type found
    let existingLike;
    const likeWhere = {
      userId: currentUser.id,
      ...(actualPostType === 'post' ? { postId } : { imagePostId: postId }),
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
      console.log(`User ${currentUser.email} already liked ${actualPostType} ${postId}`);
      return NextResponse.json({ error: `Already liked this ${actualPostType}` }, { status: 400 });
    }

    // Create like with the ACTUAL post type that was found
    try {
      const likeData = {
        userId: currentUser.id,
        ...(actualPostType === 'post' ? { postId } : { imagePostId: postId }),
      };
      
      console.log('Creating like with data:', likeData);
      
      const like = await prisma.like.create({
        data: likeData,
      });
      
      console.log(`Like created successfully: ${like.id} for ${actualPostType} ${postId}`);
    } catch (error) {
      console.error('Error creating like:', error);
      return NextResponse.json({ 
        error: 'Failed to create like',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    // Create notification for post author (if not liking own post)
    if (author && author.id !== currentUser.id) {
      try {
        const notification = await prisma.notification.create({
          data: {
            type: 'like',
            message: `${currentUser.email} liked your ${actualPostType === 'post' ? 'post' : 'image post'} "${post.title}"`,
            userId: author.id,
            senderId: currentUser.id,
            ...(actualPostType === 'post' ? { postId } : { imagePostId: postId }),
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
      message: `Successfully liked ${actualPostType} with ID ${postId}`
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
    
    const { postId, postType } = body;
    
    if (!postId) {
      console.log('Missing post ID in unlike request');
      return NextResponse.json({ error: 'Missing post ID' }, { status: 400 });
    }
    
    // Default to 'post' if postType is missing or invalid
    const validatedPostType = (postType === 'imagePost') ? 'imagePost' : 'post';
    
    console.log('Attempting to unlike:', { 
      postId, 
      postType: validatedPostType, 
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

    // Check if the like exists - use detected post type from database
    let existingLike;
    let post = null;
    let actualPostType = validatedPostType;
    
    // First check if the post exists and what type it actually is
    try {
      if (validatedPostType === 'post') {
        post = await prisma.post.findUnique({ where: { id: postId } });
      } else {
        post = await prisma.imagePost.findUnique({ where: { id: postId } });
      }
    } catch (error) {
      console.error(`Error finding ${validatedPostType} for unlike:`, error);
    }
    
    // If not found with specified type, try other type
    if (!post) {
      try {
        if (validatedPostType === 'post') {
          console.log(`Post not found as regular post for unlike, trying imagePost: ${postId}`);
          post = await prisma.imagePost.findUnique({ where: { id: postId } });
          if (post) actualPostType = 'imagePost';
        } else {
          console.log(`Post not found as imagePost for unlike, trying regular post: ${postId}`);
          post = await prisma.post.findUnique({ where: { id: postId } });
          if (post) actualPostType = 'post';
        }
      } catch (error) {
        console.error('Error finding post with alternative type for unlike:', error);
      }
    }
    
    // Check for existing like with correct post type
    const likeWhere = {
      userId: currentUser.id,
      ...(actualPostType === 'post' ? { postId } : { imagePostId: postId }),
    };
    
    console.log('Checking for existing like to unlike with:', likeWhere);
    
    try {
      existingLike = await prisma.like.findFirst({
        where: likeWhere,
      });
    } catch (error) {
      console.error('Error checking existing like for unlike:', error);
      return NextResponse.json({ error: 'Error checking like status' }, { status: 500 });
    }

    if (!existingLike) {
      console.log(`Like not found for ${actualPostType} ${postId} by user ${currentUser.email}`);
      return NextResponse.json({ error: `Not liked this ${actualPostType}` }, { status: 400 });
    }

    // Delete like
    try {
      await prisma.like.delete({
        where: {
          id: existingLike.id,
        },
      });
      
      console.log(`Like deleted successfully: ${existingLike.id} for ${actualPostType} ${postId}`);
    } catch (error) {
      console.error('Error deleting like:', error);
      return NextResponse.json({ error: 'Failed to delete like' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully unliked ${actualPostType} with ID ${postId}`
    });
  } catch (error) {
    console.error('Error in unlike post:', error);
    return NextResponse.json(
      { error: 'Failed to unlike post' },
      { status: 500 }
    );
  }
}
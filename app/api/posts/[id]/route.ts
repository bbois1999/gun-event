import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            username: true
          },
        },
        event: {
          select: {
            id: true,
            title: true,
          },
        },
        likes: true,
        // images: true - Removed due to linter error, but we need to manually add the images to the response
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Fetch the images manually
    const images = await prisma.$queryRaw`
      SELECT * FROM PostImage WHERE postId = ${id} ORDER BY position ASC
    `;

    // Fetch profile image for the author
    const authorProfile = await prisma.user.findUnique({
      where: { id: post.authorId },
      select: {
        id: true,
        profileImageUrl: true
      }
    });

    // Add the images to the post
    const postWithImages = {
      ...post,
      images,
      author: {
        ...post.author,
        profileImageUrl: authorProfile?.profileImageUrl || null
      }
    };

    return NextResponse.json(postWithImages);
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }
    
    // Check if the post exists and belongs to the user
    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        imageKey: true,
      },
    });
    
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    if (post.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'You are not authorized to delete this post' },
        { status: 403 }
      );
    }
    
    // Delete post
    await prisma.post.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { title, content } = body;
    
    // Validate required fields
    if (!title && !content) {
      return NextResponse.json(
        { error: 'At least one field (title or content) must be provided' },
        { status: 400 }
      );
    }
    
    // Check if the post exists and belongs to the user
    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
      },
    });
    
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    if (post.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'You are not authorized to update this post' },
        { status: 403 }
      );
    }
    
    // Update the post
    const updatedData: any = {};
    if (title !== undefined) updatedData.title = title;
    if (content !== undefined) updatedData.content = content;
    
    const updatedPost = await prisma.post.update({
      where: { id },
      data: updatedData,
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
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });
    
    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
} 
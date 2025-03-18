import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Extract and validate the ID - properly await params
    const resolvedParams = await Promise.resolve(params);
    const imagePostId = resolvedParams.id;
    
    if (!imagePostId) {
      return NextResponse.json({ error: 'Missing image post ID' }, { status: 400 });
    }
    
    // Fetch the image post with author, event details, likes count and user likes
    const imagePost = await prisma.imagePost.findUnique({
      where: { 
        id: imagePostId,
      },
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
        likes: {
          select: {
            id: true,
            userId: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });

    if (!imagePost) {
      return NextResponse.json({ error: 'Image post not found' }, { status: 404 });
    }

    // Fetch profile image for the author
    const authorProfile = await prisma.user.findUnique({
      where: { id: imagePost.authorId },
      select: {
        id: true,
        profileImageUrl: true
      }
    });

    // Add profile image to the post author
    const enrichedImagePost = {
      ...imagePost,
      author: {
        ...imagePost.author,
        profileImageUrl: authorProfile?.profileImageUrl || null
      }
    };

    return NextResponse.json(enrichedImagePost);
  } catch (error) {
    console.error('Error fetching image post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image post' },
      { status: 500 }
    );
  }
} 
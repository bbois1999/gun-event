import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse URL to get query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const cursor = url.searchParams.get('cursor');
    
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Build pagination query
    const paginationQuery = {
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? {
        id: cursor
      } : undefined
    };
    
    // Get notifications for the user
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      ...paginationQuery
    });
    
    // For notifications with postId, fetch the post details separately
    const notificationsWithPost = await Promise.all(
      notifications.map(async (notification) => {
        if (notification.postId) {
          const post = await prisma.post.findUnique({
            where: { id: notification.postId },
            select: { id: true, title: true }
          });
          return { ...notification, post };
        }
        return notification;
      })
    );
    
    // Get total count of unread notifications
    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        read: false
      }
    });
    
    // Determine if there's a next page
    const nextCursor = notifications.length === limit ? notifications[notifications.length - 1].id : null;
    
    return NextResponse.json({
      notifications: notificationsWithPost,
      unreadCount,
      nextCursor
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { id, read } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }
    
    if (typeof read !== 'boolean') {
      return NextResponse.json(
        { error: 'Read status must be a boolean' },
        { status: 400 }
      );
    }
    
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Find the notification
    const notification = await prisma.notification.findUnique({
      where: { id }
    });
    
    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    // Check if the notification belongs to the user
    if (notification.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to update this notification' },
        { status: 403 }
      );
    }
    
    // Update the notification
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { read }
    });
    
    return NextResponse.json(updatedNotification);
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse URL to get query parameters
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const readOnly = url.searchParams.get('readOnly') === 'true';
    
    if (!id && !readOnly) {
      return NextResponse.json(
        { error: 'Either notification ID or readOnly parameter is required' },
        { status: 400 }
      );
    }
    
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (id) {
      // Find the notification
      const notification = await prisma.notification.findUnique({
        where: { id }
      });
      
      if (!notification) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        );
      }
      
      // Check if the notification belongs to the user
      if (notification.userId !== user.id) {
        return NextResponse.json(
          { error: 'Not authorized to delete this notification' },
          { status: 403 }
        );
      }
      
      // Delete the notification
      await prisma.notification.delete({
        where: { id }
      });
      
      return NextResponse.json({ success: true, message: 'Notification deleted' });
    } else if (readOnly) {
      // Delete all read notifications for the user
      const result = await prisma.notification.deleteMany({
        where: {
          userId: user.id,
          read: true
        }
      });
      
      return NextResponse.json({
        success: true,
        message: `${result.count} read notifications deleted`
      });
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
} 
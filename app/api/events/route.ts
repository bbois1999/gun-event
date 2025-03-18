import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, MOCK_USER } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET endpoint to fetch all events
export async function GET(req: NextRequest) {
  try {
    const events = await prisma.event.findMany({
      orderBy: {
        date: 'asc'
      }
    });
    
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST endpoint to create a new event
export async function POST(req: NextRequest) {
  try {
    // Get current user or fall back to mock user for development
    let user = await getSessionUser();
    if (!user) {
      // For development, use mock user
      console.warn('No authenticated user, using mock user for development');
      user = MOCK_USER;
    }
    
    const data = await req.json();
    
    // Create the event with the user ID
    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        date: new Date(data.date),
        location: data.location,
        organizer: data.organizer,
        authorId: user.id
      }
    });
    
    return NextResponse.json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
} 
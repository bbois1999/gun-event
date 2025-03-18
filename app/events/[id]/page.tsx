import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { EventDetails } from "@/components/EventDetails"
import { EventPostFeed } from "@/components/EventPostFeed"
import { Separator } from "@/components/ui/separator"
import { PostButton } from "@/components/PostButton"
import { Metadata } from 'next'
import { unstable_noStore as noStore } from 'next/cache'
import { Post, PostImage } from "@/src/types/models"

interface EventPageProps {
  params: {
    id: string
  }
}

// This helps Next.js understand the dynamic params
export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const id = await Promise.resolve(params.id)
  if (!id) return { title: 'Event Not Found' }

  try {
    const event = await prisma.event.findUnique({
      where: { id }
    })

    return {
      title: event ? `${event.title} - Event Details` : 'Event Not Found'
    }
  } catch (error) {
    console.error('Error loading event metadata:', error)
    return { title: 'Event Not Found' }
  }
}

// Interface for the expected post format in EventPostFeed
type CombinedPost = Post & {
  author: {
    id: string
    email: string
  }
  event?: {
    id: string
    title: string
  }
  likes?: {
    id: string
    userId: string
  }[]
  _count?: {
    likes: number
  }
  images?: PostImage[]
}

export default async function EventPage({ params }: EventPageProps) {
  // Disable caching for this page to ensure fresh data
  noStore()
  
  const id = await Promise.resolve(params.id)
  if (!id) {
    return notFound()
  }

  try {
    // First, fetch the event details
    const event = await prisma.event.findUnique({
      where: { id }
    })

    if (!event) {
      return notFound()
    }

    // Separately fetch posts related to this event with all needed data
    const eventPosts = await prisma.post.findMany({
      where: {
        eventId: id,
        published: true
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
          }
        },
        likes: true,
        _count: {
          select: {
            likes: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Fetch images for each post and convert to the expected format
    const postsWithImages: CombinedPost[] = await Promise.all(eventPosts.map(async (post) => {
      // Get images for this post using raw SQL
      const imagesRaw = await prisma.$queryRaw`
        SELECT id, createdAt, updatedAt, url, key, position, postId 
        FROM PostImage 
        WHERE postId = ${post.id} 
        ORDER BY position ASC
      `;
      
      // Convert raw images to expected PostImage type
      const images = Array.isArray(imagesRaw) ? imagesRaw.map(img => ({
        id: String(img.id),
        url: String(img.url),
        key: String(img.key),
        position: Number(img.position),
        postId: String(img.postId),
        createdAt: new Date(img.createdAt),
        updatedAt: new Date(img.updatedAt)
      })) : [];
      
      // Add event details to post
      return {
        ...post,
        images,
        event: {
          id: event.id,
          title: event.title
        }
      };
    }));

    return (
      <div className="container max-w-4xl mx-auto py-8">
        <div className="space-y-8">
          <EventDetails event={event} />
          <Separator />
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-6">Event Discussion</h2>
            <PostButton preselectedEvent={event} className="mb-8" />
          </div>
          <EventPostFeed posts={postsWithImages} />
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading event:', error)
    return notFound()
  }
} 
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { EventDetails } from "@/components/EventDetails"
import { EventPostFeed } from "@/components/EventPostFeed"
import { Separator } from "@/components/ui/separator"
import { PostButton } from "@/components/PostButton"
import { Metadata } from 'next'
import { unstable_noStore as noStore } from 'next/cache'

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

export default async function EventPage({ params }: EventPageProps) {
  // Disable caching for this page to ensure fresh data
  noStore()
  
  const id = await Promise.resolve(params.id)
  if (!id) {
    return notFound()
  }

  try {
    // Fetch event with all related posts
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        posts: {
          include: {
            author: true
          },
          where: {
            published: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        imagePosts: {
          include: {
            author: true
          },
          where: {
            published: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!event) {
      return notFound()
    }

    // Combine and sort all posts by creation date
    const allPosts = [...event.posts, ...event.imagePosts].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return (
      <div className="container max-w-4xl mx-auto py-8">
        <div className="space-y-8">
          <EventDetails event={event} />
          <Separator />
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-6">Event Discussion</h2>
            <PostButton preselectedEvent={event} className="mb-8" />
          </div>
          <EventPostFeed posts={allPosts} />
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading event:', error)
    return notFound()
  }
} 
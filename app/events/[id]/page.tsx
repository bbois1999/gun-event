import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { EventDetails } from "@/components/EventDetails"
import { EventPostFeed } from "@/components/EventPostFeed"
import { Separator } from "@/components/ui/separator"

interface EventPageProps {
  params: {
    id: string
  }
}

export default async function EventPage({ params }: EventPageProps) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      posts: {
        include: {
          author: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  })

  if (!event) {
    notFound()
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="space-y-8">
        <EventDetails event={event} />
        <Separator />
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-6">Event Discussion</h2>
        </div>
        <EventPostFeed posts={event.posts} />
      </div>
    </div>
  )
} 
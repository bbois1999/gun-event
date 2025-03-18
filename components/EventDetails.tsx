import type { Event as PrismaEvent } from "@prisma/client"
import { format } from "date-fns"
import { CalendarIcon, MapPinIcon, UserIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface EventDetailsProps {
  event: PrismaEvent
}

export function EventDetails({ event }: EventDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{event.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarIcon className="h-4 w-4" />
          <span>{format(new Date(event.date), "PPP 'at' p")}</span>
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPinIcon className="h-4 w-4" />
          <span>{event.location}</span>
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <UserIcon className="h-4 w-4" />
          <span>Organized by {event.organizer}</span>
        </div>
        
        <div className="mt-4 text-sm">
          <p className="whitespace-pre-wrap">{event.description}</p>
        </div>
      </CardContent>
    </Card>
  )
} 
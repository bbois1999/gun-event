"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle, Filter, CalendarIcon, Clock, Loader2, User } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { format } from "date-fns"

// List of Northwest cities
const NORTHWEST_CITIES = [
  "Seattle, WA",
  "Portland, OR",
  "Boise, ID",
  "Spokane, WA",
  "Coeur D'Alene, ID",
  "Tacoma, WA",
  "Eugene, OR",
  "Salem, OR",
  "Olympia, WA",
  "Bend, OR",
  "Missoula, MT",
  "Bellingham, WA",
  "Idaho Falls, ID",
  "Pocatello, ID"
]

// Event data structure (matching our Prisma schema)
interface Event {
  id: string
  title: string
  description: string
  date: Date
  location: string
  organizer: string
  createdAt?: Date
  updatedAt?: Date
  authorId?: string
}

export default function EventsPage() {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [isDateSelected, setIsDateSelected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  
  // State for the new event form
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    location: NORTHWEST_CITIES[0],
    organizer: "",
    time: "12:00" // Default time
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectKey, setSelectKey] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch events from the API on component mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/events')
        
        if (!response.ok) {
          throw new Error('Failed to fetch events')
        }
        
        const data = await response.json()
        
        // Convert date strings to Date objects
        const eventsWithDates = data.map((event: any) => ({
          ...event,
          date: new Date(event.date)
        }))
        
        setEvents(eventsWithDates)
      } catch (error) {
        console.error('Error loading events:', error)
        toast({
          title: "Error",
          description: "Failed to load events. Please try again.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  // Handle date selection and track if user has explicitly selected a date
  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate)
    setIsDateSelected(!!newDate)
  }

  // Clear date selection
  const clearDateSelection = () => {
    setDate(undefined)
    setIsDateSelected(false)
  }

  // Function to handle adding a new event
  const handleAddEvent = async () => {
    if (!date || !newEvent.title) return
    
    try {
      setIsSubmitting(true)
      
      // Combine the selected date with the time input
      const [hours, minutes] = newEvent.time.split(':').map(Number)
      const eventDateTime = new Date(date)
      eventDateTime.setHours(hours, minutes)
      
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newEvent.title,
          description: newEvent.description,
          date: eventDateTime.toISOString(),
          location: newEvent.location,
          organizer: newEvent.organizer
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create event')
      }
      
      const createdEvent = await response.json()
      
      // Add the new event to the local state
      setEvents([...events, {
        ...createdEvent,
        date: new Date(createdEvent.date)
      }])
      
      // Reset form
      setNewEvent({
        title: "",
        description: "",
        location: NORTHWEST_CITIES[0],
        organizer: "",
        time: "12:00"
      })
      
      setIsDialogOpen(false)
      
      toast({
        title: "Success",
        description: "Event created successfully!",
      })
    } catch (error) {
      console.error('Error creating event:', error)
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Apply city filter to events if a city is selected
  const filteredEvents = selectedCity 
    ? events.filter(event => event.location === selectedCity)
    : events

  // Get current date for filtering upcoming events
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  // Get events based on date selection and filters
  const displayEvents = isDateSelected && date
    // If a date is selected, show events for that date
    ? filteredEvents.filter(event => 
        event.date.getDate() === date.getDate() &&
        event.date.getMonth() === date.getMonth() &&
        event.date.getFullYear() === date.getFullYear()
      )
    // Otherwise, show all upcoming events sorted by date
    : filteredEvents
        .filter(event => event.date >= now) // Only future events
        .sort((a, b) => a.date.getTime() - b.date.getTime()) // Sort by date ascending

  // Get all dates that have events for highlighting on the calendar
  const eventDates = filteredEvents.map(event => {
    const eventDate = new Date(
      event.date.getFullYear(),
      event.date.getMonth(),
      event.date.getDate()
    )
    return eventDate.toISOString().split('T')[0]
  })

  // Clear filter function
  const clearFilter = () => {
    setSelectedCity(null)
    setSelectKey(prev => prev + 1) // Force re-render of Select component
  }

  // Create a map of dates that have events (for calendar highlighting)
  const dateHasEvent = (date: Date): boolean => {
    const dateString = date.toISOString().split('T')[0]
    return eventDates.includes(dateString)
  }

  // Format date for display in event list
  const formatEventDate = (eventDate: Date) => {
    return format(eventDate, "PPP 'at' p")
  }

  return (
    <main className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
      <div className="flex flex-col lg:flex-row gap-6 justify-center">
        <div className="w-full lg:w-2/5 max-w-md mx-auto lg:mx-0">
          <Card className="mb-5">
            <CardHeader>
              <CardTitle className="flex justify-between items-center text-xl sm:text-2xl">
                Location Filter
                {selectedCity && (
                  <Button variant="ghost" size="sm" onClick={clearFilter}>
                    Clear Filter
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                Filter events by city
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select 
                key={selectKey} 
                value={selectedCity || undefined}
                onValueChange={setSelectedCity}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  {NORTHWEST_CITIES.map(city => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center text-xl sm:text-2xl">
                Calendar
                {isDateSelected && (
                  <Button variant="ghost" size="sm" onClick={clearDateSelection}>
                    Clear Date
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                Select a date to view events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                className="rounded-md mx-auto"
                modifiers={{
                  event: (date) => dateHasEvent(date)
                }}
                modifiersClassNames={{
                  event: "bg-primary/10 font-bold text-primary"
                }}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="w-full lg:w-3/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <h2 className="text-xl sm:text-2xl font-bold">
              {isDateSelected && date ? (
                `Events on ${format(date, 'MMMM d, yyyy')}`
              ) : (
                "Upcoming Events"
              )}
              {selectedCity && <span className="block sm:inline text-base sm:text-xl mt-1 sm:mt-0 sm:ml-2">in {selectedCity}</span>}
            </h2>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full sm:w-auto">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-w-[95vw]">
                <DialogHeader>
                  <DialogTitle>Add New Event</DialogTitle>
                  <DialogDescription>
                    Create a new event for gun enthusiasts
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right">
                      Title
                    </Label>
                    <Input
                      id="title"
                      placeholder="Enter event title"
                      className="col-span-3"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Enter event description"
                      className="col-span-3"
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="date" className="text-right">
                      Date
                    </Label>
                    <div className="col-span-3 flex items-center gap-2">
                      <Button
                        variant="outline"
                        className={!date ? "text-muted-foreground" : ""}
                        onClick={() => setIsDialogOpen(false)}
                        type="button"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : "Select date"}
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Please select a date on the calendar first
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="time" className="text-right">
                      Time
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="time"
                        type="time"
                        value={newEvent.time}
                        onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="location" className="text-right">
                      Location
                    </Label>
                    <div className="col-span-3">
                      <Select
                        value={newEvent.location}
                        onValueChange={(value) => setNewEvent({...newEvent, location: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a city" />
                        </SelectTrigger>
                        <SelectContent>
                          {NORTHWEST_CITIES.map(city => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="organizer" className="text-right">
                      Organizer
                    </Label>
                    <Input
                      id="organizer"
                      placeholder="Enter organizer name"
                      className="col-span-3"
                      value={newEvent.organizer}
                      onChange={(e) => setNewEvent({...newEvent, organizer: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleAddEvent} disabled={isSubmitting || !date || !newEvent.title}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Event"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          {displayEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayEvents.map(event => (
                <Card key={event.id} className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg">{event.title}</CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <CalendarIcon className="mr-1 h-4 w-4" />
                      {formatEventDate(event.date)}
                    </div>
                  </CardHeader>
                  <CardContent className="py-2">
                    <p className="text-sm line-clamp-2 mb-2">{event.description}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <Filter className="mr-1 h-3 w-3" /> 
                        {event.location}
                      </span>
                      {event.organizer && (
                        <span className="flex items-center">
                          <User className="mr-1 h-3 w-3" /> 
                          {event.organizer}
                        </span>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button asChild variant="secondary" size="sm" className="w-full">
                      <Link href={`/events/${event.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center text-center h-[200px]">
                  <CalendarIcon className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg mb-2">No events found</h3>
                  <p className="text-muted-foreground text-sm max-w-md">
                    {isDateSelected && date
                      ? `There are no events scheduled for ${format(date, 'MMMM d, yyyy')}${selectedCity ? ` in ${selectedCity}` : ''}.`
                      : selectedCity
                        ? `There are no upcoming events in ${selectedCity}.`
                        : 'There are no upcoming events scheduled.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
} 
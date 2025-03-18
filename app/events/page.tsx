"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle, Filter, CalendarIcon, Clock, Loader2 } from "lucide-react"
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
    <main className="container mx-auto py-8 max-w-7xl">
      <div className="flex flex-col lg:flex-row gap-8 justify-center">
        <div className="w-full lg:w-2/5 max-w-md">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
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
                <SelectTrigger>
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  {NORTHWEST_CITIES.map((city) => (
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
              <CardTitle className="flex justify-between items-center">
                Event Calendar
                <div className="flex gap-2">
                  {isDateSelected && (
                    <Button variant="outline" size="sm" onClick={clearDateSelection}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Show All Events
                    </Button>
                  )}
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="flex gap-1">
                        <PlusCircle className="h-4 w-4" />
                        Add Event
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Event</DialogTitle>
                        <DialogDescription>
                          Create a new event for {date ? format(date, "PPP") : "the future"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="title">Title</Label>
                          <Input
                            id="title"
                            value={newEvent.title}
                            onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                            placeholder="Event Title"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={newEvent.description}
                            onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                            placeholder="Event Description"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="time">Time</Label>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Input
                              id="time"
                              type="time"
                              value={newEvent.time}
                              onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="location">Location</Label>
                          <Select 
                            value={newEvent.location} 
                            onValueChange={(value: string) => setNewEvent({...newEvent, location: value})}
                          >
                            <SelectTrigger id="location">
                              <SelectValue placeholder="Select a city" />
                            </SelectTrigger>
                            <SelectContent>
                              {NORTHWEST_CITIES.map((city) => (
                                <SelectItem key={city} value={city}>
                                  {city}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="organizer">Organizer</Label>
                          <Input
                            id="organizer"
                            value={newEvent.organizer}
                            onChange={(e) => setNewEvent({...newEvent, organizer: e.target.value})}
                            placeholder="Event Organizer"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button 
                          onClick={handleAddEvent} 
                          disabled={isSubmitting || !date || !newEvent.title}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Event"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                className="rounded-md border w-full mx-auto text-lg p-4"
                modifiers={{
                  hasEvent: dateHasEvent
                }}
                modifiersClassNames={{
                  hasEvent: "bg-red-500 text-white hover:bg-red-600 font-medium"
                }}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="w-full lg:w-3/5 max-w-2xl">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>
                {isDateSelected
                  ? (selectedCity 
                      ? `Events in ${selectedCity} for ${date ? format(date, "PPP") : ""}` 
                      : `Events for ${date ? format(date, "PPP") : ""}`)
                  : (selectedCity
                      ? `Upcoming Events in ${selectedCity}`
                      : "All Upcoming Events")
                }
              </CardTitle>
              <CardDescription>
                {!isDateSelected
                  ? `${displayEvents.length} upcoming event(s)`
                  : (displayEvents.length === 0 
                      ? "No events scheduled for this date" 
                      : `${displayEvents.length} event(s) scheduled`)
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {displayEvents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {isDateSelected 
                        ? "No events found for this date. Click \"Add Event\" to create one."
                        : "No upcoming events. Click \"Add Event\" to create one."}
                    </div>
                  ) : (
                    displayEvents.map(event => (
                      <Link 
                        key={event.id} 
                        href={`/events/${event.id}`}
                        className="block transition-transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle>{event.title}</CardTitle>
                              {!isDateSelected && (
                                <span className="text-sm font-medium text-muted-foreground">
                                  {formatEventDate(event.date)}
                                </span>
                              )}
                            </div>
                            <CardDescription>{event.location}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p>{event.description}</p>
                            <div className="mt-2 text-sm text-muted-foreground">
                              Organized by: {event.organizer}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
} 
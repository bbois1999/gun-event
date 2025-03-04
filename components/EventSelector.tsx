"use client"

import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown } from "lucide-react"
import { format } from 'date-fns'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { type Event } from '@/src/types/models'

interface EventSelectorProps {
  onEventSelect: (event: Event | null) => void
  preselectedEvent?: Event
}

export function EventSelector({ onEventSelect, preselectedEvent }: EventSelectorProps) {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(preselectedEvent || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events')
        if (!response.ok) throw new Error('Failed to fetch events')
        const data = await response.json()
        setEvents(data)
      } catch (error) {
        console.error('Error fetching events:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const handleSelect = (event: Event | null) => {
    setSelectedEvent(event)
    setOpen(false)
    onEventSelect(event)
  }

  if (preselectedEvent) {
    return (
      <div className="text-sm text-muted-foreground">
        Posting to event: {preselectedEvent.title}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedEvent ? selectedEvent.title : "Select an event..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search events..." />
          <CommandEmpty>No events found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto">
            <CommandItem
              onSelect={() => handleSelect(null)}
              className="cursor-pointer"
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  !selectedEvent ? "opacity-100" : "opacity-0"
                )}
              />
              No event (post to profile only)
            </CommandItem>
            {events.map((event) => (
              <CommandItem
                key={event.id}
                onSelect={() => handleSelect(event)}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedEvent?.id === event.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span>{event.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(event.date), "PPP 'at' p")} - {event.location}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 
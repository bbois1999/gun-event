"use client"

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { type Event } from '@/src/types/models'
import { Label } from '@/components/ui/label'
import { Loader2, Calendar, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface EventSelectorProps {
  onEventSelect: (event: Event | null) => void
  preselectedEvent?: Event
}

export function EventSelector({ onEventSelect, preselectedEvent }: EventSelectorProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedYear, setSelectedYear] = useState('')

  // Extract unique locations, months, and years from events
  const uniqueLocations = [...new Set(events.map(event => event.location))].sort()
  
  const eventYears = [...new Set(events.map(event => 
    new Date(event.date).getFullYear()
  ))].sort((a, b) => a - b)
  
  const months = [
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' }
  ]

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events')
        if (!response.ok) throw new Error('Failed to fetch events')
        const data = await response.json()
        setEvents(data)
        setFilteredEvents(data)
      } catch (error) {
        console.error('Error fetching events:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  useEffect(() => {
    // Apply filters whenever they change
    let filtered = [...events]
    
    // Filter by location
    if (selectedLocation) {
      filtered = filtered.filter(event => event.location === selectedLocation)
    }
    
    // Filter by month and year
    if (selectedMonth && selectedYear) {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date)
        return (
          eventDate.getMonth() === parseInt(selectedMonth) &&
          eventDate.getFullYear() === parseInt(selectedYear)
        )
      })
    } else if (selectedMonth) {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date)
        return eventDate.getMonth() === parseInt(selectedMonth)
      })
    } else if (selectedYear) {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date)
        return eventDate.getFullYear() === parseInt(selectedYear)
      })
    }
    
    setFilteredEvents(filtered)
  }, [selectedLocation, selectedMonth, selectedYear, events])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const eventId = e.target.value;
    if (eventId === "none") {
      onEventSelect(null);
    } else {
      const selectedEvent = events.find(event => event.id === eventId);
      if (selectedEvent) {
        onEventSelect(selectedEvent);
      }
    }
  };

  const clearFilters = () => {
    setSelectedLocation('');
    setSelectedMonth('');
    setSelectedYear('');
  };

  if (preselectedEvent) {
    return (
      <div className="text-sm text-muted-foreground">
        Posting to event: {preselectedEvent.title}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading events...
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {/* Filters */}
      <div className="grid grid-cols-3 gap-2">
        {/* Location dropdown */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </div>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="">All Locations</option>
            {uniqueLocations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        {/* Month dropdown */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="">All Months</option>
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        {/* Year dropdown */}
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="">All Years</option>
          {eventYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Event Selector */}
      <select 
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        onChange={handleChange}
        defaultValue="none"
      >
        <option value="none">No event (post to profile only)</option>
        {filteredEvents.length === 0 ? (
          <option disabled>No events match your filters</option>
        ) : (
          filteredEvents.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title} - {format(new Date(event.date), "PPP")} - {event.location}
            </option>
          ))
        )}
      </select>

      {/* Filter status */}
      {(selectedLocation || selectedMonth || selectedYear) && (
        <div className="text-xs text-muted-foreground">
          Showing {filteredEvents.length} of {events.length} events
          {selectedLocation && <span> • Location: {selectedLocation}</span>}
          {selectedMonth && <span> • Month: {months.find(m => m.value === selectedMonth)?.label}</span>}
          {selectedYear && <span> • Year: {selectedYear}</span>}
          {filteredEvents.length === 0 && (
            <button 
              onClick={clearFilters}
              className="ml-2 text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  )
} 
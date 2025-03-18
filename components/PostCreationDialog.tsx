"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { type Event } from '@/src/types/models'
import { useCreatePost } from '@/lib/hooks/custom/use-create-post'
import { Loader2, Image as ImageIcon } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { EventSelector } from './EventSelector'
import { useUploadThing } from '@/lib/uploadthing-react'
import { ImageUpload, ImageFile } from '@/components/ui/image-upload'

interface PostCreationDialogProps {
  triggerButton?: React.ReactNode
  preselectedEvent?: Event
  onSuccess?: () => void
}

export function PostCreationDialog({ 
  triggerButton, 
  preselectedEvent,
  onSuccess 
}: PostCreationDialogProps) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<ImageFile[] | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(preselectedEvent || null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const createPost = useCreatePost()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user) return

    setIsSubmitting(true)
    try {
      // Create the post with image details if available
      const postData = {
        title,
        content,
        published: true,
        ...(images && images.length > 0 && {
          imageUrl: images[0].url,
          imageKey: images[0].key,
        }),
        ...(selectedEvent && {
          eventId: selectedEvent.id 
        })
      };

      console.log("Creating post with data:", postData);
      console.log("Images:", images);

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...postData,
          // Add additional images if there are more than one
          additionalImages: images && images.length > 1 
            ? images.slice(1).map((img, i) => ({
                url: img.url,
                key: img.key,
                position: i + 1, // Position 0 is the main image
              }))
            : undefined
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create post");
      }

      const result = await response.json();

      toast({
        title: "Success!",
        description: "Your post has been created.",
      })

      // Reset form
      setTitle('')
      setContent('')
      setImages(null)
      setSelectedEvent(preselectedEvent || null)
      setOpen(false)
      
      // Call the onSuccess callback to refresh the posts feed
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating post:', error)
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || <Button>Create Post</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a New Post</DialogTitle>
            <DialogDescription>
              Share your thoughts and images with the community
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your post"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Images (up to 10)</Label>
              <div className="flex flex-col gap-3">
                <ImageUpload
                  value={images}
                  onChange={setImages}
                  disabled={isSubmitting}
                  maxImages={10}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Event</Label>
              <EventSelector 
                onEventSelect={setSelectedEvent} 
                preselectedEvent={preselectedEvent} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Post'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 
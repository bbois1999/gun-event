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
import { useCreateImagePost } from '@/lib/hooks/custom/use-create-image-post'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { EventSelector } from './EventSelector'

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
  const [images, setImages] = useState<File[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(preselectedEvent || null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const createPost = useCreatePost()
  const createImagePost = useCreateImagePost()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user) return

    setIsSubmitting(true)
    try {
      // Create the main post
      const post = await createPost.mutateAsync({
        data: {
          title,
          content,
          published: true,
          author: { connect: { id: session.user.id } },
          ...(selectedEvent && {
            event: { connect: { id: selectedEvent.id } }
          })
        }
      })

      // Create image posts if there are any images
      if (images.length > 0) {
        await Promise.all(images.map(async (file) => {
          // In a real app, you would upload the image to a storage service
          // and get back a URL. For now, we'll just use the file name
          const imageUrl = file.name // Replace with actual image upload logic

          await createImagePost.mutateAsync({
            data: {
              title: `Image for ${title}`,
              content: '',
              published: true,
              image: imageUrl,
              author: { connect: { id: session.user.id } },
              ...(selectedEvent && {
                event: { connect: { id: selectedEvent.id } }
              })
            }
          })
        }))
      }

      toast({
        title: "Success!",
        description: "Your post has been created.",
      })

      // Reset form
      setTitle('')
      setContent('')
      setImages([])
      setSelectedEvent(null)
      setOpen(false)
      onSuccess?.()
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || <Button>Create Post</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
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
              <Label htmlFor="images">Images</Label>
              <Input
                id="images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
              />
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